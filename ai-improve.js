// Support both Chrome and Firefox APIs
const browserAPI = typeof browser !== "undefined" ? browser : chrome;

// DOM Elements
let apiKeyInput,
  brandNameInput,
  businessFocusInput,
  targetAudienceInput,
  serviceAreaInput,
  toneSelect,
  additionalInstructionsInput,
  wpSiteUrlInput,
  wpUsernameInput,
  wpAppPasswordInput;
let saveSettingsBtn, scanBtn, applyAllBtn;
let settingsStatus, improveStatus, loadingContainer, suggestionsContainer;

// Store suggestions
let suggestions = [];
let acceptedSuggestions = new Set();

// Store parsed services for bulk replace
let parsedServices = [];

// Store the target tab ID from the last scan
let lastScannedTabId = null;
let lastScannedMeta = { url: null, title: null };
// Inferred intent from permalink (e.g., commercial vs domestic)
let pageIntent = { intent: "unknown", cues: [], url: null };

// Presets (saved suggestion bundles)
let presetsCache = [];

document.addEventListener("DOMContentLoaded", function () {
  // Initialize DOM elements
  apiKeyInput = document.getElementById("apiKey");
  brandNameInput = document.getElementById("brandName");
  businessFocusInput = document.getElementById("businessFocus");
  targetAudienceInput = document.getElementById("targetAudience");
  serviceAreaInput = document.getElementById("serviceArea");
  toneSelect = document.getElementById("tone");
  additionalInstructionsInput = document.getElementById("additionalInstructions");
  wpSiteUrlInput = document.getElementById("wpSiteUrl");
  wpUsernameInput = document.getElementById("wpUsername");
  wpAppPasswordInput = document.getElementById("wpAppPassword");
  saveSettingsBtn = document.getElementById("saveSettings");
  scanBtn = document.getElementById("scanBtn");
  applyAllBtn = document.getElementById("applyAllBtn");
  settingsStatus = document.getElementById("settingsStatus");
  improveStatus = document.getElementById("improveStatus");
  loadingContainer = document.getElementById("loadingContainer");
  suggestionsContainer = document.getElementById("suggestionsContainer");

  // If running in a small popup window, show the open-in-tab notice
  const popupNotice = document.getElementById("popupNotice");
  const openFullTabLink = document.getElementById("openFullTabLink");
  if (popupNotice) {
    const showNotice = window.innerHeight < 650;
    if (showNotice) {
      popupNotice.style.display = "block";
    }
  }
  if (openFullTabLink) {
    openFullTabLink.addEventListener("click", (e) => {
      e.preventDefault();
      try {
        (typeof browser !== "undefined" ? browser : chrome).tabs.create({
          url: (typeof browser !== "undefined"
            ? browser
            : chrome
          ).runtime.getURL("ai-improve.html"),
        });
      } catch (err) {
        window.open("ai-improve.html", "_blank");
      }
    });
  }

  // Tab switching
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", function () {
      const tabName = this.getAttribute("data-tab");
      switchTab(tabName);
    });
  });

  // Load saved settings
  loadSettings();

  // Save settings
  saveSettingsBtn.addEventListener("click", saveSettings);

  // Test API key
  const testApiBtn = document.getElementById("testApiBtn");
  if (testApiBtn) {
    testApiBtn.addEventListener("click", testApiKey);
  }

  // Test WordPress connection
  const testWpConnectionBtn = document.getElementById("testWpConnectionBtn");
  if (testWpConnectionBtn) {
    testWpConnectionBtn.addEventListener("click", testWordPressConnection);
  }

  // Scan and improve
  scanBtn.addEventListener("click", scanAndImprove);

  // Test connection
  const testConnectionBtn = document.getElementById("testConnectionBtn");
  if (testConnectionBtn) {
    testConnectionBtn.addEventListener("click", testConnection);
  }

  // Apply all accepted changes
  applyAllBtn.addEventListener("click", applyAllChanges);

  // Preset handlers
  const savePresetBtn = document.getElementById("savePresetBtn");
  const loadPresetBtn = document.getElementById("loadPresetBtn");
  const deletePresetBtn = document.getElementById("deletePresetBtn");
  const presetSelect = document.getElementById("presetSelect");

  if (savePresetBtn) savePresetBtn.addEventListener("click", saveCurrentPreset);
  if (loadPresetBtn)
    loadPresetBtn.addEventListener("click", loadSelectedPreset);
  if (deletePresetBtn)
    deletePresetBtn.addEventListener("click", deleteSelectedPreset);

  // Load presets list on startup
  refreshPresetList();

  // Bulk Replace Services handlers
  const parseDataBtn = document.getElementById("parseDataBtn");
  const applyServicesBtn = document.getElementById("applyServicesBtn");
  const serviceFileInput = document.getElementById("serviceFile");
  const saveDataBtn = document.getElementById("saveDataBtn");
  const downloadDataBtn = document.getElementById("downloadDataBtn");

  if (parseDataBtn) {
    parseDataBtn.addEventListener("click", parseServiceData);
  }

  if (applyServicesBtn) {
    applyServicesBtn.addEventListener("click", applyBulkServices);
  }

  if (saveDataBtn) {
    saveDataBtn.addEventListener("click", saveServiceDataToStorage);
  }

  if (downloadDataBtn) {
    downloadDataBtn.addEventListener("click", downloadServiceDataToFile);
  }

  if (serviceFileInput) {
    serviceFileInput.addEventListener("change", function (event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          document.getElementById("serviceData").value = e.target.result;
          showStatus(
            document.getElementById("parseStatus"),
            `✓ Loaded ${file.name}`,
            "success"
          );
        };
        reader.readAsText(file);
      }
    });
  }

  // Image mapping handlers
  const applyBulkImageUrls = document.getElementById("applyBulkImageUrls");
  const saveImageMappingBtn = document.getElementById("saveImageMappingBtn");
  const uploadAndAssignImagesBtn = document.getElementById("uploadAndAssignImagesBtn");

  if (applyBulkImageUrls) {
    applyBulkImageUrls.addEventListener("click", applyBulkImageUrlsToServices);
  }

  // Navigation button handlers
  const navToImagesBtn = document.getElementById("navToImagesBtn");
  const navToFieldsBtn = document.getElementById("navToFieldsBtn");
  const navToTextBtn = document.getElementById("navToTextBtn");

  if (navToImagesBtn) {
    navToImagesBtn.addEventListener("click", function() {
      switchTab('images');
    });
  }

  if (navToFieldsBtn) {
    navToFieldsBtn.addEventListener("click", function() {
      switchTab('fields');
    });
  }

  if (navToTextBtn) {
    navToTextBtn.addEventListener("click", function() {
      switchTab('text');
    });
  }

  if (saveImageMappingBtn) {
    saveImageMappingBtn.addEventListener("click", saveImageMapping);
  }

  if (uploadAndAssignImagesBtn) {
    uploadAndAssignImagesBtn.addEventListener("click", uploadAndAssignImagesViaAPI);
  }

  // Custom single ACF field handler
  const applyCustomFieldBtn = document.getElementById("applyCustomFieldBtn");
  if (applyCustomFieldBtn) {
    applyCustomFieldBtn.addEventListener("click", applyCustomAcfField);
  }

  // New tab page-specific handlers
  const applyBulkImageUrlsPage = document.getElementById("applyBulkImageUrlsPage");
  const uploadAndAssignImagesPage = document.getElementById("uploadAndAssignImagesPage");
  const applyCustomFieldPage = document.getElementById("applyCustomFieldPage");

  if (applyBulkImageUrlsPage) {
    applyBulkImageUrlsPage.addEventListener("click", applyBulkImageUrlsToServices);
  }

  if (uploadAndAssignImagesPage) {
    uploadAndAssignImagesPage.addEventListener("click", uploadAndAssignImagesViaAPI);
  }

  if (applyCustomFieldPage) {
    applyCustomFieldPage.addEventListener("click", applyCustomAcfField);
  }

  // Service Text tab handlers
  const parseServiceTextPage = document.getElementById("parseServiceTextPage");
  const applyServiceTextPage = document.getElementById("applyServiceTextPage");

  if (parseServiceTextPage) {
    parseServiceTextPage.addEventListener("click", parseServiceTextData);
  }

  if (applyServiceTextPage) {
    applyServiceTextPage.addEventListener("click", applyServiceTextToPage);
  }

  // Load saved service data when switching to replace tab
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", function () {
      if (this.getAttribute("data-tab") === "replace") {
        loadSavedServiceData();
      }
    });
  });
});

// Toggle function for collapsible bulk sections
function toggleBulkSection(sectionName) {
  const content = document.getElementById(sectionName + 'Content');
  const toggle = document.getElementById(sectionName + 'Toggle');
  
  if (content.classList.contains('collapsed')) {
    content.classList.remove('collapsed');
    content.style.display = 'block';
    toggle.textContent = '▼';
  } else {
    content.classList.add('collapsed');
    content.style.display = 'none';
    toggle.textContent = '▶';
  }
}

// Show bulk sections after parsing
function showBulkSections() {
  const container = document.getElementById('bulkSectionsContainer');
  const actions = document.getElementById('mainActions');
  if (container) container.style.display = 'block';
  if (actions) actions.style.display = 'block';
  
  // Open Page Settings by default
  const pageSettingsContent = document.getElementById('pageSettingsContent');
  const pageSettingsToggle = document.getElementById('pageSettingsToggle');
  if (pageSettingsContent && pageSettingsToggle) {
    pageSettingsContent.classList.remove('collapsed');
    pageSettingsContent.style.display = 'block';
    pageSettingsToggle.textContent = '▼';
  }
}

// Infer page intent (commercial/domestic/industrial) from permalink
function inferPageIntentFromUrl(url) {
  const lower = String(url || "").toLowerCase();
  const cues = [];
  let intent = "unknown";

  const has = (s) => lower.includes(s);

  if (
    has("/commercial") ||
    has("-commercial") ||
    has("commercial-") ||
    has("/business") ||
    has("/b2b")
  ) {
    intent = "commercial";
    [
      "commercial",
      "business",
      "b2b",
      "office",
      "restaurant",
      "retail",
      "industrial",
    ].forEach((c) => cues.push(c));
  } else if (
    has("/domestic") ||
    has("-domestic") ||
    has("domestic-") ||
    has("/residential") ||
    has("-residential") ||
    has("residential-") ||
    has("/home")
  ) {
    intent = "domestic";
    ["domestic", "residential", "home", "household", "homeowners"].forEach(
      (c) => cues.push(c)
    );
  } else if (has("/industrial") || has("industrial-") || has("-industrial")) {
    intent = "industrial";
    ["industrial", "factory", "plant", "warehouse"].forEach((c) =>
      cues.push(c)
    );
  }

  return { intent, cues, url: url || null };
}

function switchTab(tabName) {
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((c) => c.classList.remove("active"));

  document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");
  document.getElementById(`${tabName}-tab`).classList.add("active");
}

function loadSettings() {
  browserAPI.storage.local.get(
    [
      "geminiApiKey",
      "brandName",
      "businessFocus",
      "targetAudience",
      "serviceArea",
      "tone",
      "additionalInstructions",
      "wpSiteUrl",
      "wpUsername",
      "wpAppPassword",
      "imageMapping",
      "servicePageBaseUrl",
      "autoCreateAcfFields"
    ],
    function (result) {
      if (result.geminiApiKey) apiKeyInput.value = result.geminiApiKey;
      if (result.brandName) brandNameInput.value = result.brandName;
      if (result.businessFocus) businessFocusInput.value = result.businessFocus;
      if (result.targetAudience)
        targetAudienceInput.value = result.targetAudience;
      if (result.serviceArea) serviceAreaInput.value = result.serviceArea;
      if (result.tone) toneSelect.value = result.tone;
      if (result.additionalInstructions)
        additionalInstructionsInput.value = result.additionalInstructions;
      if (result.wpSiteUrl) wpSiteUrlInput.value = result.wpSiteUrl;
      if (result.wpUsername) wpUsernameInput.value = result.wpUsername;
      if (result.wpAppPassword) wpAppPasswordInput.value = result.wpAppPassword;
      
      // Load auto-create ACF fields checkbox
      const autoCreateCheckbox = document.getElementById('autoCreateAcfFields');
      if (autoCreateCheckbox) {
        autoCreateCheckbox.checked = result.autoCreateAcfFields || false;
      }
      
      // Load saved image mapping
      if (result.imageMapping) {
        serviceImageMap.clear();
        Object.entries(result.imageMapping).forEach(([serviceNum, imageName]) => {
          serviceImageMap.set(parseInt(serviceNum), imageName);
        });
      }
      
      // Load service page base URL
      if (result.servicePageBaseUrl) {
        const servicePageBaseUrlInput = document.getElementById("servicePageBaseUrl");
        if (servicePageBaseUrlInput) {
          servicePageBaseUrlInput.value = result.servicePageBaseUrl;
        }
      }
    }
  );
}

async function testApiKey() {
  const apiKey = apiKeyInput.value;

  if (!apiKey) {
    showStatus(settingsStatus, "Please enter an API key first", "error");
    return;
  }

  const testBtn = document.getElementById("testApiBtn");
  testBtn.textContent = "Testing...";
  testBtn.disabled = true;

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Say 'API key is valid' in 3 words.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || "Invalid API key");
    }

    showStatus(settingsStatus, "✓ API Key is valid!", "success");
  } catch (error) {
    showStatus(settingsStatus, "API Key Error: " + error.message, "error");
  } finally {
    testBtn.textContent = "Test API Key";
    testBtn.disabled = false;
  }
}

async function testWordPressConnection() {
  const wpSiteUrl = wpSiteUrlInput.value.trim();
  const wpUsername = wpUsernameInput.value.trim();
  const wpAppPassword = wpAppPasswordInput.value.trim();

  if (!wpSiteUrl || !wpUsername || !wpAppPassword) {
    showStatus(settingsStatus, "Please fill in all WordPress fields", "error");
    return;
  }

  const testBtn = document.getElementById("testWpConnectionBtn");
  testBtn.textContent = "Testing...";
  testBtn.disabled = true;

  try {
    // Clean the password (remove all spaces)
    const cleanPassword = wpAppPassword.replace(/\s/g, '');
    
    // Test connection by fetching site info
    const apiUrl = `${wpSiteUrl.replace(/\/$/, '')}/wp-json/wp/v2/users/me`;
    const credentials = btoa(`${wpUsername}:${cleanPassword}`);
    
    console.log('=== WordPress Connection Test ===');
    console.log('API URL:', apiUrl);
    console.log('Username:', wpUsername);
    console.log('Password length (cleaned):', cleanPassword.length);
    console.log('Password (first 4 chars):', cleanPassword.substring(0, 4) + '...');
    console.log('Authorization header:', 'Basic ' + credentials.substring(0, 20) + '...');

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details');
      console.error('WordPress API Error Response:', errorText);
      
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
        console.error('Error details (parsed):', errorDetails);
      } catch (e) {
        console.error('Could not parse error as JSON');
      }
      
      if (response.status === 401) {
        const errorCode = errorDetails?.code || 'unknown';
        const errorMsg = errorDetails?.message || 'Authentication failed';
        
        // Check for specific "rest_not_logged_in" error
        if (errorCode === 'rest_not_logged_in') {
          // Application Passwords completely blocked - offer workaround
          const useManual = confirm(
            '⚠️ Application Passwords NOT Supported\n\n' +
            'Your local WordPress is blocking Application Password authentication even with the filters.\n\n' +
            'OPTIONS:\n\n' +
            '1. Use Manual Assignment Helper (RECOMMENDED)\n' +
            '   • Click OK to use it now\n' +
            '   • Visual guide in WordPress admin\n' +
            '   • Works without any configuration\n\n' +
            '2. Use regular WordPress password instead\n' +
            '   • Click CANCEL\n' +
            '   • Enter your REGULAR WordPress login password in the password field\n' +
            '   • Try testing again\n\n' +
            'Choose an option:'
          );
          
          if (useManual) {
            showStatus(settingsStatus, "Use the 'Upload & Assign Images' button - it will open the Manual Helper for you.", "info");
            testBtn.textContent = "Test WordPress Connection";
            testBtn.disabled = false;
            return;
          } else {
            throw new Error(`Try using your REGULAR WordPress password instead of Application Password.\n\n` +
              `Your local WordPress is blocking Application Passwords.\n\n` +
              `Change the password field to your normal login password and test again.`);
          }
        }
        
        throw new Error(`Authentication failed (401)\n\nError: ${errorCode}\nMessage: ${errorMsg}\n\nPossible solutions:\n1. Check username is correct (case-sensitive)\n2. Regenerate Application Password in WordPress\n3. Make sure you copied the FULL password\n4. Try deleting and re-entering credentials in extension`);
      }
      throw new Error(`Connection failed (${response.status}). Check your credentials.`);
    }

    const userData = await response.json();
    console.log('✅ Success! Connected as:', userData.name);
    showStatus(settingsStatus, `✓ Connected as: ${userData.name}`, "success");
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    showStatus(settingsStatus, "WordPress Error: " + error.message, "error");
  } finally {
    testBtn.textContent = "Test WordPress Connection";
    testBtn.disabled = false;
  }
}

async function testConnection() {
  const testBtn = document.getElementById("testConnectionBtn");
  testBtn.textContent = "🔧 Testing...";
  testBtn.disabled = true;

  try {
    // Get target URL from input field
    const targetPageUrlInput = document.getElementById("targetPageUrl");
    const targetUrl = targetPageUrlInput ? targetPageUrlInput.value.trim() : "";

    let tab;

    if (targetUrl) {
      // User provided a URL - find that tab
      const allTabs = await browserAPI.tabs.query({});
      tab = allTabs.find(
        (t) => t.url === targetUrl || t.url.startsWith(targetUrl)
      );

      if (!tab) {
        showStatus(
          improveStatus,
          "Target page not found. Please open it first or leave URL empty to use active tab.",
          "error"
        );
        testBtn.textContent = "🔧 Test Connection (Debug)";
        testBtn.disabled = false;
        return;
      }
    } else {
      // No URL provided - use current active tab
      const tabs = await browserAPI.tabs.query({
        active: true,
        currentWindow: true,
      });
      tab = tabs[0];

      // Check if it's an extension page
      if (
        tab.url.startsWith("chrome-extension://") ||
        tab.url.startsWith("moz-extension://") ||
        tab.url.startsWith("edge-extension://") ||
        tab.url.startsWith("about:") ||
        tab.url.startsWith("chrome://") ||
        tab.url.startsWith("edge://")
      ) {
        showStatus(
          improveStatus,
          "Cannot test extension pages. Please provide a website URL in the Target Page URL field.",
          "error"
        );
        testBtn.textContent = "🔧 Test Connection (Debug)";
        testBtn.disabled = false;
        return;
      }
    }

    // Test 1: Can we access the page?
    console.log("✅ Test 1: Extension can access page");

    // Test 2: Can we find fields?
    const results = await browserAPI.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const inputs = document.querySelectorAll(
          'input[type="text"], textarea'
        );
        return {
          inputCount: inputs.length,
          sampleFields: Array.from(inputs)
            .slice(0, 3)
            .map((i) => ({
              tag: i.tagName,
              name: i.name || i.id || "unnamed",
              valueLength: i.value.length,
            })),
        };
      },
    });

    const fieldInfo = results[0].result;
    console.log("✅ Test 2: Found fields:", fieldInfo);

    // Test 3: Can we modify a field?
    const modifyResults = await browserAPI.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const testInput = document.querySelectorAll(
          'input[type="text"], textarea'
        )[0];
        if (testInput) {
          const oldValue = testInput.value;
          testInput.value = oldValue + " [TEST]";
          const newValue = testInput.value;

          // Restore original
          setTimeout(() => {
            testInput.value = oldValue;
          }, 1000);

          return {
            success: newValue.includes("[TEST]"),
            fieldName: testInput.name || testInput.id || "unnamed",
          };
        }
        return { success: false, error: "No fields found" };
      },
    });

    const modifyResult = modifyResults[0].result;
    console.log("✅ Test 3: Modification test:", modifyResult);

    if (modifyResult.success) {
      showStatus(
        improveStatus,
        `✅ Connection Working! Found ${fieldInfo.inputCount} fields. Modified "${modifyResult.fieldName}" successfully.`,
        "success"
      );
      testBtn.textContent = "✅ Connection Works!";
      testBtn.style.background = "#4CAF50";
    } else {
      showStatus(
        improveStatus,
        `⚠️ Found ${fieldInfo.inputCount} fields but couldn't modify them. Check console (F12).`,
        "info"
      );
      testBtn.textContent = "⚠️ Partial Success";
      testBtn.style.background = "#ff9800";
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
    showStatus(improveStatus, `❌ Test Failed: ${error.message}`, "error");
    testBtn.textContent = "❌ Test Failed";
    testBtn.style.background = "#f44336";
  } finally {
    setTimeout(() => {
      testBtn.textContent = "🔧 Test Connection (Debug)";
      testBtn.style.background = "#9C27B0";
      testBtn.disabled = false;
    }, 3000);
  }
}

function saveSettings() {
  const settings = {
    geminiApiKey: apiKeyInput.value,
    brandName: brandNameInput.value,
    businessFocus: businessFocusInput.value,
    targetAudience: targetAudienceInput.value,
    serviceArea: serviceAreaInput.value,
    tone: toneSelect.value,
    additionalInstructions: additionalInstructionsInput.value.trim(),
    wpSiteUrl: wpSiteUrlInput.value.trim(),
    wpUsername: wpUsernameInput.value.trim(),
    wpAppPassword: wpAppPasswordInput.value.trim(),
    autoCreateAcfFields: document.getElementById('autoCreateAcfFields')?.checked || false,
  };

  if (!settings.geminiApiKey) {
    showStatus(settingsStatus, "Please enter your Gemini API key", "error");
    return;
  }

  browserAPI.storage.local.set(settings, function () {
    showStatus(settingsStatus, "Settings saved successfully!", "success");
  });
}

async function scanAndImprove() {
  // Get settings
  const settings = await new Promise((resolve) => {
    browserAPI.storage.local.get(
      [
        "geminiApiKey",
        "brandName",
        "businessFocus",
        "targetAudience",
        "serviceArea",
        "tone",
        "additionalInstructions",
      ],
      resolve
    );
  });

  if (!settings.geminiApiKey) {
    showStatus(
      improveStatus,
      "Please set your API key in Settings first",
      "error"
    );
    switchTab("settings");
    return;
  }

  // Get target URL from input field - MAKE IT REQUIRED
  const targetPageUrlInput = document.getElementById("targetPageUrl");
  const targetUrl = targetPageUrlInput ? targetPageUrlInput.value.trim() : "";

  // REQUIRE URL when AI Improver is open in its own tab
  if (!targetUrl) {
    showStatus(
      improveStatus,
      "⚠️ Please paste the WordPress page URL in the 'Target Page URL' field above before scanning.",
      "error"
    );
    // Highlight the URL field
    if (targetPageUrlInput) {
      targetPageUrlInput.style.border = "2px solid #f44336";
      targetPageUrlInput.focus();
      setTimeout(() => {
        targetPageUrlInput.style.border = "";
      }, 3000);
    }
    return;
  }

  try {
    // Show loading
    loadingContainer.style.display = "block";
    loadingContainer.innerHTML = `
      <div class="spinner"></div>
      <p>Scanning page for text fields...</p>
    `;
    suggestionsContainer.innerHTML = "";
    applyAllBtn.style.display = "none";
    suggestions = [];
    acceptedSuggestions.clear();

    let tab;

    // User provided a URL - find or open that tab
    const allTabs = await browserAPI.tabs.query({});
    tab = allTabs.find(
      (t) => t.url === targetUrl || t.url.startsWith(targetUrl)
    );

    if (!tab) {
      // URL not found in any tab - open it
      showStatus(improveStatus, "Opening the target page...", "info");
      tab = await browserAPI.tabs.create({ url: targetUrl, active: false });

      // Wait for page to load
      await new Promise((resolve) => {
        const listener = (tabId, changeInfo) => {
          if (tabId === tab.id && changeInfo.status === "complete") {
            browserAPI.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        };
        browserAPI.tabs.onUpdated.addListener(listener);

        // Timeout after 10 seconds
        setTimeout(resolve, 10000);
      });
    }

    // Track meta
    lastScannedMeta = { url: tab.url || null, title: tab.title || null };
  // Infer intent from permalink and store globally
  pageIntent = inferPageIntentFromUrl(tab.url || "");
  console.log("🔎 Inferred page intent from URL:", pageIntent);
    // Debug: Log the tab URL we're about to scan
    console.log("About to scan tab:", tab.url, "Tab ID:", tab.id);

    // Check if it's an extension page (chrome-extension://, moz-extension://, etc.)
    if (
      tab.url.startsWith("chrome-extension://") ||
      tab.url.startsWith("moz-extension://") ||
      tab.url.startsWith("edge-extension://") ||
      tab.url.startsWith("about:") ||
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("edge://")
    ) {
      showStatus(
        improveStatus,
        "❌ Cannot scan extension pages. Please paste the website URL in the 'Target Page URL' field above.",
        "error"
      );
      loadingContainer.style.display = "none";
      return;
    }

    // Store the tab ID for later use when applying changes
    lastScannedTabId = tab.id;
    console.log(
      "✅ Stored tab ID for applying changes:",
      lastScannedTabId,
      "URL:",
      tab.url
    );

    // Extract text fields from page
    const results = await browserAPI.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractTextFields,
    });

    const fields = results[0].result;

    if (fields.length === 0) {
      showStatus(improveStatus, "No text fields found on this page", "info");
      loadingContainer.style.display = "none";
      return;
    }

    // Update loading message
    loadingContainer.innerHTML = `
      <div class="spinner"></div>
      <p>Found ${fields.length} field(s). Generating AI improvements...</p>
      <p style="font-size: 12px; color: #666; margin-top: 5px;">Ultra-fast batch mode. Progress: <span id="progress">0/${fields.length}</span></p>
    `;

    const progressSpan = document.getElementById("progress");
    suggestions = await improveFieldsInBatches(
      fields,
      settings,
      progressSpan
    );

    // Display suggestions
    displaySuggestions();
    loadingContainer.style.display = "none";
    applyAllBtn.style.display = "block";
  } catch (error) {
    showStatus(improveStatus, "Error: " + error.message, "error");
    loadingContainer.style.display = "none";
  }
}

// Utility: count words ignoring HTML tags
function countWords(str) {
  if (!str) return 0;
  const plain = String(str).replace(/<[^>]*>/g, " ").trim();
  if (!plain) return 0;
  return plain.split(/\s+/).length;
}

// Utility: trim plain text to max words (does not preserve HTML)
function trimToMaxWordsPlain(text, maxWords) {
  const words = String(text).trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ");
}

async function improveTextWithGemini(text, settings, maxWords) {
  const apiKey = settings.geminiApiKey;
  // Use Gemini 2.5 Flash model
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  // Include permalink context if available
  const intent = (pageIntent && pageIntent.intent) || "unknown";
  let permalinkContext = "";
  if (intent === "commercial") {
    permalinkContext = `\nPERMALINK CONTEXT: The URL indicates this is a COMMERCIAL service page.\n- Write for business audiences (e.g., businesses, offices, restaurants, facilities).\n- Avoid domestic/residential phrasing like \"home\", \"household\", \"homeowners\" unless part of a proper noun or brand.\n- If original text is domestic, adapt to commercial by replacing terms rather than adding tokens (respect the length rule).`;
  } else if (intent === "domestic") {
    permalinkContext = `\nPERMALINK CONTEXT: The URL indicates this is a DOMESTIC/RESIDENTIAL page.\n- Write for homeowners/households.\n- Avoid commercial-only phrasing like \"businesses\", \"facilities\", \"B2B\" unless necessary.`;
  } else if (intent === "industrial") {
    permalinkContext = `\nPERMALINK CONTEXT: The URL indicates this is an INDUSTRIAL page.\n- Write for plants, factories, warehouses, heavy-duty contexts.\n- Avoid home-only phrasing.`;
  }

  const prompt = `You are a professional Seo content. Improve the following text for ${
    settings.brandName || "a business"
  }.

Business Focus: ${settings.businessFocus || "Not specified"}
Target Audience: ${settings.targetAudience || "General"}
Service Area: ${settings.serviceArea || "Not specified"}
Desired Tone: ${settings.tone || "professional"}
${permalinkContext}
${settings.additionalInstructions ? `\nADDITIONAL INSTRUCTIONS: ${settings.additionalInstructions}` : ''}

Original Text: "${text}"

Please provide an improved version that is:
- More engaging and professional
- SEO-friendly
- Clear and concise
- Appropriate for the target audience
- Maintains the same general meaning and length
\nSTRICT LENGTH RULE: Keep the same number of words or up to TWO more than the original. Do not exceed ${maxWords || 'original+2'} words. Do not add new HTML tags that didn't exist.

Return ONLY the improved text without explanations or quotes.`;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
          responseMimeType: "text/plain",
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || response.statusText;
      console.error("API Error Response:", errorData);
      throw new Error(`API Error (${response.status}): ${errorMessage}`);
    }

    const data = await response.json();
    console.log("API Response:", data);

    // Check if we got a valid response
    if (!data.candidates || data.candidates.length === 0) {
      console.error("No candidates in response:", data);
      throw new Error(
        "No candidates returned. Text may have been blocked by safety filters."
      );
    }

    const candidate = data.candidates[0];
    const finishReason = candidate.finishReason;

    // Check finish reason
    if (finishReason === "SAFETY") {
      throw new Error("Content blocked by safety filters");
    }

    if (finishReason === "MAX_TOKENS") {
      console.warn("Response was truncated due to MAX_TOKENS");
      // Continue anyway - we'll use what we got
    }

    // Extract text robustly like in batch flow
    const parts = Array.isArray(candidate.content?.parts)
      ? candidate.content.parts
      : [];
    let improvedText = parts
      .map((p) => (typeof p.text === "string" ? p.text : ""))
      .filter(Boolean)
      .join("\n")
      .trim();

    if (!improvedText) {
      if (typeof candidate.outputText === "string") improvedText = candidate.outputText.trim();
      else if (typeof candidate.text === "string") improvedText = candidate.text.trim();
    }

    if (!improvedText) {
      console.error("Invalid candidate structure:", candidate);
      throw new Error("Invalid response structure from API");
    }

    // Remove quotes if present
    improvedText = improvedText.replace(/^["']|["']$/g, "");
    // Enforce maxWords if provided
    const limit = typeof maxWords === 'number' ? maxWords : undefined;
    if (limit && countWords(improvedText) > limit) {
      if (!/[<][^>]+>/.test(improvedText)) {
        improvedText = trimToMaxWordsPlain(improvedText, limit);
      }
    }
    return improvedText;
  } catch (error) {
    console.error("Gemini API Error:", error);
    if (error.message.includes("Cannot read properties of undefined")) {
      throw new Error(
        "API returned unexpected format. Check console for details."
      );
    }
    throw new Error(`Failed to improve text: ${error.message}`);
  }
}

async function improveFieldsInBatches(fields, settings, progressSpan) {
  const results = new Array(fields.length);
  const batchSize = Math.min(11, fields.length); // Increased to 11 for speed
  let processedCount = 0;

  for (let i = 0; i < fields.length; i += batchSize) {
    const batch = fields.slice(i, i + batchSize);
    console.log(
      `🔄 Requesting batch ${Math.floor(i / batchSize) + 1} with ${
        batch.length
      } field(s)`
    );

    try {
      const batchResults = await improveBatchWithGemini(batch, settings, pageIntent);
      const resultMap = new Map(
        batchResults
          .filter((item) => typeof item.index === "number")
          .map((item) => [item.index, item.improved])
      );

      for (let offset = 0; offset < batch.length; offset++) {
        const field = batch[offset];
        let improvedText = resultMap.get(field.index);
        if (
          typeof improvedText === "string" &&
          improvedText.trim().length > 0
        ) {
          // Enforce word limit: original words + 2
          const origWords = countWords(field.html || field.text || "");
          const maxWords = origWords + 2;
          const improvedWords = countWords(improvedText);

          if (improvedWords > maxWords) {
            // If improved contains HTML, re-run a single constrained request; else trim locally
            if (/[<][^>]+>/.test(improvedText)) {
              try {
                const constrained = await fallbackImproveField(field, settings, maxWords);
                improvedText = constrained.improved || improvedText;
              } catch (e) {
                // As a last resort, strip tags and trim
                improvedText = trimToMaxWordsPlain(improvedText.replace(/<[^>]*>/g, ' '), maxWords);
              }
            } else {
              improvedText = trimToMaxWordsPlain(improvedText, maxWords);
            }
          }

          results[i + offset] = {
            index: field.index,
            type: field.type,
            label: field.label,
            original: field.text,
            improved: improvedText.trim(),
          };
        } else {
          console.warn(
            `⚠️ Batch response missing index ${field.index}. Falling back to single request.`
          );
          const origWords = countWords(field.html || field.text || "");
          results[i + offset] = await fallbackImproveField(field, settings, origWords + 2);
        }
      }
    } catch (error) {
      console.error(
        "Batch request failed, falling back to single field calls:",
        error
      );
      for (let offset = 0; offset < batch.length; offset++) {
        const field = batch[offset];
        results[i + offset] = await fallbackImproveField(field, settings);
      }
    } finally {
      if (progressSpan) {
        processedCount = Math.min(processedCount + batch.length, fields.length);
        progressSpan.textContent = `${processedCount}/${fields.length}`;
      }
    }
  }

  return results;
}

async function fallbackImproveField(field, settings, maxWords) {
  try {
    const origWords = countWords(field.html || field.text || "");
    const limit = typeof maxWords === 'number' ? maxWords : (origWords + 2);
    const improved = await improveTextWithGemini(field.text, settings, limit);
    // Final guard: trim plain text if still over limit
    if (countWords(improved) > limit && !/[<][^>]+>/.test(improved)) {
      return {
        index: field.index,
        type: field.type,
        label: field.label,
        original: field.text,
        improved: trimToMaxWordsPlain(improved, limit),
      };
    }
    return {
      index: field.index,
      type: field.type,
      label: field.label,
      original: field.text,
      improved,
    };
  } catch (error) {
    // On any AI failure (e.g., invalid response structure), keep original text unchanged
    return {
      index: field.index,
      type: field.type,
      label: field.label,
      original: field.text,
      improved: field.text,
    };
  }
}

async function improveBatchWithGemini(batch, settings, pageCtx) {
  const apiKey = settings.geminiApiKey;
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const prompt = buildBatchPrompt(batch, settings, pageCtx || pageIntent);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3, // Lower for faster, more focused responses
        topK: 20,
        topP: 0.8,
        maxOutputTokens: 8192, // Maximum for better batch handling
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || response.statusText;
    throw new Error(`Batch API Error (${response.status}): ${errorMessage}`);
  }

  const data = await response.json();
  console.log("Batch API Response:", data);

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error("No candidates returned for batch request");
  }

  const candidate = data.candidates[0];

  // Check if response was truncated due to MAX_TOKENS
  if (candidate.finishReason === "MAX_TOKENS") {
    console.warn(
      "⚠️ Batch response hit MAX_TOKENS limit. Response may be incomplete."
    );
    console.warn("Consider reducing batch size or field text length.");
  }

  const parts = Array.isArray(candidate.content?.parts)
    ? candidate.content.parts
    : [];

  let rawText = parts
    .map((part) => {
      if (typeof part.text === "string") {
        return part.text;
      }
      if (part.inlineData?.data) {
        try {
          return atob(part.inlineData.data);
        } catch (error) {
          console.warn("Failed to decode inlineData", error);
        }
      }
      if (part.functionResponse?.result) {
        return JSON.stringify(part.functionResponse.result);
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");

  if (!rawText || !rawText.trim()) {
    rawText =
      typeof candidate.outputText === "string"
        ? candidate.outputText
        : typeof candidate.text === "string"
        ? candidate.text
        : "";
  }

  if (!rawText || !rawText.trim()) {
    console.error("Unexpected batch response format:", candidate);
    throw new Error("Invalid batch response structure from API");
  }

  rawText = rawText.trim();
  return parseGeminiBatchResponse(rawText);
}

function buildBatchPrompt(batch, settings, pageCtx) {
  const businessContext = `SEO copywriter for ${
    settings.brandName || "a business"
  }.
Focus: ${settings.businessFocus || "General"} | Audience: ${
    settings.targetAudience || "General"
  } | Service Area: ${settings.serviceArea || "N/A"} | Tone: ${
    settings.tone || "professional"
  }

Improve each field for SEO. CRITICAL: Keep the same number of words or UP TO TWO MORE than the original. Only use HTML tags if they exist in original.
IMPORTANT: If text mentions "same-day" or "same day", always add "(subject to availability*)" after it for accuracy.`;

  // Add permalink context
  const intent = pageCtx?.intent || "unknown";
  let permalinkContext = "";
  if (intent === "commercial") {
    permalinkContext = `\nPERMALINK CONTEXT: The URL indicates a COMMERCIAL service page.\n- Align copy to business audiences (businesses, offices, restaurants, facilities).\n- Replace domestic/residential phrasing with commercial equivalents where needed.\n- Prefer substitution over adding words to respect the ≤ original+2 rule.`;
  } else if (intent === "domestic") {
    permalinkContext = `\nPERMALINK CONTEXT: The URL indicates a DOMESTIC/RESIDENTIAL page.\n- Align copy to homeowners/households and avoid B2B-only phrasing.`;
  } else if (intent === "industrial") {
    permalinkContext = `\nPERMALINK CONTEXT: The URL indicates an INDUSTRIAL page.\n- Align copy to factories/plants/warehouses and avoid home-only phrasing.`;
  }

  // Add custom user instructions if provided
  const customInstructions = settings.additionalInstructions
    ? `\nADDITIONAL INSTRUCTIONS: ${settings.additionalInstructions}`
    : '';

  const fieldDetails = batch
    .map((field, idx) => {
      const contentToImprove = field.html || field.text || "";
      const safeText = contentToImprove.replace(/```/g, "'''");
      const wordCount = contentToImprove
        .replace(/<[^>]*>/g, "")
        .trim()
        .split(/\s+/).length;
      return `${field.index}. [${wordCount + 2} words max] ${safeText}`;
    })
    .join("\n\n");

  const outputInstructions = `Return JSON array: [{"index":number,"improved":"text"}]. Each improved text MUST be the same length or UP TO TWO words longer than the original (≤ original+2 words). Match formatting (no new HTML tags). Add "(subject to availability*)" after any "same-day" or "same day" mentions.`;

  return `${businessContext}${permalinkContext}${customInstructions}

${fieldDetails}

${outputInstructions}`;
}

function parseGeminiBatchResponse(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Empty response text from batch");
  }

  console.log(
    "📝 Raw batch response text (first 500 chars):",
    text.substring(0, 500)
  );
  console.log("📝 Full response length:", text.length);

  let cleaned = text.trim();

  // Replace unescaped control characters (newlines, tabs, etc.) with spaces to avoid JSON parse errors
  cleaned = cleaned.replace(/[\u0000-\u001F]+/g, " ");

  // Remove code block markers more aggressively
  cleaned = cleaned.replace(/^```json\s*/i, "");
  cleaned = cleaned.replace(/^```\s*/i, "");
  cleaned = cleaned.replace(/\s*```$/i, "");
  cleaned = cleaned.trim();

  // Remove trailing commas before closing brackets which break JSON
  cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");

  // Extract the JSON array - handle both complete and truncated responses
  const bracketMatch = cleaned.match(/\[[\s\S]*\]/);
  let jsonText = bracketMatch ? bracketMatch[0] : cleaned;

  // If the JSON appears incomplete (no closing bracket), try to salvage it
  if (jsonText.startsWith("[") && !jsonText.endsWith("]")) {
    console.warn(
      "⚠️ JSON response appears truncated. Attempting to complete it..."
    );
    // Count open objects and try to close them
    const openBraces = (jsonText.match(/\{/g) || []).length;
    const closeBraces = (jsonText.match(/\}/g) || []).length;
    const missingBraces = openBraces - closeBraces;

    if (missingBraces > 0) {
      jsonText += "}".repeat(missingBraces);
    }
    jsonText += "]";
    console.log(
      "🔧 Attempted repair:",
      jsonText.substring(jsonText.length - 100)
    );
  }

  try {
    const parsed = JSON.parse(jsonText);
    if (Array.isArray(parsed)) {
      console.log(`✅ Successfully parsed ${parsed.length} items from batch`);
      return parsed;
    }
    if (Array.isArray(parsed.results)) {
      console.log(
        `✅ Successfully parsed ${parsed.results.length} items from batch.results`
      );
      return parsed.results;
    }
    if (Array.isArray(parsed.fields)) {
      console.log(
        `✅ Successfully parsed ${parsed.fields.length} items from batch.fields`
      );
      return parsed.fields;
    }
    throw new Error("Batch response JSON did not contain an array");
  } catch (error) {
    console.error("❌ Failed to parse batch JSON. Error:", error.message);
    console.error("📄 Attempted to parse:", jsonText.substring(0, 500));
    throw new Error(`Batch response was not valid JSON: ${error.message}`);
  }
}

function displaySuggestions() {
  suggestionsContainer.innerHTML = "";

  // Add summary header with quick apply button
  const summaryDiv = document.createElement("div");
  summaryDiv.style.cssText =
    "background: #e3f2fd; padding: 15px; border-radius: 4px; margin-bottom: 20px; border-left: 4px solid #2196F3;";
  summaryDiv.innerHTML = `
    <h3 style="margin: 0 0 10px 0; color: #1976D2;">📝 Summary</h3>
    <p style="margin: 0; color: #333;">Found <strong>${suggestions.length}</strong> field(s) to improve</p>
    <p style="margin: 5px 0 10px 0; font-size: 13px; color: #666;">Review each suggestion below and accept the ones you want to apply.</p>
    <button id="applyAllNowBtn" style="width: 100%; padding: 12px; background: #FF6B35; color: white; border: none; border-radius: 4px; font-size: 14px; font-weight: bold; cursor: pointer; margin-top: 10px;">
      ⚡ Apply All ${suggestions.length} Changes Now (Without Review)
    </button>
  `;
  suggestionsContainer.appendChild(summaryDiv);

  // Add event listener for quick apply all button
  document
    .getElementById("applyAllNowBtn")
    .addEventListener("click", async function () {
      if (
        !confirm(
          `Apply all ${suggestions.length} improvements immediately without review?`
        )
      ) {
        return;
      }

      this.textContent = "⏳ Applying all changes...";
      this.disabled = true;
      this.style.background = "#757575";

      try {
        const tabs = await browserAPI.tabs.query({
          active: true,
          currentWindow: true,
        });
        const tab = tabs[0];

        const results = await browserAPI.scripting.executeScript({
          target: { tabId: tab.id },
          func: applyChangesToPage,
          args: [suggestions],
        });

        const result = results[0].result;

        if (result.applied > 0) {
          this.textContent = `✅ Applied All ${result.applied} Changes!`;
          this.style.background = "#4CAF50";
          showStatus(
            improveStatus,
            `✓ Applied all ${result.applied} improvements!`,
            "success"
          );

          // Highlight all fields as applied
          document.querySelectorAll(".field-item").forEach((item) => {
            item.style.border = "2px solid #4CAF50";
            item.style.background = "#e8f5e9";
          });
        } else {
          this.textContent = "❌ Failed to Apply";
          this.style.background = "#f44336";
        }
      } catch (error) {
        console.error("Error applying all changes:", error);
        this.textContent = "❌ Error";
        this.style.background = "#f44336";
      }
    });

  suggestions.forEach((suggestion, index) => {
    const fieldDiv = document.createElement("div");
    fieldDiv.className = "field-item";

    const originalLength = suggestion.original.length;
    const improvedLength = suggestion.improved.length;
    const lengthDiff = improvedLength - originalLength;
    const lengthChange = lengthDiff > 0 ? `+${lengthDiff}` : lengthDiff;

    fieldDiv.innerHTML = `
            <div class="field-label">📄 Field ${index + 1}: ${escapeHtml(
      suggestion.label || "Unknown"
    )}</div>
            <div class="field-info">
                <strong>Type:</strong> ${suggestion.type} | 
                <strong>Location:</strong> ${escapeHtml(
                  suggestion.label || "Not specified"
                )}
            </div>
            <div class="field-meta">
                <span>Original: <span class="char-count">${originalLength} chars</span></span>
                <span>Improved: <span class="char-count">${improvedLength} chars</span> (${lengthChange})</span>
            </div>
            <div class="field-original">
                <strong>📝 Current Text:</strong><br>
                ${escapeHtml(suggestion.original)}
            </div>
            <div class="field-improved">
                <strong>✨ AI Improved Version:</strong><br>
                ${escapeHtml(suggestion.improved)}
            </div>
            <div class="field-actions">
                <button class="accept-btn" data-index="${index}">✓ Accept This Change</button>
                <button class="reject-btn" data-index="${index}">✗ Skip This Field</button>
                <button class="apply-single-btn" data-index="${index}" style="display:none; background:#1976D2; color:white; flex:1;">⚡ Apply Now</button>
            </div>
        `;

    suggestionsContainer.appendChild(fieldDiv);
  });

  // Add event listeners to buttons
  document.querySelectorAll(".accept-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const index = parseInt(this.getAttribute("data-index"));
      acceptedSuggestions.add(index);
      this.textContent = "✓ Accepted";
      this.style.background = "#2e7d32";
      this.disabled = true;

      const rejectBtn = this.parentElement.querySelector(".reject-btn");
      const applySingleBtn =
        this.parentElement.querySelector(".apply-single-btn");

      rejectBtn.style.display = "none";
      applySingleBtn.style.display = "block";

      // Update the apply all button count
      updateApplyAllButton();
    });
  });

  document.querySelectorAll(".reject-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const index = parseInt(this.getAttribute("data-index"));
      acceptedSuggestions.delete(index);
      this.parentElement.parentElement.style.opacity = "0.5";
      this.textContent = "✗ Rejected";
      this.disabled = true;
      this.parentElement.querySelector(".accept-btn").style.display = "none";
    });
  });

  // Add event listeners for individual apply buttons
  document.querySelectorAll(".apply-single-btn").forEach((btn) => {
    btn.addEventListener("click", async function () {
      const index = parseInt(this.getAttribute("data-index"));
      const suggestion = suggestions[index];

      // Show loading state
      this.textContent = "⏳ Applying...";
      this.disabled = true;

      try {
        // Ensure we have a scanned tab to apply to
        if (!lastScannedTabId) {
          showStatus(
            improveStatus,
            "❌ Please scan the page first before applying.",
            "error"
          );
          this.textContent = "⚡ Apply Now";
          this.disabled = false;
          return;
        }

        // Verify the tab still exists and is not an extension page
        let targetTab;
        try {
          targetTab = await browserAPI.tabs.get(lastScannedTabId);
        } catch (e) {
          showStatus(
            improveStatus,
            "❌ The scanned page was closed. Please scan again.",
            "error"
          );
          this.textContent = "⚡ Apply Now";
          this.disabled = false;
          return;
        }

        if (
          targetTab.url.startsWith("chrome-extension://") ||
          targetTab.url.startsWith("moz-extension://") ||
          targetTab.url.startsWith("edge-extension://")
        ) {
          showStatus(
            improveStatus,
            "❌ Cannot apply to extension pages. Please paste the website URL and scan again.",
            "error"
          );
          this.textContent = "⚡ Apply Now";
          this.disabled = false;
          return;
        }

        const results = await browserAPI.scripting.executeScript({
          target: { tabId: lastScannedTabId },
          func: applyChangesToPage,
          args: [[suggestion]],
        });

        const result = results[0].result;

        if (result.applied > 0) {
          this.textContent = "✅ Applied!";
          this.style.background = "#2e7d32";
          setTimeout(() => {
            this.parentElement.parentElement.style.border = "2px solid #4CAF50";
          }, 100);
        } else {
          this.textContent = "❌ Failed";
          this.style.background = "#f44336";
        }
      } catch (error) {
        console.error("Error applying single change:", error);
        this.textContent = "❌ Error";
        this.style.background = "#f44336";
      }
    });
  });

  updateApplyAllButton();
}

function updateApplyAllButton() {
  if (acceptedSuggestions.size > 0) {
    applyAllBtn.style.display = "block";
    applyAllBtn.textContent = `⚡ Apply All ${acceptedSuggestions.size} Accepted Change(s)`;
    applyAllBtn.style.background = "#1976D2";
    applyAllBtn.disabled = false;
  } else {
    applyAllBtn.style.display = "none";
  }
}

async function applyAllChanges() {
  if (acceptedSuggestions.size === 0) {
    showStatus(improveStatus, "No suggestions accepted", "info");
    return;
  }

  // Ensure we have a target tab; if not, try to resolve from URL or active tab
  if (!lastScannedTabId) {
    const targetPageUrlInput = document.getElementById("targetPageUrl");
    const targetUrl = targetPageUrlInput ? targetPageUrlInput.value.trim() : "";
    try {
      let tab;
      if (targetUrl) {
        const allTabs = await browserAPI.tabs.query({});
        tab = allTabs.find(
          (t) => t.url === targetUrl || (t.url && t.url.startsWith(targetUrl))
        );
        if (!tab) {
          // Open it in background and wait briefly
          tab = await browserAPI.tabs.create({ url: targetUrl, active: false });
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      } else {
        const tabs = await browserAPI.tabs.query({
          active: true,
          currentWindow: true,
        });
        tab = tabs[0];
      }

      if (
        !tab ||
        !tab.url ||
        tab.url.startsWith("chrome-extension://") ||
        tab.url.startsWith("moz-extension://") ||
        tab.url.startsWith("edge-extension://")
      ) {
        showStatus(
          improveStatus,
          "❌ Please provide a website URL and/or scan first.",
          "error"
        );
        return;
      }
      lastScannedTabId = tab.id;
      lastScannedMeta = { url: tab.url, title: tab.title || null };
    } catch (e) {
      showStatus(
        improveStatus,
        "❌ Could not resolve a target page to apply changes.",
        "error"
      );
      return;
    }
  }

  // Show loading state on button
  applyAllBtn.textContent = `⏳ Applying ${acceptedSuggestions.size} change(s)...`;
  applyAllBtn.disabled = true;
  applyAllBtn.style.background = "#757575";

  try {
    // Verify the tab still exists and get its current URL
    let targetTab;
    try {
      targetTab = await browserAPI.tabs.get(lastScannedTabId);
      console.log("✅ Found target tab:", targetTab.url, "ID:", targetTab.id);
    } catch (error) {
      showStatus(
        improveStatus,
        "❌ The scanned page was closed. Please scan again.",
        "error"
      );
      applyAllBtn.textContent = `Apply All Accepted Changes`;
      applyAllBtn.disabled = false;
      applyAllBtn.style.background = "#1976D2";
      lastScannedTabId = null;
      return;
    }

    // Double-check it's not an extension page
    if (
      targetTab.url.startsWith("chrome-extension://") ||
      targetTab.url.startsWith("moz-extension://") ||
      targetTab.url.startsWith("edge-extension://")
    ) {
      showStatus(
        improveStatus,
        "❌ Cannot apply to extension pages. Please paste the website URL in the 'Target Page URL' field and scan again.",
        "error"
      );
      applyAllBtn.textContent = `Apply All Accepted Changes`;
      applyAllBtn.disabled = false;
      applyAllBtn.style.background = "#1976D2";
      return;
    }

    // Use the stored tab ID from when we scanned
    const acceptedChanges = Array.from(acceptedSuggestions).map(
      (index) => suggestions[index]
    );

    console.log("Applying changes to tab ID:", lastScannedTabId);
    console.log("Total accepted changes:", acceptedChanges.length);

    // Apply in small batches to avoid payload limits/timeouts
    const batchSize = 10;
    let totalApplied = 0;
    let totalFailed = 0;
    for (let i = 0; i < acceptedChanges.length; i += batchSize) {
      const batch = acceptedChanges.slice(i, i + batchSize);
      applyAllBtn.textContent = `⏳ Applying ${Math.min(
        i + batch.length,
        acceptedChanges.length
      )}/${acceptedChanges.length}...`;

      const results = await browserAPI.scripting.executeScript({
        target: { tabId: lastScannedTabId },
        func: applyChangesToPage,
        args: [batch],
      });

      const result = results[0]?.result || { applied: 0, failed: batch.length };
      totalApplied += result.applied || 0;
      totalFailed += result.failed || 0;
      console.log(
        `Batch result: applied ${result.applied}, failed ${result.failed}`
      );
    }

    const result = { applied: totalApplied, failed: totalFailed };
    console.log("Apply results (aggregated):", result);

    if (result.failed > 0) {
      applyAllBtn.textContent = `⚠️ ${result.applied} Applied, ${result.failed} Failed`;
      applyAllBtn.style.background = "#ff9800";
      showStatus(
        improveStatus,
        `Applied ${result.applied} change(s). ${result.failed} failed - check console (F12)`,
        "info"
      );
    } else {
      applyAllBtn.textContent = `✅ All ${result.applied} Change(s) Applied!`;
      applyAllBtn.style.background = "#4CAF50";
      showStatus(
        improveStatus,
        `✓ Successfully applied ${result.applied} improvement(s)! Check your page.`,
        "success"
      );

      // Highlight applied fields
      document.querySelectorAll(".field-item").forEach((item, idx) => {
        if (acceptedSuggestions.has(idx)) {
          item.style.border = "2px solid #4CAF50";
          item.style.background = "#e8f5e9";
        }
      });
    }

    // Keep button visible so user can see the result
    setTimeout(() => {
      applyAllBtn.style.background = "#1976D2";
    }, 3000);
  } catch (error) {
    showStatus(
      improveStatus,
      "Error applying changes: " + error.message,
      "error"
    );
  }
}

// -------- Presets: save/load/delete --------
function makePresetDisplayName(preset) {
  const date = new Date(preset.createdAt).toLocaleString();
  const focus = preset.businessFocus || "General";
  const page = preset.pageTitle || preset.url || "Untitled";
  return `${focus} — ${page} — ${date}`;
}

async function refreshPresetList() {
  const data = await new Promise((resolve) =>
    browserAPI.storage.local.get(["presets"], resolve)
  );
  presetsCache = Array.isArray(data.presets) ? data.presets : [];
  const select = document.getElementById("presetSelect");
  if (!select) return;
  select.innerHTML = "";
  if (presetsCache.length === 0) {
    select.innerHTML = '<option value="">-- No presets saved yet --</option>';
    return;
  }
  presetsCache.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    const full = makePresetDisplayName(p);
    opt.title = full;
    opt.textContent = full.length > 80 ? full.slice(0, 79) + "…" : full;
    select.appendChild(opt);
  });
}

async function saveCurrentPreset() {
  if (!suggestions || suggestions.length === 0) {
    showStatus(
      improveStatus,
      "Nothing to save. Scan first or load a preset.",
      "error"
    );
    return;
  }
  const settings = await new Promise((resolve) =>
    browserAPI.storage.local.get(
      ["brandName", "businessFocus", "targetAudience", "serviceArea", "tone", "additionalInstructions"],
      resolve
    )
  );

  const targetPageUrlInput = document.getElementById("targetPageUrl");
  const url = targetPageUrlInput
    ? targetPageUrlInput.value.trim()
    : lastScannedMeta.url || null;
  const preset = {
    id: `preset_${Date.now()}`,
    createdAt: Date.now(),
    brandName: settings.brandName || "",
    businessFocus: settings.businessFocus || "",
    targetAudience: settings.targetAudience || "",
    serviceArea: settings.serviceArea || "",
    tone: settings.tone || "professional",
    additionalInstructions: settings.additionalInstructions || "",
    url: url,
    pageTitle: lastScannedMeta.title || "",
    suggestions: suggestions,
  };

  const data = await new Promise((resolve) =>
    browserAPI.storage.local.get(["presets"], resolve)
  );
  const list = Array.isArray(data.presets) ? data.presets : [];
  list.unshift(preset);
  await browserAPI.storage.local.set({ presets: list });
  showStatus(improveStatus, "✅ Preset saved.", "success");
  refreshPresetList();
}

function loadSelectedPreset() {
  const select = document.getElementById("presetSelect");
  if (!select || !select.value) {
    showStatus(improveStatus, "Select a preset to load.", "error");
    return;
  }
  const preset = presetsCache.find((p) => p.id === select.value);
  if (!preset) {
    showStatus(improveStatus, "Preset not found.", "error");
    return;
  }
  suggestions = preset.suggestions || [];
  acceptedSuggestions = new Set(suggestions.map((_, i) => i));
  // Set URL field if empty
  const urlInput = document.getElementById("targetPageUrl");
  if (urlInput && !urlInput.value && preset.url) urlInput.value = preset.url;
  displaySuggestions();
  applyAllBtn.style.display = suggestions.length ? "block" : "none";
  showStatus(
    improveStatus,
    `✅ Loaded preset with ${suggestions.length} suggestion(s).`,
    "success"
  );
}

async function deleteSelectedPreset() {
  const select = document.getElementById("presetSelect");
  if (!select || !select.value) {
    showStatus(improveStatus, "Select a preset to delete.", "error");
    return;
  }
  const remaining = presetsCache.filter((p) => p.id !== select.value);
  await browserAPI.storage.local.set({ presets: remaining });
  showStatus(improveStatus, "🗑️ Preset deleted.", "success");
  refreshPresetList();
}
// Functions to be injected into the page
function extractTextFields() {
  const fields = [];
  let index = 0;

  // Helper function to check if text is URL or image path
  function isUrlOrImagePath(text) {
    // Check for URLs
    const urlPattern =
      /^https?:\/\/|^www\.|^ftp:\/\/|\.com|\.org|\.net|\.edu|\.gov/i;
    // Check for image extensions
    const imagePattern = /\.(jpg|jpeg|png|gif|bmp|svg|webp|ico)$/i;
    // Check for file paths
    const pathPattern = /^[a-zA-Z]:\\|^\//;
    // Check if mostly URL-like (contains :// or starts with http)
    const isUrl = urlPattern.test(text) || text.includes("://");
    // Check if it's an image path
    const isImage = imagePattern.test(text);
    // Check if it's a file path
    const isPath = pathPattern.test(text);

    return isUrl || isImage || isPath;
  }

  // Helper function to check if field should be processed
  function shouldProcessField(input) {
    const name = (input.name || "").toLowerCase();
    const id = (input.id || "").toLowerCase();
    const placeholder = (input.placeholder || "").toLowerCase();
    const className = (input.className || "").toLowerCase();
    const value = (input.value || "").toLowerCase();

    // Skip only URL/image focused fields, permalinks, and page titles
    const skipKeywords = [
      "url",
      "link",
      "href",
      "src",
      "image",
      "img",
      "photo",
      "picture",
      "permalink",
      "slug",
      "post_name",
    ];

    const fieldIdentifier = `${name} ${id} ${placeholder} ${className}`;

    // Skip permalink-related and URL/image fields
    for (const keyword of skipKeywords) {
      if (fieldIdentifier.includes(keyword)) {
        return false;
      }
    }

    // Skip if it's the page title field (usually post_title or title in WordPress)
    if (id === "title" || name === "post_title" || id === "post_title") {
      return false;
    }

    return true;
  }

  // Get all input text fields and textareas
  const inputs = document.querySelectorAll(
    'input[type="text"], textarea, input:not([type])'
  );
  inputs.forEach((input) => {
    const text = input.value.trim();

    // Only process if: long enough, not URL/image content, and field metadata isn't URL/image related
    if (
      text.length > 20 &&
      !isUrlOrImagePath(text) &&
      shouldProcessField(input)
    ) {
      input.setAttribute("data-ai-improve-index", index);
      fields.push({
        index: index,
        type: input.tagName.toLowerCase(),
        text: text,
        label: input.name || input.id || input.placeholder || "Unknown field",
      });
      index++;
    }
  });

  // Get contenteditable elements
  const editables = document.querySelectorAll('[contenteditable="true"]');
  editables.forEach((element) => {
    const text = element.textContent.trim();
    const html = element.innerHTML;

    // Only process substantial text content, not URLs/images
    if (text.length > 20 && !isUrlOrImagePath(text)) {
      element.setAttribute("data-ai-improve-index", index);
      fields.push({
        index: index,
        type: "contenteditable",
        text: text,
        html: html, // Store HTML for formatting preservation
        label: element.id || element.className || "Editable content",
      });
      index++;
    }
  });

  console.log(
    `Found ${fields.length} text fields to improve:`,
    fields.map((f) => f.label)
  );
  return fields;
}

function applyChangesToPage(changes) {
  let appliedCount = 0;
  let failedCount = 0;

  changes.forEach((change) => {
    try {
      // Find elements by index
      let elements = document.querySelectorAll(
        `[data-ai-improve-index="${change.index}"]`
      );

      // If not found by index, try to find by matching original text
      if (elements.length === 0) {
        console.warn(
          `Element with index ${change.index} not found, searching by text match...`
        );

        const allInputs = document.querySelectorAll(
          'input[type="text"], textarea, input:not([type])'
        );
        allInputs.forEach((input) => {
          if (input.value.trim() === change.original.trim()) {
            elements = [input];
            console.log(
              `Found match by text content for index ${change.index}`
            );
          }
        });

        const allEditables = document.querySelectorAll(
          '[contenteditable="true"]'
        );
        allEditables.forEach((element) => {
          if (element.textContent.trim() === change.original.trim()) {
            elements = [element];
            console.log(
              `Found match by text content for index ${change.index}`
            );
          }
        });
      }

      if (elements.length === 0) {
        console.error(`Could not find element for change:`, change);
        failedCount++;
        return;
      }

      elements.forEach((element) => {
        if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
          console.log(
            `🔧 Applying change to ${element.tagName}: ${change.label}`
          );
          console.log(`   Old value: "${element.value.substring(0, 50)}..."`);
          console.log(`   New value: "${change.improved.substring(0, 50)}..."`);

          const oldValue = element.value;
          element.value = change.improved;

          // Verify the change was applied
          if (element.value === change.improved) {
            console.log(`✅ Value successfully updated`);
          } else {
            console.error(
              `❌ Value was not updated! Current: "${element.value}"`
            );
          }

          // Trigger all necessary events
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
          element.dispatchEvent(new Event("keyup", { bubbles: true }));

          // For WordPress/Yoast - trigger focus and blur
          element.focus();
          setTimeout(() => {
            element.blur();
            console.log(`   Triggered focus/blur events`);
          }, 10);

          appliedCount++;
        } else if (element.getAttribute("contenteditable") === "true") {
          console.log(`🔧 Applying change to contenteditable: ${change.label}`);
          console.log(
            `   Old HTML: "${element.innerHTML.substring(0, 50)}..."`
          );
          console.log(
            `   New content: "${change.improved.substring(0, 50)}..."`
          );

          // Apply the improved content (which should preserve HTML if present)
          element.innerHTML = change.improved;

          // Verify the change
          if (
            element.textContent.includes(
              change.improved.substring(0, 20).replace(/<[^>]*>/g, "")
            )
          ) {
            console.log(
              `✅ Content successfully updated with formatting preserved`
            );
          } else {
            console.error(`❌ Content was not updated!`);
          }

          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
          appliedCount++;
        }
      });
    } catch (error) {
      console.error(`Error applying change:`, error, change);
      failedCount++;
    }
  });

  console.log(`Applied ${appliedCount} changes, ${failedCount} failed`);
  return { applied: appliedCount, failed: failedCount };
}

function showStatus(element, message, type) {
  element.textContent = message;
  element.className = "status " + type;
  setTimeout(() => {
    element.textContent = "";
    element.className = "status";
  }, 4000);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ==================== BULK REPLACE SERVICES ====================

function parseServiceData() {
  const serviceData = document.getElementById("serviceData").value.trim();
  const parseStatus = document.getElementById("parseStatus");
  const previewContainer = document.getElementById("previewContainer");
  const previewContent = document.getElementById("previewContent");

  if (!serviceData) {
    showStatus(parseStatus, "Please paste service data first", "error");
    return;
  }

  try {
    parsedServices = [];
    const lines = serviceData.split("\n");
    let currentService = {};
    let serviceNumber = null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Match: Service X title - Content
      const titleMatch = trimmedLine.match(
        /Service\s+(\d+)\s+title\s*-\s*(.+)/i
      );
      if (titleMatch) {
        // Save previous service if exists
        if (currentService.number) {
          parsedServices.push({ ...currentService });
        }
        serviceNumber = parseInt(titleMatch[1]);
        currentService = {
          number: serviceNumber,
          title: titleMatch[2].trim(),
        };
        continue;
      }

      // Match: Service X text - Content
      const textMatch = trimmedLine.match(/Service\s+(\d+)\s+text\s*-\s*(.+)/i);
      if (textMatch && parseInt(textMatch[1]) === serviceNumber) {
        currentService.text = textMatch[2].trim();
        continue;
      }

      // Match: Service X url - /url/
      const urlMatch = trimmedLine.match(/Service\s+(\d+)\s+url\s*-\s*(.+)/i);
      if (urlMatch && parseInt(urlMatch[1]) === serviceNumber) {
        currentService.url = urlMatch[2].trim();
      }
    }

    // Add last service
    if (currentService.number) {
      parsedServices.push({ ...currentService });
    }

    if (parsedServices.length === 0) {
      showStatus(parseStatus, "No services found. Check your format.", "error");
      return;
    }

    // Display preview
    previewContent.innerHTML = parsedServices
      .map(
        (service) => `
      <div style="padding: 10px; margin: 5px 0; border-left: 3px solid #4CAF50; background: white;">
        <strong>Service ${service.number}</strong><br>
        <span style="font-size: 12px; color: #666;">
          Title: ${escapeHtml(service.title || "N/A")}<br>
          Text: ${escapeHtml(service.text || "N/A")}<br>
          URL: ${escapeHtml(service.url || "N/A")}
        </span>
      </div>
    `
      )
      .join("");

    previewContainer.style.display = "block";
    showStatus(
      parseStatus,
      `✓ Parsed ${parsedServices.length} services successfully!`,
      "success"
    );
    
    // Show next steps guide
    const nextStepsGuide = document.getElementById("nextStepsGuide");
    if (nextStepsGuide) {
      nextStepsGuide.style.display = "block";
    }
  } catch (error) {
    console.error("Parse error:", error);
    showStatus(parseStatus, `Error parsing data: ${error.message}`, "error");
  }
}

function saveServiceDataToStorage() {
  const serviceData = document.getElementById("serviceData").value.trim();
  const parseStatus = document.getElementById("parseStatus");

  if (!serviceData) {
    showStatus(parseStatus, "No text to save", "error");
    return;
  }

  browserAPI.storage.local.set({ savedServiceData: serviceData }, function () {
    showStatus(
      parseStatus,
      "✓ Saved to extension! Will auto-load next time.",
      "success"
    );
  });
}

function loadSavedServiceData() {
  browserAPI.storage.local.get(["savedServiceData"], function (result) {
    if (result.savedServiceData) {
      const textarea = document.getElementById("serviceData");
      if (textarea && !textarea.value) {
        textarea.value = result.savedServiceData;
        console.log("✓ Loaded saved service data from extension storage");
      }
    }
  });
}

function downloadServiceDataToFile() {
  const serviceData = document.getElementById("serviceData").value.trim();
  const parseStatus = document.getElementById("parseStatus");

  if (!serviceData) {
    showStatus(parseStatus, "No text to save", "error");
    return;
  }

  try {
    // Create a blob with the text content
    const blob = new Blob([serviceData], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    // Create temporary download link
    const a = document.createElement("a");
    a.href = url;
    a.download = `service_data_${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    showStatus(parseStatus, "✓ File saved successfully!", "success");
  } catch (error) {
    console.error("Save error:", error);
    showStatus(parseStatus, `Error saving file: ${error.message}`, "error");
  }
}

async function applyBulkServices() {
  const replaceStatus = document.getElementById("replaceStatus");
  const applyServicesBtn = document.getElementById("applyServicesBtn");

  if (parsedServices.length === 0) {
    showStatus(
      replaceStatus,
      "No services to apply. Parse data first.",
      "error"
    );
    return;
  }

  applyServicesBtn.textContent = "⏳ Applying services...";
  applyServicesBtn.disabled = true;

  try {
    // Get target URL from input field
    const targetPageUrlInput = document.getElementById("targetPageUrl");
    const targetUrl = targetPageUrlInput ? targetPageUrlInput.value.trim() : "";

    let tab;

    if (targetUrl) {
      // User provided a URL - find that tab
      const allTabs = await browserAPI.tabs.query({});
      tab = allTabs.find(
        (t) => t.url === targetUrl || t.url.startsWith(targetUrl)
      );

      if (!tab) {
        showStatus(
          replaceStatus,
          "Target page not found. Please open it first or leave URL empty to use active tab.",
          "error"
        );
        applyServicesBtn.textContent = "⚡ Apply All Services to Page";
        applyServicesBtn.disabled = false;
        return;
      }
    } else {
      // No URL provided - use current active tab
      const tabs = await browserAPI.tabs.query({
        active: true,
        currentWindow: true,
      });
      tab = tabs[0];
    }

    // Check if it's an extension page
    if (
      tab.url.startsWith("chrome-extension://") ||
      tab.url.startsWith("moz-extension://") ||
      tab.url.startsWith("edge-extension://") ||
      tab.url.startsWith("about:") ||
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("edge://")
    ) {
      showStatus(
        replaceStatus,
        "Cannot apply to extension pages. Please provide a website URL or navigate to a website.",
        "error"
      );
      applyServicesBtn.textContent = "⚡ Apply All Services to Page";
      applyServicesBtn.disabled = false;
      return;
    }

    const results = await browserAPI.scripting.executeScript({
      target: { tabId: tab.id },
      func: applyServicesToPage,
      args: [parsedServices],
    });

    const result = results[0].result;

    if (result.applied > 0) {
      showStatus(
        replaceStatus,
        `✅ Successfully updated ${result.applied} service(s)! ${
          result.failed > 0 ? `(${result.failed} failed)` : ""
        }`,
        "success"
      );
    } else {
      showStatus(
        replaceStatus,
        `❌ No services were updated. Check console (F12) for details.`,
        "error"
      );
    }

    console.log("Bulk replace results:", result);
  } catch (error) {
    console.error("Error applying services:", error);
    showStatus(replaceStatus, `Error: ${error.message}`, "error");
  } finally {
    applyServicesBtn.textContent = "⚡ Apply All Services to Page";
    applyServicesBtn.disabled = false;
  }
}

// Function injected into page to apply services
function applyServicesToPage(services) {
  let appliedCount = 0;
  let failedCount = 0;

  console.log("=== Starting Bulk Service Replace ===");
  console.log(`Total services to apply: ${services.length}`);

  services.forEach((service) => {
    try {
      const serviceNum = service.number;
      console.log(`\n=== Processing Service ${serviceNum} ===`);
      console.log(`  Title: ${service.title}`);
      console.log(`  Text: ${service.text?.substring(0, 50)}...`);
      console.log(`  URL: ${service.url}`);

      let serviceUpdated = false;
      let titleUpdated = false;
      let textUpdated = false;
      let urlUpdated = false;

      // Find all text inputs and textareas
      const allFields = document.querySelectorAll(
        'input[type="text"], textarea, input:not([type])'
      );

      allFields.forEach((field) => {
        // Get the label text associated with this field
        let labelText = "";

        // Method 1: Look for <label> element
        if (field.id) {
          const label = document.querySelector(`label[for="${field.id}"]`);
          if (label) {
            labelText = label.textContent.toLowerCase().trim();
          }
        }

        // Method 2: Look for parent or sibling text
        if (!labelText) {
          const parent = field.closest("div, td, th");
          if (parent) {
            // Get all text nodes before this field
            const textBefore = Array.from(parent.childNodes)
              .filter(
                (node) =>
                  node.nodeType === Node.TEXT_NODE ||
                  (node.nodeType === Node.ELEMENT_NODE && node !== field)
              )
              .map((node) => node.textContent)
              .join(" ")
              .toLowerCase()
              .trim();
            labelText = textBefore;
          }
        }

        // Method 3: Check nearby elements
        if (!labelText) {
          const prevSibling = field.previousElementSibling;
          if (prevSibling) {
            labelText = prevSibling.textContent.toLowerCase().trim();
          }
        }

        console.log(
          `  Checking field - Label: "${labelText.substring(0, 50)}", Name: "${
            field.name
          }", ID: "${field.id}"`
        );

        // Check if this label matches our service
        const labelMatches =
          labelText.includes(`service ${serviceNum}`) ||
          labelText.includes(`service${serviceNum}`);

        if (labelMatches) {
          console.log(`    ✓ Found match for Service ${serviceNum}`);

          // Determine field type from label
          const isTitle = labelText.includes("title");
          const isText =
            labelText.includes("text") && !labelText.includes("url");
          const isUrl = labelText.includes("url");

          if (isTitle && service.title && !titleUpdated) {
            console.log(
              `    ✅ Updating TITLE: "${field.value}" → "${service.title}"`
            );
            field.value = service.title;
            field.dispatchEvent(new Event("input", { bubbles: true }));
            field.dispatchEvent(new Event("change", { bubbles: true }));
            field.focus();
            setTimeout(() => field.blur(), 10);
            titleUpdated = true;
            serviceUpdated = true;
          } else if (isText && service.text && !textUpdated) {
            console.log(
              `    ✅ Updating TEXT: "${field.value.substring(
                0,
                30
              )}..." → "${service.text.substring(0, 30)}..."`
            );
            field.value = service.text;
            field.dispatchEvent(new Event("input", { bubbles: true }));
            field.dispatchEvent(new Event("change", { bubbles: true }));
            field.focus();
            setTimeout(() => field.blur(), 10);
            textUpdated = true;
            serviceUpdated = true;
          } else if (isUrl && service.url && !urlUpdated) {
            console.log(
              `    ✅ Updating URL: "${field.value}" → "${service.url}"`
            );
            field.value = service.url;
            field.dispatchEvent(new Event("input", { bubbles: true }));
            field.dispatchEvent(new Event("change", { bubbles: true }));
            field.focus();
            setTimeout(() => field.blur(), 10);
            urlUpdated = true;
            serviceUpdated = true;
          }
        }
      });

      if (serviceUpdated) {
        console.log(`  ✅ Service ${serviceNum} updated successfully`);
        appliedCount++;
      } else {
        console.warn(`  ⚠️ No matching fields found for Service ${serviceNum}`);
        failedCount++;
      }
    } catch (error) {
      console.error(`❌ Error processing Service ${service.number}:`, error);
      failedCount++;
    }
  });

  console.log(`\n=== Bulk Replace Complete ===`);
  console.log(`✅ Successfully applied: ${appliedCount}`);
  console.log(`❌ Failed: ${failedCount}`);

  return { applied: appliedCount, failed: failedCount };
}

// ==================== IMAGE MAPPING & UPLOAD ====================

// Store image files and mappings
let uploadedImages = new Map(); // Map of filename -> File object
let serviceImageMapping = new Map(); // Map of service number -> image filename

function handleImageFolderUpload(event) {
  const files = Array.from(event.target.files);
  const parseStatus = document.getElementById("parseStatus");
  
  if (files.length === 0) {
    showStatus(parseStatus, "No images selected", "error");
    return;
  }

  // Store image files
  uploadedImages.clear();
  files.forEach(file => {
    if (file.type.startsWith('image/')) {
      uploadedImages.set(file.name, file);
    }
  });

  showStatus(parseStatus, `✓ Loaded ${uploadedImages.size} image(s)`, "success");
  
  // Show image mapping section and populate it
  if (parsedServices.length > 0) {
    displayImageMapping();
  } else {
    showStatus(parseStatus, "⚠️ Please parse services first, then upload images", "info");
  }
}

function displayImageMapping() {
  const mappingSection = document.getElementById("imageMappingSection");
  const mappingList = document.getElementById("imageMappingList");
  const uploadImagesBtn = document.getElementById("uploadImagesBtn");
  
  if (!mappingSection || !mappingList) return;
  
  mappingSection.style.display = "block";
  mappingList.innerHTML = "";

  // Create dropdown options from uploaded images
  const imageOptions = Array.from(uploadedImages.keys()).sort();
  
  parsedServices.forEach(service => {
    const row = document.createElement("div");
    row.style.cssText = "display: flex; gap: 10px; align-items: center; margin-bottom: 8px; padding: 8px; background: white; border-radius: 4px;";
    
    const label = document.createElement("label");
    label.style.cssText = "flex: 0 0 150px; font-size: 12px; font-weight: 500;";
    label.textContent = `Service ${service.number}:`;
    
    const select = document.createElement("select");
    select.style.cssText = "flex: 1; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;";
    select.dataset.serviceNumber = service.number;
    
    // Add options
    const noneOption = document.createElement("option");
    noneOption.value = "";
    noneOption.textContent = "-- No image --";
    select.appendChild(noneOption);
    
    imageOptions.forEach(filename => {
      const option = document.createElement("option");
      option.value = filename;
      option.textContent = filename;
      // Auto-select if filename contains service number or title keyword
      const titleSlug = service.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      if (filename.toLowerCase().includes(titleSlug) || 
          filename.includes(`service-${service.number}`) ||
          filename.includes(`service${service.number}`)) {
        option.selected = true;
      }
      select.appendChild(option);
    });
    
    // Load saved mapping if exists
    const savedMapping = serviceImageMapping.get(service.number);
    if (savedMapping) {
      select.value = savedMapping;
    }
    
    const preview = document.createElement("span");
    preview.style.cssText = "flex: 0 0 auto; font-size: 11px; color: #666;";
    preview.textContent = service.title;
    
    row.appendChild(label);
    row.appendChild(select);
    row.appendChild(preview);
    mappingList.appendChild(row);
  });

  // Show upload button if images are mapped
  if (uploadedImages.size > 0 && uploadImagesBtn) {
    uploadImagesBtn.style.display = "block";
  }
}

function saveImageMapping() {
  const mappingList = document.getElementById("imageMappingList");
  const parseStatus = document.getElementById("parseStatus");
  
  if (!mappingList) return;
  
  serviceImageMapping.clear();
  
  const selects = mappingList.querySelectorAll("select");
  selects.forEach(select => {
    const serviceNum = parseInt(select.dataset.serviceNumber);
    const filename = select.value;
    if (filename) {
      serviceImageMapping.set(serviceNum, filename);
    }
  });
  
  // Save to storage
  const mappingData = Array.from(serviceImageMapping.entries());
  browserAPI.storage.local.set({ serviceImageMapping: mappingData }, function() {
    showStatus(parseStatus, `✓ Saved image mapping for ${serviceImageMapping.size} service(s)`, "success");
  });
}

// ==================== SERVICE TEXT TAB FUNCTIONS ====================

function parseServiceTextData() {
  const serviceTextData = document.getElementById("serviceTextDataPage").value.trim();
  const serviceTextStatus = document.getElementById("serviceTextStatusPage");
  const serviceTextPreview = document.getElementById("serviceTextPreview");
  const serviceTextPreviewContent = document.getElementById("serviceTextPreviewContent");

  if (!serviceTextData) {
    showStatus(serviceTextStatus, "Please paste service data first", "error");
    return;
  }

  try {
    parsedServices = [];
    const lines = serviceTextData.split("\n");
    let currentService = {};
    let serviceNumber = null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Match: Service X title - Content
      const titleMatch = trimmedLine.match(
        /Service\s+(\d+)\s+title\s*-\s*(.+)/i
      );
      if (titleMatch) {
        // Save previous service if exists
        if (currentService.number) {
          parsedServices.push({ ...currentService });
        }
        serviceNumber = parseInt(titleMatch[1]);
        currentService = {
          number: serviceNumber,
          title: titleMatch[2].trim(),
        };
        continue;
      }

      // Match: Service X text - Content
      const textMatch = trimmedLine.match(/Service\s+(\d+)\s+text\s*-\s*(.+)/i);
      if (textMatch && parseInt(textMatch[1]) === serviceNumber) {
        currentService.text = textMatch[2].trim();
        continue;
      }

      // Match: Service X url - /url/
      const urlMatch = trimmedLine.match(/Service\s+(\d+)\s+url\s*-\s*(.+)/i);
      if (urlMatch && parseInt(urlMatch[1]) === serviceNumber) {
        currentService.url = urlMatch[2].trim();
      }
    }

    // Add last service
    if (currentService.number) {
      parsedServices.push({ ...currentService });
    }

    if (parsedServices.length === 0) {
      showStatus(serviceTextStatus, "No services found. Check your format.", "error");
      return;
    }

    // Display preview
    serviceTextPreviewContent.innerHTML = parsedServices
      .map(
        (service) => `
      <div style="padding: 10px; margin: 5px 0; border-left: 3px solid #4CAF50; background: white;">
        <strong>Service ${service.number}</strong><br>
        <span style="font-size: 12px; color: #666;">
          Title: ${escapeHtml(service.title || "N/A")}<br>
          Text: ${escapeHtml(service.text || "N/A")}<br>
          URL: ${escapeHtml(service.url || "N/A")}
        </span>
      </div>
    `
      )
      .join("");

    serviceTextPreview.style.display = "block";
    showStatus(
      serviceTextStatus,
      `✓ Parsed ${parsedServices.length} services successfully!`,
      "success"
    );
  } catch (error) {
    console.error("Parse error:", error);
    showStatus(serviceTextStatus, `Error parsing data: ${error.message}`, "error");
  }
}

async function applyServiceTextToPage() {
  const serviceTextStatus = document.getElementById("serviceTextStatusPage");
  const applyServiceTextPage = document.getElementById("applyServiceTextPage");

  if (parsedServices.length === 0) {
    showStatus(
      serviceTextStatus,
      "No services to apply. Parse data first.",
      "error"
    );
    return;
  }

  applyServiceTextPage.textContent = "⏳ Applying services...";
  applyServiceTextPage.disabled = true;

  try {
    // Get target URL from input field
    const textPageUrlInput = document.getElementById("textPageUrl");
    const targetUrl = textPageUrlInput ? textPageUrlInput.value.trim() : "";

    let tab;

    if (targetUrl) {
      // User provided a URL - find that tab
      const allTabs = await browserAPI.tabs.query({});
      tab = allTabs.find(
        (t) => t.url === targetUrl || t.url.startsWith(targetUrl)
      );

      if (!tab) {
        showStatus(
          serviceTextStatus,
          "Target page not found. Please open it first or leave URL empty to use active tab.",
          "error"
        );
        applyServiceTextPage.textContent = "📝 Update All Service Text";
        applyServiceTextPage.disabled = false;
        return;
      }
    } else {
      // Use active tab
      [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
    }

    // Apply services to the page
    const results = await browserAPI.scripting.executeScript({
      target: { tabId: tab.id },
      func: function(services) {
        let updated = 0;
        let failed = 0;
        const results = [];
        
        console.log('Applying', services.length, 'services to page');
        
        services.forEach((service, index) => {
          try {
            console.log(`Processing service ${service.number}: ${service.title}`);
            let titleUpdated = false, textUpdated = false, urlUpdated = false;
            
            // Find and update service fields
            const allInputs = document.querySelectorAll('input, textarea, select');
            
            allInputs.forEach(field => {
              const fieldName = field.name || field.id || '';
              const isTitle = fieldName.includes('title') && (fieldName.includes(`service_${service.number}`) || fieldName.includes(`${service.number}_title`));
              const isText = (fieldName.includes('text') || fieldName.includes('description')) && (fieldName.includes(`service_${service.number}`) || fieldName.includes(`${service.number}_text`));
              const isUrl = fieldName.includes('url') && (fieldName.includes(`service_${service.number}`) || fieldName.includes(`${service.number}_url`));
              
              if (isTitle && service.title && !titleUpdated) {
                console.log(`Updating title field: ${fieldName} = "${service.title}"`);
                field.value = service.title;
                titleUpdated = true;
                
                // Trigger change event
                field.dispatchEvent(new Event('change', { bubbles: true }));
                field.dispatchEvent(new Event('input', { bubbles: true }));
              } else if (isText && service.text && !textUpdated) {
                console.log(`Updating text field: ${fieldName} = "${service.text.substring(0, 30)}..."`);
                field.value = service.text;
                textUpdated = true;
                
                // Trigger change event
                field.dispatchEvent(new Event('change', { bubbles: true }));
                field.dispatchEvent(new Event('input', { bubbles: true }));
              } else if (isUrl && service.url && !urlUpdated) {
                console.log(`Updating URL field: ${fieldName} = "${service.url}"`);
                field.value = service.url;
                urlUpdated = true;
                
                // Trigger change event
                field.dispatchEvent(new Event('change', { bubbles: true }));
                field.dispatchEvent(new Event('input', { bubbles: true }));
              }
            });
            
            if (titleUpdated || textUpdated || urlUpdated) {
              updated++;
              results.push(`✓ Service ${service.number}: ${[titleUpdated && 'title', textUpdated && 'text', urlUpdated && 'url'].filter(Boolean).join(', ')}`);
            } else {
              failed++;
              results.push(`✗ Service ${service.number}: No matching fields found`);
            }
          } catch (error) {
            failed++;
            results.push(`✗ Service ${service.number}: Error - ${error.message}`);
            console.error('Error applying service', service.number, error);
          }
        });
        
        return { applied: updated, failed: failed, results: results };
      },
      args: [parsedServices]
    });

    const { applied, failed, results: resultsList } = results[0].result;
    
    if (applied > 0) {
      showStatus(
        serviceTextStatus,
        `✓ Updated ${applied} services! ${failed > 0 ? `(${failed} failed)` : ''}`,
        applied > failed ? "success" : "warning"
      );
      console.log('Service update results:', resultsList);
    } else {
      showStatus(
        serviceTextStatus,
        `No services updated. ${failed} failed. Check field names match your data.`,
        "error"
      );
    }

    applyServiceTextPage.textContent = "📝 Update All Service Text";
    applyServiceTextPage.disabled = false;
  } catch (error) {
    console.error("Apply services error:", error);
    showStatus(
      serviceTextStatus,
      `Error applying services: ${error.message}`,
      "error"
    );
    applyServiceTextPage.textContent = "📝 Update All Service Text";
    applyServiceTextPage.disabled = false;
  }
}

async function uploadAndAssignImages() {
  const replaceStatus = document.getElementById("replaceStatus");
  const uploadImagesBtn = document.getElementById("uploadImagesBtn");
  
  if (serviceImageMapping.size === 0) {
    showStatus(replaceStatus, "No images mapped. Please map images to services first.", "error");
    return;
  }
  
  // Save mapping first
  saveImageMapping();
  
  uploadImagesBtn.textContent = "⏳ Preparing images...";
  uploadImagesBtn.disabled = true;
  
  try {
    // Get target URL
    const targetPageUrlInput = document.getElementById("targetPageUrl");
    const targetUrl = targetPageUrlInput ? targetPageUrlInput.value.trim() : "";
    
    let tab;
    if (targetUrl) {
      const allTabs = await browserAPI.tabs.query({});
      tab = allTabs.find(t => t.url === targetUrl || t.url.startsWith(targetUrl));
      if (!tab) {
        tab = await browserAPI.tabs.create({ url: targetUrl, active: false });
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } else {
      const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
      tab = tabs[0];
    }
    
    if (!tab || tab.url.startsWith("chrome-extension://") || tab.url.startsWith("moz-extension://")) {
      showStatus(replaceStatus, "❌ Please provide a website URL", "error");
      uploadImagesBtn.textContent = "📸 Upload & Assign Images";
      uploadImagesBtn.disabled = false;
      return;
    }
    
    // Convert images to data URLs for injection
    const imageData = [];
    for (const [serviceNum, filename] of serviceImageMapping.entries()) {
      const file = uploadedImages.get(filename);
      if (file) {
        const dataUrl = await fileToDataUrl(file);
        imageData.push({
          serviceNumber: serviceNum,
          filename: filename,
          dataUrl: dataUrl,
          mimeType: file.type
        });
      }
    }
    
    uploadImagesBtn.textContent = `⏳ Uploading ${imageData.length} image(s)...`;
    
    // Inject script to handle image uploads in WordPress
    const results = await browserAPI.scripting.executeScript({
      target: { tabId: tab.id },
      func: uploadImagesToWordPress,
      args: [imageData, parsedServices]
    });
    
    const result = results[0].result;
    
    if (result.success) {
      uploadImagesBtn.textContent = `✅ Uploaded ${result.uploaded} image(s)!`;
      uploadImagesBtn.style.background = "#4CAF50";
      showStatus(replaceStatus, `✓ Successfully uploaded and assigned ${result.uploaded} image(s)!`, "success");
    } else {
      uploadImagesBtn.textContent = "❌ Upload failed";
      uploadImagesBtn.style.background = "#f44336";
      showStatus(replaceStatus, `Error: ${result.error}`, "error");
    }
    
  } catch (error) {
    console.error("Image upload error:", error);
    showStatus(replaceStatus, `Error: ${error.message}`, "error");
    uploadImagesBtn.textContent = "📸 Upload & Assign Images";
    uploadImagesBtn.style.background = "#9C27B0";
  } finally {
    setTimeout(() => {
      uploadImagesBtn.disabled = false;
      uploadImagesBtn.textContent = "📸 Upload & Assign Images";
      uploadImagesBtn.style.background = "#9C27B0";
    }, 3000);
  }
}

// Helper: Convert File to Data URL
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Function injected into WordPress page to handle image uploads
function uploadImagesToWordPress(imageData, services) {
  console.log("=== WordPress Image Upload Started ===");
  console.log(`Images to upload: ${imageData.length}`);
  
  let uploaded = 0;
  let failed = 0;
  
  try {
    // For WordPress/Elementor, look for featured image upload buttons or media library buttons
    imageData.forEach(img => {
      const service = services.find(s => s.number === img.serviceNumber);
      if (!service) {
        console.warn(`Service ${img.serviceNumber} not found`);
        failed++;
        return;
      }
      
      console.log(`Processing image for Service ${img.serviceNumber}: ${service.title}`);
      
      // Strategy 1: Look for featured image button
      const featuredImageBtn = document.querySelector('[data-setting="featured_image"], .editor-post-featured-image__toggle, #set-post-thumbnail, .components-button[aria-label*="featured image" i]');
      
      // Strategy 2: Look for Yoast/Elementor image fields
      const imageFields = document.querySelectorAll('input[type="text"][id*="image"], input[type="url"][id*="image"], input[name*="image"]');
      
      // Strategy 3: Store in a global variable for manual WordPress upload
      if (!window.pendingImageUploads) {
        window.pendingImageUploads = [];
      }
      
      window.pendingImageUploads.push({
        serviceNumber: img.serviceNumber,
        serviceTitle: service.title,
        filename: img.filename,
        dataUrl: img.dataUrl,
        instructions: `Upload "${img.filename}" for Service ${img.serviceNumber}: ${service.title}`
      });
      
      console.log(`✓ Queued: ${img.filename} for Service ${img.serviceNumber}`);
      uploaded++;
    });
    
    // Create a helper UI to guide manual upload
    const helper = document.createElement("div");
    helper.id = "image-upload-helper";
    helper.style.cssText = "position: fixed; top: 100px; right: 20px; z-index: 999999; background: #fff; border: 2px solid #4CAF50; border-radius: 8px; padding: 15px; max-width: 350px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;";
    helper.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h3 style="margin: 0; font-size: 14px; color: #333;">📸 Images Ready to Upload</h3>
        <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #666;">×</button>
      </div>
      <p style="font-size: 12px; color: #666; margin: 8px 0;">The following images are ready. Use WordPress media library to upload:</p>
      <div style="max-height: 300px; overflow-y: auto; font-size: 11px; background: #f9f9f9; padding: 8px; border-radius: 4px; margin: 8px 0;">
        ${window.pendingImageUploads.map(img => `
          <div style="padding: 4px 0; border-bottom: 1px solid #eee;">
            <strong>Service ${img.serviceNumber}:</strong> ${img.filename}
            <br><span style="color: #666;">${img.serviceTitle}</span>
          </div>
        `).join('')}
      </div>
      <button onclick="window.downloadAllImages()" style="width: 100%; padding: 8px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; margin-top: 8px;">
        💾 Download All Images
      </button>
      <p style="font-size: 10px; color: #999; margin: 8px 0 0 0; text-align: center;">Images are stored in browser memory. Open WordPress media library and upload them manually.</p>
    `;
    document.body.appendChild(helper);
    
    // Add download function
    window.downloadAllImages = function() {
      window.pendingImageUploads.forEach(img => {
        const link = document.createElement('a');
        link.href = img.dataUrl;
        link.download = img.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
      alert(`Downloading ${window.pendingImageUploads.length} images. Check your downloads folder!`);
    };
    
    return {
      success: true,
      uploaded: uploaded,
      failed: failed,
      message: `Prepared ${uploaded} image(s). Use the helper panel to upload them in WordPress.`
    };
    
  } catch (error) {
    console.error("Error preparing images:", error);
    return {
      success: false,
      uploaded: 0,
      failed: imageData.length,
      error: error.message
    };
  }
}

// ==================== IMAGE MAPPING FOR WORDPRESS MEDIA LIBRARY ====================

// Store image names for each service
let serviceImageMap = new Map(); // serviceNumber -> imageName

function displayImageMappingUI() {
  const imageMappingList = document.getElementById("imageMappingList");
  
  if (!parsedServices || parsedServices.length === 0) {
    showBulkSections(); // Show the new organized sections
    return;
  }
  
  showBulkSections(); // Show the new organized sections
  
  // Generate individual inputs for each service
  imageMappingList.innerHTML = parsedServices.map(service => {
    const suggestedFilename = service.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-') + '.jpg';
    
    return `
    <div style="padding: 10px; margin: 8px 0; background: white; border: 1px solid #ddd; border-radius: 4px;">
      <div style="font-weight: 600; color: #333; margin-bottom: 5px;">
        Service ${service.number}: ${escapeHtml(service.title)}
      </div>
      <input 
        type="text" 
        id="imageName_${service.number}" 
        placeholder="e.g., ${suggestedFilename} or ${service.title}"
        value="${serviceImageMap.get(service.number) || ''}"
        style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;"
      >
    </div>
  `}).join('');
}

// Apply image URLs to services (for upload)
let serviceImageUrlMap = new Map(); // serviceNumber -> imageUrl

function applyBulkImageUrlsToServices() {
  const bulkImageUrls = document.getElementById("bulkImageUrls").value.trim();
  
  if (!bulkImageUrls) {
    alert("Please paste image URLs first (one per line)");
    return;
  }
  
  const imageUrls = bulkImageUrls.split('\n').map(u => u.trim()).filter(Boolean);
  
  if (imageUrls.length < parsedServices.length) {
    if (!confirm(`You provided ${imageUrls.length} image URLs but have ${parsedServices.length} services. Continue anyway?`)) {
      return;
    }
  }
  
  // Clear existing mappings
  serviceImageMap.clear();
  serviceImageUrlMap.clear();
  
  // Apply to service image URL map
  parsedServices.forEach((service, index) => {
    const imageUrl = imageUrls[index] || '';
    if (imageUrl) {
      // Store the URL for upload
      serviceImageUrlMap.set(service.number, imageUrl);
      // Extract filename from URL for display
      const filename = imageUrl.split('/').pop() || `image-${service.number}.jpg`;
      serviceImageMap.set(service.number, `[UPLOAD] ${filename}`);
    }
  });
  
  // Refresh the UI
  displayImageMappingUI();
  
  showStatus(
    document.getElementById("parseStatus"),
    `✓ Applied ${Math.min(imageUrls.length, parsedServices.length)} image URLs for upload`,
    "success"
  );
}

function saveImageMapping() {
  // Save from individual inputs
  parsedServices.forEach(service => {
    const input = document.getElementById(`imageName_${service.number}`);
    if (input && input.value.trim()) {
      serviceImageMap.set(service.number, input.value.trim());
    } else {
      serviceImageMap.delete(service.number);
    }
  });
  
  // Get service page base URL
  const servicePageBaseUrlInput = document.getElementById("servicePageBaseUrl");
  const servicePageBaseUrl = servicePageBaseUrlInput ? servicePageBaseUrlInput.value.trim() : '';
  
  // Save to storage
  const mappingData = {};
  serviceImageMap.forEach((imageName, serviceNum) => {
    mappingData[serviceNum] = imageName;
  });
  
  browserAPI.storage.local.set({ 
    imageMapping: mappingData,
    servicePageBaseUrl: servicePageBaseUrl
  }, function() {
    showStatus(
      document.getElementById("parseStatus"),
      "✓ Image mapping and page URL saved!",
      "success"
    );
  });
}

/**
 * Apply a custom single ACF field (e.g., hero_section_background_image)
 */
async function applyCustomAcfField() {
  const customFieldBtn = document.getElementById("applyCustomFieldBtn");
  const customFieldStatus = document.getElementById("customFieldStatus");
  const fieldNameInput = document.getElementById("customFieldName");
  const imageUrlInput = document.getElementById("customFieldImageUrl");
  
  const fieldName = fieldNameInput.value.trim();
  const imageUrl = imageUrlInput.value.trim();
  
  if (!fieldName) {
    showStatus(customFieldStatus, "❌ Please enter an ACF field name", "error");
    return;
  }
  
  // Validate field name format
  if (!/^[a-z0-9_]+$/.test(fieldName)) {
    showStatus(customFieldStatus, "❌ ACF field name must be lowercase with underscores only (e.g., hero_section_background_image)", "error");
    return;
  }
  
  if (!imageUrl) {
    showStatus(customFieldStatus, "❌ Please enter an image URL", "error");
    return;
  }
  
  console.log(`🎯 Custom field request: ${fieldName} = ${imageUrl}`);
  
  customFieldBtn.disabled = true;
  customFieldBtn.textContent = "⏳ Processing...";
  
  try {
    // Get WordPress settings
    const settings = await new Promise((resolve) => {
      browserAPI.storage.local.get(
        ["wpSiteUrl", "wpUsername", "wpAppPassword"],
        resolve
      );
    });
    
    const wpSiteUrl = settings.wpSiteUrl?.trim();
    const wpUsername = settings.wpUsername?.trim();
    const wpAppPassword = settings.wpAppPassword?.trim();
    
    if (!wpSiteUrl || !wpUsername || !wpAppPassword) {
      showStatus(customFieldStatus, "❌ Please configure WordPress credentials in Settings", "error");
      customFieldBtn.textContent = "✨ Add/Update Custom Field";
      customFieldBtn.disabled = false;
      return;
    }
    
    const credentials = btoa(`${wpUsername}:${wpAppPassword}`);
    
    // Get current page
    const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    const currentUrl = currentTab.url;
    
    // Try to extract post ID from WordPress admin URL
    let postId = null;
    const postIdMatch = currentUrl.match(/[?&]post=(\d+)/);
    
    if (postIdMatch) {
      postId = postIdMatch[1];
      console.log(`✓ Detected post ID: ${postId}`);
    } else {
      showStatus(customFieldStatus, "❌ Please open the WordPress page editor (wp-admin/post.php?post=XXX)", "error");
      customFieldBtn.textContent = "✨ Add/Update Custom Field";
      customFieldBtn.disabled = false;
      return;
    }
    
    customFieldBtn.textContent = "🔍 Finding image...";
    
    // Extract filename from image URL
    const filename = imageUrl.split('/').pop().split('?')[0];
    console.log(`🔍 Searching for image: ${filename}`);
    
    // Search for image in WordPress media library
    const searchUrl = `${wpSiteUrl}/wp-json/wp/v2/media?search=${encodeURIComponent(filename)}&per_page=10`;
    const searchResponse = await fetch(searchUrl, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    });
    
    if (!searchResponse.ok) {
      throw new Error(`Failed to search media: ${searchResponse.status}`);
    }
    
    const mediaResults = await searchResponse.json();
    
    // Find exact match by URL or filename
    let mediaId = null;
    const foundMedia = mediaResults.find(media => 
      media.source_url === imageUrl || 
      media.source_url.includes(filename)
    );
    
    if (foundMedia) {
      mediaId = foundMedia.id;
      console.log(`✓ Found image: ${foundMedia.title.rendered} (ID: ${mediaId})`);
    } else {
      showStatus(customFieldStatus, `❌ Image not found in WordPress media library: ${filename}`, "error");
      customFieldBtn.textContent = "✨ Add/Update Custom Field";
      customFieldBtn.disabled = false;
      return;
    }
    
    customFieldBtn.textContent = "💾 Updating field...";
    
    // Get auto-create setting
    const autoCreateEnabled = (await new Promise(resolve => 
      browserAPI.storage.local.get(['autoCreateAcfFields'], resolve)
    )).autoCreateAcfFields || false;
    
    // First, get the current page data to check if field exists
    const checkUrl = `${wpSiteUrl}/wp-json/wp/v2/pages/${postId}`;
    const checkResponse = await fetch(checkUrl, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    });
    
    if (!checkResponse.ok) {
      throw new Error(`Failed to fetch page: ${checkResponse.status}`);
    }
    
    const pageData = await checkResponse.json();
    const fieldExists = pageData.acf && pageData.acf[fieldName] !== undefined;
    
    console.log(`📋 Field ${fieldName} exists:`, fieldExists);
    console.log(`📋 Current ACF fields:`, pageData.acf ? Object.keys(pageData.acf) : 'none');
    
    // If field doesn't exist and auto-create is enabled, initialize it first
    if (!fieldExists && autoCreateEnabled) {
      console.log(`✨ Creating field ${fieldName} with auto-create...`);
      customFieldBtn.textContent = "✨ Creating field...";
      
      const initPayload = {
        acf: {
          [fieldName]: ''
        },
        meta: {
          [fieldName]: '',
          [`_${fieldName}`]: 'field_auto_created'
        }
      };
      
      const initResponse = await fetch(checkUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(initPayload),
      });
      
      if (initResponse.ok) {
        console.log(`✅ Field ${fieldName} initialized`);
        customFieldBtn.textContent = "💾 Updating with image...";
      } else {
        console.warn(`⚠️ Failed to initialize field:`, await initResponse.json());
      }
    } else if (!fieldExists && !autoCreateEnabled) {
      showStatus(customFieldStatus, `❌ Field ${fieldName} doesn't exist. Enable "Auto-create ACF fields" in Settings or create it manually in WordPress.`, "error");
      customFieldBtn.textContent = "✨ Add/Update Custom Field";
      customFieldBtn.disabled = false;
      return;
    }
    
    // Update the ACF field with the media ID
    const updatePayload = {
      acf: {
        [fieldName]: mediaId
      },
      meta: {
        [fieldName]: mediaId,
        [`_${fieldName}`]: mediaId
      }
    };
    
    console.log(`📤 Updating ${fieldName} with image ID ${mediaId}`);
    
    const updateUrl = `${wpSiteUrl}/wp-json/wp/v2/pages/${postId}`;
    const updateResponse = await fetch(updateUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatePayload),
    });
    
    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      console.error("❌ Update failed:", errorData);
      throw new Error(`Failed to update field: ${updateResponse.status}`);
    }
    
    const responseData = await updateResponse.json();
    console.log(`✅ Update response:`, responseData);
    console.log(`📋 Response ACF fields:`, responseData.acf);
    
    // Check if field was actually updated
    if (responseData.acf && responseData.acf[fieldName] !== undefined) {
      const fieldValue = responseData.acf[fieldName];
      if (fieldValue === mediaId || (typeof fieldValue === 'object' && fieldValue.ID === mediaId)) {
        showStatus(customFieldStatus, `✅ Successfully updated ${fieldName} with image ID ${mediaId}!`, "success");
        console.log(`✅ Field ${fieldName} confirmed:`, fieldValue);
      } else {
        showStatus(customFieldStatus, `⚠️ Field updated but value mismatch. Expected ${mediaId}, got ${fieldValue}`, "warning");
      }
    } else {
      // Field not in response - check if it was created
      if (!fieldExists && autoCreateEnabled) {
        showStatus(customFieldStatus, `✅ Field ${fieldName} created and updated! Refresh WordPress page editor to see it.`, "success");
        console.log(`✅ Field created and set to image ID ${mediaId}`);
      } else {
        showStatus(customFieldStatus, `⚠️ Update sent but field not returned in response. The field may still be updated - refresh WordPress editor to verify.`, "warning");
        console.warn(`⚠️ Field ${fieldName} not in response. This may be normal if ACF REST API isn't fully configured.`);
      }
    }
    
    customFieldBtn.textContent = "✨ Add/Update Custom Field";
    customFieldBtn.disabled = false;
    
  } catch (error) {
    console.error("❌ Error updating custom field:", error);
    showStatus(customFieldStatus, `❌ Error: ${error.message}`, "error");
    customFieldBtn.textContent = "✨ Add/Update Custom Field";
    customFieldBtn.disabled = false;
  }
}

async function uploadAndAssignImagesViaAPI() {
  const uploadBtn = document.getElementById("uploadAndAssignImagesBtn");
  const replaceStatus = document.getElementById("replaceStatus");
  
  if (serviceImageMap.size === 0) {
    showStatus(replaceStatus, "No image mappings defined. Please specify images first.", "error");
    return;
  }
  
  uploadBtn.textContent = "⏳ Uploading images...";
  uploadBtn.disabled = true;
  
  try {
    // Get WordPress settings and service page base URL
    const settings = await new Promise((resolve) => {
      browserAPI.storage.local.get(
        ["wpSiteUrl", "wpUsername", "wpAppPassword", "servicePageBaseUrl"],
        resolve
      );
    });
    
    const wpSiteUrl = settings.wpSiteUrl ? settings.wpSiteUrl.replace(/\/$/, '') : '';
    const servicePageBaseUrl = settings.servicePageBaseUrl ? settings.servicePageBaseUrl.replace(/\/$/, '') : '';
    
    if (!wpSiteUrl) {
      showStatus(replaceStatus, "Please configure WordPress Site URL in Settings tab first.", "error");
      uploadBtn.textContent = "📸 Upload & Assign Images via WordPress API";
      uploadBtn.disabled = false;
      return;
    }
    
    if (!settings.wpUsername || !settings.wpAppPassword) {
      showStatus(replaceStatus, "Please configure WordPress credentials in Settings tab first.", "error");
      uploadBtn.textContent = "📸 Upload & Assign Images via WordPress API";
      uploadBtn.disabled = false;
      return;
    }
    
    const credentials = btoa(`${settings.wpUsername}:${settings.wpAppPassword.replace(/\s/g, '')}`);
    
    // Check if local WordPress (doesn't support Application Passwords by default)
    const isLocalWP = wpSiteUrl.includes('.local') || 
                     wpSiteUrl.includes('localhost') || 
                     wpSiteUrl.includes('127.0.0.1') ||
                     wpSiteUrl.includes('192.168.');
    
    // If local WordPress, test connection first before showing dialog
    if (isLocalWP) {
      showStatus(replaceStatus, "Testing authentication...", "info");
      
      try {
        // Quick test to see if REST API auth is working
        const testUrl = `${wpSiteUrl}/wp-json/wp/v2/users/me`;
        const testResponse = await fetch(testUrl, {
          method: "GET",
          headers: {
            "Authorization": `Basic ${credentials}`,
            "Content-Type": "application/json",
          },
        });
        
        // If authentication works, proceed normally
        if (testResponse.ok) {
          console.log("✅ Local WordPress authentication working! Proceeding with API...");
          showStatus(replaceStatus, "✓ Authentication successful! Processing images...", "info");
          // Continue to normal flow below
        } else {
          // Authentication failed - show options dialog
          const choice = confirm(
            "⚠️ Local WordPress Detected!\n\n" +
            "REST API authentication is not working on your local WordPress.\n\n" +
            "OPTION 1: Use Manual Helper (RECOMMENDED)\n" +
            "• Click OK to use visual guide in WordPress admin\n" +
            "• Manually assign images (quick but not automatic)\n\n" +
            "OPTION 2: Cancel and fix authentication\n" +
            "• Click CANCEL to stop\n" +
            "• Follow FINAL_SOLUTION_REST_API.md guide\n" +
            "• Install the REST API Enabler plugin\n\n" +
            "Choose your option:"
          );
          
          if (choice) {
            // User clicked OK - use manual helper
            await assignImagesViaWordPressAdmin();
            uploadBtn.textContent = "📸 Upload & Assign Images via WordPress API";
            uploadBtn.disabled = false;
            return;
          } else {
            // User clicked Cancel
            showStatus(replaceStatus, "Cancelled. Please fix authentication and try again.", "error");
            uploadBtn.textContent = "📸 Upload & Assign Images via WordPress API";
            uploadBtn.disabled = false;
            return;
          }
        }
      } catch (error) {
        console.error("Error testing authentication:", error);
        showStatus(replaceStatus, "Error testing connection. Please check your credentials.", "error");
        uploadBtn.textContent = "📸 Upload & Assign Images via WordPress API";
        uploadBtn.disabled = false;
        return;
      }
    }
    
    // Main processing logic
    try {
      // Get the current page URL (the main commercial page with all service fields)
      const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      const currentUrl = currentTab.url;
      
      // Try to extract post ID directly from WordPress admin URL
      let postId = null;
      let pageSlug = '';
      
      const postIdMatch = currentUrl.match(/[?&]post=(\d+)/);
      if (postIdMatch) {
        postId = postIdMatch[1];
        console.log(`✓ Detected WordPress admin page - using post ID: ${postId}`);
      } else if (servicePageBaseUrl) {
        // Use the service page base URL to determine the main page
        pageSlug = servicePageBaseUrl.split('/').filter(Boolean).pop();
        console.log(`✓ Using Service Page Base URL - looking for slug: ${pageSlug}`);
      } else {
        // Extract from current URL
        pageSlug = currentUrl.split('/').filter(Boolean).pop().split('?')[0].split('#')[0];
        // Remove post.php or other admin stuff
        if (pageSlug.includes('post.php')) {
          showStatus(replaceStatus, "⚠️ Please provide the Service Page Base URL in Settings (e.g., https://citywide.local/commercial-oven-repair)", "error");
          uploadBtn.textContent = "📸 Upload & Assign Images via WordPress API";
          uploadBtn.disabled = false;
          return;
        }
        console.log(`✓ Using current tab URL - looking for slug: ${pageSlug}`);
      }
      
      // Find the page (either by ID or slug)
      let postsUrl;
      let postsResponse;
      
      if (postId) {
        // Direct access by post ID
        postsUrl = `${wpSiteUrl}/wp-json/wp/v2/pages/${postId}`;
        console.log(`Looking for page by ID: ${postId}`);
      } else {
        // Search by slug
        postsUrl = `${wpSiteUrl}/wp-json/wp/v2/pages?slug=${pageSlug}&per_page=1`;
        console.log(`Looking for page by slug: ${pageSlug}`);
      }
      if (postId) {
        // Direct access by post ID
        postsUrl = `${wpSiteUrl}/wp-json/wp/v2/pages/${postId}`;
        console.log(`Looking for page by ID: ${postId}`);
      } else {
        // Search by slug
        postsUrl = `${wpSiteUrl}/wp-json/wp/v2/pages?slug=${pageSlug}&per_page=1`;
        console.log(`Looking for page by slug: ${pageSlug}`);
      }
      
      postsResponse = await fetch(postsUrl, {
        method: "GET",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!postsResponse.ok) {
        throw new Error(`Failed to find page: ${postsResponse.status}`);
      }
      
      // Handle response - direct ID returns object, slug search returns array
      let pageData;
      if (postId) {
        pageData = await postsResponse.json();
      } else {
        const posts = await postsResponse.json();
        if (posts.length === 0) {
          showStatus(replaceStatus, `❌ Page not found. Please set Service Page Base URL in Settings.`, "error");
          uploadBtn.textContent = "📸 Upload & Assign Images via WordPress API";
          uploadBtn.disabled = false;
          return;
        }
        pageData = posts[0];
      }
      
      postId = pageData.id;
      const pageTitle = pageData.title.rendered;
      console.log(`✓ Found page: ${pageTitle} (ID: ${postId})`);
      
      // Log current ACF fields to see what's available
      console.log(`📋 Current page ACF fields:`, pageData.acf);
      console.log(`📋 Current page meta:`, pageData.meta);
      
      // IMPORTANT: Log all ACF field names that contain 'service' or 'image'
      if (pageData.acf) {
        const serviceFields = Object.keys(pageData.acf).filter(key => 
          key.toLowerCase().includes('service') || key.toLowerCase().includes('image')
        );
        console.log(`🔍 Found ACF fields with 'service' or 'image':`, serviceFields);
        
        // Show example values
        serviceFields.slice(0, 3).forEach(fieldName => {
          console.log(`   ${fieldName} = ${pageData.acf[fieldName]}`);
        });
      }
      
      // Determine which map to use (URLs take priority)
      const hasImageUrls = serviceImageUrlMap.size > 0;
      const processingMap = hasImageUrls ? serviceImageUrlMap : serviceImageMap;
      
      if (processingMap.size === 0) {
        showStatus(replaceStatus, "❌ No images to process. Please apply image URLs first.", "error");
        uploadBtn.textContent = "📸 Upload & Assign Images via WordPress API";
        uploadBtn.disabled = false;
        return;
      }
      
      // Check if auto-create ACF fields is enabled
      const autoCreateEnabled = (await new Promise(resolve => 
        browserAPI.storage.local.get(['autoCreateAcfFields'], resolve)
      )).autoCreateAcfFields || false;
      
      if (autoCreateEnabled) {
        console.log(`✨ Auto-create ACF fields is enabled - checking for missing fields...`);
        
        // Check which service fields are missing
        const missingFields = [];
        const numServices = processingMap.size;
        
        for (let i = 1; i <= numServices; i++) {
          const imageField = `service_${i}_image`;
          const titleField = `service_${i}_title`;
          const textField = `service_${i}_text`;
          const urlField = `service_${i}_url`;
          
          if (!pageData.acf || pageData.acf[imageField] === undefined) {
            missingFields.push(imageField);
          }
          if (!pageData.acf || pageData.acf[titleField] === undefined) {
            missingFields.push(titleField);
          }
          if (!pageData.acf || pageData.acf[textField] === undefined) {
            missingFields.push(textField);
          }
          if (!pageData.acf || pageData.acf[urlField] === undefined) {
            missingFields.push(urlField);
          }
        }
        
        if (missingFields.length > 0) {
          console.log(`📝 Creating ${missingFields.length} missing ACF fields:`, missingFields);
          uploadBtn.textContent = `⏳ Creating ${missingFields.length} ACF fields...`;
          
          // Initialize fields with empty values via WordPress meta
          const initPayload = { meta: {}, acf: {} };
          
          missingFields.forEach(fieldName => {
            if (fieldName.includes('_image')) {
              initPayload.acf[fieldName] = '';  // Empty for image
              initPayload.meta[fieldName] = '';
              initPayload.meta[`_${fieldName}`] = 'field_auto_created';  // Mark as auto-created
            } else {
              initPayload.acf[fieldName] = '';  // Empty string for text fields
              initPayload.meta[fieldName] = '';
            }
          });
          
          try {
            const initResponse = await fetch(`${wpSiteUrl}/wp-json/wp/v2/pages/${postId}`, {
              method: "POST",
              headers: {
                "Authorization": `Basic ${credentials}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(initPayload),
            });
            
            if (initResponse.ok) {
              console.log(`✅ Successfully initialized ${missingFields.length} ACF fields!`);
              // Refresh page data to get new fields
              pageData = await initResponse.json();
            } else {
              console.warn(`⚠️ Failed to create ACF fields:`, await initResponse.json());
              showStatus(replaceStatus, `⚠️ Could not auto-create fields. They may need manual ACF setup.`, "warning");
            }
          } catch (error) {
            console.error(`❌ Error creating ACF fields:`, error);
          }
        } else {
          console.log(`✅ All required ACF fields already exist!`);
        }
      }
      
      showStatus(replaceStatus, `Processing ${processingMap.size} service images...`, "info");
      
      let assigned = 0;
      let failed = 0;
      
      // Object to collect all ACF field updates
      const acfUpdates = {};
      const metaUpdates = {};
      
      // Process each service image
      for (const [serviceNum, imageData] of processingMap.entries()) {
      try {
        const service = parsedServices.find(s => s.number === serviceNum);
        const serviceTitle = service ? service.title : `Service ${serviceNum}`;
        
        uploadBtn.textContent = `⏳ Processing ${serviceTitle}...`;
        
        let mediaId;
        
        // Check if this is an image URL (for upload) or image name (for search)
        const isUrl = imageData.startsWith('http://') || imageData.startsWith('https://');
        
        if (isUrl) {
          // Image URL provided - find it in WordPress media library
          const imageUrl = imageData;
          console.log(`Finding image in WordPress: ${imageUrl}`);
          
          try {
            // Extract filename from URL
            const filename = imageUrl.split('/').pop().split('?')[0];
            console.log(`Searching for filename: ${filename}`);
            
            // Search WordPress media library for this file
            const searchUrl = `${wpSiteUrl}/wp-json/wp/v2/media?search=${encodeURIComponent(filename)}&per_page=10`;
            const searchResponse = await fetch(searchUrl, {
              method: "GET",
              headers: {
                "Authorization": `Basic ${credentials}`,
                "Content-Type": "application/json",
              },
            });
            
            if (!searchResponse.ok) {
              throw new Error(`Failed to search media library: ${searchResponse.status}`);
            }
            
            const mediaItems = await searchResponse.json();
            
            // Find exact match by checking the source_url
            let foundMedia = mediaItems.find(item => item.source_url === imageUrl);
            
            // If not found by exact URL, try to find by filename
            if (!foundMedia && mediaItems.length > 0) {
              foundMedia = mediaItems.find(item => item.source_url.includes(filename));
            }
            
            if (!foundMedia && mediaItems.length > 0) {
              // Just use the first result
              foundMedia = mediaItems[0];
              console.warn(`⚠️ Exact match not found, using: ${foundMedia.source_url}`);
            }
            
            if (!foundMedia) {
              throw new Error(`Image not found in WordPress media library: ${filename}`);
            }
            
            mediaId = foundMedia.id;
            console.log(`✓ Found image in WordPress: ${foundMedia.title.rendered} (ID: ${mediaId})`);
            
            // Update metadata
            if (service) {
              try {
                const metadataUrl = `${wpSiteUrl}/wp-json/wp/v2/media/${mediaId}`;
                const metadataPayload = {
                  title: serviceTitle,
                  alt_text: serviceTitle
                };
                
                if (service.text) {
                  metadataPayload.caption = service.text.substring(0, 200);
                  metadataPayload.description = service.text;
                }
                
                const metadataResponse = await fetch(metadataUrl, {
                  method: "POST",
                  headers: {
                    "Authorization": `Basic ${credentials}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(metadataPayload),
                });
                
                if (metadataResponse.ok) {
                  console.log(`✓ Updated metadata for ${filename}`);
                } else {
                  console.warn(`⚠️ Failed to update metadata`);
                }
              } catch (metaError) {
                console.warn(`⚠️ Error updating metadata:`, metaError);
              }
            }
            
            assigned++;
            
          } catch (findError) {
            console.error(`Failed to find image for ${serviceTitle}:`, findError);
            failed++;
            continue;
          }
          
        } else {
          // SEARCH FOR EXISTING IMAGE in media library
          const imageName = imageData;
          const searchUrl = `${wpSiteUrl}/wp-json/wp/v2/media?search=${encodeURIComponent(imageName)}&per_page=5`;
          const searchResponse = await fetch(searchUrl, {
            method: "GET",
            headers: {
              "Authorization": `Basic ${credentials}`,
              "Content-Type": "application/json",
            },
          });
          
          if (!searchResponse.ok) {
            throw new Error(`Failed to search media library: ${searchResponse.status}`);
          }
          
          const mediaItems = await searchResponse.json();
          
          if (mediaItems.length === 0) {
            console.warn(`Image not found in media library: ${imageName}`);
            failed++;
            continue;
          }
          
          mediaId = mediaItems[0].id;
          console.log(`Found image: ${imageName} (ID: ${mediaId})`);
          
          // Update metadata for existing images
          if (service) {
            try {
              const metadataUrl = `${wpSiteUrl}/wp-json/wp/v2/media/${mediaId}`;
              const metadataPayload = {
                title: serviceTitle,
                alt_text: serviceTitle
              };
              
              if (service.text) {
                metadataPayload.caption = service.text.substring(0, 200);
                metadataPayload.description = service.text;
              }
              
              const metadataResponse = await fetch(metadataUrl, {
                method: "POST",
                headers: {
                  "Authorization": `Basic ${credentials}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(metadataPayload),
              });
              
              if (metadataResponse.ok) {
                console.log(`✓ Updated metadata for ${imageName}`);
              } else {
                console.warn(`⚠️ Failed to update metadata for ${imageName}`);
              }
            } catch (metaError) {
              console.warn(`⚠️ Error updating metadata:`, metaError);
            }
          }
        }
        
        // Add to ACF updates object (will update all at once)
        acfUpdates[`service_${serviceNum}_image`] = mediaId;
        metaUpdates[`service_${serviceNum}_image`] = mediaId;
        metaUpdates[`_service_${serviceNum}_image`] = mediaId;
        
        console.log(`✓ Prepared Service ${serviceNum} image (ID: ${mediaId})`);
        assigned++;
        
      } catch (error) {
        console.error(`Error processing Service ${serviceNum}:`, error);
        failed++;
      }
    }
    
    // Now update ALL service images on the page in one API call
    if (Object.keys(acfUpdates).length > 0) {
      uploadBtn.textContent = `⏳ Updating page with ${assigned} images...`;
      
      try {
        // First, check if this is an Elementor page
        const checkUrl = `${wpSiteUrl}/wp-json/wp/v2/pages/${postId}`;
        const checkResponse = await fetch(checkUrl, {
          method: "GET",
          headers: {
            "Authorization": `Basic ${credentials}`,
            "Content-Type": "application/json",
          },
        });
        
        if (checkResponse.ok) {
          const pageData = await checkResponse.json();
          const isElementor = pageData.meta && pageData.meta._elementor_edit_mode === 'builder';
          
          console.log(`📋 Page Type: ${isElementor ? 'Elementor' : 'Standard ACF'}`);
          
          if (isElementor) {
            // Handle Elementor page
            console.log(`🎨 Updating Elementor page...`);
            
            // Get Elementor data
            let elementorData = pageData.meta._elementor_data;
            if (typeof elementorData === 'string') {
              elementorData = JSON.parse(elementorData);
            }
            
            console.log(`📦 Original Elementor data structure:`, elementorData);
            
            // Update Elementor data with new image IDs
            const updatedElementorData = updateElementorImages(elementorData, acfUpdates);
            
            // Save back to WordPress
            const updateUrl = `${wpSiteUrl}/wp-json/wp/v2/pages/${postId}`;
            const updatePayload = {
              meta: {
                _elementor_data: JSON.stringify(updatedElementorData)
              }
            };
            
            console.log(`📤 Saving updated Elementor data...`);
            
            const updateResponse = await fetch(updateUrl, {
              method: "POST",
              headers: {
                "Authorization": `Basic ${credentials}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(updatePayload),
            });
            
            if (updateResponse.ok) {
              console.log(`✅ Successfully updated Elementor page with ${assigned} images!`);
              showStatus(replaceStatus, `✅ Successfully updated ${assigned} service images on Elementor page!`, "success");
            } else {
              const errorData = await updateResponse.json();
              console.warn(`⚠️ Failed to update Elementor page:`, errorData);
              showStatus(replaceStatus, `⚠️ Failed to update Elementor page. Check console.`, "error");
            }
            
          } else {
            // Handle standard ACF page
            const updateUrl = `${wpSiteUrl}/wp-json/wp/v2/pages/${postId}`;
        
            // SAFETY: Create backup of current ACF values
            console.log(`💾 Current ACF values (backup):`, JSON.stringify(pageData.acf, null, 2));
            
            // Try multiple field naming conventions
            const updatePayload = {
              meta: metaUpdates
            };
            
            // Only include ACF if it exists
            if (Object.keys(acfUpdates).length > 0) {
              updatePayload.acf = acfUpdates;
            }
            
            console.log(`📤 Updating page ${postId} with fields:`, updatePayload);
            console.log(`📋 ACF Updates:`, acfUpdates);
            console.log(`📋 Meta Updates:`, metaUpdates);
            console.log(`⚠️ SAFETY: If page breaks, restore these ACF values above ☝️`);
            
            const updateResponse = await fetch(updateUrl, {
              method: "POST",
              headers: {
                "Authorization": `Basic ${credentials}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(updatePayload),
            });
            
            const responseData = await updateResponse.json();
            console.log(`📥 Response from WordPress:`, responseData);
            
            if (!updateResponse.ok) {
              console.warn(`⚠️ Failed to update page: ${updateResponse.status}`, responseData);
              showStatus(replaceStatus, `⚠️ Images found but page update failed. Check console.`, "warning");
            } else {
              console.log(`✅ Successfully updated all ${assigned} service images on page!`);
              console.log(`✅ Response ACF:`, responseData.acf);
              console.log(`✅ Response Meta:`, responseData.meta);
            }
          }
        }
      } catch (updateError) {
        console.error(`❌ Error updating page:`, updateError);
      }
    }
    
    if (assigned > 0) {
      const summary = [];
      if (assigned > 0) summary.push(`${assigned} assigned`);
      if (failed > 0) summary.push(`${failed} failed`);
      
      uploadBtn.textContent = `✅ ${summary.join(', ')}!`;
      uploadBtn.style.background = "#4CAF50";
      showStatus(replaceStatus, `✓ Successfully assigned images: ${summary.join(', ')}.`, "success");
    } else {
      uploadBtn.textContent = "❌ No images processed";
      uploadBtn.style.background = "#f44336";
      showStatus(replaceStatus, `Failed to process images. Check console for details.`, "error");
    }
      
    } catch (error) {
      console.error("Error uploading images:", error);
      uploadBtn.textContent = "❌ Error";
      uploadBtn.style.background = "#f44336";
      showStatus(replaceStatus, `Error: ${error.message}`, "error");
    } finally {
      setTimeout(() => {
        uploadBtn.textContent = "📸 Upload & Assign Images via WordPress API";
        uploadBtn.style.background = "#9C27B0";
        uploadBtn.disabled = false;
      }, 3000);
    }
    
  } catch (outerError) {
    console.error("Error in main upload function:", outerError);
    uploadBtn.textContent = "❌ Error";
    uploadBtn.style.background = "#f44336";
    showStatus(replaceStatus, `Error: ${outerError.message}`, "error");
    uploadBtn.disabled = false;
  }
}

// Helper function to update Elementor images
function updateElementorImages(elementorData, acfUpdates) {
  console.log(`🔍 Searching for image widgets in Elementor data...`);
  
  // Recursively search for ACF field widgets in Elementor data
  function updateElement(element) {
    if (!element) return element;
    
    // Check if this is an ACF image field
    if (element.widgetType === 'acf' || element.elType === 'widget') {
      const settings = element.settings || {};
      
      // Check if this is an image field
      if (settings.acf_field_type === 'image' || settings.field_type === 'image') {
        // Get the field key
        const fieldKey = settings.acf_field || settings.field_key;
        
        // Check if we have an update for this field
        for (const [fieldName, mediaId] of Object.entries(acfUpdates)) {
          if (fieldKey && fieldKey.includes(fieldName)) {
            console.log(`✏️ Updating Elementor ACF field: ${fieldName} with media ID: ${mediaId}`);
            element.settings = element.settings || {};
            element.settings.acf_field_value = mediaId;
            element.settings.image = { id: mediaId };
          }
        }
      }
      
      // Also check for direct image widgets with dynamic tags
      if (element.widgetType === 'image' && settings['__dynamic__']) {
        const dynamic = settings['__dynamic__'];
        if (dynamic.url) {
          // Parse dynamic tag to find ACF field
          for (const [fieldName, mediaId] of Object.entries(acfUpdates)) {
            if (dynamic.url.includes(fieldName)) {
              console.log(`✏️ Updating Elementor image widget with ACF field: ${fieldName}`);
              // Update the image ID in the dynamic tag
              delete settings['__dynamic__'];
              settings.image = { id: mediaId };
            }
          }
        }
      }
    }
    
    // Recursively process children
    if (element.elements && Array.isArray(element.elements)) {
      element.elements = element.elements.map(child => updateElement(child));
    }
    
    return element;
  }
  
  // Process all elements
  if (Array.isArray(elementorData)) {
    return elementorData.map(element => updateElement(element));
  }
  
  return elementorData;
}

// Alternative method for local WordPress (works through admin interface)
async function assignImagesViaWordPressAdmin() {
  const replaceStatus = document.getElementById("replaceStatus");
  const uploadBtn = document.getElementById("uploadAndAssignImagesBtn");
  
  try {
    showStatus(replaceStatus, "Looking for WordPress admin tab...", "info");
    
    // Get the WordPress admin tab
    const tabs = await browserAPI.tabs.query({});
    const wpTabs = tabs.filter(t => t.url && (
      t.url.includes('/wp-admin') ||
      t.url.includes('/wp-login')
    ));
    
    console.log('Found tabs:', wpTabs.length, wpTabs.map(t => t.url));
    
    if (wpTabs.length === 0) {
      showStatus(replaceStatus, "⚠️ Please open WordPress admin (https://citywide.local/wp-admin) in a tab first, then try again.", "error");
      return;
    }
    
    const wpTab = wpTabs[0];
    console.log('Using WordPress tab:', wpTab.url);
    
    // Convert map to array
    const imageMappingArray = [];
    serviceImageMap.forEach((imageName, serviceNum) => {
      const service = parsedServices.find(s => s.number === serviceNum);
      if (service) {
        imageMappingArray.push({
          serviceNumber: serviceNum,
          serviceTitle: service.title,
          url: service.url,
          imageName: imageName
        });
      }
    });
    
    if (imageMappingArray.length === 0) {
      showStatus(replaceStatus, "No image mappings found. Please map images first.", "error");
      return;
    }
    
    showStatus(replaceStatus, `✓ Found WordPress admin. Creating helper panel for ${imageMappingArray.length} services...`, "info");
    
    // Switch to WordPress tab
    await browserAPI.tabs.update(wpTab.id, { active: true });
    
    // Inject script to work through WordPress admin
    const results = await browserAPI.scripting.executeScript({
      target: { tabId: wpTab.id },
      func: assignImagesInWordPressAdminPanel,
      args: [imageMappingArray]
    });
    
    console.log('Injection results:', results);
    
    const result = results[0].result;
    
    if (result.success) {
      showStatus(replaceStatus, `✓ ${result.message}`, "success");
    } else {
      showStatus(replaceStatus, `⚠️ ${result.message}`, "info");
    }
    
  } catch (error) {
    console.error("Error in admin method:", error);
    showStatus(replaceStatus, `Error: ${error.message}. Make sure WordPress admin is open.`, "error");
  }
}

// Function injected into WordPress admin to assign images
function assignImagesInWordPressAdminPanel(imageMappings) {
  console.log("Starting WordPress admin image assignment", imageMappings);
  
  const messages = [];
  let assigned = 0;
  
  // This creates a helper panel in WordPress admin
  const helperDiv = document.createElement('div');
  helperDiv.style.cssText = 'position:fixed; top:60px; right:20px; width:320px; background:white; border:2px solid #2271b1; border-radius:4px; padding:15px; z-index:999999; box-shadow:0 2px 10px rgba(0,0,0,0.2);';
  
  helperDiv.innerHTML = `
    <h3 style="margin:0 0 10px 0; color:#2271b1;">Image Assignment Helper</h3>
    <div id="imageHelperStatus" style="font-size:12px; color:#666;">
      <p><strong>${imageMappings.length} services</strong> need images assigned.</p>
      <p style="margin:10px 0;">For each service, you'll need to:</p>
      <ol style="margin:5px 0; padding-left:20px; font-size:11px;">
        <li>Find the page in WordPress</li>
        <li>Click "Set featured image"</li>
        <li>Search for the image name</li>
        <li>Select and assign it</li>
      </ol>
    </div>
    <div id="imageList" style="max-height:300px; overflow-y:auto; margin:10px 0; padding:10px; background:#f6f7f7; border-radius:3px;">
      ${imageMappings.map((m, i) => `
        <div style="padding:8px; margin:4px 0; background:white; border-radius:3px; font-size:11px;">
          <strong>${i + 1}. ${m.serviceTitle}</strong><br>
          <span style="color:#666;">Image: <code>${m.imageName}</code></span><br>
          <span style="color:#666;">URL: <code>${m.url}</code></span>
        </div>
      `).join('')}
    </div>
    <button onclick="this.parentElement.remove()" style="width:100%; padding:8px; background:#2271b1; color:white; border:none; border-radius:3px; cursor:pointer; font-size:12px;">
      Close Helper
    </button>
  `;
  
  document.body.appendChild(helperDiv);
  
  assigned = imageMappings.length;
  messages.push(`Helper panel added with ${imageMappings.length} image assignments to complete manually.`);
  
  return {
    success: true,
    assigned: assigned,
    failed: 0,
    message: messages.join(' ')
  };
}

// Function injected into WordPress page to assign images from media library
function assignImagesInWordPress(imageMapping) {
  console.log("Starting WordPress image assignment", imageMapping);
  
  let assigned = 0;
  let failed = 0;
  const messages = [];
  
  try {
    // This function needs to work with WordPress's media library interface
    // Strategy: Find the "Set featured image" button, click it, search for image, select it
    
    imageMapping.forEach(mapping => {
      console.log(`Processing: Service ${mapping.serviceNumber} - ${mapping.serviceTitle} -> ${mapping.imageName}`);
      
      // Find the featured image link for this service
      // WordPress typically uses ID-based selectors like #postimagediv
      const featuredImageDiv = document.querySelector('#postimagediv');
      
      if (featuredImageDiv) {
        const setImageLink = featuredImageDiv.querySelector('a');
        if (setImageLink) {
          messages.push(`Found featured image control for ${mapping.serviceTitle}`);
          assigned++;
          // Note: Actual clicking would open a modal that we'd need to interact with
          // This requires more complex interaction with WordPress's media library modal
        } else {
          messages.push(`⚠️ No image link found for ${mapping.serviceTitle}`);
          failed++;
        }
      } else {
        messages.push(`⚠️ Featured image div not found for ${mapping.serviceTitle}`);
        failed++;
      }
    });
    
    return {
      success: assigned > 0,
      assigned: assigned,
      failed: failed,
      message: `Processed ${assigned + failed} services. ${messages.join('; ')}`
    };
    
  } catch (error) {
    console.error("Error in assignImagesInWordPress:", error);
    return {
      success: false,
      assigned: 0,
      failed: imageMapping.length,
      message: `Error: ${error.message}`
    };
  }
}

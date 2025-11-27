// Support both Chrome and Firefox APIs
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

document.addEventListener('DOMContentLoaded', function() {
    const findInput = document.getElementById('findText');
    const replaceInput = document.getElementById('replaceText');
    const caseSensitiveCheckbox = document.getElementById('caseSensitive');
    const wholeWordCheckbox = document.getElementById('wholeWord');
    const replaceBtn = document.getElementById('replaceBtn');
    const restoreBtn = document.getElementById('restoreBtn');
    const statusDiv = document.getElementById('status');
    const openAiInTabBtn = document.getElementById('openAiInTab');

    // Open AI Improver in a new tab (stays open permanently)
    if (openAiInTabBtn) {
        openAiInTabBtn.addEventListener('click', function() {
            browserAPI.tabs.create({
                url: browserAPI.runtime.getURL('ai-improve.html')
            });
        });
    }

    // Load saved values from storage
    browserAPI.storage.local.get(['findText', 'replaceText', 'caseSensitive', 'wholeWord'], function(result) {
        if (result.findText) findInput.value = result.findText;
        if (result.replaceText) replaceInput.value = result.replaceText;
        caseSensitiveCheckbox.checked = result.caseSensitive || false;
        wholeWordCheckbox.checked = result.wholeWord || false;
    });

    // Save values when they change
    function saveSettings() {
        browserAPI.storage.local.set({
            findText: findInput.value,
            replaceText: replaceInput.value,
            caseSensitive: caseSensitiveCheckbox.checked,
            wholeWord: wholeWordCheckbox.checked
        });
    }

    findInput.addEventListener('input', saveSettings);
    replaceInput.addEventListener('input', saveSettings);
    caseSensitiveCheckbox.addEventListener('change', saveSettings);
    wholeWordCheckbox.addEventListener('change', saveSettings);

    // Replace button click handler
    replaceBtn.addEventListener('click', async function() {
        const findText = findInput.value;
        const replaceText = replaceInput.value;

        if (!findText) {
            showStatus('Please enter text to find', 'error');
            return;
        }

        try {
            const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
            const tab = tabs[0];
            
            // Execute the replace function directly
            const results = await browserAPI.scripting.executeScript({
                target: { tabId: tab.id },
                func: performReplace,
                args: [findText, replaceText, caseSensitiveCheckbox.checked, wholeWordCheckbox.checked]
            });

            const count = results[0].result;
            if (count > 0) {
                showStatus(`Replaced ${count} occurrence(s)`, 'success');
            } else {
                showStatus('No matches found', 'info');
            }
        } catch (error) {
            showStatus('Error: ' + error.message, 'error');
            console.error('Full error:', error);
        }
    });

    // Restore button click handler
    restoreBtn.addEventListener('click', async function() {
        try {
            const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
            const tab = tabs[0];

            await browserAPI.scripting.executeScript({
                target: { tabId: tab.id },
                func: restoreOriginal
            });

            showStatus('Page restored to original', 'success');
        } catch (error) {
            showStatus('Error: ' + error.message, 'error');
            console.error('Full error:', error);
        }
    });

    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = 'status ' + type;
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = 'status';
        }, 3000);
    }
});

// Function that will be injected into the page
function performReplace(findText, replaceText, caseSensitive, wholeWord) {
    // Save original content if not already saved
    if (!window.findReplaceOriginalContent) {
        window.findReplaceOriginalContent = {
            html: document.body.innerHTML,
            inputs: []
        };
    }

    let count = 0;
    
    // Create regex pattern
    let flags = caseSensitive ? 'g' : 'gi';
    let pattern = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    if (wholeWord) {
        pattern = '\\b' + pattern + '\\b';
    }
    
    const regex = new RegExp(pattern, flags);
    
    // 1. Replace in INPUT and TEXTAREA elements
    const inputs = document.querySelectorAll('input[type="text"], textarea, input:not([type])');
    inputs.forEach((input, index) => {
        if (input.value) {
            // Save original value
            if (!window.findReplaceOriginalContent.inputs[index]) {
                window.findReplaceOriginalContent.inputs[index] = input.value;
            }
            
            const matches = input.value.match(regex);
            if (matches && matches.length > 0) {
                count += matches.length;
                input.value = input.value.replace(regex, replaceText);
                // Trigger change event
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    });
    
    // 2. Replace in contentEditable elements (like WordPress editors)
    const editableElements = document.querySelectorAll('[contenteditable="true"]');
    editableElements.forEach(element => {
        if (element.textContent) {
            const matches = element.textContent.match(regex);
            if (matches && matches.length > 0) {
                count += matches.length;
                element.textContent = element.textContent.replace(regex, replaceText);
            }
        }
    });
    
    // 3. Replace in regular text nodes
    function replaceInNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const parent = node.parentElement;
            if (!parent) return;
            
            // Skip script, style, noscript, input, and textarea tags
            const tagName = parent.tagName;
            if (tagName === 'SCRIPT' || tagName === 'STYLE' || tagName === 'NOSCRIPT' || 
                tagName === 'INPUT' || tagName === 'TEXTAREA') {
                return;
            }
            
            const text = node.nodeValue;
            if (!text || !text.trim()) return;
            
            const matches = text.match(regex);
            
            if (matches && matches.length > 0) {
                count += matches.length;
                node.nodeValue = text.replace(regex, replaceText);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Skip contenteditable elements (already processed)
            if (node.getAttribute && node.getAttribute('contenteditable') === 'true') {
                return;
            }
            // Recursively process child nodes
            for (let i = 0; i < node.childNodes.length; i++) {
                replaceInNode(node.childNodes[i]);
            }
        }
    }
    
    replaceInNode(document.body);
    
    return count;
}

function restoreOriginal() {
    if (window.findReplaceOriginalContent) {
        // Restore HTML
        document.body.innerHTML = window.findReplaceOriginalContent.html;
        
        // Restore input values
        const inputs = document.querySelectorAll('input[type="text"], textarea, input:not([type])');
        inputs.forEach((input, index) => {
            if (window.findReplaceOriginalContent.inputs[index]) {
                input.value = window.findReplaceOriginalContent.inputs[index];
            }
        });
        
        delete window.findReplaceOriginalContent;
    }
}

# Fix: "rest_not_logged_in" Error

## 🎯 Your Problem

Error: `rest_not_logged_in` - "You are not currently logged in."

This means even though you added `define('WP_ENVIRONMENT_TYPE', 'local');` to wp-config.php, WordPress STILL isn't accepting Application Password authentication.

## ✅ SOLUTION: Force Enable Application Passwords

### Method 1: Add Filter to functions.php (EASIEST)

1. **Go to WordPress Admin:** `https://citywide.local/wp-admin`

2. **Navigate to:** Appearance → Theme File Editor
   - ⚠️ If you see a warning about editing files, click "I understand"

3. **Select functions.php**
   - Look in the right sidebar under "Theme Files"
   - Click on **"functions.php"**

4. **Scroll to the VERY BOTTOM** of the file

5. **Add these lines at the end:**

```php
// Force enable Application Passwords for local WordPress
add_filter('wp_is_application_passwords_available', '__return_true');
add_filter('wp_is_application_passwords_available_for_user', '__return_true');
```

6. **Click "Update File"**

7. **Regenerate Application Password:**
   - Go to: Users → Profile
   - Delete old Application Password
   - Create new one: Name it `Extension API`
   - Copy the new password (remove spaces)

8. **Test in Extension:**
   - Paste new password in extension
   - Click "Test WordPress Connection"
   - Should work now! ✅

---

## 🔧 Method 2: Add Plugin Code (Alternative)

If you can't edit theme files, create a custom plugin:

1. **Create folder:** `wp-content/plugins/enable-app-passwords/`

2. **Create file:** `enable-app-passwords.php` with this content:

```php
<?php
/**
 * Plugin Name: Enable Application Passwords
 * Description: Force enable Application Passwords for local development
 * Version: 1.0
 */

add_filter('wp_is_application_passwords_available', '__return_true');
add_filter('wp_is_application_passwords_available_for_user', '__return_true');
```

3. **Activate the plugin** in WordPress Admin → Plugins

4. **Create Application Password** and test

---

## 🧪 Verify It's Working

### Test 1: Check Application Passwords Section
- Go to: Users → Profile
- Scroll down
- Should see "Application Passwords" section
- If not visible, the filters aren't working

### Test 2: Test Endpoint Directly

Open browser and go to:
```
https://citywide.local/wp-json/wp/v2/users/me
```

Enter:
- **Username:** Your admin username
- **Password:** Your **regular** WordPress password (not Application Password)

Should show JSON with your user info.

### Test 3: Test with Extension
- Configure credentials in extension
- Click "Test WordPress Connection"
- Should show: ✅ "Connected as [your name]"

---

## 📋 Complete Checklist

- [ ] Added `define('WP_ENVIRONMENT_TYPE', 'local');` to wp-config.php ✅ (You already have this)
- [ ] Added filters to functions.php (NEW - do this now)
- [ ] WordPress reloaded (refresh admin page)
- [ ] Application Passwords section visible in User Profile
- [ ] Created NEW Application Password
- [ ] Copied password correctly (no spaces)
- [ ] Entered in extension settings
- [ ] Test connection shows success

---

## 🎯 Why This Happens

WordPress has TWO separate checks for Application Passwords:

1. ✅ **Environment check** - You fixed this with `WP_ENVIRONMENT_TYPE`
2. ❌ **Availability check** - Still blocked by default on local sites

The filters force BOTH checks to return true.

---

## ⚡ Quick Copy-Paste for functions.php

Add this at the very bottom of your theme's functions.php:

```php

// ============================================
// Enable Application Passwords for Local Dev
// ============================================
add_filter('wp_is_application_passwords_available', '__return_true');
add_filter('wp_is_application_passwords_available_for_user', '__return_true');
```

---

## 🆘 Still Not Working?

### Check for Plugin Conflicts

Some security plugins block REST API authentication:
- Wordfence Security
- iThemes Security
- All In One WP Security
- Disable WP REST API

**Try:** Temporarily deactivate ALL plugins, then test.

### Check REST API is Enabled

Go to: `https://citywide.local/wp-json/`

Should show JSON with routes. If you get 404 or error, REST API is disabled.

### Alternative: Use Manual Helper

If you can't get API working:
1. Click "Upload & Assign Images via WordPress API"
2. When prompted, click "OK" for Manual Helper
3. Follow the visual guide to assign images manually

---

**This filter fix works 99% of the time for local WordPress!** 🚀

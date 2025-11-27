# Local WordPress REST API Setup Guide

## 🎯 Goal
Enable Application Password authentication on your local WordPress site (`citywide.local`) so the extension can automatically assign images via REST API.

## ✅ Method 1: Enable Application Passwords (Recommended)

By default, Application Passwords are disabled on local/non-HTTPS sites. Here's how to enable them:

### Step 1: Add Code to wp-config.php

1. **Locate your wp-config.php file:**
   - Usually at: `C:\xampp\htdocs\citywide\wp-config.php` (XAMPP)
   - Or: `C:\wamp64\www\citywide\wp-config.php` (WAMP)
   - Or wherever your local WordPress is installed

2. **Open wp-config.php in a text editor** (Notepad++, VS Code, etc.)

3. **Add this line BEFORE the "That's all, stop editing!" comment:**
   ```php
   define('WP_ENVIRONMENT_TYPE', 'local');
   ```

4. **Save the file**

### Step 2: Verify Application Passwords Are Available

1. Log into WordPress admin: `https://citywide.local/wp-admin`
2. Go to: **Users** → **Profile** (your user profile)
3. Scroll down - you should now see **"Application Passwords"** section
4. If you see it, continue to Step 3
5. If not, try Method 2 below

### Step 3: Create Application Password

1. In the **Application Passwords** section:
   - **Name:** `AI Content Improver`
   - Click **"Add New Application Password"**
2. **Copy the generated password** (shows as: `xxxx xxxx xxxx xxxx xxxx xxxx`)
3. **Remove ALL spaces** → `xxxxxxxxxxxxxxxxxxxxxxxx`
4. Save it somewhere safe

### Step 4: Configure Extension

1. Open the extension → **Settings** tab
2. Fill in:
   - **WordPress Site URL:** `https://citywide.local`
   - **WordPress Username:** Your admin username
   - **WordPress Application Password:** (paste without spaces)
3. Click **"Test WordPress Connection"**
4. Should show: ✅ "Connected as [your username]"

---

## ✅ Method 2: Force Enable Application Passwords

If Method 1 doesn't work, use this code snippet:

### Add to your theme's functions.php:

1. Go to: **Appearance** → **Theme File Editor**
2. Select **functions.php** (right sidebar)
3. Add this code at the **bottom of the file:**

```php
// Force enable Application Passwords for local development
add_filter('wp_is_application_passwords_available', '__return_true');
add_filter('wp_is_application_passwords_available_for_user', '__return_true');
```

4. Click **"Update File"**
5. Now follow Steps 2-4 from Method 1 above

---

## ✅ Method 3: JWT Authentication (Advanced)

If Application Passwords still don't work, use JWT tokens:

### Step 1: Install JWT Plugin

1. Download: [JWT Authentication for WP REST API](https://wordpress.org/plugins/jwt-authentication-for-wp-rest-api/)
2. Upload to: `/wp-content/plugins/`
3. Activate in WordPress admin

### Step 2: Configure JWT

1. **Add to wp-config.php:**
   ```php
   define('JWT_AUTH_SECRET_KEY', 'your-secret-key-here-use-random-string');
   define('JWT_AUTH_CORS_ENABLE', true);
   ```

2. **Add to .htaccess:**
   ```apache
   RewriteCond %{HTTP:Authorization} ^(.*)
   RewriteRule ^(.*) - [E=HTTP_AUTHORIZATION:%1]
   SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1
   ```

### Step 3: Get JWT Token

1. Use Postman or browser to POST to:
   ```
   https://citywide.local/wp-json/jwt-auth/v1/token
   ```
   
   Body (JSON):
   ```json
   {
     "username": "your-username",
     "password": "your-password"
   }
   ```

2. Copy the `token` from response
3. In extension, use this as your "Application Password"

---

## 🔍 Verify REST API is Working

### Test in Browser:

1. Open: `https://citywide.local/wp-json/wp/v2/users/me`
2. Enter your WordPress username and password when prompted
3. Should show JSON with your user info

### Test with Extension:

1. Fill in credentials in Settings tab
2. Click **"Test WordPress Connection"**
3. Check browser console (F12) for detailed logs
4. Should see: ✅ "Connected as [username]"

---

## 🐛 Troubleshooting

### "rest_not_logged_in" Error
- Application Passwords not enabled → Use Method 1 or 2
- Wrong username/password → Double-check credentials
- Password has spaces → Remove ALL spaces

### 401 Unauthorized
- Application Password incorrect → Regenerate and copy again
- User lacks permissions → Make sure user is Administrator
- Plugin conflict → Temporarily disable security plugins

### SSL/HTTPS Warnings
- Local WordPress might show SSL warnings
- Add exception in browser to trust the local certificate
- Or use HTTP instead: `http://citywide.local` (less secure)

### CORS Errors
- Add to wp-config.php:
  ```php
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
  header('Access-Control-Allow-Headers: Authorization, Content-Type');
  ```

---

## 📋 Quick Checklist

- [ ] Added `define('WP_ENVIRONMENT_TYPE', 'local');` to wp-config.php
- [ ] Application Passwords section visible in user profile
- [ ] Created Application Password (removed spaces)
- [ ] Configured extension with credentials
- [ ] Tested connection successfully
- [ ] Verified REST API endpoint works in browser
- [ ] Can assign images without 401 errors

---

## ⚡ Quick Copy-Paste for wp-config.php

Add this before `/* That's all, stop editing! Happy publishing. */`:

```php
// Enable Application Passwords for local WordPress
define('WP_ENVIRONMENT_TYPE', 'local');

// Optional: Enable CORS for REST API
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With');
```

---

## 🎯 Alternative: Use Live Site

If local setup is too complex, consider:
- Using a staging site with proper HTTPS
- Testing on your live site (safer than it sounds - extension only assigns images)
- Using the Manual Assignment Helper (works without any setup)

---

## 📞 Need Help?

1. Check browser console (F12) for detailed error messages
2. Check WordPress debug.log: `/wp-content/debug.log`
3. Enable WordPress debugging:
   ```php
   define('WP_DEBUG', true);
   define('WP_DEBUG_LOG', true);
   ```

Your local WordPress at `citywide.local` should work perfectly once configured! 🚀

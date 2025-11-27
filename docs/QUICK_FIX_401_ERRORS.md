# Quick Fix: 401 Errors on citywide.local

## 🎯 Your Issue
You're getting 401 errors when trying to assign images because `citywide.local` doesn't support Application Password authentication by default.

## ✅ SOLUTION: Add One Line to wp-config.php

### Step-by-Step (5 minutes):

#### 1. Find your wp-config.php file
- **XAMPP**: `C:\xampp\htdocs\citywide\wp-config.php`
- **WAMP**: `C:\wamp64\www\citywide\wp-config.php`  
- **Other**: Look in your WordPress root folder

#### 2. Open wp-config.php
- Right-click → Open with Notepad or VS Code

#### 3. Find this line:
```php
/* That's all, stop editing! Happy publishing. */
```

#### 4. ADD this line RIGHT BEFORE it:
```php
define('WP_ENVIRONMENT_TYPE', 'local');
```

**Example (what it should look like):**
```php
define( 'WP_DEBUG', false );

// ADD THIS LINE:
define('WP_ENVIRONMENT_TYPE', 'local');

/* That's all, stop editing! Happy publishing. */
```

#### 5. Save the file

#### 6. Create Application Password
1. Go to: `https://citywide.local/wp-admin`
2. Click **Users** → **Profile**
3. Scroll down to **Application Passwords** section
4. Type name: `AI Content Improver`
5. Click **Add New Application Password**
6. **Copy the password** (looks like: `xxxx xxxx xxxx xxxx xxxx xxxx`)
7. **Remove ALL spaces** → `xxxxxxxxxxxxxxxxxxxxxxxx`

#### 7. Configure Extension
1. Open extension → **Settings** tab
2. Enter:
   - **WordPress Site URL**: `https://citywide.local`
   - **WordPress Username**: Your admin username
   - **WordPress Application Password**: (paste without spaces)
3. Click **Test WordPress Connection**
4. Should show: ✅ **"Connected as [your name]"**

#### 8. Test Image Assignment
1. Go to **Bulk Replace Services** tab
2. Click **📸 Upload & Assign Images via WordPress API**
3. Should work without 401 errors! 🎉

---

## 🔧 Alternative: Add to functions.php Instead

If you can't edit wp-config.php:

1. Go to: **Appearance** → **Theme File Editor**
2. Click **functions.php** (right sidebar)
3. Add this at the **very bottom**:

```php
// Enable Application Passwords for local WordPress
add_filter('wp_is_application_passwords_available', '__return_true');
add_filter('wp_is_application_passwords_available_for_user', '__return_true');
```

4. Click **Update File**
5. Follow steps 6-8 above

---

## ✅ Checklist

- [ ] Added line to wp-config.php
- [ ] Saved wp-config.php
- [ ] Reloaded WordPress admin
- [ ] See "Application Passwords" in User Profile
- [ ] Created Application Password
- [ ] Removed spaces from password
- [ ] Configured extension Settings
- [ ] Tested connection (shows green checkmark)
- [ ] Tried image assignment (no 401 errors!)

---

## 🎉 What You'll Get

After this fix:
- ✅ **Automatic image assignment** - no manual work
- ✅ **Metadata updates** - Alt Text, Title, Caption, Description
- ✅ **Bulk operations** - assign 10+ images in seconds
- ✅ **No more 401 errors**

---

## 🆘 Still Not Working?

### If Application Passwords still not showing:
1. Check PHP version (needs 7.4+)
2. Try the functions.php method instead
3. Check for security plugins blocking REST API

### If 401 errors persist:
1. Regenerate Application Password
2. Make sure you removed ALL spaces
3. Check username is correct
4. Try with a different admin user

### Need more help?
See full guide: [LOCAL_WORDPRESS_API_SETUP.md](LOCAL_WORDPRESS_API_SETUP.md)

---

**This one line fixes everything! 🚀**

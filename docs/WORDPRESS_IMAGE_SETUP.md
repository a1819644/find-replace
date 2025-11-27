# WordPress Image Upload Setup Guide

## ✅ What's Been Added

Your extension can now automatically:
1. Search for images in your WordPress media library by filename
2. Find the corresponding service pages by URL
3. Assign the images as featured images via WordPress REST API

## 🔧 Setup Steps

### Step 1: Create WordPress Application Password

1. Log into your WordPress admin panel
2. Go to: **Users** → **Profile** (your user)
3. Scroll down to **Application Passwords** section
4. Enter a name: `Chrome Extension` or `AI Content Improver`
5. Click **Add New Application Password**
6. **Copy the generated password** (it looks like: `xxxx xxxx xxxx xxxx xxxx xxxx`)
7. Save it somewhere safe

### Step 2: Configure Extension Settings

1. Open the extension
2. Go to **Settings** tab
3. Scroll down to **WordPress Integration** section
4. Fill in:
   - **WordPress Site URL**: `https://yoursite.com` (no trailing slash, no /wp-admin)
   - **WordPress Username**: Your admin username (e.g., `admin`)
   - **WordPress Application Password**: `sqacP8z0V74KkQqljexKNPpA` (NO SPACES - paste it exactly like this)
     - ⚠️ **IMPORTANT**: Remove ALL spaces from the password WordPress gave you
     - WordPress shows: `ZBhI twSG gmfZ 6Gbw RfDe d7UE`
     - You paste: `ZBhItwSGgmfZ6GbwRfDed7UE`
5. Click **Test WordPress Connection** to verify
6. Click **Save Settings**

## 📸 How to Use Image Assignment

### Step 1: Prepare Your Images
- Upload all your service images to WordPress Media Library first
- Note the filename or title of each image (e.g., "fridge-repair.jpg", "oven-repair.png")

### Step 2: Map Images to Services

1. Go to **Bulk Replace Services** tab
2. Paste your service data and click **Parse & Preview Services**
3. The **Image Mapping** section will appear
4. **Option A - Bulk Paste:**
   - In the textarea, paste image filenames (one per line, matching service order):
     ```
     fridge-repair.jpg
     dishwasher-repair.jpg
     oven-repair.jpg
     coffee-machine-repair.jpg
     ```
   - Click **Apply to All Services Below**

5. **Option B - Individual Entry:**
   - Type or edit each image name in the individual input fields

6. Click **Save Image Mapping** to store for reuse

### Step 3: Auto-Assign Images

1. **Optional: Set Service Page Base URL**
   - If your service pages are on a different domain/path than shown in your data
   - Enter it in "Service Page Base URL" field (e.g., `https://yoursite.com`)
   - Leave empty to use the exact URLs from your pasted service data

2. Click **📸 Upload & Assign Images via WordPress API**
3. The extension will:
   - Search for each image in your media library
   - Update image metadata (Alt Text, Title, Caption, Description)
   - Find the corresponding page by URL
   - Assign the image as featured image
4. Wait for completion (you'll see progress for each service)
5. Check the success message

## 💾 Save & Reuse Your Work

All your settings are automatically saved:
- ✅ WordPress credentials (Site URL, Username, Password)
- ✅ Image mappings (which image goes with which service)
- ✅ Service Page Base URL
- ✅ Gemini API key and brand settings

**Just reload the extension and everything will be there!**

## 🔍 Troubleshooting

### ⚠️ Local WordPress (401 Errors)

**If you're using a local WordPress site** (`.local`, `localhost`, `127.0.0.1`):

**Problem:** Local WordPress doesn't support Application Password authentication by default, causing 401 errors.

**Solution Options:**

#### Option 1: Enable REST API on Local WordPress (Recommended) ⚡

**See detailed guide:** [LOCAL_WORDPRESS_API_SETUP.md](LOCAL_WORDPRESS_API_SETUP.md)

**Quick Setup:**
1. Open your `wp-config.php` file
2. Add this line before "That's all, stop editing!":
   ```php
   define('WP_ENVIRONMENT_TYPE', 'local');
   ```
3. Save and reload WordPress admin
4. Go to Users → Profile → Create Application Password
5. Configure extension with the password (remove spaces!)
6. Test connection - should work now! ✅

**Benefits:**
- ✅ Fully automatic image assignment
- ✅ Fast bulk operations  
- ✅ Metadata updates (Alt Text, Title, etc.)
- ✅ No manual work needed

#### Option 2: Use Manual Assignment Helper 📋

**If you don't want to modify WordPress:**

1. Click "Upload & Assign Images via WordPress API"
2. When prompted, click "OK" to use helper
3. Extension creates a visual guide in your WordPress admin
4. Shows which images to assign to which pages
5. You manually assign them (quick and easy)

**Benefits:**
- ✅ No WordPress configuration needed
- ✅ Works immediately
- ✅ Visual guide makes it easy
- ❌ Requires manual clicking per service

#### Option 3: Use Live/Staging Site 🌐

Test on a live site with HTTPS - Application Passwords work automatically!

**Live WordPress sites work automatically** - no special configuration needed!

### "Please configure WordPress credentials in Settings tab first"
- Go to Settings and fill in your WordPress details
- Test the connection before trying to assign images

### "Image not found in media library: [filename]"
- Make sure the image is uploaded to WordPress Media Library
- Check that the filename matches exactly (case-sensitive)
- Try using just the image title without extension

### "Page not found for URL: [url]"
- Make sure the service URL matches the actual WordPress page slug
- Check that the page is published (not draft)
- **Use the "Service Page Base URL" field** to specify where your pages are located
- Example: If your service is at `https://yoursite.com/fridge-repair/` but data shows `/services/fridge-repair/`, enter `https://yoursite.com` in the base URL field

### "Failed to assign image: 403"
- Your Application Password might be incorrect
- Make sure your WordPress user has permission to edit pages and media
- Try creating a new Application Password

### CORS Errors
- This shouldn't happen with Application Passwords
- If it does, you may need to add REST API permissions in WordPress

## 📝 Notes

- The extension searches for **pages** by default (not posts)
- Images are assigned as **featured images**
- If multiple images match the search term, the first one is used
- The extension processes one service at a time to avoid rate limiting

## 🎯 Example Workflow

1. Upload 10 service images to WordPress Media Library
2. Name them clearly: `fridge-repair.jpg`, `oven-repair.jpg`, etc.
3. In extension, parse your 10 services
4. Paste the 10 image names in the bulk textarea
5. Click Apply, then Save Mapping
6. Click the Upload button
7. Done! All 10 services now have featured images

## ⚡ Tips

- Use consistent naming: service name + category (e.g., `fridge-commercial.jpg`)
- Save your image mapping to reuse for similar batches
- Test with 1-2 services first before running all
- Keep your Application Password secure (don't share it)

# ATH Website Documentation

This document consolidates information from various setup and instruction files for the ATH Website.

## Table of Contents

1. [Google Sheets Integration](#google-sheets-integration)
2. [PayPal Integration](#paypal-integration)
3. [Image System](#image-system)
4. [Development Notes](#development-notes)

## Google Sheets Integration

The store uses Google Sheets as a backend for inventory management. This allows for easy updates to product information without modifying the code.

### Setup Instructions

1. **Create a Google Sheet**:

   - Create a new Google Sheet
   - Add the following columns: ID, Name, Price, Stock, Description, Image
   - Fill in your product information

2. **Publish the Sheet**:

   - Click on File > Share > Publish to web
   - Select "Entire Document" and "CSV" format
   - Click "Publish"
   - Copy the published URL

3. **Update the Code**:

   - Open `sheets-inventory.js`
   - Update the `PUBLISHED_CSV_URL` variable with your published URL

4. **Set Up Google Apps Script (Optional)**:
   - For inventory updates after purchases, set up a Google Apps Script
   - Open your Google Sheet
   - Click on Extensions > Apps Script
   - Copy the code from `google-apps-script.js` into the script editor
   - Deploy as a web app
   - Update the `INVENTORY_API_URL` in `sheets-inventory.js` with your web app URL

### Sheet Structure

The Google Sheet should have the following columns:

- **ID**: Unique identifier for each product
- **Name**: Product name
- **Price**: Product price (can include currency symbol)
- **Stock**: Number of items in stock
- **Description**: Product description
- **Image**: URL to the product image

Example:

```
ID,Name,Price,Stock,Description,Image
1,Product 1,$19.99,10,This is product 1,https://example.com/image1.jpg
2,Product 2,$29.99,5,This is product 2,https://example.com/image2.jpg
```

## PayPal Integration

The store includes PayPal integration for checkout, with a test payment option for development.

### Setup Instructions

1. **Create a PayPal Business Account**:

   - Go to [PayPal Business](https://www.paypal.com/business)
   - Sign up for a business account
   - Verify your email and complete the setup

2. **Set Up PayPal Developer Account**:

   - Log in to the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
   - Navigate to "My Apps & Credentials"

3. **Create a PayPal App**:

   - Click "Create App" under the REST API apps section
   - Choose a name for your app
   - Select "Merchant" as the app type
   - Create the app and note your Client ID and Secret

4. **Update Your Store Code**:

   - Open `store.html`
   - Find the PayPal SDK loading section
   - Replace the test client ID with your actual Client ID:
     ```javascript
     const clientId = "YOUR_CLIENT_ID_HERE"; // Replace with your actual client ID
     ```

5. **Test Your Integration**:

   - Use the Sandbox environment for testing
   - Create test accounts in the PayPal Developer Dashboard
   - Test the checkout process with these accounts

6. **Go Live**:
   - Once testing is complete, switch to Live mode in the PayPal Developer Dashboard
   - Update your Client ID to the Live Client ID

## Image System

The store supports various image URL formats for product images.

### Supported Image URL Types

1. **Direct Web URLs**:

   - Standard image URLs (e.g., `https://example.com/image.jpg`)
   - Must be publicly accessible
   - Must have proper CORS headers if hosted on a different domain

2. **Google Drive URLs**:

   - The system automatically converts Google Drive sharing links to direct access URLs
   - Format: `https://drive.google.com/file/d/FILE_ID/view`
   - Will be converted to: `https://drive.google.com/uc?export=view&id=FILE_ID`

3. **Local Image Paths**:
   - Relative paths to images in the `assets` folder
   - Example: `assets/store/product1.jpg`

### Setting Up Google Drive Images

1. **Upload Images to Google Drive**:

   - Upload your product images to Google Drive

2. **Share the Images**:

   - Right-click on an image
   - Select "Share"
   - Change access to "Anyone with the link"
   - Copy the link

3. **Add to Google Sheet**:

   - Paste the Google Drive link in the "Image" column of your Google Sheet
   - The system will automatically convert it to a usable format

4. **Test Your Images**:
   - Use the Image URL Tester in the store admin panel
   - Click the "Test Images" button to open the tester
   - Paste your URL and click "Test URL"

### Troubleshooting

If images aren't loading:

1. Check that the URL is correct
2. Ensure the image is publicly accessible
3. For Google Drive images, make sure they're shared with "Anyone with the link"
4. Use the Image URL Tester to validate the URL

## Development Notes

For debugging and development purposes, the following features are available:

### Debug Panel

A hidden debug panel is included in `store.html` that can be toggled with Ctrl+Shift+D.

Features:

- Connection testing for Google Sheets URLs
- Inventory display
- Manual creation of featured products

### Admin Controls

Admin controls are hidden by default but can be accessed by modifying the CSS:

```html
<div class="admin-controls" style="display: block">
  <button id="refresh-inventory-btn">
    <i class="fas fa-sync-alt"></i> Refresh Inventory
  </button>
  <button id="show-inventory-btn">
    <i class="fas fa-clipboard-list"></i> Show Inventory
  </button>
  <button id="test-images-btn">
    <i class="fas fa-images"></i> Test Images
  </button>
</div>
```

### Test Payment

For testing the checkout process without using PayPal, a "Test Payment" option is available in the checkout modal.

### Fixed Issues

The following issues were addressed during development:

1. **CORS Issues**: Fixed by implementing multiple CORS proxies and fallback mechanisms.
2. **Image Loading**: Added robust image validation and fallback handling.
3. **Featured Products**: Implemented automatic creation of featured products from inventory.
4. **PayPal Integration**: Added error handling and test payment option.
5. **Inventory Updates**: Fixed issues with updating inventory after purchases.

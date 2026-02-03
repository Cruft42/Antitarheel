/**
 * Google Apps Script for Inventory Management
 * 
 * This script handles inventory updates from the web app.
 * To use this script:
 * 1. Go to https://script.google.com/
 * 2. Create a new project
 * 3. Copy and paste this code
 * 4. Save the project
 * 5. Deploy as a web app (Publish > Deploy as web app)
 *    - Execute the app as: Me (your email)
 *    - Who has access: Anyone, even anonymous
 * 6. Copy the web app URL and use it in your sheets-inventory.js file
 */

// The ID of your Google Sheet
// NOTE: Removed actual Sheet ID for privacy. Replace with your own Sheet ID before deploying.
const SHEET_ID = 'REPLACE_WITH_SHEET_ID';
const SHEET_NAME = 'Inventory'; // The name of your sheet tab

/**
 * Process web app requests
 */
function doGet(e) {
  return handleRequest(e);
}

/**
 * Process POST requests
 */
function doPost(e) {
  return handleRequest(e);
}

/**
 * Handle both GET and POST requests
 */
function handleRequest(e) {
  // Set up CORS headers
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  // Parse the request
  let data;
  try {
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      data = e.parameter;
    } else {
      // Return the current inventory if no data is provided
      return output.setContent(JSON.stringify({
        success: true,
        inventory: getInventory()
      }));
    }
  } catch (error) {
    return output.setContent(JSON.stringify({
      success: false,
      error: 'Invalid request format: ' + error.message
    }));
  }
  
  // Handle different actions
  try {
    if (data.action === 'updateInventory') {
      const result = updateInventory(data.items);
      return output.setContent(JSON.stringify({
        success: true,
        message: 'Inventory updated successfully',
        updatedItems: result
      }));
    } else if (data.action === 'getInventory') {
      const inventory = getInventory();
      return output.setContent(JSON.stringify({
        success: true,
        inventory: inventory
      }));
    } else {
      // Default to returning the current inventory
      return output.setContent(JSON.stringify({
        success: true,
        inventory: getInventory()
      }));
    }
  } catch (error) {
    return output.setContent(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

/**
 * Get the current inventory from the Google Sheet
 */
function getInventory() {
  try {
    // Open the spreadsheet and get the data
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error(`Sheet "${SHEET_NAME}" not found`);
    }
    
    // Get all data including headers
    const data = sheet.getDataRange().getValues();
    
    // Extract headers (first row)
    const headers = data[0];
    
    // Find column indices
    const idIndex = headers.indexOf('ID');
    const nameIndex = headers.indexOf('Name');
    const priceIndex = headers.indexOf('Price');
    const stockIndex = headers.indexOf('Stock');
    const descriptionIndex = headers.indexOf('Description');
    const imageIndex = headers.indexOf('Image');
    
    // Check if required columns exist
    if (idIndex === -1 || nameIndex === -1 || priceIndex === -1 || stockIndex === -1) {
      throw new Error('Required columns (ID, Name, Price, Stock) not found in the sheet');
    }
    
    // Convert data to objects
    const inventory = {};
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const id = row[idIndex].toString();
      
      // Skip empty rows
      if (!id) continue;
      
      inventory[id] = {
        id: id,
        name: row[nameIndex],
        price: parseFloat(row[priceIndex]) || 0,
        stock: parseInt(row[stockIndex]) || 0,
        description: descriptionIndex !== -1 ? row[descriptionIndex] : '',
        image: imageIndex !== -1 ? row[imageIndex] : ''
      };
    }
    
    return inventory;
  } catch (error) {
    throw new Error('Error getting inventory: ' + error.message);
  }
}

/**
 * Update inventory based on purchased items
 */
function updateInventory(items) {
  try {
    if (!items || !Array.isArray(items)) {
      throw new Error('Invalid items format');
    }
    
    // Open the spreadsheet
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error(`Sheet "${SHEET_NAME}" not found`);
    }
    
    // Get all data including headers
    const data = sheet.getDataRange().getValues();
    
    // Extract headers (first row)
    const headers = data[0];
    
    // Find column indices
    const idIndex = headers.indexOf('ID');
    const stockIndex = headers.indexOf('Stock');
    
    // Check if required columns exist
    if (idIndex === -1 || stockIndex === -1) {
      throw new Error('Required columns (ID, Stock) not found in the sheet');
    }
    
    // Track updated items
    const updatedItems = [];
    
    // Update stock levels for each item
    items.forEach(item => {
      const id = item.id.toString();
      const quantity = parseInt(item.quantity) || 0;
      
      // Find the row with this ID
      for (let i = 1; i < data.length; i++) {
        if (data[i][idIndex].toString() === id) {
          // Get current stock
          const currentStock = parseInt(data[i][stockIndex]) || 0;
          
          // Calculate new stock (ensure it doesn't go below 0)
          const newStock = Math.max(0, currentStock - quantity);
          
          // Update the stock in the sheet
          sheet.getRange(i + 1, stockIndex + 1).setValue(newStock);
          
          // Add to updated items
          updatedItems.push({
            id: id,
            oldStock: currentStock,
            newStock: newStock,
            quantityPurchased: quantity
          });
          
          break;
        }
      }
    });
    
    return updatedItems;
  } catch (error) {
    throw new Error('Error updating inventory: ' + error.message);
  }
} 
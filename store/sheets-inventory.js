// Google Sheets Inventory Integration
// This file connects the store inventory to a Google Sheets document

// Google Sheets published URL (HTML format)
const PUBLISHED_SHEET_URL = 'REPLACE_WITH_PUBLISHED_SHEET_HTML_URL';

// Alternative CSV URL (try to construct from the HTML URL)
const SHEET_ID = PUBLISHED_SHEET_URL.match(/\/d\/e\/([^\/]+)/)?.[1] || '';
const CSV_URL = SHEET_ID ? 
  `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?output=csv` : '';

// Direct access URL (if you know the original sheet ID)
const DIRECT_SHEET_ID = 'REPLACE_WITH_DIRECT_SHEET_ID';
const DIRECT_CSV_URL = DIRECT_SHEET_ID ? `https://docs.google.com/spreadsheets/d/${DIRECT_SHEET_ID}/export?format=csv` : '';

// Direct access to the published CSV (if available)
// Update this URL with the one you get when publishing as CSV
const PUBLISHED_CSV_URL = 'REPLACE_WITH_PUBLISHED_CSV_URL';

// CORS Proxy URLs (try different ones if one fails)
const CORS_PROXY_URL = 'https://api.allorigins.win/raw?url=';
const CORS_PROXY_URL_BACKUP = 'https://corsproxy.io/?';

// Cache for inventory data
let sheetsInventoryCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Default inventory data to use as fallback if Google Sheets fails
const defaultInventory = {
  'featured': {
    id: 'featured',
    name: 'Limited Edition Pro Deck',
    price: 59.99,
    stock: 10,
    description: 'Our flagship skateboard deck featuring a custom design by professional artists. Made with 7-ply maple wood for durability and performance.',
    image: 'assets/store/featured-deck1.jpg'
  },
  'featured2': {
    id: 'featured2',
    name: 'Urban Art Deck',
    price: 49.99,
    stock: 8,
    description: 'Premium skateboard deck with unique artwork. Perfect for street skating.',
    image: 'assets/store/featured-deck2.jpg'
  },
  'featured3': {
    id: 'featured3',
    name: 'Classic Black Deck',
    price: 39.99,
    stock: 15,
    description: 'Limited edition skateboard with professional-grade construction.',
    image: 'assets/store/featured-deck3.jpg'
  },
  '1': {
    id: '1',
    name: 'Classic Black Deck',
    price: 39.99,
    stock: 10,
    description: 'A sleek, all-black deck perfect for any style of skating. Made with high-quality materials for durability and performance.',
    image: 'assets/store/deck1.jpg'
  },
  '2': {
    id: '2',
    name: 'Urban Art Deck',
    price: 44.99,
    stock: 8,
    description: 'Featuring artwork from renowned street artists, this deck is as much a statement piece as it is functional.',
    image: 'assets/store/deck2.jpg'
  },
  '3': {
    id: '3',
    name: 'Pro Performance Deck',
    price: 54.99,
    stock: 5,
    description: 'Designed with input from professional skaters, this deck offers superior pop and durability.',
    image: 'assets/store/deck3.jpg'
  },
  '4': {
    id: '4',
    name: 'Retro Wave Deck',
    price: 49.99,
    stock: 7,
    description: 'A nostalgic throwback to 80s aesthetics with modern construction techniques.',
    image: 'assets/store/deck4.jpg'
  }
};

// Use the DEFAULT_DECK_DATA_URL and DEFAULT_FEATURED_DATA_URL from inventory.js
// These are already defined in inventory.js, so we don't redefine them here

// Google Apps Script Web App URL for inventory updates
const INVENTORY_API_URL = 'REPLACE_WITH_INVENTORY_API_URL';

// Function to parse CSV data
function parseCSV(csvText) {
  if (!csvText || typeof csvText !== 'string') {
    return [];
  }
  
  try {
    // Split the CSV text into lines
    const lines = csvText.split(/\r?\n/);
    
    if (lines.length === 0) {
      return [];
    }
    
    // Process each line
    const rows = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      const fields = [];
      let currentField = '';
      let inQuotes = false;
      
      // Process each character in the line
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"') {
          // Toggle the inQuotes flag when we encounter a quote
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          // If we encounter a comma outside of quotes, it's a field separator
          fields.push(currentField);
          currentField = '';
        } else {
          // Otherwise, add the character to the current field
          currentField += char;
        }
      }
      
      // Add the last field
      fields.push(currentField);
      
      // Add the row to the result
      rows.push(fields);
    }
    
    return rows;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return [];
  }
}

// Function to try fetching CSV data from multiple URLs
async function tryFetchCSV() {
  // URLs to try, in order of preference
  const urlsToTry = [
    { url: PUBLISHED_CSV_URL, description: "Published CSV URL" },
    { url: DIRECT_CSV_URL, description: "Direct CSV URL" },
    { url: `${CORS_PROXY_URL}${encodeURIComponent(PUBLISHED_CSV_URL)}`, description: "Proxied Published CSV URL (Primary)" },
    { url: `${CORS_PROXY_URL}${encodeURIComponent(DIRECT_CSV_URL)}`, description: "Proxied Direct CSV URL (Primary)" },
    { url: `${CORS_PROXY_URL_BACKUP}${encodeURIComponent(PUBLISHED_CSV_URL)}`, description: "Proxied Published CSV URL (Backup)" },
    { url: `${CORS_PROXY_URL_BACKUP}${encodeURIComponent(DIRECT_CSV_URL)}`, description: "Proxied Direct CSV URL (Backup)" }
  ];

  let lastError = null;

  // Try each URL in sequence
  for (const { url, description } of urlsToTry) {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const csvData = await response.text();
      
      // Check if we got valid data
      if (csvData && csvData.length > 10) {
        return csvData; // Return the raw CSV text
      } else {
        throw new Error('Invalid CSV data received (too short or empty)');
      }
    } catch (error) {
      lastError = error;
    }
  }

  // If we get here, all attempts failed
  throw lastError || new Error('Failed to fetch inventory data from all sources');
}

// Function to fetch HTML data from Google Sheets
async function fetchSheetHTML() {
  try {
    // Try direct fetch first
    let response;
    let html;
    
    try {
      // Fetch data from Google Sheets as HTML
      response = await fetch(PUBLISHED_SHEET_URL);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch from Google Sheets: ${response.status} ${response.statusText}`);
      }
      
      html = await response.text();
      if (html && html.length > 100) {
        return html;
      }
    } catch (directError) {
      // Try with primary CORS proxy as fallback
      try {
        response = await fetch(CORS_PROXY_URL + encodeURIComponent(PUBLISHED_SHEET_URL));
        
        if (!response.ok) {
          throw new Error(`Failed to fetch from Google Sheets via primary proxy: ${response.status} ${response.statusText}`);
        }
        
        html = await response.text();
        if (html && html.length > 100) {
          return html;
        }
      } catch (primaryProxyError) {
        // Try with backup CORS proxy as last resort
        try {
          response = await fetch(CORS_PROXY_URL_BACKUP + encodeURIComponent(PUBLISHED_SHEET_URL));
          
          if (!response.ok) {
            throw new Error(`Failed to fetch from Google Sheets via backup proxy: ${response.status} ${response.statusText}`);
          }
          
          html = await response.text();
          if (html && html.length > 100) {
            return html;
          }
        } catch (backupProxyError) {
          throw new Error(`All HTML fetch methods failed: ${backupProxyError.message}`);
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching sheet HTML:', error);
    return null;
  }
}

// Function to parse HTML data from Google Sheets
function parseSheetHTML(html) {
  try {
    // Create a DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Find the table with the data
    const tables = doc.querySelectorAll('table');
    if (!tables || tables.length === 0) {
      throw new Error('No tables found in the HTML');
    }
    
    // Usually the second table contains the data
    const dataTable = tables[1] || tables[0];
    const rows = dataTable.querySelectorAll('tr');
    
    // Skip the first row (header) and extract data
    const products = [];
    
    // Get header row to find column indices
    const headerRow = rows[0];
    const headers = headerRow ? Array.from(headerRow.querySelectorAll('td')).map(td => td.textContent.trim().toLowerCase()) : [];
    
    // Find column indices
    const nameIndex = headers.findIndex(h => h.includes('name'));
    const priceIndex = headers.findIndex(h => h.includes('price'));
    const stockIndex = headers.findIndex(h => h.includes('stock'));
    const descIndex = headers.findIndex(h => h.includes('desc'));
    const imageIndex = headers.findIndex(h => h.includes('image'));
    const idIndex = headers.findIndex(h => h.includes('id'));
    
    // Process data rows
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const cells = row.querySelectorAll('td');
      
      // Skip rows with insufficient cells
      if (!cells || cells.length < 3) continue;
      
      // Get cell values
      const name = (nameIndex >= 0 && cells[nameIndex]) ? cells[nameIndex].textContent.trim() : '';
      
      // Skip if no product name
      if (!name) continue;
      
      // Get other values
      const id = (idIndex >= 0 && cells[idIndex]) ? cells[idIndex].textContent.trim() : `product${i}`;
      
      // Parse price
      let price = 0;
      if (priceIndex >= 0 && cells[priceIndex]) {
        const priceText = cells[priceIndex].textContent.trim();
        const priceStr = priceText.replace(/[^\d.]/g, '');
        price = parseFloat(priceStr) || 0;
      }
      
      // Parse stock
      let stock = 0;
      if (stockIndex >= 0 && cells[stockIndex]) {
        const stockText = cells[stockIndex].textContent.trim().toLowerCase();
        const stockValue = parseInt(stockText);
        if (!isNaN(stockValue)) {
          stock = stockValue;
        } else if (stockText === 'in stock' || stockText === 'yes' || stockText === 'true') {
          stock = 10; // Default "in stock" value
        }
      }
      
      // Get description and image
      const description = (descIndex >= 0 && cells[descIndex]) ? cells[descIndex].textContent.trim() : '';
      const image = (imageIndex >= 0 && cells[imageIndex]) ? cells[imageIndex].textContent.trim() : '';
      
      // Add product to array
      products.push({
        id,
        name,
        price,
        stock,
        description,
        image
      });
    }
    
    return products;
  } catch (error) {
    console.error('Error parsing sheet HTML:', error);
    return [];
  }
}

// Function to fetch inventory data from Google Sheets
async function fetchInventoryFromSheets() {
  try {
    // Check if we have a recent cache
    const now = Date.now();
    if (sheetsInventoryCache && (now - lastFetchTime < CACHE_DURATION)) {
      return sheetsInventoryCache;
    }

    // Try CSV approach first (more reliable)
    let csvData;
    try {
      csvData = await tryFetchCSV();
    } catch (csvError) {
      csvData = null;
    }
    
    // If CSV approach worked, parse the data
    if (csvData && csvData.length > 0) {
      // Parse the CSV data into rows
      const csvRows = parseCSV(csvData);
      
      if (csvRows && csvRows.length > 0) {
        // Process the data into our inventory format
        const inventoryData = {};
        
        // Get the header row to find column indices
        const headerRow = csvRows[0];
        
        // Find column indices
        const nameIndex = headerRow.findIndex(h => h.toLowerCase().includes('name'));
        const priceIndex = headerRow.findIndex(h => h.toLowerCase().includes('price'));
        const stockIndex = headerRow.findIndex(h => h.toLowerCase().includes('stock'));
        const descIndex = headerRow.findIndex(h => h.toLowerCase().includes('desc'));
        const imageIndex = headerRow.findIndex(h => h.toLowerCase().includes('image'));
        const idIndex = headerRow.findIndex(h => h.toLowerCase().includes('id'));
        
        // Skip the header row and process each data row
        for (let i = 1; i < csvRows.length; i++) {
          const row = csvRows[i];
          
          // Skip empty rows
          if (!row || row.length < 3) continue;
          
          // Get the product ID (use ID column if available, otherwise use row index)
          const productId = (idIndex >= 0 && row[idIndex]) ? row[idIndex] : `product${i}`;
          
          // Skip if no product name
          if (!row[nameIndex] || row[nameIndex].trim() === '') continue;
          
          // Parse price and stock, with fallbacks
          const priceStr = row[priceIndex] ? row[priceIndex].replace(/[^\d.]/g, '') : '0';
          const price = parseFloat(priceStr) || 0;
          
          // Parse stock value - handle different formats
          let stock = 0;
          if (row[stockIndex]) {
            // Try to parse as integer
            const stockValue = parseInt(row[stockIndex]);
            if (!isNaN(stockValue)) {
              stock = stockValue;
            } else {
              // Check for text values
              const stockText = row[stockIndex].toLowerCase().trim();
              if (stockText === 'in stock' || stockText === 'yes' || stockText === 'true') {
                stock = 10; // Default "in stock" value
              }
            }
          }
          
          // Get description and image URL if available
          const description = (descIndex >= 0 && row[descIndex]) ? row[descIndex] : '';
          const imageUrl = (imageIndex >= 0 && row[imageIndex]) ? row[imageIndex] : '';
          
          // Add to inventory data
          inventoryData[productId] = {
            id: productId,
            name: row[nameIndex],
            price: price,
            stock: stock,
            description: description,
            image: imageUrl
          };
        }
        
        // Create featured products from the first three products
        createFeaturedProducts(inventoryData);
        
        // Update cache
        sheetsInventoryCache = inventoryData;
        lastFetchTime = now;
        
        return inventoryData;
      }
    }
    
    // If CSV approach failed, try HTML approach as fallback
    const htmlData = await fetchSheetHTML();
    if (htmlData) {
      const products = parseSheetHTML(htmlData);
      
      if (products && products.length > 0) {
        // Convert array to object with IDs as keys
        const inventoryData = {};
        products.forEach((product, index) => {
          const id = product.id || `product${index + 1}`;
          inventoryData[id] = {
            id: id,
            name: product.name,
            price: product.price,
            stock: product.stock,
            description: product.description || '',
            image: product.image || ''
          };
        });
        
        // Create featured products from the first three products
        createFeaturedProducts(inventoryData);
        
        // Update cache
        sheetsInventoryCache = inventoryData;
        lastFetchTime = now;
        
        return inventoryData;
      }
    }
    
    // If we get here, all approaches failed
    // Check if we have a local inventory as a last resort
    if (window.productInventory && Object.keys(window.productInventory).length > 0) {
      return window.productInventory;
    }
    
    throw new Error('No valid data found from any source');
  } catch (error) {
    console.error('Error fetching inventory from Google Sheets:', error);
    
    // Check if we have a local inventory as a last resort
    if (window.productInventory && Object.keys(window.productInventory).length > 0) {
      return window.productInventory;
    }
    
    return null;
  }
}

// Function to initialize inventory from Google Sheets
async function initializeInventoryFromSheets() {
  try {
    // Fetch inventory data from Google Sheets
    const sheetsData = await fetchInventoryFromSheets();
    
    if (sheetsData && Object.keys(sheetsData).length > 0) {
      // Set the global inventory object
      window.productInventory = sheetsData;
      
      // Ensure featured products are created
      if (!sheetsData['featured'] || !sheetsData['featured2'] || !sheetsData['featured3']) {
        createFeaturedProducts(window.productInventory);
      }
      
      console.log('Inventory initialized from Google Sheets');
      
      return true;
    } else {
      console.warn('Failed to fetch inventory from Google Sheets, using default inventory');
      
      // If we have a default inventory defined, use that
      if (typeof defaultInventory !== 'undefined') {
        window.productInventory = defaultInventory;
        return true;
      }
      
      return false;
    }
  } catch (error) {
    console.error('Error initializing inventory from sheets:', error);
    
    // If we have a default inventory defined, use that
    if (typeof defaultInventory !== 'undefined') {
      window.productInventory = defaultInventory;
      return true;
    }
    
    return false;
  }
}

// Function to refresh inventory from Google Sheets
async function refreshInventoryFromSheets() {
  try {
    // Attempt to fetch from Google Sheets
    const sheetsData = await fetchInventoryFromSheets();
    
    if (sheetsData && Object.keys(sheetsData).length > 0) {
      // Update the global inventory with the fetched data
      window.productInventory = sheetsData;
      
      // Check if these functions exist before calling them
      if (typeof updateProductGrid === 'function') {
        updateProductGrid();
      }
      
      if (typeof initializeFeaturedProduct === 'function') {
        initializeFeaturedProduct();
      } else if (typeof updateFeaturedProducts === 'function') {
        updateFeaturedProducts();
      }
      
      return true;
    } else {
      // If sheets data fetch failed, fall back to local inventory
      
      // If we have a default inventory defined, use that
      if (typeof defaultInventory !== 'undefined') {
        window.productInventory = defaultInventory;
        
        // Update the UI with the default inventory
        if (typeof updateProductGrid === 'function') {
          updateProductGrid();
        }
        
        if (typeof initializeFeaturedProduct === 'function') {
          initializeFeaturedProduct();
        } else if (typeof updateFeaturedProducts === 'function') {
          updateFeaturedProducts();
        }
        
        return true;
      }
      
      return false;
    }
  } catch (error) {
    console.error('Error refreshing inventory from sheets:', error);
    
    // Fall back to local inventory
    if (typeof defaultInventory !== 'undefined') {
      window.productInventory = defaultInventory;
      
      // Update the UI with the default inventory
      if (typeof updateProductGrid === 'function') {
        updateProductGrid();
      }
      
      if (typeof initializeFeaturedProduct === 'function') {
        initializeFeaturedProduct();
      } else if (typeof updateFeaturedProducts === 'function') {
        updateFeaturedProducts();
      }
      
      return true;
    }
    
    return false;
  }
}

// Function to create featured products from the first three products in the inventory
function createFeaturedProducts(inventoryData) {
  // Get all products sorted by ID
  const products = Object.values(inventoryData).sort((a, b) => {
    // Try to parse IDs as numbers for proper sorting
    const idA = parseInt(a.id);
    const idB = parseInt(b.id);
    
    if (!isNaN(idA) && !isNaN(idB)) {
      return idA - idB;
    }
    
    // Fall back to string comparison
    return a.id.localeCompare(b.id);
  });
  
  if (products.length > 0) {
    // First product as main featured product
    inventoryData['featured'] = {
      id: 'featured',
      name: products[0].name,
      price: products[0].price,
      stock: products[0].stock,
      description: products[0].description || 'Our flagship product featuring a custom design.',
      image: products[0].image || 'assets/store/featured-deck1.jpg'
    };
    
    // Second featured product (for slideshow)
    if (products.length > 1) {
      inventoryData['featured2'] = {
        id: 'featured2',
        name: products[1].name,
        price: products[1].price,
        stock: products[1].stock,
        description: products[1].description || 'Premium product with unique design.',
        image: products[1].image || 'assets/store/featured-deck2.jpg'
      };
      
      // Third featured product (for slideshow)
      if (products.length > 2) {
        inventoryData['featured3'] = {
          id: 'featured3',
          name: products[2].name,
          price: products[2].price,
          stock: products[2].stock,
          description: products[2].description || 'Limited edition product with professional-grade construction.',
          image: products[2].image || 'assets/store/featured-deck3.jpg'
        };
      }
    }
  }
  
  return inventoryData;
}

// Make functions available globally
window.refreshInventoryFromSheets = refreshInventoryFromSheets;
window.initializeInventoryFromSheets = initializeInventoryFromSheets;
window.checkInventoryLoaded = checkInventoryLoaded;
window.fetchInventoryFromSheets = fetchInventoryFromSheets;
window.tryFetchCSV = tryFetchCSV;
window.parseSheetHTML = parseSheetHTML;

// Also expose them as global variables for backward compatibility
var refreshInventoryFromSheets = window.refreshInventoryFromSheets;
var initializeInventoryFromSheets = window.initializeInventoryFromSheets;
var checkInventoryLoaded = window.checkInventoryLoaded;
var fetchInventoryFromSheets = window.fetchInventoryFromSheets;

// Override the original loadInventory function to use Google Sheets
const originalLoadInventory = window.loadInventory;
window.loadInventory = async function() {
  // First try to load from Google Sheets
  const sheetsSuccess = await initializeInventoryFromSheets();
  
  // If that fails, fall back to the original function
  if (!sheetsSuccess && originalLoadInventory) {
    return originalLoadInventory();
  }
  
  return window.productInventory;
};

// Override the original saveInventory function
const originalSaveInventory = window.saveInventory;
window.saveInventory = function() {
  // First save locally
  if (originalSaveInventory) {
    originalSaveInventory();
  } else {
    localStorage.setItem('productInventory', JSON.stringify(window.productInventory));
  }
};

// Initialize when the document is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Check if we're on a page that needs inventory
  if (document.getElementById('products-grid') || 
      document.getElementById('inventory-table')) {
    initializeInventoryFromSheets();
  }
});

// Function to update Google Sheets inventory after a purchase
async function updateGoogleSheetsInventory(purchasedItems) {
  try {
    // First update the local inventory
    purchasedItems.forEach(item => {
      const product = window.productInventory[item.id];
      if (product) {
        // Decrease the stock by the purchased quantity
        product.stock = Math.max(0, product.stock - item.quantity);
      }
    });
    
    // Then try to update the remote inventory
    // Use no-cors mode to avoid CORS issues, but this means we can't check the response
    const response = await fetch(INVENTORY_API_URL, {
      method: 'POST',
      mode: 'no-cors', // This prevents CORS errors but also means we can't read the response
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'updateInventory',
        items: purchasedItems
      })
    });
    
    // Since we're using no-cors, we can't actually check the response
    // We'll just assume it worked and return true
    return true;
  } catch (error) {
    console.error('Error updating Google Sheets inventory:', error);
    
    // Even if the remote update fails, we've already updated the local inventory
    // So we'll return true to indicate that the purchase can proceed
    return true;
  }
}

// Make the function available globally
window.updateGoogleSheetsInventory = updateGoogleSheetsInventory; 
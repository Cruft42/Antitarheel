// Inventory Management System

// Default data URLs for fallback images
const DEFAULT_DECK_DATA_URL = 'assets/store/default-deck.svg';
const DEFAULT_FEATURED_DATA_URL = 'assets/store/default-featured.svg';

// Initial inventory data
window.productInventory = {
  // Featured product
  "featured": {
    id: "featured",
    name: "Limited Edition Pro Deck",
    price: 79.99,
    stock: 5,
    description: "Our flagship skateboard deck featuring a custom design by professional artists. Made with 7-ply maple wood for durability and performance.",
    image: "assets/store/featured-deck1.jpg",
    fallbackImage: DEFAULT_FEATURED_DATA_URL
  },
  // Regular products
  "1": {
    id: "1",
    name: "Classic Black Deck",
    price: 59.99,
    stock: 10,
    description: "Sleek black design with minimalist graphics. 7-ply maple construction.",
    image: "assets/store/deck1.jpg",
    fallbackImage: DEFAULT_DECK_DATA_URL
  },
  "2": {
    id: "2",
    name: "Street Art Deck",
    price: 64.99,
    stock: 8,
    description: "Featuring original street art designs. Perfect for urban skating.",
    image: "assets/store/deck2.jpg",
    fallbackImage: DEFAULT_DECK_DATA_URL
  },
  "3": {
    id: "3",
    name: "Neon Glow Deck",
    price: 69.99,
    stock: 6,
    description: "Vibrant neon colors on a black background. Stands out at night.",
    image: "assets/store/deck3.jpg",
    fallbackImage: DEFAULT_DECK_DATA_URL
  },
  "4": {
    id: "4",
    name: "Retro Wave Deck",
    price: 62.99,
    stock: 12,
    description: "80s inspired synthwave design. Nostalgic and stylish.",
    image: "assets/store/deck4.jpg",
    fallbackImage: DEFAULT_DECK_DATA_URL
  },
  "5": {
    id: "5",
    name: "Galaxy Deck",
    price: 74.99,
    stock: 4,
    description: "Deep space nebula design. Out of this world performance.",
    image: "assets/store/deck5.jpg",
    fallbackImage: DEFAULT_DECK_DATA_URL
  },
  "6": {
    id: "6",
    name: "Geometric Deck",
    price: 59.99,
    stock: 9,
    description: "Modern geometric patterns in bold colors. Clean and contemporary.",
    image: "assets/store/deck6.jpg",
    fallbackImage: DEFAULT_DECK_DATA_URL
  },
  "7": {
    id: "7",
    name: "Floral Deck",
    price: 67.99,
    stock: 7,
    description: "Elegant floral patterns. Brings nature to your skating experience.",
    image: "assets/store/deck7.jpg",
    fallbackImage: DEFAULT_DECK_DATA_URL
  },
  "8": {
    id: "8",
    name: "Graffiti Deck",
    price: 65.99,
    stock: 11,
    description: "Bold graffiti art inspired design. Urban culture at its finest.",
    image: "assets/store/deck8.jpg",
    fallbackImage: DEFAULT_DECK_DATA_URL
  }
};

// Load inventory from localStorage
function loadInventory() {
  return new Promise((resolve) => {
    // Check if we already have inventory from Google Sheets
    if (window.inventoryLoadedFromSheets) {
      console.log("Inventory already loaded from Google Sheets, skipping local inventory");
      resolve(window.productInventory);
      return;
    }
    
    const savedInventory = localStorage.getItem('productInventory');
    if (savedInventory) {
      // Merge saved inventory with default inventory
      // This ensures new products are added even if they weren't in the saved inventory
      const parsedInventory = JSON.parse(savedInventory);
      
      // Update the productInventory with saved values
      Object.keys(parsedInventory).forEach(key => {
        if (window.productInventory[key]) {
          window.productInventory[key].stock = parsedInventory[key].stock;
        }
      });
    }
    
    // Save the current inventory state
    saveInventory();
    
    resolve(window.productInventory);
  });
}

// Save inventory to localStorage
function saveInventory() {
  localStorage.setItem('productInventory', JSON.stringify(window.productInventory));
}

// Check if a product is in stock
function isInStock(productId) {
  return window.productInventory[productId] && window.productInventory[productId].stock > 0;
}

// Get current stock level for a product
function getStockLevel(productId) {
  return window.productInventory[productId] ? window.productInventory[productId].stock : 0;
}

// Decrease stock level when an item is purchased
function decreaseStock(productId, quantity = 1) {
  if (window.productInventory[productId] && window.productInventory[productId].stock >= quantity) {
    window.productInventory[productId].stock -= quantity;
    saveInventory();
    return true;
  }
  return false;
}

// Increase stock level (for returns or inventory updates)
function increaseStock(productId, quantity = 1) {
  if (window.productInventory[productId]) {
    window.productInventory[productId].stock += quantity;
    saveInventory();
    return true;
  }
  return false;
}

// Get product details
function getProductDetails(productId) {
  return window.productInventory[productId] || null;
}

// Get all products
function getAllProducts() {
  return Object.values(window.productInventory);
}

// Reset inventory to initial values (for testing)
function resetInventory() {
  localStorage.removeItem('productInventory');
  location.reload();
}

// Initialize inventory on page load
document.addEventListener('DOMContentLoaded', loadInventory); 
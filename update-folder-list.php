<?php
/**
 * Update Folder List Script
 * 
 * This script rebuilds the folder_list.txt file by scanning the
 * wagers-bay-dates directory to ensure only folders that actually
 * exist are included in the list.
 * 
 * Use this script after manually deleting date folders to ensure
 * the folder_list.txt file stays in sync with the actual directories.
 */

// Disable error display
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Set content type to JSON for API response
header('Content-Type: application/json');

// Start output buffering
ob_start();

// Define constants
define('BASE_DIR', 'assets/images/wagers-bay-dates/');
define('FOLDER_LIST_FILE', BASE_DIR . 'folder_list.txt');

// Initialize response
$response = [
    'success' => false,
    'message' => '',
    'folder_count' => 0,
    'folders' => []
];

try {
    // Check if the base directory exists
    if (!is_dir(BASE_DIR)) {
        throw new Exception("Base directory does not exist: " . BASE_DIR);
    }
    
    // Get all folders in the wagers-bay-dates directory
    $allItems = scandir(BASE_DIR);
    $dateFolders = [];
    
    // Filter for valid date folders
    foreach ($allItems as $item) {
        // Skip . and .. and non-directories
        if ($item === '.' || $item === '..' || !is_dir(BASE_DIR . $item)) {
            continue;
        }
        
        // Check if the folder name matches the date format (YYYY-MM-DD)
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $item)) {
            // Check if directory has images
            $hasImages = hasImages(BASE_DIR . $item);
            
            if ($hasImages) {
                $dateFolders[] = $item;
                $response['folders'][] = [
                    'name' => $item,
                    'has_images' => true
                ];
            } else {
                $response['folders'][] = [
                    'name' => $item,
                    'has_images' => false,
                    'note' => 'Directory exists but contains no images'
                ];
            }
        }
    }
    
    // Sort dates in descending order (newest first)
    rsort($dateFolders);
    
    // Update the folder list file
    if (file_put_contents(FOLDER_LIST_FILE, implode("\n", $dateFolders) . "\n")) {
        $response['success'] = true;
        $response['message'] = "Folder list updated successfully";
        $response['folder_count'] = count($dateFolders);
    } else {
        throw new Exception("Failed to write to folder list file");
    }
    
} catch (Exception $e) {
    $response['success'] = false;
    $response['message'] = $e->getMessage();
}

// End output buffering
ob_end_clean();

// Output response
echo json_encode($response, JSON_PRETTY_PRINT);

/**
 * Check if a directory has valid image files
 */
function hasImages($dirPath) {
    // List of common image extensions
    $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    
    // Get all files in the directory
    $files = scandir($dirPath);
    
    foreach ($files as $file) {
        // Skip . and .. directories
        if ($file === '.' || $file === '..') {
            continue;
        }
        
        // Get file extension
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        
        // Check if it's an image
        if (in_array($ext, $imageExtensions)) {
            return true; // Found at least one image
        }
    }
    
    return false; // No images found
}

exit;
?> 
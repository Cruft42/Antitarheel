<?php
/**
 * Image Listing Script
 * 
 * This script lists all images in a specific date directory
 * for use with the New Wagers Bay slideshow when image-locations.js
 * doesn't have the data.
 */

// Set content type to JSON
header('Content-Type: application/json');

// Disable error display
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Start output buffering to prevent unexpected output
ob_start();

// Initialize response array
$response = [
    'success' => false,
    'date' => '',
    'images' => [],
    'directory_exists' => false
];

try {
    // Check if date parameter is provided
    if (empty($_GET['date'])) {
        throw new Exception('Missing date parameter');
    }
    
    // Sanitize the date parameter
    $date = trim($_GET['date']);
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        throw new Exception('Invalid date format. Expected YYYY-MM-DD');
    }
    
    $response['date'] = $date;
    
    // Create the path to the date directory
    $dirPath = 'assets/images/wagers-bay-dates/' . $date;
    
    // Check if directory exists
    if (!is_dir($dirPath)) {
        $response['directory_exists'] = false;
        $response['message'] = 'Directory does not exist: ' . $dirPath;
        throw new Exception('Directory does not exist: ' . $dirPath);
    }
    
    $response['directory_exists'] = true;
    
    // Get all files in the directory
    $files = scandir($dirPath);
    
    // Filter out non-image files
    $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    $images = [];
    
    foreach ($files as $file) {
        // Skip . and .. directories
        if ($file === '.' || $file === '..') {
            continue;
        }
        
        // Get file extension
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        
        // Check if it's an image
        if (in_array($ext, $imageExtensions)) {
            $filePath = $dirPath . '/' . $file;
            
            // Check if file is readable
            if (is_readable($filePath)) {
                $images[] = $filePath;
            }
        }
    }
    
    // Return success only if images were found
    if (count($images) > 0) {
        $response['success'] = true;
        $response['images'] = $images;
        $response['count'] = count($images);
    } else {
        $response['message'] = 'No images found in directory: ' . $dirPath;
        throw new Exception('No images found in directory: ' . $dirPath);
    }
    
} catch (Exception $e) {
    // Set error message
    $response['success'] = false;
    $response['message'] = $e->getMessage();
}

// End output buffering
ob_end_clean();

// Return JSON response
echo json_encode($response);
exit;
?> 
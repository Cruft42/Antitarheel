<?php
/**
 * Simplified Wagers Bay Image Uploader
 * 
 * This script handles uploading images with date selection,
 * creating the appropriate directory structure, and minimizing
 * potential error points.
 */

// Increase limits for larger uploads (though .htaccess should handle this)
ini_set('upload_max_filesize', '100M');
ini_set('post_max_size', '100M');
ini_set('memory_limit', '512M');
ini_set('max_execution_time', '600');
ini_set('max_input_time', '600');

// Enable full error reporting but don't display errors directly
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Start output buffering to catch any unexpected output
ob_start();

// Set JSON content type header
header('Content-Type: application/json');

// Define file paths
define('FOLDER_LIST_FILE', 'assets/images/wagers-bay-dates/folder_list.txt');
define('IMAGE_LOCATIONS_JS', 'image-locations.js');

// Initialize response array
$response = [
    'success' => false,
    'message' => '',
    'date' => '',
    'files' => [],
    'debug' => []
];

try {
    // Debug info
    $response['debug']['request_method'] = $_SERVER['REQUEST_METHOD'];
    $response['debug']['post_count'] = count($_POST);
    $response['debug']['files_count'] = isset($_FILES['images']) ? count($_FILES['images']) : 0;
    
    // Check if the request is POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception("Invalid request method. Expected POST, got {$_SERVER['REQUEST_METHOD']}");
    }
    
    // Log raw POST data for debugging
    $response['debug']['post_keys'] = array_keys($_POST);
    
    // Check if we have a date (more carefully)
    if (!isset($_POST['date']) || empty(trim($_POST['date']))) {
        throw new Exception("Missing required parameter: date");
    }
    
    // Sanitize and validate the date
    $date = trim($_POST['date']);
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        throw new Exception("Invalid date format. Expected YYYY-MM-DD, got: {$date}");
    }
    
    $response['date'] = $date;
    
    // Check if files were uploaded
    if (!isset($_FILES['images']) || empty($_FILES['images']) || empty($_FILES['images']['name'][0])) {
        throw new Exception("No files were uploaded");
    }
    
    // Define the target directory (using the correct path structure)
    $baseUploadDir = 'assets/images/wagers-bay-dates/';
    
    // Ensure base upload directory exists
    if (!is_dir($baseUploadDir)) {
        if (!mkdir($baseUploadDir, 0755, true)) {
            throw new Exception("Failed to create base upload directory: {$baseUploadDir}");
        }
    }
    
    // Create the date-specific directory
    $dateUploadDir = $baseUploadDir . $date . '/';
    if (!is_dir($dateUploadDir)) {
        if (!mkdir($dateUploadDir, 0755, true)) {
            throw new Exception("Failed to create date upload directory: {$dateUploadDir}");
        }
    }
    
    // Make the directories writable just to be safe
    chmod($baseUploadDir, 0755);
    chmod($dateUploadDir, 0755);
    
    // Process the uploaded files
    $uploadedFiles = [];
    
    // Determine if we're dealing with a single file or multiple files
    $isMultiple = is_array($_FILES['images']['name']);
    
    if ($isMultiple) {
        // Multiple files
        for ($i = 0; $i < count($_FILES['images']['name']); $i++) {
            // Skip if there was an upload error
            if ($_FILES['images']['error'][$i] !== UPLOAD_ERR_OK) {
                $errorMessage = uploadErrorMessage($_FILES['images']['error'][$i]);
                $response['debug']['upload_errors'][] = "File {$i}: {$errorMessage}";
                continue;
            }
            
            // Get file info for validation
            $fileName = $_FILES['images']['name'][$i];
            $fileSize = $_FILES['images']['size'][$i];
            $fileType = $_FILES['images']['type'][$i];
            $fileTmpName = $_FILES['images']['tmp_name'][$i];
            
            // Only allow image files
            if (!preg_match('/^image\//', $fileType)) {
                $response['debug']['skipped_files'][] = "File {$fileName} skipped: not an image";
                continue;
            }
            
            // Create a unique filename
            $uniqueFilename = uniqid() . '_' . preg_replace('/[^a-zA-Z0-9\._-]/', '', $fileName);
            $targetFilePath = $dateUploadDir . $uniqueFilename;
            
            // Move the uploaded file
            if (move_uploaded_file($fileTmpName, $targetFilePath)) {
                $relativePath = 'assets/images/wagers-bay-dates/' . $date . '/' . $uniqueFilename;
                $uploadedFiles[] = [
                    'name' => $fileName,
                    'path' => $relativePath
                ];
            } else {
                $response['debug']['move_errors'][] = "Failed to move {$fileName} to {$targetFilePath}";
            }
        }
    } else {
        // Single file
        if ($_FILES['images']['error'] === UPLOAD_ERR_OK) {
            // Get file info for validation
            $fileName = $_FILES['images']['name'];
            $fileSize = $_FILES['images']['size'];
            $fileType = $_FILES['images']['type'];
            $fileTmpName = $_FILES['images']['tmp_name'];
            
            // Only allow image files
            if (preg_match('/^image\//', $fileType)) {
                // Create a unique filename
                $uniqueFilename = uniqid() . '_' . preg_replace('/[^a-zA-Z0-9\._-]/', '', $fileName);
                $targetFilePath = $dateUploadDir . $uniqueFilename;
                
                // Move the uploaded file
                if (move_uploaded_file($fileTmpName, $targetFilePath)) {
                    $relativePath = 'assets/images/wagers-bay-dates/' . $date . '/' . $uniqueFilename;
                    $uploadedFiles[] = [
                        'name' => $fileName,
                        'path' => $relativePath
                    ];
                } else {
                    $response['debug']['move_errors'][] = "Failed to move {$fileName} to {$targetFilePath}";
                }
            } else {
                $response['debug']['skipped_files'][] = "File {$fileName} skipped: not an image";
            }
        } else {
            $errorMessage = uploadErrorMessage($_FILES['images']['error']);
            $response['debug']['upload_errors'][] = "File upload error: {$errorMessage}";
        }
    }
    
    // Check if any files were uploaded successfully
    if (empty($uploadedFiles)) {
        throw new Exception("Failed to upload any files. Please check file types and permissions.");
    }

    // Update folder_list.txt with the new date
    updateFolderList($date);
    
    // Update image-locations.js with the new images
    updateImageLocations($date, array_column($uploadedFiles, 'path'));
    
    // Success response
    $response['success'] = true;
    $response['message'] = 'Files uploaded successfully';
    $response['files'] = $uploadedFiles;
    $response['file_count'] = count($uploadedFiles);
    
    // Add paths to response for updating the image-locations.js
    $response['filePaths'] = array_column($uploadedFiles, 'path');
    
    // Check for any unexpected output that might break JSON
    $unexpectedOutput = ob_get_clean();
    if (!empty($unexpectedOutput)) {
        $response['debug_output'] = $unexpectedOutput;
    } else {
        ob_end_clean(); // No unexpected output, just end buffer
    }
    
    // Output the response as JSON
    echo json_encode($response, JSON_PRETTY_PRINT);
    
} catch (Throwable $e) {
    // Discard any output that may have been generated
    ob_end_clean();
    
    // Error response
    $response['success'] = false;
    $response['message'] = $e->getMessage();
    $response['file'] = $e->getFile();
    $response['line'] = $e->getLine();
    
    // Output the response as JSON
    echo json_encode($response, JSON_PRETTY_PRINT);
}

/**
 * Function to update folder_list.txt with the new date
 */
function updateFolderList($date) {
    $folderListFile = FOLDER_LIST_FILE;
    $baseDir = 'assets/images/wagers-bay-dates/';
    
    // Create file if it doesn't exist
    if (!file_exists($folderListFile)) {
        if (!file_put_contents($folderListFile, $date . "\n")) {
            throw new Exception("Failed to create folder list file");
        }
        return true;
    }
    
    // Read existing dates
    $content = file_get_contents($folderListFile);
    if ($content === false) {
        throw new Exception("Failed to read folder list file");
    }
    
    // Split content into lines and filter empty lines
    $dates = array_filter(explode("\n", $content), 'trim');
    
    // Verify all dates in the list still have corresponding folders
    $validDates = [];
    foreach ($dates as $existingDate) {
        if (is_dir($baseDir . $existingDate)) {
            $validDates[] = $existingDate;
        }
    }
    
    // Add the new date if it's not already in the list
    if (!in_array($date, $validDates)) {
        $validDates[] = $date;
    }
    
    // Sort dates in descending order (newest first)
    rsort($validDates);
    
    // Write back to file
    if (!file_put_contents($folderListFile, implode("\n", $validDates) . "\n")) {
        throw new Exception("Failed to update folder list file");
    }
    
    return true;
}

/**
 * Function to update image-locations.js with the new images
 */
function updateImageLocations($date, $filePaths) {
    $imageLocationsFile = IMAGE_LOCATIONS_JS;
    
    // If file doesn't exist, create a basic structure
    if (!file_exists($imageLocationsFile)) {
        $content = "// This file contains all image locations for the New Wagers Bay slideshow\n";
        $content .= "// Organized by date for easy reference\n\n";
        $content .= "const imageLocations = {\n};\n";
        
        if (!file_put_contents($imageLocationsFile, $content)) {
            throw new Exception("Failed to create image locations file");
        }
    }
    
    // Read the existing file
    $content = file_get_contents($imageLocationsFile);
    if ($content === false) {
        throw new Exception("Failed to read image locations file");
    }
    
    // Format the new paths as JSON array items
    $formattedPaths = array_map(function($path) {
        return "    \"$path\"";
    }, $filePaths);
    
    // Create the entry for this date
    $newEntry = "  \"$date\": [\n" . implode(",\n", $formattedPaths) . "\n  ]";
    
    // Check if this date already exists in the file
    if (preg_match("/\"$date\"\s*:\s*\[\s*.*?\s*\]/s", $content)) {
        // Replace the existing entry
        $content = preg_replace("/\"$date\"\s*:\s*\[\s*.*?\s*\]/s", $newEntry, $content);
    } else {
        // Add as a new entry
        // Find the position after the first brace
        $pos = strpos($content, '{') + 1;
        
        // Insert at the beginning of the object
        $content = substr_replace($content, "\n" . $newEntry . ",", $pos, 0);
    }
    
    // Write the updated content back to the file
    if (!file_put_contents($imageLocationsFile, $content)) {
        throw new Exception("Failed to update image locations file");
    }
    
    return true;
}

/**
 * Function to translate upload error codes to messages
 */
function uploadErrorMessage($errorCode) {
    switch ($errorCode) {
        case UPLOAD_ERR_INI_SIZE:
            return 'The uploaded file exceeds the upload_max_filesize directive in php.ini';
        case UPLOAD_ERR_FORM_SIZE:
            return 'The uploaded file exceeds the MAX_FILE_SIZE directive in the HTML form';
        case UPLOAD_ERR_PARTIAL:
            return 'The uploaded file was only partially uploaded';
        case UPLOAD_ERR_NO_FILE:
            return 'No file was uploaded';
        case UPLOAD_ERR_NO_TMP_DIR:
            return 'Missing a temporary folder';
        case UPLOAD_ERR_CANT_WRITE:
            return 'Failed to write file to disk';
        case UPLOAD_ERR_EXTENSION:
            return 'A PHP extension stopped the file upload';
        default:
            return 'Unknown upload error';
    }
}

exit;
?> 
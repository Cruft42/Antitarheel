<?php
/**
 * Wagers Bay Image Upload Handler
 * 
 * This script handles uploading images for the Wagers Bay calendar.
 * It creates a folder for the date (if not exists) and saves the images there.
 * It also updates the image-locations.js file with the new images.
 */

// Ensure errors are not displayed but logged
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Set headers for JSON response
header('Content-Type: application/json');

// Global error handler to ensure JSON response
function handleFatalErrors() {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        $response = [
            'success' => false,
            'message' => 'Fatal server error: ' . $error['message']
        ];
        echo json_encode($response);
        exit;
    }
}
register_shutdown_function('handleFatalErrors');

// Define constants
define('UPLOAD_DIR', '../assets/images/wagers-bay-dates/');
define('IMAGE_LOCATIONS_FILE', '../image-locations.js');
define('FOLDER_LIST_FILE', '../assets/images/wagers-bay-dates/folder_list.txt');

// Function to sanitize the date input
function sanitizeDate($date) {
    // Validate date format (YYYY-MM-DD)
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        return false;
    }
    
    // Further validation by converting to a DateTime object
    try {
        $dateObj = new DateTime($date);
        return $dateObj->format('Y-m-d'); // Returns date in YYYY-MM-DD format
    } catch (Exception $e) {
        return false;
    }
}

// Function to create directory if it doesn't exist
function createDirectoryIfNotExists($path) {
    if (!file_exists($path)) {
        return mkdir($path, 0755, true);
    }
    return true;
}

// Function to update the image-locations.js file
function updateImageLocationsFile($date, $filePaths) {
    // Check if file exists first
    if (!file_exists(IMAGE_LOCATIONS_FILE)) {
        // Create a basic template if the file doesn't exist
        $template = "// This file contains all image locations for the New Wagers Bay slideshow\n// Organized by date for easy reference\n\nconst imageLocations = {\n};\n";
        file_put_contents(IMAGE_LOCATIONS_FILE, $template);
    }
    
    // Read current file content
    $fileContent = file_get_contents(IMAGE_LOCATIONS_FILE);
    if ($fileContent === false) {
        throw new Exception('Could not read image locations file');
    }
    
    // Check if the date already exists in the file
    $datePattern = '/"' . preg_quote($date, '/') . '"\s*:\s*\[([^\]]*)\]/';
    
    // Format the new file paths as a JSON array string
    $filePathsJSON = "";
    foreach ($filePaths as $index => $path) {
        $filePathsJSON .= '"' . addslashes($path) . '"';
        if ($index < count($filePaths) - 1) {
            $filePathsJSON .= ', ';
        }
    }
    
    if (preg_match($datePattern, $fileContent)) {
        // Date exists, update the entry
        $fileContent = preg_replace(
            $datePattern,
            '"' . $date . '": [' . $filePathsJSON . ']',
            $fileContent
        );
    } else {
        // Date doesn't exist, add a new entry
        // Find the appropriate place to insert (right after the opening const imageLocations = {)
        $insertPosition = strpos($fileContent, 'const imageLocations = {') + strlen('const imageLocations = {');
        if ($insertPosition === false) {
            throw new Exception('Could not find insertion point in image locations file');
        }
        $insertContent = "\n  \"" . $date . "\": [" . $filePathsJSON . "],";
        $fileContent = substr_replace($fileContent, $insertContent, $insertPosition, 0);
    }
    
    // Write the updated content back to the file
    $result = file_put_contents(IMAGE_LOCATIONS_FILE, $fileContent);
    if ($result === false) {
        throw new Exception('Could not write to image locations file');
    }
    return true;
}

// Function to update the folder_list.txt file
function updateFolderListFile($date) {
    // Create the file if it doesn't exist
    if (!file_exists(FOLDER_LIST_FILE)) {
        file_put_contents(FOLDER_LIST_FILE, '');
    }
    
    // Read current folder list
    $folderList = file(FOLDER_LIST_FILE, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($folderList === false) {
        throw new Exception('Could not read folder list file');
    }
    
    // Check if date already exists in the list
    if (!in_array($date, $folderList)) {
        // Add the new date to the list
        $folderList[] = $date;
        
        // Sort the dates (newest first)
        rsort($folderList);
        
        // Write the updated list back to the file
        $result = file_put_contents(FOLDER_LIST_FILE, implode(PHP_EOL, $folderList) . PHP_EOL);
        if ($result === false) {
            throw new Exception('Could not write to folder list file');
        }
    }
    
    return true;
}

// Process the upload request
$response = [
    'success' => false,
    'message' => '',
    'date' => '',
    'filePaths' => []
];

try {
    // Check if request is POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Invalid request method');
    }
    
    // Validate date
    if (!isset($_POST['date']) || empty($_POST['date'])) {
        throw new Exception('Date is required');
    }
    
    $date = sanitizeDate($_POST['date']);
    if (!$date) {
        throw new Exception('Invalid date format');
    }
    
    // Check if images were uploaded
    if (!isset($_FILES['images']) || empty($_FILES['images'])) {
        throw new Exception('No images uploaded');
    }
    
    // Create target directory
    $targetDir = UPLOAD_DIR . $date . '/';
    if (!createDirectoryIfNotExists($targetDir)) {
        throw new Exception('Failed to create directory: ' . $targetDir);
    }
    
    // Process each uploaded file
    $uploadedFiles = [];
    $fileCount = is_array($_FILES['images']['name']) ? count($_FILES['images']['name']) : 0;
    
    if ($fileCount == 0) {
        throw new Exception('No files were received');
    }
    
    for ($i = 0; $i < $fileCount; $i++) {
        // Skip if there was an error
        if ($_FILES['images']['error'][$i] !== UPLOAD_ERROR_OK) {
            continue;
        }
        
        // Get file info
        $fileName = $_FILES['images']['name'][$i];
        $tmpName = $_FILES['images']['tmp_name'][$i];
        $fileType = $_FILES['images']['type'][$i];
        $fileSize = $_FILES['images']['size'][$i];
        
        // Validate file is an image
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!in_array($fileType, $allowedTypes)) {
            continue; // Skip non-image files
        }
        
        // Generate a unique filename
        $fileExtension = pathinfo($fileName, PATHINFO_EXTENSION);
        $newFileName = uniqid() . '.' . $fileExtension;
        $targetFilePath = $targetDir . $newFileName;
        
        // Move the file to the target directory
        if (move_uploaded_file($tmpName, $targetFilePath)) {
            // Add the file path to the list (format for image-locations.js)
            $relativePath = 'assets/images/wagers-bay-dates/' . $date . '/' . $newFileName;
            $uploadedFiles[] = $relativePath;
        }
    }
    
    // Check if any files were successfully uploaded
    if (empty($uploadedFiles)) {
        throw new Exception('No files were uploaded successfully');
    }
    
    // Update the image-locations.js file
    if (!updateImageLocationsFile($date, $uploadedFiles)) {
        throw new Exception('Failed to update image locations file');
    }
    
    // Update the folder_list.txt file
    if (!updateFolderListFile($date)) {
        throw new Exception('Failed to update folder list file');
    }
    
    // Success response
    $response['success'] = true;
    $response['message'] = 'Images uploaded successfully';
    $response['date'] = $date;
    $response['filePaths'] = $uploadedFiles;
    
} catch (Exception $e) {
    $response['message'] = $e->getMessage();
}

// Return JSON response
echo json_encode($response);
exit; 
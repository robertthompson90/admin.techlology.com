<?php
// ajax/saveNewImage.php
// Creates a new "virtual master" asset in media_assets.
header('Content-Type: application/json');
include '../inc/loginanddb.php'; // Ensure this path is correct

if (!isset($_SESSION['user'])) {
    echo json_encode(['success' => false, 'error' => 'User not authenticated.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Invalid request method.']);
    exit;
}

// Input parameters from the JavaScript client
$source_media_asset_id = isset($_POST['source_media_asset_id']) ? (int)$_POST['source_media_asset_id'] : 0;
$current_crop_json = isset($_POST['current_crop_json']) ? $_POST['current_crop_json'] : '{}';
$current_filters_json = isset($_POST['current_filters_json']) ? $_POST['current_filters_json'] : '{}';

// Parameters for the new virtual master's metadata
$new_admin_title = isset($_POST['new_admin_title']) ? trim($_POST['new_admin_title']) : 'New Virtual Image'; 
$new_public_caption = isset($_POST['new_public_caption']) ? trim($_POST['new_public_caption']) : '';
$new_alt_text = isset($_POST['new_alt_text']) ? trim($_POST['new_alt_text']) : '';
$new_attribution = isset($_POST['new_attribution']) ? trim($_POST['new_attribution']) : '';


// Validate essential input
if (empty($source_media_asset_id)) {
    echo json_encode(['success' => false, 'error' => 'Source media asset ID is required.']);
    exit;
}

// Validate JSON strings
json_decode($current_crop_json);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(['success' => false, 'error' => 'Invalid JSON in current_crop_json. Error: ' . json_last_error_msg()]);
    exit;
}
json_decode($current_filters_json);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(['success' => false, 'error' => 'Invalid JSON in current_filters_json. Error: ' . json_last_error_msg()]);
    exit;
}

try {
    $db->beginTransaction();

    // Fetch the original source asset to determine its physical file details
    $stmtSource = $db->prepare("SELECT id, file_path, file_size, file_hash, physical_source_asset_id FROM media_assets WHERE id = ?");
    $stmtSource->execute([$source_media_asset_id]);
    $sourceAsset = $stmtSource->fetch(PDO::FETCH_ASSOC);

    if (!$sourceAsset) {
        $db->rollBack();
        echo json_encode(['success' => false, 'error' => 'Original source media asset not found.']);
        exit;
    }

    // Determine the ultimate physical source ID and its details
    $true_physical_source_id = $sourceAsset['physical_source_asset_id'] ? $sourceAsset['physical_source_asset_id'] : $sourceAsset['id'];
    
    $physicalAssetDetails = $sourceAsset; // Assume current source is physical initially
    if ($sourceAsset['physical_source_asset_id']) { // If the source asset was already virtual, get its physical parent's details
        $stmtPhysical = $db->prepare("SELECT file_path, file_size, file_hash FROM media_assets WHERE id = ?");
        $stmtPhysical->execute([$true_physical_source_id]);
        $physicalAssetDetailsResult = $stmtPhysical->fetch(PDO::FETCH_ASSOC);
        if (!$physicalAssetDetailsResult) {
            $db->rollBack();
            echo json_encode(['success' => false, 'error' => 'True physical source asset not found.']);
            exit;
        }
        // Overwrite with the actual physical asset's details for file_path, size, hash
        $physicalAssetDetails['file_path'] = $physicalAssetDetailsResult['file_path'];
        $physicalAssetDetails['file_size'] = $physicalAssetDetailsResult['file_size'];
        $physicalAssetDetails['file_hash'] = $physicalAssetDetailsResult['file_hash'];
    }

    // Insert the new virtual master asset
    $stmtInsert = $db->prepare(
        "INSERT INTO media_assets 
            (file_path, file_size, file_hash, physical_source_asset_id, 
             default_crop, filter_state, 
             admin_title, caption, alt_text, attribution, 
             created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())"
    );

    $stmtInsert->execute([
        $physicalAssetDetails['file_path'],      // Path of the physical file
        $physicalAssetDetails['file_size'],      // Size of the physical file
        $physicalAssetDetails['file_hash'],      // Hash of the physical file
        $true_physical_source_id,                // ID of the ultimate physical source asset
        $current_crop_json,                      // Default crop for this new virtual master
        $current_filters_json,                   // Default filters for this new virtual master
        $new_admin_title,                        // Admin title for this new virtual master
        $new_public_caption,                     // Public caption for this new virtual master
        $new_alt_text,                           // Alt text for this new virtual master
        $new_attribution                         // Attribution for this new virtual master
    ]);

    $newVirtualMasterId = $db->lastInsertId();
    $db->commit();

    // Construct the response for the UIE
    // Crucially, 'image_url' here refers to the path of the physical file that UIE needs to load.
    echo json_encode([
        'success' => true,
        'message' => 'Virtual master image created successfully.',
        'media' => [
            'id' => $newVirtualMasterId,
            'file_path' => $physicalAssetDetails['file_path'], // Actual path on disk (relative)
            'image_url' => $physicalAssetDetails['file_path'], // URL for JS to load the image (same as file_path if served directly)
            'admin_title' => $new_admin_title, 
            'title' => $new_admin_title, // For UIE consistency, derived from admin_title
            'public_caption' => $new_public_caption,
            'caption' => $new_public_caption, // Keep for compatibility if JS expects 'caption'
            'alt_text' => $new_alt_text,
            'attribution' => $new_attribution,
            'physical_source_asset_id' => $true_physical_source_id,
            'default_crop' => $current_crop_json,
            'filter_state' => $current_filters_json
            // Note: file_size and file_hash of the physical file are not typically needed by UIE for display,
            // but they are correctly stored in the DB for the new virtual asset record.
        ]
    ]);

} catch (PDOException $e) {
    $db->rollBack();
    error_log("Error in saveNewImage.php (virtual master): " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Database error. Could not create virtual master image. Details: ' . $e->getMessage()]);
}
?>

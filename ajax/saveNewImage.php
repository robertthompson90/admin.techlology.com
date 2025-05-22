<?php
// ajax/saveNewImage.php
// Creates a new "virtual master" asset in media_assets.
header('Content-Type: application/json');
include '../inc/loginanddb.php'; 

global $db; // Make $db available

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
// --- NEW: Get Source URL and Attribution for the new virtual master ---
$new_source_url = isset($_POST['new_source_url']) ? trim($_POST['new_source_url']) : '';
$new_attribution = isset($_POST['new_attribution']) ? trim($_POST['new_attribution']) : '';
// --- END NEW ---


// Validate essential input
if (empty($source_media_asset_id)) {
    echo json_encode(['success' => false, 'error' => 'Source media asset ID is required.']);
    exit;
}

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

    $stmtSource = $db->prepare("SELECT id, file_path, file_size, file_hash, physical_source_asset_id FROM media_assets WHERE id = ?");
    $stmtSource->execute([$source_media_asset_id]);
    $sourceAsset = $stmtSource->fetch(PDO::FETCH_ASSOC);

    if (!$sourceAsset) {
        $db->rollBack();
        echo json_encode(['success' => false, 'error' => 'Original source media asset not found.']);
        exit;
    }

    $true_physical_source_id = $sourceAsset['physical_source_asset_id'] ? $sourceAsset['physical_source_asset_id'] : $sourceAsset['id'];
    
    $physicalAssetDetails = $sourceAsset; 
    if ($sourceAsset['physical_source_asset_id']) { 
        $stmtPhysical = $db->prepare("SELECT file_path, file_size, file_hash FROM media_assets WHERE id = ?");
        $stmtPhysical->execute([$true_physical_source_id]);
        $physicalAssetDetailsResult = $stmtPhysical->fetch(PDO::FETCH_ASSOC);
        if (!$physicalAssetDetailsResult) {
            $db->rollBack();
            echo json_encode(['success' => false, 'error' => 'True physical source asset not found.']);
            exit;
        }
        $physicalAssetDetails['file_path'] = $physicalAssetDetailsResult['file_path'];
        $physicalAssetDetails['file_size'] = $physicalAssetDetailsResult['file_size'];
        $physicalAssetDetails['file_hash'] = $physicalAssetDetailsResult['file_hash'];
    }

    // Insert the new virtual master asset
    // --- NEW: Added source_url to INSERT statement ---
    $stmtInsert = $db->prepare(
        "INSERT INTO media_assets 
            (file_path, file_size, file_hash, physical_source_asset_id, 
             default_crop, filter_state, 
             admin_title, caption, alt_text, source_url, attribution, 
             created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())"
    );

    $stmtInsert->execute([
        $physicalAssetDetails['file_path'],      
        $physicalAssetDetails['file_size'],      
        $physicalAssetDetails['file_hash'],      
        $true_physical_source_id,                
        $current_crop_json,                      
        $current_filters_json,                   
        $new_admin_title,                        
        $new_public_caption,                     
        $new_alt_text,                           
        $new_source_url,                         // --- NEW ---
        $new_attribution,                        
    ]);

    $newVirtualMasterId = $db->lastInsertId();
    $db->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Virtual master image created successfully.',
        'media' => [
            'id' => $newVirtualMasterId,
            'file_path' => $physicalAssetDetails['file_path'], 
            'image_url' => $physicalAssetDetails['file_path'], 
            'admin_title' => $new_admin_title, 
            'title' => $new_admin_title, 
            'public_caption' => $new_public_caption,
            'caption' => $new_public_caption, 
            'alt_text' => $new_alt_text,
            'source_url' => $new_source_url,     // --- NEW ---
            'attribution' => $new_attribution,   // --- NEW ---
            'physical_source_asset_id' => $true_physical_source_id,
            'default_crop' => $current_crop_json,
            'filter_state' => $current_filters_json
        ]
    ]);

} catch (PDOException $e) {
    $db->rollBack();
    error_log("Error in saveNewImage.php (virtual master): " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Database error. Could not create virtual master image. Details: ' . $e->getCode()]);
}
?>

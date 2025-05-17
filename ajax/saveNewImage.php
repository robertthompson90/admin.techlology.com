<?php
// ajax/saveNewImage.php
// Creates a new "virtual master" asset in media_assets,
// referencing an original physical file but with its own default crop/filters.
header('Content-Type: application/json');
include '../inc/loginanddb.php';

if (!isset($_SESSION['user'])) {
    echo json_encode(['success' => false, 'error' => 'User not authenticated.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Invalid request method.']);
    exit;
}

// Parameters expected from UnifiedImageEditor.js
$source_media_asset_id = isset($_POST['source_media_asset_id']) ? (int)$_POST['source_media_asset_id'] : 0;
$current_crop_json = isset($_POST['current_crop_json']) ? $_POST['current_crop_json'] : '{}';
$current_filters_json = isset($_POST['current_filters_json']) ? $_POST['current_filters_json'] : '{}';

// Metadata for the new virtual master
$new_caption = isset($_POST['new_caption']) ? trim($_POST['new_caption']) : 'New Virtual Image';
$new_alt_text = isset($_POST['new_alt_text']) ? trim($_POST['new_alt_text']) : '';
$new_attribution = isset($_POST['new_attribution']) ? trim($_POST['new_attribution']) : '';


if (empty($source_media_asset_id)) {
    echo json_encode(['success' => false, 'error' => 'Source media asset ID is required.']);
    exit;
}

// Validate JSON for crop and filters
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

    // 1. Determine the true physical source ID and its details
    $stmtSource = $db->prepare("SELECT id, file_path, file_size, file_hash, physical_source_asset_id FROM media_assets WHERE id = ?");
    $stmtSource->execute([$source_media_asset_id]);
    $sourceAsset = $stmtSource->fetch(PDO::FETCH_ASSOC);

    if (!$sourceAsset) {
        $db->rollBack();
        echo json_encode(['success' => false, 'error' => 'Original source media asset not found.']);
        exit;
    }

    $true_physical_source_id = $sourceAsset['physical_source_asset_id'] ? $sourceAsset['physical_source_asset_id'] : $sourceAsset['id'];
    
    // Fetch details from the true physical source if the current source was already virtual
    $physicalAssetDetails = $sourceAsset; // Assume current source is physical initially
    if ($sourceAsset['physical_source_asset_id']) {
        $stmtPhysical = $db->prepare("SELECT file_path, file_size, file_hash FROM media_assets WHERE id = ?");
        $stmtPhysical->execute([$true_physical_source_id]);
        $physicalAssetDetails = $stmtPhysical->fetch(PDO::FETCH_ASSOC);
        if (!$physicalAssetDetails) {
            $db->rollBack();
            echo json_encode(['success' => false, 'error' => 'True physical source asset not found.']);
            exit;
        }
    }

    // 2. Insert a new row into media_assets for the "Virtual Master"
    $stmtInsert = $db->prepare(
        "INSERT INTO media_assets 
            (file_path, file_size, file_hash, physical_source_asset_id, 
             default_crop, filter_state, 
             caption, alt_text, attribution, 
             created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())"
    );

    $stmtInsert->execute([
        $physicalAssetDetails['file_path'],
        $physicalAssetDetails['file_size'],
        $physicalAssetDetails['file_hash'],
        $true_physical_source_id,
        $current_crop_json,
        $current_filters_json,
        $new_caption,
        $new_alt_text,
        $new_attribution
    ]);

    $newVirtualMasterId = $db->lastInsertId();
    $db->commit();

    // Return details of the newly created virtual master
    echo json_encode([
        'success' => true,
        'message' => 'Virtual master image created successfully.',
        'media' => [
            'id' => $newVirtualMasterId,
            'file_path' => $physicalAssetDetails['file_path'], // Path of the physical source
            'caption' => $new_caption,
            'alt_text' => $new_alt_text,
            'attribution' => $new_attribution,
            'physical_source_asset_id' => $true_physical_source_id,
            'default_crop' => $current_crop_json,
            'filter_state' => $current_filters_json
            // Include other relevant fields if needed by the editor to reload
        ]
    ]);

} catch (PDOException $e) {
    $db->rollBack();
    error_log("Error in saveNewImage.php (virtual master): " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Database error. Could not create virtual master image.']);
}
?>

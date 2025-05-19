<?php
// ajax/saveMediaVariant.php
header('Content-Type: application/json');
include '../inc/loginanddb.php'; // Ensures user is logged in and DB is available

if (!isset($_SESSION['user'])) {
    echo json_encode(['success' => false, 'error' => 'User not authenticated.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Invalid request method.']);
    exit;
}

$media_asset_id = isset($_POST['media_asset_id']) ? (int)$_POST['media_asset_id'] : 0;
$variant_type = isset($_POST['variant_type']) ? trim($_POST['variant_type']) : 'custom'; // This is the variant's admin title
$variant_details_json = isset($_POST['variant_details']) ? $_POST['variant_details'] : ''; // Expecting JSON string

if (empty($media_asset_id) || empty($variant_details_json)) {
    echo json_encode(['success' => false, 'error' => 'Missing required parameters (media_asset_id or variant_details).']);
    exit;
}

// Validate if media_asset_id exists
$stmtCheck = $db->prepare("SELECT id FROM media_assets WHERE id = ?");
$stmtCheck->execute([$media_asset_id]);
if ($stmtCheck->rowCount() == 0) {
    echo json_encode(['success' => false, 'error' => 'Invalid media_asset_id.']);
    exit;
}

// Validate JSON for variant_details
$decoded_details = json_decode($variant_details_json);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(['success' => false, 'error' => 'Invalid JSON in variant_details. Error: ' . json_last_error_msg()]);
    exit;
}

// Ensure essential keys are present in the decoded details (optional, but good practice)
// For example, crop and filters should ideally always be there.
// Caption and altText are also expected now.
if (!isset($decoded_details->crop) || !isset($decoded_details->filters)) {
    // echo json_encode(['success' => false, 'error' => 'Variant details JSON missing crop or filters.']);
    // exit;
    // For flexibility, we can allow them to be missing and let the JS handle defaults if needed.
}


try {
    $db->beginTransaction();
    $stmt = $db->prepare(
        "INSERT INTO media_variants (media_asset_id, variant_type, variant_details, created_at, updated_at)
         VALUES (?, ?, ?, NOW(), NOW())"
    );
    $stmt->execute([$media_asset_id, $variant_type, $variant_details_json]);
    $newVariantId = $db->lastInsertId();
    $db->commit();

    echo json_encode([
        'success' => true, 
        'variant_id' => $newVariantId, 
        'message' => 'Variant saved successfully.'
    ]);

} catch (PDOException $e) {
    $db->rollBack();
    error_log("Error in saveMediaVariant.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Database error: Could not save variant.']);
}
?>

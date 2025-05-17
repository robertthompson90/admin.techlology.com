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
$variant_type = isset($_POST['variant_type']) ? trim($_POST['variant_type']) : 'custom';
$variant_details = isset($_POST['variant_details']) ? $_POST['variant_details'] : ''; // Expecting JSON string

if (empty($media_asset_id) || empty($variant_details)) {
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
$decoded_details = json_decode($variant_details);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(['success' => false, 'error' => 'Invalid JSON in variant_details. Error: ' . json_last_error_msg()]);
    exit;
}

try {
    $db->beginTransaction();
    $stmt = $db->prepare(
        "INSERT INTO media_variants (media_asset_id, variant_type, variant_details, created_at, updated_at)
         VALUES (?, ?, ?, NOW(), NOW())"
    );
    $stmt->execute([$media_asset_id, $variant_type, $variant_details]);
    $newVariantId = $db->lastInsertId();
    $db->commit();

    echo json_encode(['success' => true, 'variant_id' => $newVariantId, 'message' => 'Variant saved successfully.']);

} catch (PDOException $e) {
    $db->rollBack();
    error_log("Error in saveMediaVariant.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Database error: Could not save variant.']);
}
?>

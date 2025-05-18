<?php
// ajax/getMediaVariants.php
header('Content-Type: application/json');
include '../inc/loginanddb.php';

if (!isset($_SESSION['user'])) {
    echo json_encode(['success' => false, 'error' => 'User not authenticated.']);
    exit;
}

$media_asset_id = isset($_GET['media_asset_id']) ? (int)$_GET['media_asset_id'] : 0;

if (empty($media_asset_id)) {
    echo json_encode(['success' => false, 'error' => 'Missing media_asset_id.']);
    exit;
}

try {
    $stmt = $db->prepare(
        "SELECT id, media_asset_id, variant_type, variant_details, created_at, updated_at 
         FROM media_variants 
         WHERE media_asset_id = ? 
         ORDER BY created_at DESC"
    );
    $stmt->execute([$media_asset_id]);
    $variants = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'variants' => $variants]);

} catch (PDOException $e) {
    error_log("Error in getMediaVariants.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Database error: Could not fetch variants.']);
}
?>

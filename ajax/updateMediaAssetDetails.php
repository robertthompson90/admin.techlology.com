<?php
// ajax/updateMediaAssetDetails.php
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
// The 'title' from the JS will now map to 'admin_title' in the DB
$admin_title = isset($_POST['title']) ? trim($_POST['title']) : null; 

if (empty($media_asset_id)) {
    echo json_encode(['success' => false, 'error' => 'Missing media asset ID.']);
    exit;
}

if ($admin_title === null) { 
    echo json_encode(['success' => false, 'error' => 'Missing title parameter for admin_title.']);
    exit;
}

try {
    $stmt = $db->prepare(
        "UPDATE media_assets 
         SET admin_title = :admin_title, updated_at = NOW() 
         WHERE id = :media_asset_id"
    );
    
    $stmt->bindParam(':admin_title', $admin_title, PDO::PARAM_STR);
    $stmt->bindParam(':media_asset_id', $media_asset_id, PDO::PARAM_INT);
    
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Asset admin title updated successfully.']);
    } else {
        $checkStmt = $db->prepare("SELECT id FROM media_assets WHERE id = ?");
        $checkStmt->execute([$media_asset_id]);
        if ($checkStmt->rowCount() == 0) {
            echo json_encode(['success' => false, 'error' => 'Media asset not found.']);
        } else {
            echo json_encode(['success' => true, 'message' => 'Asset admin title was already up to date.']);
        }
    }

} catch (PDOException $e) {
    error_log("Error in updateMediaAssetDetails.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Database error: Could not update asset admin title.']);
}
?>

<?php
// ajax/updateMediaAssetDetails.php
// Purpose: Updates admin_title, public_caption, alt_text, source_url, and attribution for a media_asset.
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

$media_asset_id = isset($_POST['media_asset_id']) ? (int)$_POST['media_asset_id'] : 0;
$admin_title_value = isset($_POST['admin_title']) ? trim($_POST['admin_title']) : null; 
$public_caption_value = isset($_POST['public_caption']) ? trim($_POST['public_caption']) : null;
$alt_text_value = isset($_POST['alt_text']) ? trim($_POST['alt_text']) : null;
// --- NEW: Get Source URL and Attribution ---
$source_url_value = isset($_POST['source_url']) ? trim($_POST['source_url']) : null;
$attribution_value = isset($_POST['attribution']) ? trim($_POST['attribution']) : null;
// --- END NEW ---


if (empty($media_asset_id)) {
    echo json_encode(['success' => false, 'error' => 'Missing media asset ID.']);
    exit;
}

// Check if there's anything to update. 
if ($admin_title_value === null && $public_caption_value === null && $alt_text_value === null && $source_url_value === null && $attribution_value === null) {
    echo json_encode(['success' => false, 'error' => 'No metadata provided to update.']);
    exit;
}

try {
    $sql_parts = [];
    $params = []; // Parameters for execute

    if ($admin_title_value !== null) {
        $sql_parts[] = "admin_title = ?";
        $params[] = $admin_title_value;
    }
    if ($public_caption_value !== null) {
        $sql_parts[] = "caption = ?"; 
        $params[] = $public_caption_value;
    }
    if ($alt_text_value !== null) {
        $sql_parts[] = "alt_text = ?";
        $params[] = $alt_text_value;
    }
    // --- NEW: Add Source URL and Attribution to SQL ---
    if ($source_url_value !== null) {
        $sql_parts[] = "source_url = ?";
        $params[] = $source_url_value;
    }
    if ($attribution_value !== null) {
        $sql_parts[] = "attribution = ?";
        $params[] = $attribution_value;
    }
    // --- END NEW ---


    if (empty($sql_parts)) {
        echo json_encode(['success' => true, 'message' => 'No actual metadata fields to update.']);
        exit;
    }

    $sql_parts[] = "updated_at = NOW()";
    $params[] = $media_asset_id; // Add media_asset_id for the WHERE clause

    $sql = "UPDATE media_assets SET " . implode(", ", $sql_parts) . " WHERE id = ?";
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Asset details updated successfully.']);
    } else {
        $checkStmt = $db->prepare("SELECT id FROM media_assets WHERE id = ?");
        $checkStmt->execute([$media_asset_id]);
        if ($checkStmt->rowCount() == 0) {
            echo json_encode(['success' => false, 'error' => 'Media asset not found.']);
        } else {
            echo json_encode(['success' => true, 'message' => 'Asset details were already up to date or no effective change made.']);
        }
    }

} catch (PDOException $e) {
    error_log("Error in updateMediaAssetDetails.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Database error: Could not update asset details. ' . $e->getCode()]);
}
?>

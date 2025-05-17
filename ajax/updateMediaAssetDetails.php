<?php
// ajax/updateMediaAssetDetails.php
// Purpose: Updates admin_title, and optionally public_caption and alt_text for a media_asset.
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

$media_asset_id = isset($_POST['media_asset_id']) ? (int)$_POST['media_asset_id'] : 0;

// The 'title' from JS's .uie-title-input (when saving master admin title)
$admin_title_value = isset($_POST['title']) ? trim($_POST['title']) : null; 

// Optional: public caption and alt_text if sent (e.g., from a more comprehensive form)
// The current UIE "Save Admin Title" button does NOT send these for master assets.
$public_caption_value = isset($_POST['public_caption']) ? trim($_POST['public_caption']) : null;
$alt_text_value = isset($_POST['alt_text']) ? trim($_POST['alt_text']) : null;


if (empty($media_asset_id)) {
    echo json_encode(['success' => false, 'error' => 'Missing media asset ID.']);
    exit;
}

// Check if there's anything to update. 
// The admin_title (from JS 'title') is expected if this script is called by "Save Admin Title" button.
if ($admin_title_value === null && $public_caption_value === null && $alt_text_value === null) {
    echo json_encode(['success' => false, 'error' => 'No metadata provided to update.']);
    exit;
}

try {
    $sql_parts = [];
    $params = [':media_asset_id' => $media_asset_id];

    if ($admin_title_value !== null) {
        $sql_parts[] = "admin_title = :admin_title_param";
        $params[':admin_title_param'] = $admin_title_value;
    }
    if ($public_caption_value !== null) {
        $sql_parts[] = "caption = :public_caption_param"; 
        $params[':public_caption_param'] = $public_caption_value;
    }
    if ($alt_text_value !== null) {
        $sql_parts[] = "alt_text = :alt_text_param";
        $params[':alt_text_param'] = $alt_text_value;
    }

    if (empty($sql_parts)) {
        // This case should ideally not be reached if the initial check for any data is done.
        echo json_encode(['success' => true, 'message' => 'No actual metadata fields to update.']);
        exit;
    }

    $sql_parts[] = "updated_at = NOW()";
    $sql = "UPDATE media_assets SET " . implode(", ", $sql_parts) . " WHERE id = :media_asset_id";
    
    $stmt = $db->prepare($sql);
    
    // Bind parameters dynamically
    if ($admin_title_value !== null) {
        $stmt->bindParam(':admin_title_param', $params[':admin_title_param'], PDO::PARAM_STR);
    }
    if ($public_caption_value !== null) {
        $stmt->bindParam(':public_caption_param', $params[':public_caption_param'], PDO::PARAM_STR);
    }
    if ($alt_text_value !== null) {
        $stmt->bindParam(':alt_text_param', $params[':alt_text_param'], PDO::PARAM_STR);
    }
    $stmt->bindParam(':media_asset_id', $params[':media_asset_id'], PDO::PARAM_INT);
    
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Asset details updated successfully.']);
    } else {
        // Check if the asset exists to differentiate between "not found" and "no change"
        $checkStmt = $db->prepare("SELECT id FROM media_assets WHERE id = ?");
        $checkStmt->execute([$media_asset_id]);
        if ($checkStmt->rowCount() == 0) {
            echo json_encode(['success' => false, 'error' => 'Media asset not found.']);
        } else {
            // If no rows affected but asset exists, it means the values were already the same.
            echo json_encode(['success' => true, 'message' => 'Asset details were already up to date or no effective change made.']);
        }
    }

} catch (PDOException $e) {
    error_log("Error in updateMediaAssetDetails.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Database error: Could not update asset details.']);
}
?>

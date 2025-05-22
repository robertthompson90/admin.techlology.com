<?php
// ajax/removeTagFromItem.php
// Removes a tag's association from an item (article or media asset).

require_once '../inc/loginanddb.php';
header('Content-Type: application/json');

global $db; 

$response = ['success' => false, 'message' => 'Invalid request.'];

$tag_id = isset($_POST['tag_id']) ? (int)$_POST['tag_id'] : null;
$item_id = isset($_POST['item_id']) ? (int)$_POST['item_id'] : null;
$item_type = isset($_POST['item_type']) ? $_POST['item_type'] : null;

if ($tag_id && $item_id && $item_type) {
    $link_table = "";
    $link_item_id_column = "";
    $link_tag_id_column = "tag_id"; 

    if ($item_type === 'article') {
        $link_table = "article_tags"; 
        $link_item_id_column = "article_id";
    } elseif ($item_type === 'mediaAsset') {
        $link_table = "media_tags";
        $link_item_id_column = "media_asset_id";
    }

    if ($link_table) {
        $db->beginTransaction();
        try {
            $sql = "DELETE FROM `" . $link_table . "` 
                    WHERE `" . $link_item_id_column . "` = ? AND `" . $link_tag_id_column . "` = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute([$item_id, $tag_id]);

            if ($stmt->rowCount() > 0) {
                $response['success'] = true;
                $response['message'] = 'Tag association removed successfully.';
            } else {
                $response['success'] = true; 
                $response['message'] = 'Tag association not found or already removed.';
            }
            $db->commit();
        } catch (PDOException $e) {
            $db->rollBack();
            $response['message'] = "Database error (removeTagFromItem.php): " . $e->getMessage();
            error_log("Error removing tag association (removeTagFromItem.php): " . $e->getMessage());
        }
    } else {
        $response['message'] = 'Invalid item type specified.';
    }
} else {
    $response['message'] = 'Missing required parameters (tag_id, item_id, item_type).';
}

echo json_encode($response);
?>
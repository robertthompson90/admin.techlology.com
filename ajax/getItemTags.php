<?php
// ajax/getItemTags.php
// Fetches all tags associated with a specific item (article or media asset).

require_once '../inc/loginanddb.php';
header('Content-Type: application/json');

global $db; 

$item_id = isset($_GET['item_id']) ? (int)$_GET['item_id'] : null;
$item_type = isset($_GET['item_type']) ? $_GET['item_type'] : null;

$tags_array = array(); 

if ($item_id && $item_type) {
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
        $sql = "SELECT t.id, t.name 
                FROM tags t
                JOIN `" . $link_table . "` lt ON t.id = lt.`" . $link_tag_id_column . "`
                WHERE lt.`" . $link_item_id_column . "` = ?
                ORDER BY t.name ASC";
        try {
            $stmt = $db->prepare($sql);
            $stmt->execute([$item_id]);
            $tags_array = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("Error fetching item tags (getItemTags.php): " . $e->getMessage());
        }
    }
}

echo json_encode($tags_array);
?>
<?php
// ajax/gettags.php
// Fetches tag suggestions for autocomplete, excluding tags already on the item.

require_once '../inc/loginanddb.php'; // Defines $db
header('Content-Type: application/json');

global $db; // Make $db available

$term = isset($_POST['term']) ? trim($_POST['term']) : '';
// item_id and item_type might not always be sent if just Browse all tags
$item_id = isset($_POST['item_id']) && !empty($_POST['item_id']) ? (int)$_POST['item_id'] : null;
$item_type = isset($_POST['item_type']) && !empty($_POST['item_type']) ? $_POST['item_type'] : null;

$results = array();

if (strlen($term) >= 1) { // Lowered minLength for broader search, JS controls display threshold
    $searchTerm = strtolower($term) . '%'; 

    $params = [$searchTerm];
    $exclude_sql_part = "";

    if ($item_id && $item_type) {
        $link_table = "";
        $link_item_id_column = "";

        if ($item_type === 'article') {
            $link_table = "article_tags"; 
            $link_item_id_column = "article_id";
        } elseif ($item_type === 'mediaAsset') {
            $link_table = "media_tags";
            $link_item_id_column = "media_asset_id";
        }

        if ($link_table) {
            $exclude_sql_part = "AND t.id NOT IN (
                                    SELECT lt.tag_id 
                                    FROM `" . $link_table . "` lt 
                                    WHERE lt.`" . $link_item_id_column . "` = ?
                                )";
            $params[] = $item_id;
        }
    }

    $sql = "SELECT t.id, t.name 
            FROM tags t 
            WHERE LOWER(t.name) LIKE ? 
            " . $exclude_sql_part . "
            ORDER BY t.name ASC 
            LIMIT 10";

    try {
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $tags = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($tags as $tag) {
            $results[] = array('id' => $tag['id'], 'value' => $tag['name'], 'label' => $tag['name']);
        }
    } catch (PDOException $e) {
        error_log("Error fetching tags (gettags.php): " . $e->getMessage());
    }
}

echo json_encode($results);
?>
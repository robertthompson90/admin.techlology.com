<?php
// ajax/addtag.php
// Adds a tag globally if new, and associates it with an item (article or media asset).

require_once '../inc/loginanddb.php'; 
header('Content-Type: application/json');

global $db; 

$response = ['success' => false, 'message' => 'Invalid request.'];

$tag_name = isset($_POST['tag_name']) ? trim(strtolower($_POST['tag_name'])) : null;
$existing_tag_id = isset($_POST['existing_tag_id']) && !empty($_POST['existing_tag_id']) ? (int)$_POST['existing_tag_id'] : null;
$item_id = isset($_POST['item_id']) && !empty($_POST['item_id']) ? (int)$_POST['item_id'] : null;
$item_type = isset($_POST['item_type']) && !empty($_POST['item_type']) ? $_POST['item_type'] : null;


if (empty($tag_name)) {
    $response['message'] = 'Tag name cannot be empty.';
    echo json_encode($response);
    exit;
}

// item_id and item_type can be null if we are just adding a global tag without association (not current use case for this script)
if ($item_type && empty($item_id)) {
    $response['message'] = 'Item ID is required when Item Type is specified for association.';
    echo json_encode($response);
    exit;
}


$db->beginTransaction();

try {
    $tag_id_to_associate = null;
    $definitive_tag_name = $tag_name; // Default to submitted name

    if ($existing_tag_id) {
        $stmt_check_existing = $db->prepare("SELECT id, name FROM tags WHERE id = ?");
        $stmt_check_existing->execute([$existing_tag_id]);
        $tag_row = $stmt_check_existing->fetch(PDO::FETCH_ASSOC);
        if ($tag_row && strtolower($tag_row['name']) === $tag_name) { // Ensure name matches for given ID
            $tag_id_to_associate = $tag_row['id'];
            $definitive_tag_name = $tag_row['name']; // Use the name from DB
        } else {
            $existing_tag_id = null; // ID-Name mismatch or ID not found, proceed by name
        }
    }
    
    if (!$existing_tag_id) { 
        $stmt_find = $db->prepare("SELECT id, name FROM tags WHERE LOWER(name) = ?");
        $stmt_find->execute([$tag_name]);
        $tag_data = $stmt_find->fetch(PDO::FETCH_ASSOC);

        if ($tag_data) {
            $tag_id_to_associate = $tag_data['id'];
            $definitive_tag_name = $tag_data['name']; // Use existing name from DB
        } else {
            // Tag doesn't exist globally, create it with the processed (lowercase) name
            $stmt_insert_tag = $db->prepare("INSERT INTO tags (name) VALUES (?)");
            $stmt_insert_tag->execute([$tag_name]); 
            $tag_id_to_associate = $db->lastInsertId();
            $definitive_tag_name = $tag_name; // Name is as inserted
            if (!$tag_id_to_associate) {
                throw new Exception("Failed to create new tag in global 'tags' table for name: '$tag_name'.");
            }
        }
    }

    // If item_id and item_type are provided, proceed with association
    if ($item_id && $item_type && $tag_id_to_associate) {
        $link_table = "";
        $link_item_id_column = "";
        $link_tag_id_column = "tag_id";

        if ($item_type === 'article') {
            $link_table = "article_tags"; 
            $link_item_id_column = "article_id";
        } elseif ($item_type === 'mediaAsset') {
            $link_table = "media_tags";
            $link_item_id_column = "media_asset_id";
        } else {
            // If item_type is unknown but item_id was passed, this is an error.
            // If item_type was null from start, we might just be adding a global tag.
             if ($item_type) throw new Exception("Invalid item type ('$item_type') for tagging.");
        }

        if ($link_table) { // Proceed only if we have a valid link table context
            $stmt_check_assoc = $db->prepare("SELECT COUNT(*) FROM `" . $link_table . "` WHERE `" . $link_item_id_column . "` = ? AND `" . $link_tag_id_column . "` = ?");
            $stmt_check_assoc->execute([$item_id, $tag_id_to_associate]);
            if ($stmt_check_assoc->fetchColumn() == 0) {
                $stmt_link = $db->prepare("INSERT INTO `" . $link_table . "` (`" . $link_item_id_column . "`, `" . $link_tag_id_column . "`) VALUES (?, ?)");
                $stmt_link->execute([$item_id, $tag_id_to_associate]);
                $response['message'] = 'Tag associated successfully.';
            } else {
                $response['message'] = 'Tag already associated with this item.';
            }
        }
        $response['success'] = true;
        $response['tag'] = ['id' => $tag_id_to_associate, 'name' => $definitive_tag_name];
    } elseif ($tag_id_to_associate) {
        // Tag was found or created globally, but no item context to associate it with
        $response['success'] = true;
        $response['message'] = 'Tag found/created globally, but no item association was made.';
        $response['tag'] = ['id' => $tag_id_to_associate, 'name' => $definitive_tag_name];
    }
     else {
         throw new Exception("Could not determine tag ID to associate for tag name: '$tag_name'.");
    }

    $db->commit();

} catch (PDOException $e) {
    $db->rollBack();
    $response['message'] = "Database error (addtag.php): " . $e->getMessage();
    error_log("Tagging DB Error (PDO - addtag.php): " . $e->getMessage());
} catch (Exception $e) {
    $db->rollBack();
    $response['message'] = "General error (addtag.php): " . $e->getMessage();
    error_log("Tagging General Error (addtag.php): " . $e->getMessage());
}

echo json_encode($response);
?>
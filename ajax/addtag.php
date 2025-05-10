<?php
// ajax/addtag.php
include '../inc/loginanddb.php';

if (isset($_POST['tag']) && !empty($_POST['tag'])) {
    $tag = strtolower(trim($_POST['tag']));
    // Check if the tag already exists (case-insensitive)
    $stmt = $db->prepare("SELECT name FROM tags WHERE LOWER(name) = LOWER(?)");
    $stmt->execute([$tag]);
    $existing = $stmt->fetch(PDO::FETCH_COLUMN);
    if ($existing) {
        echo json_encode(['value' => strtolower($existing)]);
        exit;
    }
    // Insert new tag
    $stmt = $db->prepare("INSERT INTO tags (name) VALUES (?)");
    if ($stmt->execute([$tag])) {
         echo json_encode(['value' => $tag]);
    } else {
         http_response_code(500);
         echo json_encode(['error' => 'Failed to add tag']);
    }
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Tag parameter missing']);
}
?>

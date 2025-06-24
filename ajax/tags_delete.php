<?php
include '../inc/loginanddb.php';
$id = intval($_POST['id'] ?? 0);
if ($id > 0) {
    $db->prepare("DELETE FROM tags WHERE id=?")->execute([$id]);
    $db->prepare("DELETE FROM article_tags WHERE tag_id=?")->execute([$id]);
}
echo json_encode(['success' => true]);

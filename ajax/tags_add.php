<?php
include '../inc/loginanddb.php';
$name = trim($_POST['name'] ?? '');
if ($name !== '') {
    $stmt = $db->prepare("INSERT IGNORE INTO tags (name) VALUES (?)");
    $stmt->execute([$name]);
}
echo json_encode(['success' => true]);

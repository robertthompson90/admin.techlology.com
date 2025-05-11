<?php
// ajax/checkDuplicate.php

header('Content-Type: application/json');
include '../inc/loginanddb.php';

// Retrieve and trim the hash from the POST.
$hash = isset($_POST['hash']) ? trim($_POST['hash']) : '';

if (!$hash) {
    echo json_encode(['duplicate' => false]);
    exit;
}

// Use the full hash to check for existing media.
$stmt = $db->prepare("SELECT id, file_path, caption, default_crop, filter_state 
                      FROM media_assets 
                      WHERE TRIM(file_hash) = ?");
$stmt->execute([$hash]);
$media = $stmt->fetch(PDO::FETCH_ASSOC);

if ($media) {
    echo json_encode(['duplicate' => true, 'media' => $media]);
} else {
    echo json_encode(['duplicate' => false]);
}
?>

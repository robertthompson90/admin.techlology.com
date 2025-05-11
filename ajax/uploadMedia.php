<?php
// ajax/uploadMedia.php

header('Content-Type: application/json');
include '../inc/loginanddb.php'; // Adjust the path if required

// Check if a media file is uploaded successfully.
if (!isset($_FILES['media_file']) || $_FILES['media_file']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['error' => 'Media file upload failed.']);
    exit;
}

$fileSize = $_FILES['media_file']['size'];
$fileHash = isset($_POST['file_hash']) ? trim($_POST['file_hash']) : '';

// **Check for an existing file_hash before proceeding**
$stmt = $db->prepare("SELECT id, file_path FROM media_assets WHERE TRIM(file_hash)= ?");
$stmt->execute([$fileHash]);
$existingMedia = $stmt->fetch(PDO::FETCH_ASSOC);

if ($existingMedia) {
    echo json_encode([
        'error' => 'Duplicate detected',
        'duplicate' => true,
        'existing_media' => $existingMedia
    ]);
    exit;
}

// Proceed with the upload only if no duplicate was found.
$uploadDir = '../uploads/media/';  
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$originalFilename = basename($_FILES['media_file']['name']);
$extension = pathinfo($originalFilename, PATHINFO_EXTENSION);
$newFilename = time() . "_" . uniqid() . "." . strtolower($extension);
$targetFile = $uploadDir . $newFilename;

if (!move_uploaded_file($_FILES['media_file']['tmp_name'], $targetFile)) {
    echo json_encode(['error' => 'Failed to move uploaded file.']);
    exit;
}

$filePath = 'uploads/media/' . $newFilename;
// Insert the new media file record into the DB using the full hash.
$stmt = $db->prepare("INSERT INTO media_assets (file_path, file_size, file_hash, default_crop, filter_state, caption, alt_text, attribution, created_at, updated_at)
                      VALUES (?, ?, ?, '', '', '', '', '', NOW(), NOW())");

if ($stmt->execute([$filePath, $fileSize, $fileHash])) {
    $mediaId = $db->lastInsertId();
    echo json_encode([
        'success' => true,
        'media' => [
            'id'        => $mediaId,
            'file_path' => $filePath,
            'caption'   => '',
            'title'     => ''
        ]
    ]);
} else {
    echo json_encode(['error' => 'Database insert failed.']);
}
?>

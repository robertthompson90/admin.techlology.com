<?php
// ajax/uploadMedia.php

header('Content-Type: application/json');
include '../inc/loginanddb.php'; // Adjust the path if required

// Check if a media file is uploaded
if (!isset($_FILES['media_file']) || $_FILES['media_file']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['error' => 'Media file upload failed.']);
    exit;
}

$uploadDir = '../uploads/media/';  // Folder relative to this endpoint
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

// Get file size and construct the relative path for the DB record.
$fileSize = $_FILES['media_file']['size'];
$filePath = 'uploads/media/' . $newFilename;  // This path is relative to your site root

// Insert into media_assets table. The schema has: id, file_path, file_size, default_crop, filter_state, caption, alt_text, attribution, created_at, updated_at.
$stmt = $db->prepare("INSERT INTO media_assets (file_path, file_size, default_crop, filter_state, caption, alt_text, attribution, created_at, updated_at) VALUES (?, ?, '', '', '', '', '', NOW(), NOW())");
if ($stmt->execute([$filePath, $fileSize])) {
    // Return the newly created media asset details.
    $mediaId = $db->lastInsertId();
    echo json_encode([
        'success' => true,
        'media' => [
            'id'   => $mediaId,
            'file_path' => $filePath,
            'caption' => '',
            'title' => ''   // Title can be updated later if desired.
        ]
    ]);
} else {
    echo json_encode(['error' => 'Database insert failed.']);
}
?>

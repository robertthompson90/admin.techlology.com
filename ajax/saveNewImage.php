<?php
// ajax/saveNewImage.php
header('Content-Type: application/json');
include '../inc/loginanddb.php'; // Adjust path if needed

// Validate image data
if (!isset($_POST['image']) || empty($_POST['image'])) {
    echo json_encode(['error' => 'No image data provided.']);
    exit;
}

// Extract the image data from the Data URL
$dataUrl = $_POST['image'];
if (preg_match('/^data:image\/(\w+);base64,/', $dataUrl, $type)) {
    $data = substr($dataUrl, strpos($dataUrl, ',') + 1);
    $data = base64_decode($data);
    $extension = strtolower($type[1]);
    if (!in_array($extension, ['png', 'jpg', 'jpeg', 'gif'])) {
      echo json_encode(['error' => 'Invalid image type.']);
      exit;
    }
} else {
    echo json_encode(['error' => 'Invalid data URL.']);
    exit;
}

// Compute a hash of the image data for duplicate detection
$imageHash = md5($data);

// Check for duplicates (requires a column "file_hash" in media_assets)
$stmt = $db->prepare("SELECT id, file_path FROM media_assets WHERE file_hash = ?");
$stmt->execute([$imageHash]);
$existing = $stmt->fetch(PDO::FETCH_ASSOC);
if ($existing) {
    // If a duplicate is found, return the existing asset
    echo json_encode(['success' => true, 'media' => [
         'id' => $existing['id'],
         'file_path' => $existing['file_path'],
         'caption' => '',
         'title' => ''
    ]]);
    exit;
}

$uploadDir = '../uploads/media/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$newFilename = time() . "_" . uniqid() . "." . $extension;
$targetFile = $uploadDir . $newFilename;
if (file_put_contents($targetFile, $data) === false) {
    echo json_encode(['error' => 'Failed to save the new image.']);
    exit;
}

// Optionally, here you could generate multiple sizes (large, medium, small) using GD or ImageMagick.
// For brevity, we store only the original here. Extend as needed.

// Insert record into media_assets (make sure your table has a column `file_hash`)
$fileSize = filesize($targetFile);
$filePath = 'uploads/media/' . $newFilename;
$stmt = $db->prepare("INSERT INTO media_assets (file_path, file_size, default_crop, filter_state, caption, alt_text, attribution, file_hash, created_at, updated_at) VALUES (?, ?, '', '', '', '', '', ?, NOW(), NOW())");
if ($stmt->execute([$filePath, $fileSize, $imageHash])) {
    $mediaId = $db->lastInsertId();
    echo json_encode(['success' => true, 'media' => [
         'id' => $mediaId,
         'file_path' => $filePath,
         'caption' => '',
         'title' => ''
    ]]);
} else {
    echo json_encode(['error' => 'Database insert failed.']);
}
?>

<?php
// ajax/uploadMedia.php (Updated)

header('Content-Type: application/json');
include '../inc/loginanddb.php';

if (!isset($_FILES['media_file']) || $_FILES['media_file']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'error' => 'Media file upload failed.']);
    exit;
}

$fileSize = $_FILES['media_file']['size'];
$fileHash = isset($_POST['file_hash']) ? trim($_POST['file_hash']) : '';
$originalFilename = isset($_POST['original_filename']) ? trim(basename($_POST['original_filename'])) : ''; // Get it from POST

// --- (Duplicate check logic remains the same) ---
$stmtCheckDuplicate = $db->prepare(
    "SELECT id, file_path, admin_title, caption, alt_text, attribution, source_url, default_crop, filter_state, physical_source_asset_id
     FROM media_assets WHERE TRIM(file_hash)= ?"
);
$stmtCheckDuplicate->execute([$fileHash]);
$existingMedia = $stmtCheckDuplicate->fetch(PDO::FETCH_ASSOC);

if ($existingMedia) {
    $mediaDataForResponse = [
        'id' => (int)$existingMedia['id'],
        'file_path' => $existingMedia['file_path'],
        'image_url' => $existingMedia['file_path'],
        'admin_title' => $existingMedia['admin_title'] ?? '',
        'title' => $existingMedia['admin_title'] ?: ($existingMedia['caption'] ?? ''),
        'caption' => $existingMedia['caption'] ?? '',
        'alt_text' => $existingMedia['alt_text'] ?? '',
        'attribution' => $existingMedia['attribution'] ?? '',
        'source_url' => $existingMedia['source_url'] ?? '',
        'default_crop' => $existingMedia['default_crop'] ? json_decode($existingMedia['default_crop']) : null,
        'filter_state' => $existingMedia['filter_state'] ? json_decode($existingMedia['filter_state']) : null,
        'physical_source_asset_id' => $existingMedia['physical_source_asset_id'] ? (int)$existingMedia['physical_source_asset_id'] : null,
        'is_variant' => false
    ];
    echo json_encode([
        'success' => true,
        'duplicate' => true,
        'media' => $mediaDataForResponse
    ]);
    exit;
}
// --- End of duplicate check ---


$uploadDir = '../uploads/media/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// Use the actual uploaded file's name for extension and safe new name generation
$actualUploadedFilename = basename($_FILES['media_file']['name']);
$extension = pathinfo($actualUploadedFilename, PATHINFO_EXTENSION);
$extension = strtolower($extension ?: 'png'); // Default to png if no extension

// Create a safer base for the new filename, prefer POSTed original_filename if available and sensible
$filenameBaseForNewFile = $originalFilename ? pathinfo($originalFilename, PATHINFO_FILENAME) : pathinfo($actualUploadedFilename, PATHINFO_FILENAME);
$safeFilenameBase = preg_replace("/[^a-zA-Z0-9_-]/", "", $filenameBaseForNewFile);
if (empty($safeFilenameBase)) { $safeFilenameBase = "uploaded_image"; }

$newFilename = time() . "_" . uniqid() . "_" . $safeFilenameBase . "." . $extension;
$targetFile = $uploadDir . $newFilename;

if (!move_uploaded_file($_FILES['media_file']['tmp_name'], $targetFile)) {
    echo json_encode(['success' => false, 'error' => 'Failed to move uploaded file.']);
    exit;
}

$filePath = 'uploads/media/' . $newFilename;

// Generate admin_title from the original filename (either POSTed or from the file itself)
$titleSourceFilename = $originalFilename ?: $actualUploadedFilename;
$adminTitle = preg_replace('/\\.[^.\\s]{3,4}$/', '', $titleSourceFilename); // Remove extension
$adminTitle = str_replace(['-', '_'], ' ', $adminTitle); // Replace separators with spaces
$adminTitle = ucwords(strtolower($adminTitle)); // Capitalize words
$adminTitle = trim(preg_replace('/\s+/', ' ', $adminTitle)); // Normalize spaces
if (empty($adminTitle)) { $adminTitle = "Uploaded Image " . time(); }


$stmt = $db->prepare(
    "INSERT INTO media_assets (file_path, file_size, file_hash, admin_title, caption, alt_text, source_url, attribution, created_at, updated_at)
     VALUES (?, ?, ?, ?, '', '', '', '', NOW(), NOW())" // source_url & attribution are empty for direct uploads
);

if ($stmt->execute([$filePath, $fileSize, $fileHash, $adminTitle])) {
    $mediaId = $db->lastInsertId();
    echo json_encode([
        'success' => true,
        'media' => [
            'id'        => (int)$mediaId,
            'file_path' => $filePath,
            'image_url' => $filePath,
            'admin_title' => $adminTitle,
            'title'     => $adminTitle, // Initially same as admin_title
            'caption'   => '',
            'alt_text'  => '',
            'attribution' => '',       // Empty for direct file uploads
            'source_url' => '',        // Empty for direct file uploads
            'default_crop' => null,
            'filter_state' => null,
            'physical_source_asset_id' => null,
            'is_variant' => false
        ]
    ]);
} else {
    if (file_exists($targetFile)) { unlink($targetFile); }
    echo json_encode(['success' => false, 'error' => 'Database insert failed for uploaded file.']);
}
?>
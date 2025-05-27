<?php
// ajax/uploadImageFromUrl.php

header('Content-Type: application/json');
include '../inc/loginanddb.php'; // Auth and DB

if (!isset($_POST['image_url']) || empty(trim($_POST['image_url']))) {
    echo json_encode(['success' => false, 'error' => 'Image URL not provided.']);
    exit;
}

$imageUrl = trim($_POST['image_url']);

// Validate URL format (basic)
if (!filter_var($imageUrl, FILTER_VALIDATE_URL)) {
    echo json_encode(['success' => false, 'error' => 'Invalid URL format.']);
    exit;
}

// --- Security: Prevent SSRF ---
$parsedUrl = parse_url($imageUrl);
if (!$parsedUrl || !isset($parsedUrl['host'])) {
    echo json_encode(['success' => false, 'error' => 'Could not parse URL host.']);
    exit;
}
// Optional: Whitelist domains or check against local/internal IPs more thoroughly
// For now, basic check for http/https
if (!in_array($parsedUrl['scheme'], ['http', 'https'])) {
    echo json_encode(['success' => false, 'error' => 'URL scheme must be http or https.']);
    exit;
}

// --- Download the image ---
$imageData = null;
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $imageUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true); // Follow redirects
curl_setopt($ch, CURLOPT_TIMEOUT, 15); // 15 second timeout
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true); // Enable SSL verification
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
// Set a User-Agent as some servers block requests without one
curl_setopt($ch, CURLOPT_USERAGENT, 'TechlologyCMS-ImageFetcher/1.0 (+http://yourdomain.com/bot.html)');

$imageData = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$curlError = curl_error($ch);
curl_close($ch);

if ($httpCode !== 200 || !$imageData) {
    echo json_encode(['success' => false, 'error' => 'Failed to download image. HTTP Code: ' . $httpCode . ($curlError ? ' Curl Error: '.$curlError : '')]);
    exit;
}

// --- Validate if it's an image and get extension ---
$imageSizeInfo = getimagesizefromstring($imageData);
if ($imageSizeInfo === false || !isset($imageSizeInfo['mime'])) {
    echo json_encode(['success' => false, 'error' => 'Downloaded content is not a valid image or MIME type unknown. Detected Content-Type: ' . $contentType]);
    exit;
}

$mime = $imageSizeInfo['mime'];
$extension = '';
switch ($mime) {
    case 'image/jpeg': $extension = 'jpg'; break;
    case 'image/png':  $extension = 'png'; break;
    case 'image/gif':  $extension = 'gif'; break;
    case 'image/webp': $extension = 'webp'; break;
    case 'image/bmp':  $extension = 'bmp'; break;
    default:
        echo json_encode(['success' => false, 'error' => 'Unsupported image type: ' . $mime]);
        exit;
}

// --- Save the file ---
$uploadDir = '../uploads/media/';
if (!is_dir($uploadDir)) { @mkdir($uploadDir, 0777, true); }

// Generate admin_title from the original URL's filename part
$pathInfo = pathinfo($parsedUrl['path']);
$urlFilename = $pathInfo['filename'] ?? 'image_from_url';
$adminTitle = preg_replace('/[^a-zA-Z0-9\s_-]/', '', $urlFilename); // Sanitize
$adminTitle = str_replace(['-', '_'], ' ', $adminTitle);
$adminTitle = ucwords(strtolower($adminTitle));
$adminTitle = trim(preg_replace('/\s+/', ' ', $adminTitle));
if (empty($adminTitle)) { $adminTitle = "Image " . time(); }

// New filename for server
$newFilenameOnServer = time() . "_" . uniqid() . "_" . preg_replace("/[^a-zA-Z0-9_-]/", "", $urlFilename) . "." . $extension;
$targetFile = $uploadDir . $newFilenameOnServer;

if (!file_put_contents($targetFile, $imageData)) {
    echo json_encode(['success' => false, 'error' => 'Failed to save downloaded image.']);
    exit;
}

$fileSize = filesize($targetFile);
$filePath = 'uploads/media/' . $newFilenameOnServer;

// --- Calculate Hash & Check Duplicate ---
$hash = hash('sha256', $imageData); // Hash the content

$stmtCheckDuplicate = $db->prepare(
    "SELECT id, file_path, admin_title, caption, alt_text, attribution, source_url, default_crop, filter_state, physical_source_asset_id
     FROM media_assets WHERE TRIM(file_hash)= ?"
);
$stmtCheckDuplicate->execute([$hash]);
$existingMedia = $stmtCheckDuplicate->fetch(PDO::FETCH_ASSOC);

if ($existingMedia) {
    // If duplicate, delete the newly downloaded file
    if (file_exists($targetFile)) { unlink($targetFile); }
    $mediaDataForResponse = [ /* ... (same structure as in uploadMedia.php for existingMedia) ... */
        'id' => (int)$existingMedia['id'], 'file_path' => $existingMedia['file_path'], 'image_url' => $existingMedia['file_path'],
        'admin_title' => $existingMedia['admin_title'] ?? '', 'title' => $existingMedia['admin_title'] ?: ($existingMedia['caption'] ?? ''),
        'caption' => $existingMedia['caption'] ?? '', 'alt_text' => $existingMedia['alt_text'] ?? '',
        'attribution' => $existingMedia['attribution'] ?? '', 'source_url' => $existingMedia['source_url'] ?? '',
        'default_crop' => $existingMedia['default_crop'] ? json_decode($existingMedia['default_crop']) : null,
        'filter_state' => $existingMedia['filter_state'] ? json_decode($existingMedia['filter_state']) : null,
        'physical_source_asset_id' => $existingMedia['physical_source_asset_id'] ? (int)$existingMedia['physical_source_asset_id'] : null,
        'is_variant' => false
    ];
    echo json_encode(['success' => true, 'duplicate' => true, 'media' => $mediaDataForResponse, 'message' => 'Image from URL already exists in library.']);
    exit;
}

// --- Attribution from URL ---
$attribution = $parsedUrl['host'] ?? 'Source URL';


// --- Insert into Database ---
$stmt = $db->prepare(
    "INSERT INTO media_assets (file_path, file_size, file_hash, admin_title, caption, alt_text, source_url, attribution, created_at, updated_at)
     VALUES (?, ?, ?, ?, '', '', ?, ?, NOW(), NOW())"
);

if ($stmt->execute([$filePath, $fileSize, $hash, $adminTitle, $imageUrl, $attribution])) {
    $mediaId = $db->lastInsertId();
    echo json_encode([
        'success' => true,
        'media' => [
            'id'        => (int)$mediaId,
            'file_path' => $filePath,
            'image_url' => $filePath,
            'admin_title' => $adminTitle,
            'title'     => $adminTitle,
            'caption'   => '',
            'alt_text'  => '',
            'attribution' => $attribution,
            'source_url' => $imageUrl,
            'default_crop' => null,
            'filter_state' => null,
            'physical_source_asset_id' => null,
            'is_variant' => false
        ]
    ]);
} else {
    if (file_exists($targetFile)) { unlink($targetFile); }
    echo json_encode(['success' => false, 'error' => 'Database insert failed for image from URL.']);
}
?>

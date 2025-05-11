<?php
// ajax/getGlobalMedia.php

header('Content-Type: application/json');
include '../inc/loginanddb.php'; // Adjust the path if needed

$q = "";
if (isset($_GET['q']) && trim($_GET['q']) != "") {
    $q = trim($_GET['q']);
}

try {
    if ($q != "") {
        $stmt = $db->prepare("SELECT id, file_path AS image_url, caption AS title FROM media_assets WHERE caption LIKE :q ORDER BY id DESC");
        $stmt->execute([':q' => '%' . $q . '%']);
    } else {
        $stmt = $db->query("SELECT id, file_path AS image_url, caption AS title FROM media_assets ORDER BY id DESC");
    }
    $mediaAssets = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($mediaAssets);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>

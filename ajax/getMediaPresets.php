<?php
// ajax/getMediaPresets.php

header('Content-Type: application/json');
include '../inc/loginanddb.php'; // Adjust the path if needed

try {
    $stmt = $db->query("SELECT id, type, name, preset_details FROM media_presets ORDER BY type, name");
    $presets = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($presets);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>

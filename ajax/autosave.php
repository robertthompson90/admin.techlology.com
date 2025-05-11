<?php
// ajax/autosave.php

header('Content-Type: application/json');
include '../inc/loginanddb.php'; // Adjust the path as needed

if(!isset($_SESSION['user'])){
    echo json_encode(['error' => 'User session not found.']);
    exit;
}

$userId = $_SESSION['user'];
// Use the POST data (serialized form data); you might choose to store it as-is.
$data = json_encode($_POST);
$now = date('Y-m-d H:i:s');

try {
    // Check if a draft already exists for this user.
    $stmt = $db->prepare("SELECT id FROM drafts WHERE user_id = ?");
    $stmt->execute([$userId]);
    $existingDraft = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if($existingDraft){
        // Update the existing draft.
        $stmt = $db->prepare("UPDATE drafts SET data = ?, last_saved = ? WHERE id = ?");
        $stmt->execute([$data, $now, $existingDraft['id']]);
    } else {
        // Insert a new draft.
        $stmt = $db->prepare("INSERT INTO drafts (user_id, data, last_saved) VALUES (?, ?, ?)");
        $stmt->execute([$userId, $data, $now]);
    }
    echo json_encode(['success' => true]);
} catch(Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>

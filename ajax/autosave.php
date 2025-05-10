<?php
header('Content-Type: application/json');

// Ensure your database connection and login routines are set up.
// This file should create the $db PDO instance. Adjust the path if needed.
require_once '../inc/loginanddb.php';

$user_id = $_SESSION['user'];

// Convert the posted form data into JSON for storage.
$draftData = json_encode($_POST);
$currentTime = date("Y-m-d H:i:s");

try {
    // Check if an autosave draft already exists for this user.
    $query = "SELECT id FROM drafts WHERE user_id = :user_id LIMIT 1";
    $stmt = $db->prepare($query);
    $stmt->execute([':user_id' => $user_id]);
    $draft = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($draft) {
        // Update the existing draft.
        $query = "UPDATE drafts SET data = :data, last_saved = :last_saved WHERE id = :id";
        $stmt = $db->prepare($query);
        $stmt->execute([
            ':data'       => $draftData,
            ':last_saved' => $currentTime,
            ':id'         => $draft['id']
        ]);
    } else {
        // Insert a new draft for the user.
        $query = "INSERT INTO drafts (user_id, data, last_saved) VALUES (:user_id, :data, :last_saved)";
        $stmt = $db->prepare($query);
        $stmt->execute([
            ':user_id'    => $user_id,
            ':data'       => $draftData,
            ':last_saved' => $currentTime
        ]);
    }

    // Return a JSON success response with the current timestamp.
    echo json_encode(['success' => true, 'last_saved' => $currentTime]);
} catch (PDOException $e) {
    // Return an error response in JSON.
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

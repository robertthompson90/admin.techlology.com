<?php
// ajax/getAllTags.php
// Fetches all unique tags for populating filter dropdowns, etc.

header('Content-Type: application/json');
include '../inc/loginanddb.php'; // Ensures $db is available

global $db; // Make $db available

$tags = array();

try {
    $stmt = $db->query("SELECT id, name FROM tags ORDER BY name ASC");
    $tags = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($tags);
} catch (PDOException $e) {
    error_log("Error fetching all tags (getAllTags.php): " . $e->getMessage());
    echo json_encode([]); // Return empty array on error
}
?>

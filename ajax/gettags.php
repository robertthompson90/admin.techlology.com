<?php
// ajax/gettags.php
include '../inc/loginanddb.php';

if (isset($_POST['term'])) {
    $term = $_POST['term'];
    $stmt = $db->prepare("SELECT name FROM tags WHERE name LIKE ? ORDER BY name");
    $likeTerm = "%$term%";
    $stmt->execute([$likeTerm]);
    $results = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo json_encode($results);
} else {
    echo json_encode([]);
}
?>

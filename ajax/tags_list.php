<?php
include '../inc/loginanddb.php';
$tags = $db->query("SELECT id, name FROM tags ORDER BY name ASC")->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($tags);

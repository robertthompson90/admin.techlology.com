<?php
include '../inc/loginanddb.php';

$rows = $db->query("SELECT id, title, status, updated_at FROM articles ORDER BY updated_at DESC LIMIT 8")->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($rows);

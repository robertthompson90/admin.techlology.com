<?php
include '../inc/loginanddb.php';

$rows = $db->query("SELECT id, admin_title, file_path, created_at FROM media_assets ORDER BY created_at DESC LIMIT 8")->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($rows);

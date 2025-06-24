<?php
include '../inc/loginanddb.php';
$users = $db->query("SELECT id, name, username, email, role, created_at FROM users ORDER BY created_at DESC")->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($users);

<?php
include '../inc/loginanddb.php';

echo json_encode([
    'articles' => (int)$db->query("SELECT COUNT(*) FROM articles")->fetchColumn(),
    'media'    => (int)$db->query("SELECT COUNT(*) FROM media_assets")->fetchColumn(),
    'tags'     => (int)$db->query("SELECT COUNT(*) FROM tags")->fetchColumn(),
    'users'    => (int)$db->query("SELECT COUNT(*) FROM users")->fetchColumn()
]);

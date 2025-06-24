<?php
include '../inc/loginanddb.php';

$search = isset($_GET['search']) ? trim($_GET['search']) : '';
$status = isset($_GET['status']) ? trim($_GET['status']) : '';

$sql = "SELECT a.id, a.title, a.status, a.updated_at, u.name AS author
        FROM articles a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE 1";
$params = [];
if ($search !== '') {
    $sql .= " AND a.title LIKE ?";
    $params[] = "%$search%";
}
if ($status !== '') {
    $sql .= " AND a.status = ?";
    $params[] = $status;
}
$sql .= " ORDER BY a.updated_at DESC LIMIT 50";
$stmt = $db->prepare($sql);
$stmt->execute($params);
$articles = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Fetch tags for all articles in one go
$ids = array_column($articles, 'id');
$tags = [];
if ($ids) {
    $in = implode(',', array_fill(0, count($ids), '?'));
    $tagRows = $db->prepare("SELECT at.article_id, t.name FROM article_tags at JOIN tags t ON at.tag_id = t.id WHERE at.article_id IN ($in)");
    $tagRows->execute($ids);
    foreach ($tagRows->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $tags[$row['article_id']][] = $row['name'];
    }
}
foreach ($articles as &$a) {
    $a['tags'] = isset($tags[$a['id']]) ? $tags[$a['id']] : [];
}
echo json_encode($articles);

<?php
require_once 'inc/auth.php';
require_once 'inc/db.php';

$article_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$user_id = $_SESSION['user_id'] ?? 0;

$stmt = $pdo->prepare("SELECT * FROM articles WHERE id=? AND user_id=?");
$stmt->execute([$article_id, $user_id]);
$article = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$article) {
    http_response_code(404);
    echo json_encode(['error' => 'Article not found']);
    exit;
}

// --- Sections ---
$stmt = $pdo->prepare("SELECT * FROM article_sections WHERE article_id=? ORDER BY order_num ASC");
$stmt->execute([$article_id]);
$sections = [];
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $content = json_decode($row['content'], true);
    $sections[] = [
        'type' => (int)$row['section_type_id'],
        'instanceId' => $row['id'],
        'content' => $content,
        'data' => $content // for image/gallery, this is the same
    ];
}

// --- Tags ---
$stmt = $pdo->prepare("SELECT tag_id FROM article_tags WHERE article_id=?");
$stmt->execute([$article_id]);
$tags = array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'tag_id');

// --- Sources ---
$stmt = $pdo->prepare("SELECT title, url, note FROM article_sources WHERE article_id=?");
$stmt->execute([$article_id]);
$sources = $stmt->fetchAll(PDO::FETCH_ASSOC);

// --- Pros/Cons ---
$stmt = $pdo->prepare("SELECT type, content FROM pros_and_cons WHERE article_id=?");
$stmt->execute([$article_id]);
$pros = [];
$cons = [];
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    if ($row['type'] === 'pros') $pros[] = $row['content'];
    if ($row['type'] === 'cons') $cons[] = $row['content'];
}

// --- Ratings ---
$stmt = $pdo->prepare("SELECT rating, verdict FROM article_ratings WHERE article_id=? ORDER BY id DESC LIMIT 1");
$stmt->execute([$article_id]);
$rating = $stmt->fetch(PDO::FETCH_ASSOC);

$response = [
    'article_id' => $article['id'],
    'title' => $article['title'],
    'tagline' => $article['tagline'],
    'seo_title' => $article['seo_title'],
    'meta_description' => $article['meta_description'],
    'status' => $article['status'],
    'thumbnail' => [
        'asset_id' => $article['thumbnail_asset_id'],
        'variant_id' => $article['thumbnail_variant_id'],
        'preview_url' => $article['thumbnail']
    ],
    'sections' => $sections,
    'tags' => $tags,
    'sources' => $sources,
    'pros' => $pros,
    'cons' => $cons,
    'rating' => $rating
];

header('Content-Type: application/json');
echo json_encode($response);

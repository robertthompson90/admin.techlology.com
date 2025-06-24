<?php
require_once 'inc/auth.php';
require_once 'inc/db.php';

// Parse JSON input
$data = json_decode(file_get_contents('php://input'), true);
if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

$user_id = $_SESSION['user_id'];
$title = trim($data['title'] ?? '');
$tagline = trim($data['tagline'] ?? '');
$seo_title = trim($data['seo_title'] ?? '');
$meta_description = trim($data['meta_description'] ?? '');
$status = in_array($data['status'] ?? '', ['draft','published']) ? $data['status'] : 'draft';

// --- Thumbnail ---
$thumbnail = $data['thumbnail'] ?? [];
$thumbnail_asset_id = $thumbnail['asset_id'] ?? null;
$thumbnail_variant_id = $thumbnail['variant_id'] ?? null;
$thumbnail_url = $thumbnail['preview_url'] ?? '';
$thumbnail_caption = $thumbnail['caption_override'] ?? '';
$thumbnail_alt = $thumbnail['alt_override'] ?? '';

// --- Save or update article ---
if (!empty($data['article_id'])) {
    $article_id = (int)$data['article_id'];
    $stmt = $pdo->prepare("UPDATE articles SET title=?, tagline=?, seo_title=?, meta_description=?, status=?, thumbnail_asset_id=?, thumbnail_variant_id=?, thumbnail=?, updated_at=NOW() WHERE id=? AND user_id=?");
    $stmt->execute([$title, $tagline, $seo_title, $meta_description, $status, $thumbnail_asset_id, $thumbnail_variant_id, $thumbnail_url, $article_id, $user_id]);
} else {
    $stmt = $pdo->prepare("INSERT INTO articles (user_id, title, tagline, seo_title, meta_description, status, thumbnail_asset_id, thumbnail_variant_id, thumbnail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$user_id, $title, $tagline, $seo_title, $meta_description, $status, $thumbnail_asset_id, $thumbnail_variant_id, $thumbnail_url]);
    $article_id = $pdo->lastInsertId();
}

// --- Sections ---
$sections = $data['sections'] ?? [];
$pdo->prepare("DELETE FROM article_sections WHERE article_id=?")->execute([$article_id]);
$order_num = 1;
foreach ($sections as $section) {
    $type = (int)($section['type'] ?? 0);
    $instanceId = $section['instanceId'] ?? '';
    $content = $section['content'] ?? [];
    $sectionData = $section['data'] ?? [];

    if ($type == 3) { // Image section
        $content = json_encode([
            'asset_id' => $sectionData['asset_id'] ?? null,
            'variant_id' => $sectionData['variant_id'] ?? null,
            'caption_override' => $sectionData['caption_override'] ?? '',
            'alt_text_override' => $sectionData['alt_text_override'] ?? '',
            'preview_url' => $sectionData['preview_url'] ?? ''
        ]);
    } else if ($type == 5) { // Gallery section
        $images = [];
        foreach ($sectionData['images'] ?? [] as $img) {
            $images[] = [
                'asset_id' => $img['asset_id'] ?? null,
                'variant_id' => $img['variant_id'] ?? null,
                'caption_override' => $img['caption_override'] ?? '',
                'alt_text_override' => $img['alt_text_override'] ?? '',
                'preview_url' => $img['preview_url'] ?? ''
            ];
        }
        $content = json_encode(['images' => $images]);
    } else {
        $content = json_encode($content);
    }

    $stmt = $pdo->prepare("INSERT INTO article_sections (article_id, section_type_id, content, order_num, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())");
    $stmt->execute([$article_id, $type, $content, $order_num]);
    $order_num++;
}

// --- Tags ---
$pdo->prepare("DELETE FROM article_tags WHERE article_id=?")->execute([$article_id]);
if (!empty($data['tags']) && is_array($data['tags'])) {
    $stmt = $pdo->prepare("INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)");
    foreach ($data['tags'] as $tag_id) {
        $stmt->execute([$article_id, (int)$tag_id]);
    }
}

// --- Sources ---
$pdo->prepare("DELETE FROM article_sources WHERE article_id=?")->execute([$article_id]);
if (!empty($data['sources']) && is_array($data['sources'])) {
    $stmt = $pdo->prepare("INSERT INTO article_sources (article_id, title, url, note) VALUES (?, ?, ?, ?)");
    foreach ($data['sources'] as $src) {
        $stmt->execute([$article_id, $src['title'] ?? '', $src['url'] ?? '', $src['note'] ?? '']);
    }
}

// --- Pros/Cons ---
$pdo->prepare("DELETE FROM pros_and_cons WHERE article_id=?")->execute([$article_id]);
if (!empty($data['pros']) && is_array($data['pros'])) {
    $stmt = $pdo->prepare("INSERT INTO pros_and_cons (article_id, type, content) VALUES (?, 'pros', ?)");
    foreach ($data['pros'] as $pro) {
        $stmt->execute([$article_id, $pro]);
    }
}
if (!empty($data['cons']) && is_array($data['cons'])) {
    $stmt = $pdo->prepare("INSERT INTO pros_and_cons (article_id, type, content) VALUES (?, 'cons', ?)");
    foreach ($data['cons'] as $con) {
        $stmt->execute([$article_id, $con]);
    }
}

// --- Ratings ---
$pdo->prepare("DELETE FROM article_ratings WHERE article_id=?")->execute([$article_id]);
if (!empty($data['rating'])) {
    $stmt = $pdo->prepare("INSERT INTO article_ratings (article_id, rating, verdict) VALUES (?, ?, ?)");
    $stmt->execute([$article_id, $data['rating']['score'] ?? 0, $data['rating']['verdict'] ?? '']);
}

echo json_encode(['success' => true, 'article_id' => $article_id]);

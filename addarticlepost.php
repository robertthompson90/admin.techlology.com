<?php
// addarticlepost.php
include 'inc/loginanddb.php';
session_start();

// Validate required fields.
if (!isset($_POST['title']) || empty(trim($_POST['title']))) {
    die("Article title is required.");
}
if (!isset($_POST['tagline']) || empty(trim($_POST['tagline']))) {
    die("Tagline is required.");
}
if (!isset($_FILES['thumbnail']) || $_FILES['thumbnail']['error'] !== 0) {
    die("Thumbnail is required.");
}
if (!isset($_POST['selected_tags']) || empty(trim($_POST['selected_tags']))) {
    die("At least one tag is required.");
}
if (!isset($_POST['section_present'])) {
    die("At least one modular content section is required.");
}

// Process thumbnail file upload.
$uploadDir = 'uploads/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}
$filename = basename($_FILES['thumbnail']['name']);
$targetFile = $uploadDir . time() . "_" . $filename;
if (!move_uploaded_file($_FILES['thumbnail']['tmp_name'], $targetFile)) {
    die("Failed to upload thumbnail.");
}

// Start a transaction.
$db->beginTransaction();

try {
    // Insert fixed article data.
    $stmt = $db->prepare("INSERT INTO articles (user_id, title, tagline, thumbnail, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'draft', NOW(), NOW())");
    $userId = $_SESSION['user'];
    $stmt->execute([$userId, trim($_POST['title']), trim($_POST['tagline']), $targetFile]);
    $articleId = $db->lastInsertId();
    
    // Process tags.
    $tags = explode(',', $_POST['selected_tags']);
    $stmtArticleTag = $db->prepare("INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)");
    $stmtGetTagId = $db->prepare("SELECT id FROM tags WHERE name = ?");
    foreach ($tags as $tag) {
        $tag = trim($tag);
        if ($tag == '') continue;
        $stmtGetTagId->execute([$tag]);
        $tagId = $stmtGetTagId->fetchColumn();
        if ($tagId) {
            $stmtArticleTag->execute([$articleId, $tagId]);
        }
    }
    
    // Process modular content sections.
    // Expect arrays: section_type[] and corresponding content arrays.
    if (isset($_POST['section_type']) && is_array($_POST['section_type'])) {
        $stmtSection = $db->prepare("INSERT INTO article_sections (article_id, section_type_id, content, order_num, created_at, updated_at) VALUES (?, (SELECT id FROM section_types WHERE name = ?), ?, ?, NOW(), NOW())");
        $order = 1;
        foreach ($_POST['section_type'] as $index => $secType) {
            $content = "";
            if ($secType == 'text' && isset($_POST['section_text'][$index])) {
                $content = $_POST['section_text'][$index];
            } elseif ($secType == 'media') {
                $mediaType = $_POST['media_type'][$index] ?? '';
                $mediaUrl = $_POST['media_url'][$index] ?? '';
                $mediaCaption = $_POST['media_caption'][$index] ?? '';
                $content = json_encode(['media_type' => $mediaType, 'media_url' => $mediaUrl, 'media_caption' => $mediaCaption]);
            } elseif ($secType == 'quote' && isset($_POST['section_quote'][$index])) {
                $content = $_POST['section_quote'][$index];
            } elseif ($secType == 'pros_cons') {
                $pros = $_POST['section_pros'][$index] ?? '';
                $cons = $_POST['section_cons'][$index] ?? '';
                $content = json_encode(['pros' => $pros, 'cons' => $cons]);
            } elseif ($secType == 'rating') {
                $rating = $_POST['section_rating'][$index] ?? '';
                $verdict = $_POST['section_verdict'][$index] ?? '';
                $content = json_encode(['rating' => $rating, 'verdict' => $verdict]);
            }
            $stmtSection->execute([$articleId, $secType, $content, $order]);
            $order++;
        }
    }
    
    // Process Sources & Citations.
    if (isset($_POST['source_title']) && is_array($_POST['source_title'])) {
        $stmtSource = $db->prepare("INSERT INTO article_sources (article_id, title, url, note) VALUES (?, ?, ?, ?)");
        foreach ($_POST['source_title'] as $i => $sourceTitle) {
            $sourceUrl = $_POST['source_url'][$i] ?? '';
            $sourceNote = $_POST['source_note'][$i] ?? '';
            $stmtSource->execute([$articleId, trim($sourceTitle), trim($sourceUrl), trim($sourceNote)]);
        }
    }
    
    $db->commit();
    header("Location: dashboard.php?msg=Article added successfully");
    exit;
    
} catch (Exception $e) {
    $db->rollBack();
    die("Error saving article: " . $e->getMessage());
}
?>

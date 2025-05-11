<?php
// addarticlepost.php

include 'inc/loginanddb.php';

// -------------------------------
// Validate required fields
// -------------------------------
if (!isset($_POST['title']) || empty(trim($_POST['title']))) {
    die("Article title is required.");
}
if (!isset($_POST['tagline']) || empty(trim($_POST['tagline']))) {
    die("Tagline is required.");
}
if (!isset($_FILES['thumbnail']) || $_FILES['thumbnail']['error'] !== UPLOAD_ERR_OK) {
    die("Thumbnail is required.");
}
if (!isset($_POST['selected_tags']) || empty(trim($_POST['selected_tags']))) {
    die("At least one tag is required.");
}
if (!isset($_POST['section_present']) || empty(trim($_POST['section_present']))) {
    die("At least one modular content section is required.");
}

// -------------------------------
// Retrieve and trim SEO fields (they may be empty, but we want to store them)
// -------------------------------
$seo_title = isset($_POST['seo_title']) ? trim($_POST['seo_title']) : "";
$meta_description = isset($_POST['meta_description']) ? trim($_POST['meta_description']) : "";

// -------------------------------
// Process thumbnail file upload
// -------------------------------
$uploadDir = 'uploads/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}
$originalFilename = basename($_FILES['thumbnail']['name']);
$extension = pathinfo($originalFilename, PATHINFO_EXTENSION);
$newFilename = time() . "_" . uniqid() . "." . strtolower($extension);
$targetFile = $uploadDir . $newFilename;
if (!move_uploaded_file($_FILES['thumbnail']['tmp_name'], $targetFile)) {
    die("Failed to upload thumbnail.");
}

// -------------------------------
// Start Transaction
// -------------------------------
$db->beginTransaction();

try {
    // -------------------------------
    // Insert fixed article data into the articles table.
    // This now includes the SEO fields.
    // -------------------------------
    if (!isset($_SESSION['user'])) {
        throw new Exception("User session not found.");
    }
    $userId = $_SESSION['user'];
    $title = trim($_POST['title']);
    $tagline = trim($_POST['tagline']);
    
    $stmt = $db->prepare(
        "INSERT INTO articles (user_id, title, tagline, thumbnail, seo_title, meta_description, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'draft', NOW(), NOW())"
    );
    $stmt->execute([$userId, $title, $tagline, $targetFile, $seo_title, $meta_description]);
    $articleId = $db->lastInsertId();
    
    // -------------------------------
    // Process Tags: using the comma-delimited list from selected_tags.
    // If a tag doesn’t exist in the tags table, insert it.
    // Then, insert into article_tags.
    // -------------------------------
    $tagList = explode(',', $_POST['selected_tags']);
    $stmtArticleTag = $db->prepare("INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)");
    $stmtGetTagId = $db->prepare("SELECT id FROM tags WHERE name = ?");
    
    foreach ($tagList as $tag) {
        $tag = trim($tag);
        if ($tag == '') {
            continue;
        }
        
        $stmtGetTagId->execute([$tag]);
        $tagId = $stmtGetTagId->fetchColumn();
        if ($tagId) {
            $stmtArticleTag->execute([$articleId, $tagId]);
        } else {
            // Insert new tag
            $stmtInsertTag = $db->prepare("INSERT INTO tags (name) VALUES (?)");
            $stmtInsertTag->execute([$tag]);
            $newTagId = $db->lastInsertId();
            $stmtArticleTag->execute([$articleId, $newTagId]);
        }
    }
    
    // -------------------------------
    // Process Modular Content Sections
    // We expect that the form sends an array "section_type[]" and corresponding content arrays.
    // We'll look up the numeric ID in the section_types table based on the provided section type (as a string).
    // Content for certain types is JSON-encoded.
    // -------------------------------
    if (isset($_POST['section_type']) && is_array($_POST['section_type'])) {
        $order = 1;
        $stmtSection = $db->prepare(
            "INSERT INTO article_sections (article_id, section_type_id, content, order_num, created_at, updated_at)
             VALUES (?, ?, ?, ?, NOW(), NOW())"
        );
        foreach ($_POST['section_type'] as $index => $secType) {
            $secType = trim($secType);
            if (empty($secType)) {
                continue;
            }
            
            // Look up section type ID from section_types table.
            $stmtGetSectionType = $db->prepare("SELECT id FROM section_types WHERE name = ?");
            $stmtGetSectionType->execute([$secType]);
            $sectionTypeId = $stmtGetSectionType->fetchColumn();
            if (!$sectionTypeId) {
                // Skip if the section type is not found.
                continue;
            }
            
            $content = "";
            if ($secType == 'text' && isset($_POST['section_text'][$index])) {
                $content = $_POST['section_text'][$index];
            } elseif ($secType == 'media') {
                $mediaType = $_POST['media_type'][$index] ?? '';
                $mediaUrl = $_POST['media_url'][$index] ?? '';
                $mediaCaption = $_POST['media_caption'][$index] ?? '';
                $content = json_encode([
                    'media_type'    => $mediaType,
                    'media_url'     => $mediaUrl,
                    'media_caption' => $mediaCaption
                ]);
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
            $stmtSection->execute([$articleId, $sectionTypeId, $content, $order]);
            $order++;
        }
    }
    
    // -------------------------------
    // Process Sources & Citations
    // Expect arrays: source_title[], source_url[], and source_note[].
    // -------------------------------
    if (isset($_POST['source_title']) && is_array($_POST['source_title'])) {
        $stmtSource = $db->prepare("INSERT INTO article_sources (article_id, title, url, note) VALUES (?, ?, ?, ?)");
        foreach ($_POST['source_title'] as $i => $sourceTitle) {
            $sourceTitle = trim($sourceTitle);
            if (empty($sourceTitle)) {
                continue;
            }
            $sourceUrl = isset($_POST['source_url'][$i]) ? trim($_POST['source_url'][$i]) : '';
            $sourceNote = isset($_POST['source_note'][$i]) ? trim($_POST['source_note'][$i]) : '';
            $stmtSource->execute([$articleId, $sourceTitle, $sourceUrl, $sourceNote]);
        }
    }
    
    // -------------------------------
    // Commit the transaction if everything succeeds
    // -------------------------------
    $db->commit();
    header("Location: dashboard.php?msg=Article added successfully");
    exit;
    
} catch (Exception $e) {
    $db->rollBack();
    die("Error saving article: " . $e->getMessage());
}
?>

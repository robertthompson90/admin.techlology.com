<?php
// addarticlepost.php
// Updated to handle thumbnail_media_asset_id and thumbnail_media_variant_id

include 'inc/loginanddb.php'; // Auth and DB connection

// --- Basic Validation (should be more robust in a production system) ---
if (!isset($_POST['title']) || empty(trim($_POST['title']))) {
    // Consider redirecting back with an error message or a more user-friendly error page
    // For now, simple die for brevity.
    error_log("addarticlepost.php: Article title is required.");
    die("Article title is required.");
}
if (!isset($_POST['tagline']) || empty(trim($_POST['tagline']))) {
    error_log("addarticlepost.php: Tagline is required.");
    die("Tagline is required.");
}

// Thumbnail is now ID-based. $_FILES['thumbnail'] is no longer used for the main article thumbnail.
// We will check for the presence of thumbnail_media_asset_id.
// It's up to your application logic whether a thumbnail is strictly mandatory.
// For now, we'll allow it to be optional (NULL in the database if not provided).

// --- Retrieve and sanitize form data ---
$title = trim($_POST['title']);
$tagline = trim($_POST['tagline']);
$seo_title = isset($_POST['seo_title']) ? trim($_POST['seo_title']) : "";
$meta_description = isset($_POST['meta_description']) ? trim($_POST['meta_description']) : "";

// New thumbnail fields from the form
$thumbnail_asset_id = isset($_POST['thumbnail_media_asset_id']) && !empty($_POST['thumbnail_media_asset_id']) ? (int)$_POST['thumbnail_media_asset_id'] : null;
$thumbnail_variant_id = isset($_POST['thumbnail_media_variant_id']) && !empty($_POST['thumbnail_media_variant_id']) ? (int)$_POST['thumbnail_media_variant_id'] : null;

// User ID from session
if (!isset($_SESSION['user'])) {
    error_log("addarticlepost.php: User session not found.");
    die("User session not found. Please log in again.");
}
$userId = $_SESSION['user'];


// --- Start Database Transaction ---
$db->beginTransaction();

try {
    // 1. Insert core article data (title, tagline, user_id, seo, meta)
    //    AND the new thumbnail asset/variant IDs.
    //    The old 'thumbnail' column (if you haven't dropped/renamed it) is NOT included here.
    //    Ensure your `articles` table has `thumbnail_asset_id` and `thumbnail_variant_id` columns.
    $stmtArticle = $db->prepare(
        "INSERT INTO articles (user_id, title, tagline, seo_title, meta_description, 
                               thumbnail_asset_id, thumbnail_variant_id, 
                               status, created_at, updated_at)
         VALUES (:user_id, :title, :tagline, :seo_title, :meta_description, 
                 :thumbnail_asset_id, :thumbnail_variant_id, 
                 'draft', NOW(), NOW())"
    );

    $stmtArticle->bindParam(':user_id', $userId, PDO::PARAM_INT);
    $stmtArticle->bindParam(':title', $title, PDO::PARAM_STR);
    $stmtArticle->bindParam(':tagline', $tagline, PDO::PARAM_STR);
    $stmtArticle->bindParam(':seo_title', $seo_title, PDO::PARAM_STR);
    $stmtArticle->bindParam(':meta_description', $meta_description, PDO::PARAM_STR);
    $stmtArticle->bindParam(':thumbnail_asset_id', $thumbnail_asset_id, $thumbnail_asset_id === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
    $stmtArticle->bindParam(':thumbnail_variant_id', $thumbnail_variant_id, $thumbnail_variant_id === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
    
    $stmtArticle->execute();
    $articleId = $db->lastInsertId();

    if (!$articleId) {
        throw new Exception("Failed to insert article and get lastInsertId.");
    }

    // 2. Process Tags (existing logic from your previous addarticlepost.php)
    // This assumes tags are submitted as a comma-separated string in 'selected_tags'
    // and that your 'tags' and 'article_tags' tables are set up accordingly.
    if (isset($_POST['selected_tags']) && !empty(trim($_POST['selected_tags']))) {
        $tagList = explode(',', $_POST['selected_tags']);
        $stmtArticleTag = $db->prepare("INSERT INTO article_tags (article_id, tag_id) VALUES (:article_id, :tag_id)");
        $stmtGetTagId = $db->prepare("SELECT id FROM tags WHERE LOWER(name) = LOWER(:tag_name)"); // Case-insensitive check
        $stmtInsertTag = $db->prepare("INSERT INTO tags (name) VALUES (:tag_name)");

        foreach ($tagList as $tagName) {
            $tagName = trim($tagName);
            if (empty($tagName)) continue;

            $stmtGetTagId->execute([':tag_name' => $tagName]);
            $tagId = $stmtGetTagId->fetchColumn();

            if (!$tagId) {
                // Tag doesn't exist, create it
                $stmtInsertTag->execute([':tag_name' => $tagName]);
                $tagId = $db->lastInsertId();
            }
            if ($tagId) { // Ensure tagId was found or created
                $stmtArticleTag->execute([':article_id' => $articleId, ':tag_id' => $tagId]);
            }
        }
    }

    // 3. Process Modular Content Sections
    //    THIS SECTION WILL BE SIGNIFICANTLY UPDATED IN LATER STEPS
    //    to handle asset/variant IDs for image/gallery sections and structured JSON.
    //    For now, this is a simplified version of your previous logic to avoid breaking
    //    the script entirely, but it does NOT yet correctly handle the new image/gallery data.
    //    The primary goal of this current step is to get the THUMBNAIL IDs saving.
    if (isset($_POST['sections']) && is_array($_POST['sections'])) {
        $order = 1;
        $stmtSection = $db->prepare(
            "INSERT INTO article_sections (article_id, section_type_id, content, order_num, created_at, updated_at)
             VALUES (:article_id, :section_type_id, :content, :order_num, NOW(), NOW())"
        );

        foreach ($_POST['sections'] as $sectionInstanceId => $sectionData) {
            $sectionTypeId = isset($sectionData['type']) ? (int)$sectionData['type'] : null;
            if (empty($sectionTypeId)) {
                error_log("Skipping section for article $articleId due to missing type. Instance ID: $sectionInstanceId");
                continue;
            }

            // Placeholder for content: Actual content processing will be more complex
            // This currently expects a 'content' sub-array or 'data' sub-array based on your js/sections.js naming
            $contentJson = "{}"; // Default to empty JSON object
            if (isset($sectionData['content'])) {
                $contentJson = json_encode($sectionData['content']);
            } elseif (isset($sectionData['data'])) { // For Image/Gallery sections using the new structure
                $contentJson = json_encode($sectionData['data']);
            }
             if (json_last_error() !== JSON_ERROR_NONE) {
                error_log("JSON encode error for section $sectionInstanceId, article $articleId: " . json_last_error_msg());
                $contentJson = "{}"; // Fallback on encoding error
            }


            $stmtSection->execute([
                ':article_id' => $articleId,
                ':section_type_id' => $sectionTypeId,
                ':content' => $contentJson,
                ':order_num' => $order
            ]);
            $order++;
        }
    }


    // 4. Process Sources & Citations (existing logic from your previous addarticlepost.php)
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

    // --- Commit Transaction ---
    $db->commit();

    // Redirect after successful save
    // Consider redirecting to an edit page for the newly created article: e.g., edit_article.php?id=$articleId
    header("Location: dashboard.php?msg=Article+added+successfully+(ID:+$articleId)");
    exit;

} catch (Exception $e) {
    $db->rollBack();
    error_log("Error saving article in addarticlepost.php: " . $e->getMessage() . " on line " . $e->getLine() . " in " . $e->getFile());
    // Provide a user-friendly error message. Avoid exposing raw exception details in production.
    die("Error saving article. Please check the server logs or contact support. Details: " . htmlspecialchars($e->getMessage()));
}
?>

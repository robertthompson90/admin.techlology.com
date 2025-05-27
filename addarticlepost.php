<?php
// addarticlepost.php
// Version 3.0 - Fully updated to handle structured data for all section types,
// including asset/variant IDs for thumbnail, image sections, and gallery sections.

include 'inc/loginanddb.php'; // Auth and DB connection

// --- Basic Validation ---
if (!isset($_POST['title']) || empty(trim($_POST['title']))) {
    error_log("addarticlepost.php: Article title is required.");
    die("Article title is required.");
}
if (!isset($_POST['tagline']) || empty(trim($_POST['tagline']))) {
    error_log("addarticlepost.php: Tagline is required.");
    die("Tagline is required.");
}

// --- Retrieve and sanitize form data ---
$title = trim($_POST['title']);
$tagline = trim($_POST['tagline']);
$seo_title = isset($_POST['seo_title']) ? trim($_POST['seo_title']) : "";
$meta_description = isset($_POST['meta_description']) ? trim($_POST['meta_description']) : "";

$thumbnail_asset_id = isset($_POST['thumbnail_media_asset_id']) && !empty($_POST['thumbnail_media_asset_id']) ? (int)$_POST['thumbnail_media_asset_id'] : null;
$thumbnail_variant_id = isset($_POST['thumbnail_media_variant_id']) && !empty($_POST['thumbnail_media_variant_id']) ? (int)$_POST['thumbnail_media_variant_id'] : null;

if (!isset($_SESSION['user'])) {
    error_log("addarticlepost.php: User session not found.");
    die("User session not found. Please log in again.");
}
$userId = $_SESSION['user'];

// --- Start Database Transaction ---
$db->beginTransaction();

try {
    // 1. Insert core article data
    $stmtArticle = $db->prepare(
        "INSERT INTO articles (user_id, title, tagline, seo_title, meta_description, 
                               thumbnail_asset_id, thumbnail_variant_id, 
                               status, created_at, updated_at)
         VALUES (:user_id, :title, :tagline, :seo_title, :meta_description, 
                 :thumbnail_asset_id, :thumbnail_variant_id, 
                 'draft', NOW(), NOW())"
    );
    $stmtArticle->execute([
        ':user_id' => $userId,
        ':title' => $title,
        ':tagline' => $tagline,
        ':seo_title' => $seo_title,
        ':meta_description' => $meta_description,
        ':thumbnail_asset_id' => $thumbnail_asset_id,
        ':thumbnail_variant_id' => $thumbnail_variant_id
    ]);
    $articleId = $db->lastInsertId();

    if (!$articleId) {
        throw new Exception("Failed to insert article and get lastInsertId.");
    }

    // 2. Process Tags
    if (isset($_POST['selected_tags']) && !empty(trim($_POST['selected_tags']))) {
        $tagList = explode(',', $_POST['selected_tags']);
        $stmtArticleTag = $db->prepare("INSERT INTO article_tags (article_id, tag_id) VALUES (:article_id, :tag_id)");
        $stmtGetTagId = $db->prepare("SELECT id FROM tags WHERE LOWER(name) = LOWER(:tag_name)");
        $stmtInsertTag = $db->prepare("INSERT INTO tags (name) VALUES (:tag_name)");

        foreach ($tagList as $tagName) {
            $tagName = trim($tagName);
            if (empty($tagName)) continue;
            $stmtGetTagId->execute([':tag_name' => $tagName]);
            $tagId = $stmtGetTagId->fetchColumn();
            if (!$tagId) {
                $stmtInsertTag->execute([':tag_name' => $tagName]);
                $tagId = $db->lastInsertId();
            }
            if ($tagId) {
                $stmtArticleTag->execute([':article_id' => $articleId, ':tag_id' => $tagId]);
            }
        }
    }

    // 3. Process Modular Content Sections
    if (isset($_POST['sections']) && is_array($_POST['sections'])) {
        $order = 1;
        $stmtSection = $db->prepare(
            "INSERT INTO article_sections (article_id, section_type_id, content, order_num, created_at, updated_at)
             VALUES (:article_id, :section_type_id, :content, :order_num, NOW(), NOW())"
        );

        // Define section type constants locally for clarity, ensure they match JS and DB
        define('SUBTITLE_SECTION', 1); define('TEXT_SECTION', 2); define('IMAGE_SECTION', 3);
        define('VIDEO_SECTION', 4); define('GALLERY_SECTION', 5); define('QUOTE_SECTION', 6);
        define('PROS_CONS_SECTION', 7); define('RATING_SECTION', 8);

        foreach ($_POST['sections'] as $sectionInstanceId => $sectionSubmissionData) {
            $sectionTypeId = isset($sectionSubmissionData['type']) ? (int)$sectionSubmissionData['type'] : null;
            if (empty($sectionTypeId)) {
                error_log("addarticlepost.php: Skipping section for article $articleId due to missing type. Instance ID: $sectionInstanceId");
                continue;
            }

            $contentToStore = null; // This will be JSON encoded

            switch ($sectionTypeId) {
                case SUBTITLE_SECTION:
                case TEXT_SECTION:
                case VIDEO_SECTION:
                case QUOTE_SECTION:
                case RATING_SECTION: // For rating, content might include rating_value and verdict_text
                    // These sections primarily use the 'content' sub-array from the form
                    if (isset($sectionSubmissionData['content']) && is_array($sectionSubmissionData['content'])) {
                        $contentToStore = json_encode($sectionSubmissionData['content']);
                    } else {
                        error_log("addarticlepost.php: Missing 'content' array for section type $sectionTypeId, instance $sectionInstanceId");
                        $contentToStore = json_encode([]); // Store empty object if data is malformed
                    }
                    break;

                case IMAGE_SECTION:
                case GALLERY_SECTION:
                    // These sections primarily use the 'data' sub-array from the form
                    if (isset($sectionSubmissionData['data']) && is_array($sectionSubmissionData['data'])) {
                        // For GALLERY_SECTION, 'gallery_images_json' is already a JSON string
                        if ($sectionTypeId == GALLERY_SECTION && isset($sectionSubmissionData['data']['gallery_images_json'])) {
                            // We store the JSON string directly as received for galleries
                            // No, we should store the parsed array as JSON, not a string within a string.
                            // The client-side autosave now saves data.images as an array.
                            // The form submission (if using hidden field populated by JS) would be a JSON string.
                            // Let's assume 'gallery_images_json' is the key if coming directly from a hidden field.
                            // Or, if JS populates 'sections[instanceId][data][images]' as an array, that's better.
                            // Assuming `js/autosave.js` captures `data.images` as an array,
                            // and for direct form submission, a hidden field `gallery_images_json` is used.
                            // For now, let's prioritize `gallery_images_json` if it exists.
                            $galleryJsonString = $sectionSubmissionData['data']['gallery_images_json'] ?? null;
                            if ($galleryJsonString !== null) {
                                json_decode($galleryJsonString); // Validate JSON
                                if (json_last_error() === JSON_ERROR_NONE) {
                                    $contentToStore = $galleryJsonString; // Store the validated JSON string
                                } else {
                                     error_log("addarticlepost.php: Invalid JSON in gallery_images_json for section $sectionInstanceId");
                                     $contentToStore = json_encode(['images' => []]); // Fallback
                                }
                            } else if (isset($sectionSubmissionData['data']['images'])) { // If JS sent a parsed array
                                $contentToStore = json_encode(['images' => $sectionSubmissionData['data']['images']]);
                            } else {
                                $contentToStore = json_encode(['images' => []]);
                            }
                        } else {
                            // For IMAGE_SECTION and potentially other 'data' based sections
                            $contentToStore = json_encode($sectionSubmissionData['data']);
                        }
                    } else {
                        error_log("addarticlepost.php: Missing 'data' array for section type $sectionTypeId, instance $sectionInstanceId");
                        $contentToStore = json_encode([]);
                    }
                    break;

                case PROS_CONS_SECTION:
                    // Expects 'data_json' from a hidden field populated by client-side JS
                    // This field should contain a JSON string like {"pros": ["p1"], "cons": ["c1"]}
                    if (isset($sectionSubmissionData['data_json'])) {
                        json_decode($sectionSubmissionData['data_json']); // Validate
                        if (json_last_error() === JSON_ERROR_NONE) {
                            $contentToStore = $sectionSubmissionData['data_json'];
                        } else {
                            error_log("addarticlepost.php: Invalid JSON in pros_cons data_json for section $sectionInstanceId");
                            $contentToStore = json_encode(['pros' => [], 'cons' => []]); // Fallback
                        }
                    } 
                    // Fallback if JS didn't populate data_json but sent individual arrays (less ideal now)
                    else if (isset($sectionSubmissionData['data']['pros']) || isset($sectionSubmissionData['data']['cons'])) {
                         $prosData = isset($sectionSubmissionData['data']['pros']) && is_array($sectionSubmissionData['data']['pros']) ? $sectionSubmissionData['data']['pros'] : [];
                         $consData = isset($sectionSubmissionData['data']['cons']) && is_array($sectionSubmissionData['data']['cons']) ? $sectionSubmissionData['data']['cons'] : [];
                         $contentToStore = json_encode(['pros' => $prosData, 'cons' => $consData]);
                    }
                    else {
                        error_log("addarticlepost.php: Missing 'data_json' or 'data[pros/cons]' for PROS_CONS_SECTION, instance $sectionInstanceId");
                        $contentToStore = json_encode(['pros' => [], 'cons' => []]);
                    }
                    break;

                default:
                    error_log("addarticlepost.php: Unknown section type $sectionTypeId for article $articleId, instance $sectionInstanceId");
                    $contentToStore = json_encode(['error' => "Unknown section type: $sectionTypeId"]);
            }

            if ($contentToStore === null) { // Should not happen if logic above is complete
                $contentToStore = '{}'; // Default to empty JSON object
            }

            $stmtSection->execute([
                ':article_id' => $articleId,
                ':section_type_id' => $sectionTypeId,
                ':content' => $contentToStore,
                ':order_num' => $order
            ]);
            $order++;
        }
    }

    // 4. Process Sources & Citations
    if (isset($_POST['source_title']) && is_array($_POST['source_title'])) {
        $stmtSource = $db->prepare("INSERT INTO article_sources (article_id, title, url, note) VALUES (?, ?, ?, ?)");
        foreach ($_POST['source_title'] as $i => $sourceTitle) {
            $sourceTitle = trim($sourceTitle);
            if (empty($sourceTitle)) continue;
            $sourceUrl = isset($_POST['source_url'][$i]) ? trim($_POST['source_url'][$i]) : '';
            $sourceNote = isset($_POST['source_note'][$i]) ? trim($_POST['source_note'][$i]) : '';
            $stmtSource->execute([$articleId, $sourceTitle, $sourceUrl, $sourceNote]);
        }
    }

    // --- Commit Transaction ---
    $db->commit();
    header("Location: dashboard.php?msg=Article+added+successfully+(ID:+$articleId)");
    exit;

} catch (Exception $e) {
    $db->rollBack();
    error_log("Error saving article in addarticlepost.php: " . $e->getMessage() . " on line " . $e->getLine() . " in " . $e->getFile());
    die("Error saving article. Please check the server logs or contact support. Message: " . htmlspecialchars($e->getMessage()));
}
?>

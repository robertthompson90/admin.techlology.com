<?php
// ajax/getGlobalMedia.php

header('Content-Type: application/json');
include '../inc/loginanddb.php'; 

global $db; // Make $db available

$q = "";
if (isset($_GET['q']) && trim($_GET['q']) != "") {
    $q = trim($_GET['q']);
}

try {
    // Updated query to include admin_title, source_url, and attribution
    $baseQuery = "
        SELECT
            ma.id,
            ma.admin_title,                                 
            COALESCE(NULLIF(TRIM(ma.admin_title), ''), ma.caption) AS title, 
            ma.caption AS public_caption,                   
            ma.alt_text,
            ma.attribution,                                 -- Existing attribution
            ma.source_url,                                  -- NEW source_url
            ma.default_crop,
            ma.filter_state,
            ma.physical_source_asset_id,
            COALESCE(psa.file_path, ma.file_path) AS image_url
        FROM
            media_assets ma
        LEFT JOIN
            media_assets psa ON ma.physical_source_asset_id = psa.id
    ";

    if ($q != "") {
        // Search in admin_title, caption, alt_text, and now attribution.
        // You might want to add source_url to search later if needed.
        $sql = $baseQuery . " WHERE (ma.admin_title LIKE :q OR ma.caption LIKE :q OR ma.alt_text LIKE :q OR ma.attribution LIKE :q) ORDER BY ma.updated_at DESC, ma.id DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute([':q' => '%' . $q . '%']);
    } else {
        $sql = $baseQuery . " ORDER BY ma.updated_at DESC, ma.id DESC";
        $stmt = $db->query($sql);
    }
    
    $mediaAssets = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Ensure all expected fields have default values if null from DB, especially new ones
    foreach ($mediaAssets as &$asset) {
        $asset['default_crop'] = $asset['default_crop'] ?? '';
        $asset['filter_state'] = $asset['filter_state'] ?? '';
        $asset['admin_title'] = $asset['admin_title'] ?? ''; 
        $asset['title'] = $asset['title'] ?? ($asset['admin_title'] ?: ($asset['public_caption'] ?: 'Untitled Asset')); // More robust fallback for title
        $asset['public_caption'] = $asset['public_caption'] ?? '';
        $asset['alt_text'] = $asset['alt_text'] ?? '';
        $asset['attribution'] = $asset['attribution'] ?? ''; // Default for attribution
        $asset['source_url'] = $asset['source_url'] ?? '';   // Default for source_url
    }
    unset($asset); 

    echo json_encode($mediaAssets);

} catch (Exception $e) {
    http_response_code(500);
    error_log("Error in getGlobalMedia.php: " . $e->getMessage()); 
    echo json_encode(['error' => 'Could not retrieve media assets. ' . $e->getMessage()]);
}
?>

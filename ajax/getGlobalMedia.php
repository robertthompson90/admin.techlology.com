<?php
// ajax/getGlobalMedia.php

header('Content-Type: application/json');
include '../inc/loginanddb.php'; // Adjust the path if needed

$q = "";
if (isset($_GET['q']) && trim($_GET['q']) != "") {
    $q = trim($_GET['q']);
}

try {
    // Updated query to include admin_title
    // The existing 'title' alias for ma.caption is kept for now.
    // If admin_title is empty, we can fall back to caption for the 'title' field for display in media library.
    $baseQuery = "
        SELECT
            ma.id,
            ma.admin_title,                                 -- New admin_title field
            COALESCE(NULLIF(ma.admin_title, ''), ma.caption) AS title, -- Use admin_title for display, fallback to caption
            ma.caption AS public_caption,                   -- Keep original caption available
            ma.alt_text,
            ma.attribution,
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
        // Search in admin_title, caption, alt_text, and tags
        $sql = $baseQuery . " WHERE (ma.admin_title LIKE :q OR ma.caption LIKE :q OR ma.alt_text LIKE :q OR ma.tags LIKE :q) ORDER BY ma.id DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute([':q' => '%' . $q . '%']);
    } else {
        $sql = $baseQuery . " ORDER BY ma.id DESC";
        $stmt = $db->query($sql);
    }
    
    $mediaAssets = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($mediaAssets as &$asset) {
        $asset['default_crop'] = $asset['default_crop'] ?? '';
        $asset['filter_state'] = $asset['filter_state'] ?? '';
        $asset['admin_title'] = $asset['admin_title'] ?? ''; // Ensure admin_title is not null
        // The 'title' field is now primarily derived from admin_title or caption
    }
    unset($asset); 

    echo json_encode($mediaAssets);

} catch (Exception $e) {
    http_response_code(500);
    error_log("Error in getGlobalMedia.php: " . $e->getMessage()); 
    echo json_encode(['error' => 'Could not retrieve media assets. ' . $e->getMessage()]);
}
?>

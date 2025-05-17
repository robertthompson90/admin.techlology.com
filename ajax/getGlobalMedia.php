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
    // The 'title' alias for ma.caption has been updated to prioritize admin_title.
    $baseQuery = "
        SELECT
            ma.id,
            ma.admin_title,                                 -- New admin_title field
            COALESCE(NULLIF(TRIM(ma.admin_title), ''), ma.caption) AS title, -- Use admin_title for display, fallback to caption
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
        // Search in admin_title, caption, alt_text. Assuming 'tags' is not a direct column in media_assets for now.
        // If you have a tags system for media, that join/condition would be added here.
        $sql = $baseQuery . " WHERE (ma.admin_title LIKE :q OR ma.caption LIKE :q OR ma.alt_text LIKE :q) ORDER BY ma.id DESC";
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
        $asset['admin_title'] = $asset['admin_title'] ?? ''; 
        $asset['title'] = $asset['title'] ?? ''; // Ensure title is not null
        $asset['public_caption'] = $asset['public_caption'] ?? '';
        $asset['alt_text'] = $asset['alt_text'] ?? '';
    }
    unset($asset); 

    echo json_encode($mediaAssets);

} catch (Exception $e) {
    http_response_code(500);
    error_log("Error in getGlobalMedia.php: " . $e->getMessage()); 
    echo json_encode(['error' => 'Could not retrieve media assets. ' . $e->getMessage()]);
}
?>

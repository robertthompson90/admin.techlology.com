<?php
// ajax/getGlobalMedia.php

header('Content-Type: application/json');
include '../inc/loginanddb.php'; // Adjust the path if needed

$q = "";
if (isset($_GET['q']) && trim($_GET['q']) != "") {
    $q = trim($_GET['q']);
}

try {
    $baseQuery = "
        SELECT
            ma.id,
            ma.caption AS title, 
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
        $sql = $baseQuery . " WHERE ma.caption LIKE :q OR ma.alt_text LIKE :q OR ma.tags LIKE :q ORDER BY ma.id DESC"; // Added search in alt_text and assumed a 'tags' text column for searching
        $stmt = $db->prepare($sql);
        $stmt->execute([':q' => '%' . $q . '%']);
    } else {
        $sql = $baseQuery . " ORDER BY ma.id DESC";
        $stmt = $db->query($sql);
    }
    
    $mediaAssets = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Ensure default_crop and filter_state are not null for JS (empty string is fine)
    foreach ($mediaAssets as &$asset) {
        $asset['default_crop'] = $asset['default_crop'] ?? '';
        $asset['filter_state'] = $asset['filter_state'] ?? '';
        // physical_source_asset_id can be null, that's fine
    }
    unset($asset); // Unset reference

    echo json_encode($mediaAssets);

} catch (Exception $e) {
    http_response_code(500);
    error_log("Error in getGlobalMedia.php: " . $e->getMessage()); // Log the actual error
    echo json_encode(['error' => 'Could not retrieve media assets. ' . $e->getMessage()]);
}
?>

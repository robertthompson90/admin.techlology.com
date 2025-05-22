<?php
// ajax/getGlobalMedia.php

header('Content-Type: application/json');
include '../inc/loginanddb.php'; 

global $db; 

$q = isset($_GET['q']) ? trim($_GET['q']) : "";
$tag_filter_id = isset($_GET['tag_filter']) && !empty($_GET['tag_filter']) ? (int)$_GET['tag_filter'] : null;
$show_variants = isset($_GET['show_variants']) && ($_GET['show_variants'] === 'true' || $_GET['show_variants'] === true);

try {
    $params = [];
    // Fields for master assets
    // When a row is a master, variant_id, variant_type, etc., will be NULL.
    // is_variant is 'false'.
    // master_admin_title etc. will be the master's own details.
    $master_asset_fields_select = "
        ma.id, ma.admin_title, 
        COALESCE(NULLIF(TRIM(ma.admin_title), ''), ma.caption) AS title, 
        ma.caption AS public_caption, ma.alt_text, ma.attribution, ma.source_url,
        ma.default_crop, ma.filter_state, ma.physical_source_asset_id,
        COALESCE(psa.file_path, ma.file_path) AS image_url,
        'false' AS is_variant, 
        NULL AS variant_id, 
        NULL AS variant_type, 
        NULL AS variant_details, 
        NULL AS media_asset_id_for_variant,
        ma.admin_title AS master_admin_title,
        ma.caption AS master_public_caption,
        ma.alt_text AS master_alt_text,
        ma.source_url AS master_source_url,
        ma.attribution AS master_attribution,
        ma.default_crop AS master_default_crop,
        ma.filter_state AS master_filter_state,
        ma.physical_source_asset_id AS master_physical_source_asset_id
    ";

    $sql_master_assets_from = "
        FROM media_assets ma
        LEFT JOIN media_assets psa ON ma.physical_source_asset_id = psa.id
    ";

    $joins_master = "";
    $where_conditions_master = [];

    if ($q != "") {
        $where_conditions_master[] = "(ma.admin_title LIKE :q_master OR ma.caption LIKE :q_master_caption OR ma.alt_text LIKE :q_master_alt OR ma.attribution LIKE :q_master_attr)";
        $params[':q_master'] = '%' . $q . '%';
        $params[':q_master_caption'] = '%' . $q . '%';
        $params[':q_master_alt'] = '%' . $q . '%';
        $params[':q_master_attr'] = '%' . $q . '%';
    }

    if ($tag_filter_id !== null) {
        $joins_master .= " JOIN media_tags mt_master ON ma.id = mt_master.media_asset_id ";
        $where_conditions_master[] = "mt_master.tag_id = :tag_id_master";
        $params[':tag_id_master'] = $tag_filter_id;
    }
    
    $sql_master_assets = "SELECT $master_asset_fields_select $sql_master_assets_from ";
    if (!empty($joins_master)) {
        $sql_master_assets .= $joins_master;
    }
    if (!empty($where_conditions_master)) {
        $sql_master_assets .= " WHERE " . implode(" AND ", $where_conditions_master);
    }

    $final_sql = "";

    if ($show_variants) {
        // Fields for variants.
        // id here will be the master's id, variant_id will be the media_variants.id
        // is_variant is 'true'.
        // master_admin_title etc. are explicitly selected from the joined master_asset.
        $variant_fields_select = "
            master_asset.id, master_asset.admin_title, -- Master's admin_title for context
            mv.variant_type AS title, -- Variant's type as its primary title display
            master_asset.caption AS public_caption, -- Master's public caption
            master_asset.alt_text AS alt_text,     -- Master's alt text
            master_asset.attribution AS attribution, -- Master's attribution
            master_asset.source_url AS source_url,   -- Master's source_url
            NULL AS default_crop,   -- Not directly applicable to variant row, master's is used
            NULL AS filter_state,   -- Not directly applicable to variant row, master's is used
            master_asset.physical_source_asset_id, -- Master's physical source ID
            COALESCE(phys_master.file_path, master_asset.file_path) AS image_url, -- Physical URL from master
            'true' AS is_variant,
            mv.id AS variant_id,
            mv.variant_type,
            mv.variant_details,
            mv.media_asset_id AS media_asset_id_for_variant,
            master_asset.admin_title AS master_admin_title,
            master_asset.caption AS master_public_caption,
            master_asset.alt_text AS master_alt_text,
            master_asset.source_url AS master_source_url,
            master_asset.attribution AS master_attribution,
            master_asset.default_crop AS master_default_crop,
            master_asset.filter_state AS master_filter_state,
            master_asset.physical_source_asset_id AS master_physical_source_asset_id
        ";

        $sql_variants_from = "
            FROM media_variants mv
            JOIN media_assets master_asset ON mv.media_asset_id = master_asset.id
            LEFT JOIN media_assets phys_master ON master_asset.physical_source_asset_id = phys_master.id
        ";
        
        $joins_variant = "";
        $where_conditions_variant = []; // These conditions apply to the master of the variant

        if ($q != "") {
            // Filter variants if their master matches OR if the variant_type itself matches
            $where_conditions_variant[] = " (master_asset.admin_title LIKE :q_variant_master OR master_asset.caption LIKE :q_variant_master_caption OR master_asset.alt_text LIKE :q_variant_master_alt OR master_asset.attribution LIKE :q_variant_master_attr OR mv.variant_type LIKE :q_variant_type) ";
            $params[':q_variant_master'] = '%' . $q . '%';
            $params[':q_variant_master_caption'] = '%' . $q . '%';
            $params[':q_variant_master_alt'] = '%' . $q . '%';
            $params[':q_variant_master_attr'] = '%' . $q . '%';
            $params[':q_variant_type'] = '%' . $q . '%';
        }

        if ($tag_filter_id !== null) {
            // Filter variants if their master has the tag
            $joins_variant .= " JOIN media_tags mt_variant_master ON master_asset.id = mt_variant_master.media_asset_id ";
            $where_conditions_variant[] = "mt_variant_master.tag_id = :tag_id_variant";
            $params[':tag_id_variant'] = $tag_filter_id;
        }
        
        $sql_variants = "SELECT $variant_fields_select $sql_variants_from ";
        if (!empty($joins_variant)) {
            $sql_variants .= $joins_variant;
        }
        if (!empty($where_conditions_variant)) {
            $sql_variants .= " WHERE " . implode(" AND ", $where_conditions_variant);
        }
        
        // The UNION combines masters that match filters, AND variants whose masters match filters
        $final_sql = "SELECT * FROM ( ($sql_master_assets) UNION ALL ($sql_variants) ) AS combined_results 
                      ORDER BY 
                        COALESCE(media_asset_id_for_variant, id) DESC, -- Group by master asset ID
                        is_variant ASC,                         -- Show master before its variants
                        COALESCE(variant_id, 0) ASC;            -- Then order variants by their ID
                      ";
    } else {
        $final_sql = $sql_master_assets . " ORDER BY ma.updated_at DESC, ma.id DESC";
    }
    
    error_log("GetGlobalMedia SQL: " . $final_sql);
    error_log("GetGlobalMedia Params: " . print_r($params, true));

    $stmt = $db->prepare($final_sql);
    $stmt->execute($params);
    
    $mediaAssets = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($mediaAssets as &$asset) {
        // Ensure boolean for is_variant
        $asset['is_variant'] = ($asset['is_variant'] === 'true' || $asset['is_variant'] === true);

        // Default values for potentially null fields
        $asset['admin_title'] = $asset['admin_title'] ?? '';
        $asset['title'] = $asset['title'] ?? ($asset['admin_title'] ?: ($asset['public_caption'] ?: 'Untitled'));
        $asset['public_caption'] = $asset['public_caption'] ?? '';
        $asset['alt_text'] = $asset['alt_text'] ?? '';
        $asset['attribution'] = $asset['attribution'] ?? '';
        $asset['source_url'] = $asset['source_url'] ?? '';
        $asset['default_crop'] = $asset['default_crop'] ?? '';
        $asset['filter_state'] = $asset['filter_state'] ?? '';
        
        if ($asset['is_variant']) {
            $variant_details_parsed = null;
            if (!empty($asset['variant_details'])) {
                try {
                    $variant_details_parsed = json_decode($asset['variant_details'], true);
                    if (json_last_error() !== JSON_ERROR_NONE) {
                        error_log("JSON decode error for variant ID " . $asset['variant_id'] . " (master " . $asset['media_asset_id_for_variant'] . "): " . json_last_error_msg() . " - Details: " . $asset['variant_details']);
                        $variant_details_parsed = null;
                    }
                } catch (Exception $e) {
                    error_log("Exception parsing variant_details for variant ID " . $asset['variant_id'] . ": " . $e->getMessage());
                    $variant_details_parsed = null;
                }
            }
            
            // Initialize effective crop and filters with the variant's own details
            $effective_crop = $variant_details_parsed['crop'] ?? null;
            $effective_filters = $variant_details_parsed['filters'] ?? [];

            // Check if the variant's master is a virtual master and has defaults
            $master_is_virtual_and_has_defaults = false;
            if ($asset['master_physical_source_asset_id'] !== null && 
                $asset['master_physical_source_asset_id'] != $asset['media_asset_id_for_variant']) { // Master is virtual
                if (!empty($asset['master_default_crop']) || !empty($asset['master_filter_state'])) {
                    $master_is_virtual_and_has_defaults = true;
                }
            }

            if ($master_is_virtual_and_has_defaults) {
                $master_default_crop_parsed = null;
                if (!empty($asset['master_default_crop'])) {
                    try { $master_default_crop_parsed = json_decode($asset['master_default_crop'], true); } catch (Exception $e) {}
                }
                $master_filter_state_parsed = null;
                if (!empty($asset['master_filter_state'])) {
                    try { $master_filter_state_parsed = json_decode($asset['master_filter_state'], true); } catch (Exception $e) {}
                }

                // 1. Combine Filters: Variant's filters override/add to master's default filters
                if (!empty($master_filter_state_parsed)) {
                    $effective_filters = array_merge($master_filter_state_parsed, $effective_filters);
                }

                // 2. Combine Crops: Variant's crop is relative to master's default_crop view
                if ($master_default_crop_parsed && isset($master_default_crop_parsed['x'], $master_default_crop_parsed['y']) &&
                    $effective_crop && isset($effective_crop['x'], $effective_crop['y'])) {
                    
                    $new_effective_crop_x = ($master_default_crop_parsed['x'] ?? 0) + ($effective_crop['x'] ?? 0);
                    $new_effective_crop_y = ($master_default_crop_parsed['y'] ?? 0) + ($effective_crop['y'] ?? 0);
                    
                    // Width and height of the variant's crop are absolute *within* the master's cropped view.
                    // We need to ensure they don't exceed the master's default crop dimensions.
                    $new_effective_crop_width = $effective_crop['width'] ?? 0;
                    $new_effective_crop_height = $effective_crop['height'] ?? 0;

                    if (isset($master_default_crop_parsed['width']) && $master_default_crop_parsed['width'] > 0) {
                         $new_effective_crop_width = min($new_effective_crop_width, $master_default_crop_parsed['width'] - ($effective_crop['x'] ?? 0) );
                    }
                     if (isset($master_default_crop_parsed['height']) && $master_default_crop_parsed['height'] > 0) {
                        $new_effective_crop_height = min($new_effective_crop_height, $master_default_crop_parsed['height'] - ($effective_crop['y'] ?? 0) );
                    }
                    
                    $effective_crop['x'] = max(0, $new_effective_crop_x); // Ensure not negative
                    $effective_crop['y'] = max(0, $new_effective_crop_y); // Ensure not negative
                    $effective_crop['width'] = max(1, $new_effective_crop_width); // Ensure positive
                    $effective_crop['height'] = max(1, $new_effective_crop_height); // Ensure positive

                } elseif ($master_default_crop_parsed && !$effective_crop) {
                    // If variant has no crop but master does, use master's crop
                    $effective_crop = $master_default_crop_parsed;
                }
            }
            
            // Store the final effective transformations for the JS
            $asset['variant_details_parsed'] = [
                'crop' => $effective_crop,
                'filters' => $effective_filters,
                // Preserve original caption/alt from variant_details if they existed
                'caption' => $variant_details_parsed['caption'] ?? '',
                'altText' => $variant_details_parsed['altText'] ?? ''
            ];
            // Also update the string version for consistency if needed, though JS primarily uses _parsed
            // $asset['variant_details'] = json_encode($asset['variant_details_parsed']);
        }
    }
    unset($asset); 

    echo json_encode($mediaAssets);

} catch (Exception $e) {
    http_response_code(500);
    error_log("Error in getGlobalMedia.php: " . $e->getMessage() . " SQL: " . ($final_sql ?? 'N/A')); 
    echo json_encode(['error' => 'Could not retrieve media assets. ' . $e->getMessage()]);
}
?>

<?php
// ajax/updateMediaVariant.php
header('Content-Type: application/json');
include '../inc/loginanddb.php';

if (!isset($_SESSION['user'])) {
    echo json_encode(['success' => false, 'error' => 'User not authenticated.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Invalid request method.']);
    exit;
}

$variant_id = isset($_POST['variant_id']) ? (int)$_POST['variant_id'] : 0;
$variant_type = isset($_POST['variant_type']) ? trim($_POST['variant_type']) : null; // Variant's admin title
$variant_details_json = isset($_POST['variant_details']) ? $_POST['variant_details'] : ''; // JSON blob with crop, filters, caption, altText

if (empty($variant_id) || empty($variant_details_json)) {
    echo json_encode(['success' => false, 'error' => 'Missing required parameters (variant_id or variant_details).']);
    exit;
}

// Validate JSON for variant_details
$decoded_details = json_decode($variant_details_json);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(['success' => false, 'error' => 'Invalid JSON in variant_details. Error: ' . json_last_error_msg()]);
    exit;
}

try {
    $db->beginTransaction();

    // If variant_type is not provided (e.g. only image data changed), keep the existing one.
    // However, the JS (v2.9) should always send it now.
    $current_variant_type = $variant_type;
    if ($variant_type === null) {
        $stmtFetchType = $db->prepare("SELECT variant_type FROM media_variants WHERE id = ?");
        $stmtFetchType->execute([$variant_id]);
        $current_variant_type = $stmtFetchType->fetchColumn();
        if ($current_variant_type === false) { 
             $db->rollBack();
             echo json_encode(['success' => false, 'error' => 'Variant not found for type fetch.']);
             exit;
        }
    }
    
    $stmt = $db->prepare(
        "UPDATE media_variants 
         SET variant_type = ?, variant_details = ?, updated_at = NOW()
         WHERE id = ?"
    );
    $stmt->execute([$current_variant_type, $variant_details_json, $variant_id]);
    
    if ($stmt->rowCount() > 0) {
        $db->commit();
        echo json_encode(['success' => true, 'variant_id' => $variant_id, 'message' => 'Variant updated successfully.']);
    } else {
        $checkStmt = $db->prepare("SELECT id FROM media_variants WHERE id = ?");
        $checkStmt->execute([$variant_id]);
        if ($checkStmt->rowCount() == 0) {
            $db->rollBack();
            echo json_encode(['success' => false, 'error' => 'Variant not found.', 'variant_id' => $variant_id]);
        } else {
            $db->commit(); 
            echo json_encode(['success' => true, 'variant_id' => $variant_id, 'message' => 'Variant details were already up to date.']);
        }
    }

} catch (PDOException $e) {
    $db->rollBack();
    error_log("Error in updateMediaVariant.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Database error: Could not update variant.']);
}
?>

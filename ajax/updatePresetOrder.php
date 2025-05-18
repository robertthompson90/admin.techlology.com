<?php
// updatePresetOrder.php
header('Content-Type: application/json');
include '../inc/loginanddb.php'; // Adjust the path if needed

if (isset($_POST['order']) && is_array($_POST['order'])) {
    $orderArray = $_POST['order'];
    foreach ($orderArray as $displayOrder => $presetId) {
        // Use proper parameter binding with your PDO/MySQLi instance.
        $stmt = $db->prepare("UPDATE media_presets SET display_order = ? WHERE id = ?");
        $stmt->execute([$displayOrder, $presetId]);
    }
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => 'Invalid order data']);
}
?>
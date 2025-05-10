<?php
// Include the loginanddb.php to verify and ensure session setup
include 'inc/loginanddb.php';

// Destroy the session
session_start();
session_unset(); // Remove all session variables
session_destroy(); // Destroy the session

// Redirect to the login page after logging out
header('Location: login.php');
exit();
?>

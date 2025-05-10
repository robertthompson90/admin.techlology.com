<?php
  session_start();

  require_once('inc/dbonly.php');

  if (
    !isset($_POST['challenge']) ||
    !isset($_SESSION['challenge']) ||
    $_POST['challenge'] !== $_SESSION['challenge']
  )
  {
    // Challenge is missing or does not match
    header('Location: login.php?error=invalid');
    exit();
  }

  // Unset the challenge to prevent reuse
  unset($_SESSION['challenge']);

  $username = $_POST['username'];
  $password = $_POST['password'];

  $quser = $db->prepare('SELECT id, username, password FROM users WHERE username = :username');
  $quser->bindParam(':username', $username);
  $quser->execute();
  $ruser = $quser->fetch(PDO::FETCH_ASSOC);

  if ($ruser && password_verify($password, $ruser['password']))
  {
    $_SESSION['user'] = $ruser['id'];
    $redirectPage = isset($_GET['page']) ? $_GET['page'] : 'dashboard.php';
    header("Location: $redirectPage");
    exit();
  }
  else
  {
    header('Location: login.php?error=invalid&username=' . urlencode($username));
    exit();
  }
?>

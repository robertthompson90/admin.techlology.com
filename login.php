<?php
  session_start();
  session_unset();
  $challenge = '';
  for ($i = 0; $i < 80; $i++) 
  {
    $challenge .= dechex(rand(0, 15)); // Generate random challenge
  }
  $_SESSION['challenge'] = $challenge; // Store challenge in session
?>
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0">
  <link rel="stylesheet" type="text/css" href="css/login.css">
  <title>Login</title>
</head>
<body>
  <div id="login-container">
    <?php
      if (isset($_GET['error']) && $_GET['error'] == 'invalid') 
      {
        echo '<div id="error-message-container"><div class="error-message">Invalid username or password.</div></div>';
      }
    ?>
    <form id="loginform" action="authenticate.php" method="POST">
      <input type="hidden" name="challenge" value="<?php echo $_SESSION['challenge']; ?>"> <!-- Correct challenge from session -->
      <input class="width200" type="text" name="username" placeholder="username" required autofocus autocomplete="off" value="<?php echo isset($_GET['username']) ? htmlspecialchars($_GET['username']) : ''; ?>"> <!-- Pre-fill username on error -->
      <div class="password-container">
        <input class="width200" type="password" name="password" id="password" placeholder="password" required> <!-- Correct field name as 'password' -->
        <span class="view-password-icon" id="toggle-password">👁️</span>
      </div>
      <button id="login">Login</button>
    </form>
  </div>

  <script src="js/jquery-3.6.0.min.js"></script>
  <script>
    // Toggle password visibility
    $('#toggle-password').click(function() 
    {
      var passwordfield = $('#password');
      var fieldtype = passwordfield.attr('type');
      
      if (fieldtype === 'password') 
      {
        passwordfield.attr('type', 'text');
      } 
      else 
      {
        passwordfield.attr('type', 'password');
      }
    });
  </script>
</body>
</html>

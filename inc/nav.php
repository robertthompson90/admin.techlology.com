<?php
// nav.php
?>
<div class="sidebar">
  <div class="sidebar-title">TECHLOLOGY</div>
  <ul class="nav">
    <li class="nav-item">
      <a href="dashboard.php" <?php if(basename($_SERVER['PHP_SELF']) == 'dashboard.php') { echo 'class="active"'; } ?>>
        Dashboard
      </a>
    </li>
    <li class="nav-item">
      <a href="articles.php" <?php if(basename($_SERVER['PHP_SELF']) == 'articles.php') { echo 'class="active"'; } ?>>
        Articles
      </a>
    </li>
    <li class="nav-item">
      <a href="users.php" <?php if(basename($_SERVER['PHP_SELF']) == 'users.php') { echo 'class="active"'; } ?>>
        Users
      </a>
    </li>
    <li class="nav-item">
      <a href="tags.php" <?php if(basename($_SERVER['PHP_SELF']) == 'tags.php') { echo 'class="active"'; } ?>>
        Tags
      </a>
    </li>
    <li class="nav-item">
      <a href="sources.php" <?php if(basename($_SERVER['PHP_SELF']) == 'sources.php') { echo 'class="active"'; } ?>>
        Sources
      </a>
    </li>
    <li class="nav-item">
      <a href="settings.php" <?php if(basename($_SERVER['PHP_SELF']) == 'settings.php') { echo 'class="active"'; } ?>>
        Settings
      </a>
    </li>
    <li class="nav-item">
      <a href="logout.php" class="logout">Logout</a>
    </li>
  </ul>
</div>

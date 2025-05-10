<?php

	include 'inc/loginanddb.php';

	// get current user name
	$quser = $db->prepare("select name from users where id = ?");
	$quser->execute([ $_SESSION['user'] ]);
	$ruser = $quser->fetch();

	// get article count
	$qarticles = $db->query("select count(*) from articles");
	$articles = $qarticles->fetchColumn();

	// get user count
	$qusers = $db->query("select count(*) from users");
	$users = $qusers->fetchColumn();

	// get tag count
	$qtags = $db->query("select count(*) from tags");
	$tags = $qtags->fetchColumn();

	// get source count
	$qsources = $db->query("select count(*) from article_sources");
	$sources = $qsources->fetchColumn();

?>
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>Admin Dashboard</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link href="css/techlology.css?v=1" rel="stylesheet" type="text/css">
</head>
<body>

<div class="layout">

	<?php include('inc/nav.php'); ?>

	<div class="main">
		<div class="header">
			<h1>Welcome, <?php echo htmlspecialchars($ruser['name']); ?>!</h1>
		</div>

		<div class="dashboard-grid">

			<div class="card">
				<div class="card-title">Articles</div>
				<div class="card-number"><?php echo $articles; ?></div>
			</div>

			<div class="card">
				<div class="card-title">Users</div>
				<div class="card-number"><?php echo $users; ?></div>
			</div>

			<div class="card">
				<div class="card-title">Tags</div>
				<div class="card-number"><?php echo $tags; ?></div>
			</div>

			<div class="card">
				<div class="card-title">Sources</div>
				<div class="card-number"><?php echo $sources; ?></div>
			</div>

		</div>
	</div>

</div>

</body>
</html>

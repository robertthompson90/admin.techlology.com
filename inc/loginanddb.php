<?php
date_default_timezone_set('Europe/London');

session_start();
if(!isset($_SESSION['user']))
{
	if(isset($_REQUEST['fromajax']))
	{
		echo -1;
	}
	else
	{
		echo '<script>window.top.location.href="/login.php?page="+window.top.location.href;</script>';
	}
	die();
}

require_once('dbonly.php');
?>
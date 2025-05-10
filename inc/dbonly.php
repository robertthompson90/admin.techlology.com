<?php
// Windows
$windowspath = 'C:\\\dbfilecredentials\\admin.techlology.com.php';
// Linux (DigitalOcean)
$linuxpath = '/var/secure/credentials_techlologyadmin.php';
// Pick based on OS
$credentialsfile = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN'?$windowspath:$linuxpath;
$dbcredentials = require $credentialsfile;

date_default_timezone_set('Europe/London');
$db = new PDO("mysql:host=".$dbcredentials['DB_ADDR'].";dbname=techlology", $dbcredentials['DB_USER'], $dbcredentials['DB_PASS']);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->exec("set names utf8mb4");
?>
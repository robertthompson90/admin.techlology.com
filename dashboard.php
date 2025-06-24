<?php
include 'inc/loginanddb.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Admin Dashboard - Techlology</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="css/global.css">
    <link rel="stylesheet" href="css/dashboard.css">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
</head>
<body class="dashboard-page">
    <?php include 'inc/nav.php'; ?>
    <div class="dashboard-main">
        <h1>Dashboard</h1>
        <div class="dashboard-cards" id="dashboard-cards"></div>
        <div class="dashboard-section">
            <h3>Recent Articles</h3>
            <div class="dashboard-actions">
                <button class="btn btn-primary" onclick="window.location='addarticle.php'">+ New Article</button>
            </div>
            <table class="dashboard-table" id="recent-articles-table">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Last Updated</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
        <div class="dashboard-section">
            <h3>Recent Media</h3>
            <div class="dashboard-actions">
                <button class="btn btn-primary" onclick="window.location='medialibrary.php'">+ Add Media</button>
            </div>
            <table class="dashboard-table" id="recent-media-table">
                <thead>
                    <tr>
                        <th>Preview</th>
                        <th>Title</th>
                        <th>Uploaded</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    </div>
    <script>
    $(function() {
        $.getJSON('ajax/dashboard_summary.php', function(data) {
            $('#dashboard-cards').html(
                '<div class="dashboard-card"><div class="count">'+data.articles+'</div><div>Articles</div></div>' +
                '<div class="dashboard-card"><div class="count">'+data.media+'</div><div>Media Assets</div></div>' +
                '<div class="dashboard-card"><div class="count">'+data.tags+'</div><div>Tags</div></div>' +
                '<div class="dashboard-card"><div class="count">'+data.users+'</div><div>Users</div></div>'
            );
        });
        $.getJSON('ajax/dashboard_recent_articles.php', function(data) {
            var rows = '';
            if (data.length === 0) {
                rows = '<tr><td colspan="4" class="dashboard-empty">No articles found.</td></tr>';
            } else {
                $.each(data, function(i, a) {
                    rows += '<tr>' +
                        '<td><a class="dashboard-link" href="addarticle.php?id='+a.id+'">'+$('<div>').text(a.title).html()+'</a></td>' +
                        '<td>'+$('<div>').text(a.status).html()+'</td>' +
                        '<td>'+$('<div>').text(a.updated_at).html()+'</td>' +
                        '<td><button class="btn btn-secondary" onclick="window.location=\'addarticle.php?id='+a.id+'\'">Edit</button></td>' +
                        '</tr>';
                });
            }
            $('#recent-articles-table tbody').html(rows);
        });
        $.getJSON('ajax/dashboard_recent_media.php', function(data) {
            var rows = '';
            if (data.length === 0) {
                rows = '<tr><td colspan="4" class="dashboard-empty">No media found.</td></tr>';
            } else {
                $.each(data, function(i, m) {
                    rows += '<tr>' +
                        '<td>' + (m.file_path ? '<img class="dashboard-media-thumb" src="'+$('<div>').text(m.file_path).html()+'" alt="">' : '<span class="dashboard-empty">No image</span>') + '</td>' +
                        '<td>' + ($('<div>').text(m.admin_title || 'Untitled').html()) + '</td>' +
                        '<td>' + ($('<div>').text(m.created_at).html()) + '</td>' +
                        '<td><button class="btn btn-secondary" onclick="window.location=\'medialibrary.php?media_id='+m.id+'\'">View</button></td>' +
                        '</tr>';
                });
            }
            $('#recent-media-table tbody').html(rows);
        });
    });
    </script>
</body>
</html>

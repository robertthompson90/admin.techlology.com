<?php
include 'inc/loginanddb.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>All Articles - Techlology Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="css/global.css">
    <link rel="stylesheet" href="css/dashboard.css">
    <link rel="stylesheet" href="css/articles.css">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
</head>
<body class="dashboard-page">
    <?php include 'inc/nav.php'; ?>
    <div class="dashboard-main">
        <h1>Articles</h1>
        <div class="articles-controls">
            <input type="text" id="article-search" class="input" placeholder="Search articles..." autocomplete="off">
            <select id="article-status-filter" class="input">
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
            </select>
            <button class="btn btn-primary" onclick="window.location='addarticle.php'">+ New Article</button>
        </div>
        <table class="dashboard-table" id="articles-table">
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Author</th>
                    <th>Updated</th>
                    <th>Tags</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <!-- AJAX: articles -->
            </tbody>
        </table>
    </div>
    <script>
    function fetchArticles() {
        var search = $('#article-search').val();
        var status = $('#article-status-filter').val();
        $.getJSON('ajax/articles_list.php', {search: search, status: status}, function(data) {
            var rows = '';
            if (data.length === 0) {
                rows = '<tr><td colspan="6" class="dashboard-empty">No articles found.</td></tr>';
            } else {
                $.each(data, function(i, a) {
                    rows += '<tr>' +
                        '<td><a class="dashboard-link" href="addarticle.php?id='+a.id+'">'+$('<div>').text(a.title).html()+'</a></td>' +
                        '<td>'+$('<div>').text(a.status).html()+'</td>' +
                        '<td>'+$('<div>').text(a.author).html()+'</td>' +
                        '<td>'+$('<div>').text(a.updated_at).html()+'</td>' +
                        '<td>'+(a.tags ? a.tags.map(function(t){return '<span class="tag">'+$('<div>').text(t).html()+'</span>';}).join(' ') : '')+'</td>' +
                        '<td>' +
                            '<button class="btn btn-secondary" onclick="window.location=\'addarticle.php?id='+a.id+'\'">Edit</button>' +
                            '<button class="btn btn-secondary" onclick="window.location=\'viewarticle.php?id='+a.id+'\'">View</button>' +
                        '</td>' +
                        '</tr>';
                });
            }
            $('#articles-table tbody').html(rows);
        });
    }
    $(function() {
        fetchArticles();
        $('#article-search').on('input', function() { fetchArticles(); });
        $('#article-status-filter').on('change', function() { fetchArticles(); });
    });
    </script>
</body>
</html>
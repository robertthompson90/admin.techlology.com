<?php
include 'inc/loginanddb.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Tags - Techlology Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="css/global.css">
    <link rel="stylesheet" href="css/dashboard.css">
    <link rel="stylesheet" href="css/tags.css">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
</head>
<body class="dashboard-page">
    <?php include 'inc/nav.php'; ?>
    <div class="dashboard-main">
        <h1>Tags</h1>
        <div class="tags-controls">
            <input type="text" id="tag-new" class="input" placeholder="Add new tag..." autocomplete="off">
            <button class="btn btn-primary" id="add-tag-btn">Add Tag</button>
        </div>
        <table class="dashboard-table" id="tags-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <!-- AJAX: tags -->
            </tbody>
        </table>
    </div>
    <script>
    function fetchTags() {
        $.getJSON('ajax/tags_list.php', function(data) {
            var rows = '';
            if (data.length === 0) {
                rows = '<tr><td colspan="2" class="dashboard-empty">No tags found.</td></tr>';
            } else {
                $.each(data, function(i, t) {
                    rows += '<tr>' +
                        '<td>'+$('<div>').text(t.name).html()+'</td>' +
                        '<td><button class="btn btn-secondary" onclick="deleteTag('+t.id+')">Delete</button></td>' +
                        '</tr>';
                });
            }
            $('#tags-table tbody').html(rows);
        });
    }
    function deleteTag(id) {
        if (!confirm('Delete this tag?')) return;
        $.post('ajax/tags_delete.php', {id: id}, fetchTags);
    }
    $('#add-tag-btn').on('click', function() {
        var name = $('#tag-new').val().trim();
        if (!name) return;
        $.post('ajax/tags_add.php', {name: name}, function() {
            $('#tag-new').val('');
            fetchTags();
        });
    });
    $(fetchTags);
    </script>
</body>
</html>

<?php
include 'inc/loginanddb.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Users - Techlology Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="css/global.css">
    <link rel="stylesheet" href="css/dashboard.css">
    <link rel="stylesheet" href="css/users.css">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
</head>
<body class="dashboard-page">
    <?php include 'inc/nav.php'; ?>
    <div class="dashboard-main">
        <h1>Users</h1>
        <table class="dashboard-table" id="users-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <!-- AJAX: users -->
            </tbody>
        </table>
    </div>
    <script>
    function fetchUsers() {
        $.getJSON('ajax/users_list.php', function(data) {
            var rows = '';
            if (data.length === 0) {
                rows = '<tr><td colspan="6" class="dashboard-empty">No users found.</td></tr>';
            } else {
                $.each(data, function(i, u) {
                    rows += '<tr>' +
                        '<td>'+$('<div>').text(u.name).html()+'</td>' +
                        '<td>'+$('<div>').text(u.username).html()+'</td>' +
                        '<td>'+$('<div>').text(u.email || '').html()+'</td>' +
                        '<td>'+$('<div>').text(u.role).html()+'</td>' +
                        '<td>'+$('<div>').text(u.created_at).html()+'</td>' +
                        '<td><button class="btn btn-secondary" onclick="window.location=\'edituser.php?id='+u.id+'\'">Edit</button></td>' +
                        '</tr>';
                });
            }
            $('#users-table tbody').html(rows);
        });
    }
    $(fetchUsers);
    </script>
</body>
</html>

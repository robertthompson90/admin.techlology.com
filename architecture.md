# Architecture Overview – admin.techlology.com

## 1. Overview

This is the administrative interface for **techlology.com**, built using **PHP** for backend processing and **JavaScript/jQuery** for rich client-side interactivity. The system provides tools for managing articles, media, tags, and content sections, with advanced features such as autosave, undo/redo, and image editing.

---

## 2. File & Directory Structure

### Root PHP Pages

- **login.php**  
  Displays the login form for administrators.

- **authenticate.php**  
  Validates user credentials and starts a session.

- **logout.php**  
  Destroys the session and redirects to login.

- **dashboard.php**  
  Displays admin dashboard metrics or links.

- **addarticle.php**  
  Main article creation interface with JavaScript-enhanced fields for media, tags, sections, etc.

- **addarticlepost.php**  
  Server-side processing of submitted article data.

---

### `/ajax/` – AJAX Endpoint Handlers

- **addtag.php** – Adds a new tag to the database.  
- **autosave.php** – Periodically saves draft articles.  
- **checkDuplicate.php** – Checks if an article or tag already exists.  
- **getGlobalMedia.php** – Retrieves images from the media library.  
- **gettags.php** – Returns tag suggestions.  
- **saveNewImage.php** – Stores newly edited image from canvas/editor.  
- **uploadMedia.php** – Handles media uploads.

---

### `/inc/` – Includes

- **dbonly.php** – Establishes the database connection.  
- **loginanddb.php** – Ensures the user is logged in and sets up the DB.  
- **nav.php** – HTML/PHP snippet for navigation sidebar.

---

### `/css/` – Stylesheets

- **login.css** – Styles for the login form.  
- **techlology.css** – Core admin panel styles.  
- **editor-extensions.css**, **cropper.css** – Editor and image styling support.

---

### `/js/` – Client-Side JavaScript

- **jquery-3.6.0.min.js** – jQuery library.  
- **app.js** – General behavior and setup.  
- **autosave.js** – Triggers autosave AJAX posts.  
- **mediaUpload.js**, **dropzones.js** – Media uploader functionality.  
- **imageEditor.js**, **UnifiedImageEditor.js**, **advancedImageEditor.js** – In-browser image editing tools.  
- **tags.js** – Adds/removes article tags.  
- **sections.js** – Handles adding sections to articles.  
- **sources.js** – Handles article source links.  
- **undoRedo.js** – Enables undo/redo functionality.  
- **keyboard.js** – Keyboard shortcuts and accessibility.  
- **formNavigation.js** – Helps with multi-section forms.  
- **validation.js** – Client-side field validation.  
- **notifications.js** – Displays toast-style UI alerts.  
- **globalErrorHandler.js** – Captures JS errors and reports/logs them.

---

### `/uploads/media/`

Contains uploaded images, used in articles or media library.

---

### `/img/`

UI assets like:
- **login.jpg** – Login page background  
- **loading.gif** – Loader animation  
- **icon-edit.png**, **drag.png** – Icons for editor

---

## 3. Application Flow

1. **Login**
   - `login.php` → `authenticate.php`
   - Successful login redirects to `dashboard.php`

2. **Dashboard**
   - Navigation and stats (if implemented)

3. **Add Article**
   - `addarticle.php`: JS-enhanced form with tags, sections, and media
   - Uses many JS scripts + AJAX for rich editing
   - Submitted to `addarticlepost.php`

4. **Session/Auth**
   - Pages like `dashboard.php`, `addarticle.php` include `loginanddb.php`

---

## 4. Component Interaction

- JS forms post to `/ajax/` PHP handlers for real-time updates.  
- Editor scripts manipulate the DOM and canvas, and then send data via AJAX.  
- DB access centralized via `/inc/dbonly.php`.  
- `/uploads/media/` acts as the persistent storage for media.

---

## 5. Technologies

- **Frontend**: HTML5, CSS3, jQuery  
- **Backend**: PHP 7+, MySQL (assumed via `dbonly.php`)  
- **Libraries**: Cropper.js (inferred from `cropper.css`), custom JS tools

---

## 6. Suggestions

- Add routing or modular loading for scalability.  
- Consider using a modern PHP framework (e.g., Laravel) for future growth.  
- Implement CSRF protection and validation on all endpoints.

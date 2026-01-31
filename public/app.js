// Blog App JavaScript
const API_URL = '/api';

// DOM Elements
const views = document.querySelectorAll('.view');
const navBtns = document.querySelectorAll('.nav-btn');
const filterBtns = document.querySelectorAll('.filter-btn');
const postForm = document.getElementById('post-form');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const toast = document.getElementById('toast');
const userArea = document.getElementById('user-area');

// State
let currentFilter = 'all';
let editingPostId = null;
let currentUser = null;
let currentPostId = null;

// ============ UTILITY FUNCTIONS ============

function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getStatusLabel(status) {
  const labels = {
    published: 'Đã xuất bản',
    draft: 'Bản nháp',
    hidden: 'Đã ẩn'
  };
  return labels[status] || status;
}

function truncateText(text, maxLength = 150) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// ============ AUTH FUNCTIONS ============

async function checkAuth() {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      credentials: 'include'
    });
    const data = await response.json();
    currentUser = data.user;
    updateUserArea();
    updateNavButtons();
  } catch (error) {
    console.error('Auth check failed:', error);
  }
}

function updateUserArea() {
  if (currentUser) {
    const initial = currentUser.display_name.charAt(0).toUpperCase();
    const roleLabel = currentUser.role === 'admin' ? ' 👑' : '';
    userArea.innerHTML = `
      <div class="user-info">
        <div class="user-avatar">${initial}</div>
        <span class="user-name">${currentUser.display_name}${roleLabel}</span>
      </div>
      <button class="btn-logout" onclick="logout()">Đăng xuất</button>
    `;
  } else {
    userArea.innerHTML = `
      <button class="btn-login" onclick="showView('login')">Đăng nhập</button>
      <button class="btn-register" onclick="showView('register')">Đăng ký</button>
    `;
  }
}

function updateNavButtons() {
  // Hiển thị nút cho user đã đăng nhập
  const authRequiredBtns = document.querySelectorAll('.auth-required');
  authRequiredBtns.forEach(btn => {
    btn.style.display = currentUser ? 'inline-block' : 'none';
  });
  
  // Hiển thị nút Admin chỉ cho admin
  const adminRequiredBtns = document.querySelectorAll('.admin-required');
  adminRequiredBtns.forEach(btn => {
    btn.style.display = (currentUser && currentUser.role === 'admin') ? 'inline-block' : 'none';
  });
}

// Kiểm tra có phải admin không
function isAdmin() {
  return currentUser && currentUser.role === 'admin';
}

// Kiểm tra có phải chủ sở hữu hoặc admin không
function canEdit(resourceUserId) {
  return currentUser && (currentUser.role === 'admin' || currentUser.id === resourceUserId);
}

async function login(username, password) {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      currentUser = data.user;
      updateUserArea();
      updateNavButtons();
      showToast('Đăng nhập thành công!', 'success');
      showView('home');
    } else {
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Lỗi kết nối', 'error');
  }
}

async function register(username, email, password, display_name) {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, email, password, display_name })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      currentUser = data.user;
      updateUserArea();
      updateNavButtons();
      showToast('Đăng ký thành công!', 'success');
      showView('home');
    } else {
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Lỗi kết nối', 'error');
  }
}

async function logout() {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    currentUser = null;
    updateUserArea();
    updateNavButtons();
    showToast('Đã đăng xuất', 'info');
    showView('home');
  } catch (error) {
    console.error('Logout failed:', error);
  }
}

// Login form handler
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  login(username, password);
});

// Register form handler
registerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('reg-username').value;
  const email = document.getElementById('reg-email').value;
  const display_name = document.getElementById('reg-displayname').value;
  const password = document.getElementById('reg-password').value;
  const confirmPassword = document.getElementById('reg-confirm-password').value;
  
  if (password !== confirmPassword) {
    showToast('Mật khẩu xác nhận không khớp', 'error');
    return;
  }
  
  if (password.length < 6) {
    showToast('Mật khẩu phải có ít nhất 6 ký tự', 'error');
    return;
  }
  
  register(username, email, password, display_name);
});

// Switch between login and register
document.getElementById('show-register').addEventListener('click', (e) => {
  e.preventDefault();
  showView('register');
});

document.getElementById('show-login').addEventListener('click', (e) => {
  e.preventDefault();
  showView('login');
});

// ============ VIEW MANAGEMENT ============

function showView(viewName) {
  // Check auth for protected views
  if (['write', 'manage'].includes(viewName) && !currentUser) {
    showToast('Vui lòng đăng nhập để tiếp tục', 'info');
    showView('login');
    return;
  }
  
  // Check admin for admin view
  if (viewName === 'admin' && !isAdmin()) {
    showToast('Bạn không có quyền truy cập', 'error');
    showView('home');
    return;
  }
  
  views.forEach(view => view.classList.remove('active'));
  navBtns.forEach(btn => btn.classList.remove('active'));
  
  document.getElementById(`${viewName}-view`).classList.add('active');
  document.querySelector(`[data-view="${viewName}"]`)?.classList.add('active');
  
  // Load data based on view
  if (viewName === 'home') {
    loadPublishedPosts();
  } else if (viewName === 'manage') {
    loadAllPosts();
  } else if (viewName === 'write') {
    if (!editingPostId) {
      resetPostForm();
    }
  } else if (viewName === 'admin') {
    loadAdminData();
  }
}

// Navigation click handler
navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    editingPostId = null;
    showView(btn.dataset.view);
  });
});

// ============ POSTS FUNCTIONS ============

async function loadPublishedPosts() {
  try {
    const response = await fetch(`${API_URL}/posts?status=published`);
    const posts = await response.json();
    renderPosts(posts, 'posts-list');
  } catch (error) {
    showToast('Lỗi khi tải bài viết', 'error');
    console.error(error);
  }
}

async function loadAllPosts() {
  try {
    const response = await fetch(`${API_URL}/posts?all=true`, {
      credentials: 'include'
    });
    let posts = await response.json();
    
    // Apply filter
    if (currentFilter !== 'all') {
      posts = posts.filter(post => post.status === currentFilter);
    }
    
    renderManagePosts(posts);
  } catch (error) {
    showToast('Lỗi khi tải bài viết', 'error');
    console.error(error);
  }
}

function renderPosts(posts, containerId) {
  const container = document.getElementById(containerId);
  
  if (posts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Chưa có bài viết nào.</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = posts.map(post => `
    <div class="post-card" data-id="${post.id}">
      <h3 onclick="viewPost(${post.id})">${post.title}</h3>
      <div class="post-meta">
        <span>✍️ ${post.author}</span>
        <span>📅 ${formatDate(post.created_at)}</span>
      </div>
      <p class="post-excerpt">${truncateText(post.content)}</p>
    </div>
  `).join('');
}

function renderManagePosts(posts) {
  const container = document.getElementById('manage-posts-list');
  
  // Nếu không phải admin, chỉ hiển thị bài viết của chính mình
  if (!isAdmin()) {
    posts = posts.filter(post => post.user_id === currentUser.id);
  }
  
  if (posts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Không có bài viết nào.</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = posts.map(post => `
    <div class="post-card" data-id="${post.id}">
      <div class="post-info">
        <h3 onclick="viewPost(${post.id})">${post.title}</h3>
        <div class="post-meta">
          <span>✍️ ${post.author}</span>
          <span>📅 ${formatDate(post.created_at)}</span>
          <span class="post-status status-${post.status}">${getStatusLabel(post.status)}</span>
        </div>
      </div>
      ${canEdit(post.user_id) ? `
        <div class="post-actions">
          <button class="btn btn-sm btn-primary" onclick="editPost(${post.id})">Sửa</button>
          <select class="btn btn-sm" onchange="changeStatus(${post.id}, this.value)">
            <option value="" disabled selected>Đổi trạng thái</option>
            <option value="published" ${post.status === 'published' ? 'disabled' : ''}>Xuất bản</option>
            <option value="draft" ${post.status === 'draft' ? 'disabled' : ''}>Bản nháp</option>
            <option value="hidden" ${post.status === 'hidden' ? 'disabled' : ''}>Ẩn</option>
          </select>
          <button class="btn btn-sm btn-danger" onclick="deletePost(${post.id})">Xóa</button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

async function viewPost(postId) {
  try {
    const response = await fetch(`${API_URL}/posts/${postId}`);
    const post = await response.json();
    
    if (response.ok) {
      currentPostId = postId;
      
      document.getElementById('post-detail').innerHTML = `
        <h1>${post.title}</h1>
        <div class="post-meta">
          <span>✍️ ${post.author}</span>
          <span>📅 ${formatDate(post.created_at)}</span>
          <span class="post-status status-${post.status}">${getStatusLabel(post.status)}</span>
        </div>
        <div class="post-content">${post.content}</div>
      `;
      
      renderCommentForm();
      loadComments(postId);
      
      views.forEach(view => view.classList.remove('active'));
      navBtns.forEach(btn => btn.classList.remove('active'));
      document.getElementById('post-detail-view').classList.add('active');
    }
  } catch (error) {
    showToast('Lỗi khi tải bài viết', 'error');
    console.error(error);
  }
}

function renderCommentForm() {
  const container = document.getElementById('comment-form-container');
  
  if (currentUser) {
    container.innerHTML = `
      <form id="comment-form" class="comment-form">
        <div class="form-group">
          <p><strong>Bình luận với tư cách:</strong> ${currentUser.display_name}</p>
        </div>
        <div class="form-group">
          <textarea id="comment-content" rows="3" placeholder="Viết bình luận..." required></textarea>
        </div>
        <button type="submit" class="btn btn-primary">Gửi bình luận</button>
      </form>
    `;
    
    // Re-attach form handler
    document.getElementById('comment-form').addEventListener('submit', submitComment);
  } else {
    container.innerHTML = `
      <div class="login-notice">
        <p>Vui lòng <a href="#" onclick="showView('login'); return false;">đăng nhập</a> để bình luận.</p>
      </div>
    `;
  }
}

async function editPost(postId) {
  if (!currentUser) {
    showToast('Vui lòng đăng nhập', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/posts/${postId}`);
    const post = await response.json();
    
    if (response.ok) {
      editingPostId = postId;
      document.getElementById('post-id').value = postId;
      document.getElementById('post-title').value = post.title;
      document.getElementById('post-content').value = post.content;
      document.getElementById('post-status').value = post.status;
      
      showView('write');
      document.querySelector('#write-view h2').textContent = 'Chỉnh sửa bài viết';
    }
  } catch (error) {
    showToast('Lỗi khi tải bài viết', 'error');
    console.error(error);
  }
}

async function changeStatus(postId, newStatus) {
  if (!newStatus) return;
  
  try {
    const response = await fetch(`${API_URL}/posts/${postId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: newStatus })
    });
    
    if (response.ok) {
      showToast(`Đã đổi trạng thái thành "${getStatusLabel(newStatus)}"`, 'success');
      loadAllPosts();
    } else {
      const data = await response.json();
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Lỗi khi đổi trạng thái', 'error');
    console.error(error);
  }
}

async function deletePost(postId) {
  if (!confirm('Bạn có chắc muốn xóa bài viết này?')) return;
  
  try {
    const response = await fetch(`${API_URL}/posts/${postId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (response.ok) {
      showToast('Đã xóa bài viết', 'success');
      loadAllPosts();
    } else {
      const data = await response.json();
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Lỗi khi xóa bài viết', 'error');
    console.error(error);
  }
}

function resetPostForm() {
  editingPostId = null;
  postForm.reset();
  document.getElementById('post-id').value = '';
  document.querySelector('#write-view h2').textContent = 'Viết bài mới';
}

// Post form submit handler
postForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!currentUser) {
    showToast('Vui lòng đăng nhập', 'error');
    return;
  }
  
  const postData = {
    title: document.getElementById('post-title').value,
    content: document.getElementById('post-content').value,
    status: document.getElementById('post-status').value
  };
  
  try {
    let response;
    
    if (editingPostId) {
      // Update existing post
      response = await fetch(`${API_URL}/posts/${editingPostId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(postData)
      });
    } else {
      // Create new post
      response = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(postData)
      });
    }
    
    if (response.ok) {
      showToast(editingPostId ? 'Đã cập nhật bài viết' : 'Đã đăng bài viết mới', 'success');
      resetPostForm();
      showView('home');
    } else {
      const data = await response.json();
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Lỗi khi lưu bài viết', 'error');
    console.error(error);
  }
});

// Cancel edit button
document.getElementById('cancel-edit').addEventListener('click', () => {
  resetPostForm();
  showView('home');
});

// ============ COMMENTS FUNCTIONS ============

async function loadComments(postId) {
  try {
    const response = await fetch(`${API_URL}/posts/${postId}/comments`);
    const comments = await response.json();
    renderComments(comments);
  } catch (error) {
    console.error(error);
  }
}

function renderComments(comments) {
  const container = document.getElementById('comments-list');
  
  if (comments.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Chưa có bình luận nào. Hãy là người đầu tiên!</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = comments.map(comment => `
    <div class="comment-card" data-id="${comment.id}">
      <div class="comment-header">
        <span class="comment-author">${comment.author}</span>
        <span class="comment-date">${formatDate(comment.created_at)}</span>
      </div>
      <p class="comment-content">${comment.content}</p>
      ${canEdit(comment.user_id) ? `
        <div class="comment-actions">
          <button class="btn btn-sm btn-danger" onclick="deleteComment(${comment.id})">Xóa</button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

async function submitComment(e) {
  e.preventDefault();
  
  if (!currentUser) {
    showToast('Vui lòng đăng nhập để bình luận', 'error');
    return;
  }
  
  const content = document.getElementById('comment-content').value;
  
  if (!content.trim()) {
    showToast('Vui lòng nhập nội dung bình luận', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/posts/${currentPostId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content })
    });
    
    if (response.ok) {
      showToast('Đã gửi bình luận', 'success');
      document.getElementById('comment-content').value = '';
      loadComments(currentPostId);
    } else {
      const data = await response.json();
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Lỗi khi gửi bình luận', 'error');
    console.error(error);
  }
}

async function deleteComment(commentId) {
  if (!confirm('Bạn có chắc muốn xóa bình luận này?')) return;
  
  try {
    const response = await fetch(`${API_URL}/comments/${commentId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (response.ok) {
      showToast('Đã xóa bình luận', 'success');
      loadComments(currentPostId);
    } else {
      const data = await response.json();
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Lỗi khi xóa bình luận', 'error');
    console.error(error);
  }
}

// ============ FILTER FUNCTIONS ============

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    loadAllPosts();
  });
});

// ============ BACK BUTTON ============

document.getElementById('back-btn').addEventListener('click', () => {
  showView('home');
});

// ============ ADMIN FUNCTIONS ============

async function loadAdminData() {
  await Promise.all([
    loadStats(),
    loadUsers(),
    loadAdminPosts()
  ]);
  
  // Setup admin tabs
  setupAdminTabs();
}

function setupAdminTabs() {
  const adminTabs = document.querySelectorAll('.admin-tab');
  adminTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      adminTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(`admin-${tab.dataset.tab}-tab`).classList.add('active');
    });
  });
}

async function loadStats() {
  try {
    const response = await fetch(`${API_URL}/stats`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const stats = await response.json();
      document.getElementById('stats-grid').innerHTML = `
        <div class="stat-card users">
          <span class="stat-number">${stats.users}</span>
          <span class="stat-label">Người dùng</span>
        </div>
        <div class="stat-card posts">
          <span class="stat-number">${stats.posts}</span>
          <span class="stat-label">Bài viết</span>
        </div>
        <div class="stat-card comments">
          <span class="stat-number">${stats.comments}</span>
          <span class="stat-label">Bình luận</span>
        </div>
        <div class="stat-card published">
          <span class="stat-number">${stats.publishedPosts}</span>
          <span class="stat-label">Đã xuất bản</span>
        </div>
      `;
    }
  } catch (error) {
    console.error('Load stats error:', error);
  }
}

async function loadUsers() {
  try {
    const response = await fetch(`${API_URL}/users`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const users = await response.json();
      renderUsers(users);
    }
  } catch (error) {
    console.error('Load users error:', error);
  }
}

function renderUsers(users) {
  const container = document.getElementById('users-list');
  
  if (users.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>Chưa có người dùng nào.</p></div>';
    return;
  }
  
  container.innerHTML = users.map(user => `
    <div class="user-card ${user.role === 'admin' ? 'role-admin' : ''}" data-id="${user.id}">
      <div class="user-info-card">
        <h4>
          ${user.display_name}
          <span class="role-badge ${user.role}">${user.role === 'admin' ? 'Admin' : 'User'}</span>
        </h4>
        <div class="user-meta">
          <span>👤 ${user.username}</span>
          <span>📧 ${user.email}</span>
          <span>📅 ${formatDate(user.created_at)}</span>
        </div>
      </div>
      <div class="user-actions">
        ${user.id !== currentUser.id ? `
          <select onchange="changeUserRole(${user.id}, this.value)">
            <option value="" disabled selected>Đổi vai trò</option>
            <option value="admin" ${user.role === 'admin' ? 'disabled' : ''}>👑 Admin</option>
            <option value="user" ${user.role === 'user' ? 'disabled' : ''}>👤 User</option>
          </select>
          <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">Xóa</button>
        ` : '<span style="color:#888;">Tài khoản của bạn</span>'}
      </div>
    </div>
  `).join('');
}

async function changeUserRole(userId, newRole) {
  if (!newRole) return;
  
  try {
    const response = await fetch(`${API_URL}/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ role: newRole })
    });
    
    if (response.ok) {
      showToast(`Đã cập nhật vai trò thành ${newRole === 'admin' ? 'Admin' : 'User'}`, 'success');
      loadUsers();
      loadStats();
    } else {
      const data = await response.json();
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Lỗi khi cập nhật vai trò', 'error');
    console.error(error);
  }
}

async function deleteUser(userId) {
  if (!confirm('Bạn có chắc muốn xóa người dùng này? Tất cả bài viết và bình luận của họ cũng sẽ bị xóa!')) return;
  
  try {
    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (response.ok) {
      showToast('Đã xóa người dùng', 'success');
      loadUsers();
      loadStats();
      loadAdminPosts();
    } else {
      const data = await response.json();
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Lỗi khi xóa người dùng', 'error');
    console.error(error);
  }
}

async function loadAdminPosts() {
  try {
    const response = await fetch(`${API_URL}/posts?all=true`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const posts = await response.json();
      renderAdminPosts(posts);
    }
  } catch (error) {
    console.error('Load admin posts error:', error);
  }
}

function renderAdminPosts(posts) {
  const container = document.getElementById('admin-posts-list');
  
  if (posts.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>Chưa có bài viết nào.</p></div>';
    return;
  }
  
  container.innerHTML = posts.map(post => `
    <div class="post-card" data-id="${post.id}">
      <div class="post-info">
        <h3 onclick="viewPost(${post.id})">${post.title}</h3>
        <div class="post-meta">
          <span>✍️ ${post.author}</span>
          <span>📅 ${formatDate(post.created_at)}</span>
          <span class="post-status status-${post.status}">${getStatusLabel(post.status)}</span>
        </div>
      </div>
      <div class="post-actions">
        <button class="btn btn-sm btn-primary" onclick="editPost(${post.id})">Sửa</button>
        <select class="btn btn-sm" onchange="changeStatus(${post.id}, this.value)">
          <option value="" disabled selected>Đổi trạng thái</option>
          <option value="published" ${post.status === 'published' ? 'disabled' : ''}>Xuất bản</option>
          <option value="draft" ${post.status === 'draft' ? 'disabled' : ''}>Bản nháp</option>
          <option value="hidden" ${post.status === 'hidden' ? 'disabled' : ''}>Ẩn</option>
        </select>
        <button class="btn btn-sm btn-danger" onclick="deletePost(${post.id})">Xóa</button>
      </div>
    </div>
  `).join('');
}

// ============ INITIALIZE ============

document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  showView('home');
});

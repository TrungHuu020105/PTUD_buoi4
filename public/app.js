// Blog App JavaScript
const API_URL = '/api';

// DOM Elements
const views = document.querySelectorAll('.view');
const navBtns = document.querySelectorAll('.nav-btn');
const filterBtns = document.querySelectorAll('.filter-btn');
const postForm = document.getElementById('post-form');
const commentForm = document.getElementById('comment-form');
const toast = document.getElementById('toast');

// State
let currentFilter = 'all';
let editingPostId = null;

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

// ============ VIEW MANAGEMENT ============

function showView(viewName) {
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
    const response = await fetch(`${API_URL}/posts?all=true`);
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

async function viewPost(postId) {
  try {
    const response = await fetch(`${API_URL}/posts/${postId}`);
    const post = await response.json();
    
    if (response.ok) {
      document.getElementById('post-detail').innerHTML = `
        <h1>${post.title}</h1>
        <div class="post-meta">
          <span>✍️ ${post.author}</span>
          <span>📅 ${formatDate(post.created_at)}</span>
          <span class="post-status status-${post.status}">${getStatusLabel(post.status)}</span>
        </div>
        <div class="post-content">${post.content}</div>
      `;
      
      document.getElementById('comment-post-id').value = postId;
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

async function editPost(postId) {
  try {
    const response = await fetch(`${API_URL}/posts/${postId}`);
    const post = await response.json();
    
    if (response.ok) {
      editingPostId = postId;
      document.getElementById('post-id').value = postId;
      document.getElementById('post-title').value = post.title;
      document.getElementById('post-author').value = post.author;
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
      method: 'DELETE'
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
  
  const postData = {
    title: document.getElementById('post-title').value,
    author: document.getElementById('post-author').value,
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
        body: JSON.stringify(postData)
      });
    } else {
      // Create new post
      response = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      <div class="comment-actions">
        <button class="btn btn-sm btn-danger" onclick="deleteComment(${comment.id})">Xóa</button>
      </div>
    </div>
  `).join('');
}

async function deleteComment(commentId) {
  if (!confirm('Bạn có chắc muốn xóa bình luận này?')) return;
  
  try {
    const response = await fetch(`${API_URL}/comments/${commentId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      showToast('Đã xóa bình luận', 'success');
      const postId = document.getElementById('comment-post-id').value;
      loadComments(postId);
    } else {
      const data = await response.json();
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Lỗi khi xóa bình luận', 'error');
    console.error(error);
  }
}

// Comment form submit handler
commentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const postId = document.getElementById('comment-post-id').value;
  const commentData = {
    author: document.getElementById('comment-author').value,
    content: document.getElementById('comment-content').value
  };
  
  try {
    const response = await fetch(`${API_URL}/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(commentData)
    });
    
    if (response.ok) {
      showToast('Đã gửi bình luận', 'success');
      document.getElementById('comment-author').value = '';
      document.getElementById('comment-content').value = '';
      loadComments(postId);
    } else {
      const data = await response.json();
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Lỗi khi gửi bình luận', 'error');
    console.error(error);
  }
});

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

// ============ INITIALIZE ============

document.addEventListener('DOMContentLoaded', () => {
  showView('home');
});

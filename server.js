const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(session({
  secret: 'blog-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, 
    maxAge: 24 * 60 * 60 * 1000 // 24 giờ
  }
}));
app.use(express.static('public'));

// Khởi tạo database
const db = new Database('blog.db');

// Tạo bảng
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    user_id INTEGER,
    status TEXT DEFAULT 'published',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Middleware kiểm tra đăng nhập
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Vui lòng đăng nhập' });
  }
  next();
};

// Middleware kiểm tra quyền Admin
const requireAdmin = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Vui lòng đăng nhập' });
  }
  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này' });
  }
  next();
};

// Middleware kiểm tra quyền sở hữu hoặc Admin
const requireOwnerOrAdmin = (resourceType) => {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập' });
    }
    
    const resourceId = req.params.id;
    let resource;
    
    if (resourceType === 'post') {
      resource = db.prepare('SELECT * FROM posts WHERE id = ?').get(resourceId);
    } else if (resourceType === 'comment') {
      resource = db.prepare('SELECT * FROM comments WHERE id = ?').get(resourceId);
    }
    
    if (!resource) {
      return res.status(404).json({ error: 'Không tìm thấy tài nguyên' });
    }
    
    // Admin có thể thao tác tất cả, hoặc chủ sở hữu
    if (req.session.user.role === 'admin' || resource.user_id === req.session.user.id) {
      req.resource = resource;
      next();
    } else {
      return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này' });
    }
  };
};

// Tạo tài khoản admin mặc định nếu chưa có
const createDefaultAdmin = async () => {
  const admin = db.prepare('SELECT * FROM users WHERE role = ?').get('admin');
  if (!admin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    db.prepare(
      'INSERT INTO users (username, email, password, display_name, role) VALUES (?, ?, ?, ?, ?)'
    ).run('admin', 'admin@blog.com', hashedPassword, 'Quản trị viên', 'admin');
    console.log('✅ Đã tạo tài khoản admin mặc định: admin / admin123');
  }
};
createDefaultAdmin();

// ============ AUTH API ============

// Đăng ký
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, display_name } = req.body;
    
    if (!username || !email || !password || !display_name) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    // Kiểm tra username/email đã tồn tại
    const existingUser = db.prepare(
      'SELECT * FROM users WHERE username = ? OR email = ?'
    ).get(username, email);
    
    if (existingUser) {
      return res.status(400).json({ error: 'Tên đăng nhập hoặc email đã tồn tại' });
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = db.prepare(
      'INSERT INTO users (username, email, password, display_name) VALUES (?, ?, ?, ?)'
    ).run(username, email, hashedPassword, display_name);

    const newUser = db.prepare('SELECT id, username, email, display_name, role FROM users WHERE id = ?')
      .get(result.lastInsertRowid);

    // Tự động đăng nhập sau khi đăng ký
    req.session.user = newUser;
    
    res.status(201).json({ message: 'Đăng ký thành công', user: newUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Đăng nhập
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
    }

    const user = db.prepare(
      'SELECT * FROM users WHERE username = ? OR email = ?'
    ).get(username, username);
    
    if (!user) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    // Lưu session
    const userData = { 
      id: user.id, 
      username: user.username, 
      email: user.email,
      display_name: user.display_name,
      role: user.role 
    };
    req.session.user = userData;
    
    res.json({ message: 'Đăng nhập thành công', user: userData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Đăng xuất
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Đã đăng xuất' });
});

// Kiểm tra trạng thái đăng nhập
app.get('/api/auth/me', (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.json({ user: null });
  }
});

// ============ API ROUTES ============

// Lấy tất cả bài viết (có thể lọc theo status)
app.get('/api/posts', (req, res) => {
  try {
    const { status, all } = req.query;
    let query = 'SELECT * FROM posts';
    let params = [];

    if (all !== 'true') {
      // Mặc định chỉ lấy bài viết đã published
      query += ' WHERE status = ?';
      params.push(status || 'published');
    }

    query += ' ORDER BY created_at DESC';
    
    const posts = db.prepare(query).all(...params);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lấy một bài viết theo ID
app.get('/api/posts/:id', (req, res) => {
  try {
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết' });
    }
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tạo bài viết mới (yêu cầu đăng nhập)
app.post('/api/posts', requireAuth, (req, res) => {
  try {
    const { title, content, status = 'published' } = req.body;
    const author = req.session.user.display_name;
    const user_id = req.session.user.id;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    const result = db.prepare(
      'INSERT INTO posts (title, content, author, user_id, status) VALUES (?, ?, ?, ?, ?)'
    ).run(title, content, author, user_id, status);

    const newPost = db.prepare('SELECT * FROM posts WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cập nhật bài viết (chủ sở hữu hoặc admin)
app.put('/api/posts/:id', requireOwnerOrAdmin('post'), (req, res) => {
  try {
    const { title, content, status } = req.body;
    const post = req.resource;

    db.prepare(`
      UPDATE posts 
      SET title = ?, content = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(
      title || post.title,
      content || post.content,
      status || post.status,
      req.params.id
    );

    const updatedPost = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Thay đổi trạng thái bài viết (chủ sở hữu hoặc admin)
app.patch('/api/posts/:id/status', requireOwnerOrAdmin('post'), (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['published', 'draft', 'hidden'].includes(status)) {
      return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
    }

    db.prepare('UPDATE posts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, req.params.id);

    const updatedPost = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Xóa bài viết (chủ sở hữu hoặc admin)
app.delete('/api/posts/:id', requireOwnerOrAdmin('post'), (req, res) => {
  try {
    db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
    res.json({ message: 'Đã xóa bài viết thành công' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ COMMENTS API ============

// Lấy bình luận của bài viết
app.get('/api/posts/:id/comments', (req, res) => {
  try {
    const comments = db.prepare(
      'SELECT * FROM comments WHERE post_id = ? ORDER BY created_at DESC'
    ).all(req.params.id);
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Thêm bình luận (yêu cầu đăng nhập)
app.post('/api/posts/:id/comments', requireAuth, (req, res) => {
  try {
    const { content } = req.body;
    const postId = req.params.id;
    const author = req.session.user.display_name;
    const user_id = req.session.user.id;

    if (!content) {
      return res.status(400).json({ error: 'Vui lòng nhập nội dung bình luận' });
    }

    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết' });
    }

    const result = db.prepare(
      'INSERT INTO comments (post_id, user_id, author, content) VALUES (?, ?, ?, ?)'
    ).run(postId, user_id, author, content);

    const newComment = db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Xóa bình luận (chủ sở hữu hoặc admin)
app.delete('/api/comments/:id', requireOwnerOrAdmin('comment'), (req, res) => {
  try {
    db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
    res.json({ message: 'Đã xóa bình luận thành công' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ USERS API (Admin only) ============

// Lấy danh sách users (admin only)
app.get('/api/users', requireAdmin, (req, res) => {
  try {
    const users = db.prepare(
      'SELECT id, username, email, display_name, role, created_at FROM users ORDER BY created_at DESC'
    ).all();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Thay đổi role của user (admin only)
app.patch('/api/users/:id/role', requireAdmin, (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;
    
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Vai trò không hợp lệ' });
    }
    
    // Không cho phép admin tự hạ cấp mình
    if (req.session.user.id === parseInt(userId) && role !== 'admin') {
      return res.status(400).json({ error: 'Không thể tự hạ cấp tài khoản của bạn' });
    }
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }
    
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
    
    const updatedUser = db.prepare(
      'SELECT id, username, email, display_name, role FROM users WHERE id = ?'
    ).get(userId);
    
    res.json({ message: 'Đã cập nhật vai trò', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Xóa user (admin only)
app.delete('/api/users/:id', requireAdmin, (req, res) => {
  try {
    const userId = req.params.id;
    
    // Không cho phép admin tự xóa mình
    if (req.session.user.id === parseInt(userId)) {
      return res.status(400).json({ error: 'Không thể tự xóa tài khoản của bạn' });
    }
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }
    
    // Xóa tất cả bài viết và bình luận của user
    db.prepare('DELETE FROM comments WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM posts WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    
    res.json({ message: 'Đã xóa người dùng thành công' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lấy thống kê (admin only)
app.get('/api/stats', requireAdmin, (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalPosts = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;
    const totalComments = db.prepare('SELECT COUNT(*) as count FROM comments').get().count;
    const publishedPosts = db.prepare("SELECT COUNT(*) as count FROM posts WHERE status = 'published'").get().count;
    
    res.json({
      users: totalUsers,
      posts: totalPosts,
      comments: totalComments,
      publishedPosts: publishedPosts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve index.html cho tất cả routes khác
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Khởi động server - lắng nghe trên tất cả network interfaces
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Blog Server đang chạy!`);
  console.log(`   - Local:   http://localhost:${PORT}`);
  
  // Hiển thị IP để các máy khác truy cập
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  Object.keys(networkInterfaces).forEach(ifname => {
    networkInterfaces[ifname].forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`   - Network: http://${iface.address}:${PORT}`);
      }
    });
  });
  
  console.log(`\n📢 Chia sẻ link Network cho người khác trong cùng mạng WiFi/LAN!`);
});


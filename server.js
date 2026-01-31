const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Khởi tạo database
const db = new Database('blog.db');

// Tạo bảng
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    status TEXT DEFAULT 'published',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
  );
`);

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

// Tạo bài viết mới
app.post('/api/posts', (req, res) => {
  try {
    const { title, content, author, status = 'published' } = req.body;
    
    if (!title || !content || !author) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    const result = db.prepare(
      'INSERT INTO posts (title, content, author, status) VALUES (?, ?, ?, ?)'
    ).run(title, content, author, status);

    const newPost = db.prepare('SELECT * FROM posts WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cập nhật bài viết
app.put('/api/posts/:id', (req, res) => {
  try {
    const { title, content, author, status } = req.body;
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết' });
    }

    db.prepare(`
      UPDATE posts 
      SET title = ?, content = ?, author = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(
      title || post.title,
      content || post.content,
      author || post.author,
      status || post.status,
      req.params.id
    );

    const updatedPost = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Thay đổi trạng thái bài viết
app.patch('/api/posts/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['published', 'draft', 'hidden'].includes(status)) {
      return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
    }

    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết' });
    }

    db.prepare('UPDATE posts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, req.params.id);

    const updatedPost = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Xóa bài viết
app.delete('/api/posts/:id', (req, res) => {
  try {
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết' });
    }

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

// Thêm bình luận
app.post('/api/posts/:id/comments', (req, res) => {
  try {
    const { author, content } = req.body;
    const postId = req.params.id;

    if (!author || !content) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết' });
    }

    const result = db.prepare(
      'INSERT INTO comments (post_id, author, content) VALUES (?, ?, ?)'
    ).run(postId, author, content);

    const newComment = db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Xóa bình luận
app.delete('/api/comments/:id', (req, res) => {
  try {
    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Không tìm thấy bình luận' });
    }

    db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
    res.json({ message: 'Đã xóa bình luận thành công' });
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


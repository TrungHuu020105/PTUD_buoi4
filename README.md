# 📝 Blog MVP

Ứng dụng Blog hoàn chỉnh với các chức năng: Đăng nhập/Đăng ký, Viết bài, Bình luận, Thay đổi trạng thái hiển thị bài viết và Hệ thống phân quyền.

## 🚀 Tính năng

### 1. 🔐 Hệ thống xác thực
- Đăng ký tài khoản mới
- Đăng nhập / Đăng xuất
- Session-based authentication
- Mã hóa mật khẩu với bcrypt

### 2. 👥 Phân quyền người dùng

| Vai trò | Quyền hạn |
|---------|-----------|
| **👑 Admin** | Quản lý tất cả users, posts, comments. Xem thống kê. Thay đổi vai trò users |
| **👤 User** | Viết bài, bình luận, sửa/xóa bài viết & bình luận **của mình** |
| **🔒 Guest** | Chỉ xem bài viết đã xuất bản và bình luận |

### 3. ✍️ Viết bài
- Tạo bài viết mới với tiêu đề và nội dung
- Chỉnh sửa bài viết đã tồn tại
- Xóa bài viết (chủ sở hữu hoặc admin)

### 4. 💬 Bình luận
- Thêm bình luận vào bài viết (yêu cầu đăng nhập)
- Xóa bình luận (chủ sở hữu hoặc admin)

### 5. 📊 Thay đổi trạng thái hiển thị
- **Published (Đã xuất bản)**: Bài viết hiển thị công khai
- **Draft (Bản nháp)**: Bài viết đang soạn thảo
- **Hidden (Ẩn)**: Bài viết bị ẩn khỏi trang chủ

### 6. 👑 Trang Admin
- Thống kê tổng quan (users, posts, comments)
- Quản lý người dùng (xem, đổi vai trò, xóa)
- Quản lý tất cả bài viết

## 🛠️ Công nghệ sử dụng

- **Backend**: Node.js + Express.js
- **Database**: SQLite (better-sqlite3)
- **Authentication**: express-session + bcryptjs
- **Frontend**: HTML, CSS, JavaScript (Vanilla)

## 📦 Cài đặt

### Yêu cầu
- Node.js >= 14.x
- npm >= 6.x

### Các bước cài đặt

1. **Clone hoặc di chuyển vào thư mục project**
```bash
cd blog-app
```

2. **Cài đặt dependencies**
```bash
npm install
```

3. **Chạy ứng dụng**
```bash
npm start
```

4. **Truy cập ứng dụng**
- Local: http://localhost:3000
- Network: http://[your-ip]:3000 (cho các máy khác trong cùng mạng)

## 🔐 Tài khoản mặc định

| Username | Password | Vai trò |
|----------|----------|---------|
| `admin` | `admin123` | 👑 Admin |

> ⚠️ **Lưu ý**: Hãy đổi mật khẩu admin sau khi triển khai!

## 📁 Cấu trúc thư mục

```
blog-app/
├── public/
│   ├── index.html      # Trang HTML chính
│   ├── styles.css      # CSS styles
│   └── app.js          # JavaScript frontend
├── server.js           # Express server & API
├── package.json        # Dependencies
├── blog.db             # SQLite database (tự động tạo)
├── render.yaml         # Cấu hình deploy Render
├── .gitignore          # Git ignore
└── README.md           # Tài liệu
```

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/auth/register` | Đăng ký tài khoản mới |
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/logout` | Đăng xuất |
| GET | `/api/auth/me` | Kiểm tra trạng thái đăng nhập |

### Posts
| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/api/posts` | Lấy danh sách bài viết | Public |
| GET | `/api/posts/:id` | Lấy chi tiết bài viết | Public |
| POST | `/api/posts` | Tạo bài viết mới | User |
| PUT | `/api/posts/:id` | Cập nhật bài viết | Owner/Admin |
| PATCH | `/api/posts/:id/status` | Đổi trạng thái bài viết | Owner/Admin |
| DELETE | `/api/posts/:id` | Xóa bài viết | Owner/Admin |

### Comments
| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/api/posts/:id/comments` | Lấy bình luận của bài viết | Public |
| POST | `/api/posts/:id/comments` | Thêm bình luận | User |
| DELETE | `/api/comments/:id` | Xóa bình luận | Owner/Admin |

### Users (Admin only)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/users` | Lấy danh sách users |
| PATCH | `/api/users/:id/role` | Đổi vai trò user |
| DELETE | `/api/users/:id` | Xóa user |
| GET | `/api/stats` | Lấy thống kê |

## 🌐 Deploy

### Deploy lên Render.com (Miễn phí)

1. Push code lên GitHub
2. Vào https://render.com → Đăng ký
3. New → Web Service → Kết nối GitHub repo
4. Render tự động deploy
5. Nhận link công khai!

### Sử dụng ngrok (Demo nhanh)

```bash
# Chạy server
npm start

# Mở terminal khác, chạy ngrok
ngrok http 3000
```

## 📸 Screenshots

### 🏠 Trang chủ
- Hiển thị danh sách bài viết đã xuất bản
- Click vào tiêu đề để xem chi tiết

### 🔐 Đăng nhập / Đăng ký
- Form đăng nhập với username/email
- Form đăng ký tài khoản mới

### ✍️ Viết bài
- Form nhập tiêu đề, nội dung
- Chọn trạng thái xuất bản

### 📋 Quản lý bài viết
- Xem bài viết của mình
- Lọc theo trạng thái
- Sửa/Xóa/Đổi trạng thái

### 👑 Trang Admin
- Thống kê tổng quan
- Quản lý người dùng
- Quản lý tất cả bài viết

### 💬 Chi tiết bài viết
- Xem nội dung đầy đủ
- Đọc và viết bình luận

## 👨‍💻 Tác giả

Phát triển cho môn **Phát triển ứng dụng web** - HK2 2025-2026

## 📄 License

MIT License

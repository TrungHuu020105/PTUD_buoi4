# 📝 Blog MVP

Ứng dụng Blog đơn giản với các chức năng: Viết bài, Bình luận, Thay đổi trạng thái hiển thị bài viết.

## 🚀 Tính năng

### 1. Viết bài
- Tạo bài viết mới với tiêu đề, nội dung và tên tác giả
- Chỉnh sửa bài viết đã tồn tại
- Xóa bài viết

### 2. Bình luận
- Thêm bình luận vào bài viết
- Xóa bình luận

### 3. Thay đổi trạng thái hiển thị
- **Published (Đã xuất bản)**: Bài viết hiển thị công khai
- **Draft (Bản nháp)**: Bài viết đang soạn thảo
- **Hidden (Ẩn)**: Bài viết bị ẩn khỏi trang chủ

## 🛠️ Công nghệ sử dụng

- **Backend**: Node.js + Express.js
- **Database**: SQLite (better-sqlite3)
- **Frontend**: HTML, CSS, JavaScript (Vanilla)

## 📦 Cài đặt

### Yêu cầu
- Node.js >= 14.x
- npm >= 6.x

### Các bước cài đặt

1. **Di chuyển vào thư mục project**
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
Mở trình duyệt và truy cập: http://localhost:3000

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
└── README.md           # Tài liệu
```

## 🔌 API Endpoints

### Posts
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/posts` | Lấy danh sách bài viết |
| GET | `/api/posts/:id` | Lấy chi tiết bài viết |
| POST | `/api/posts` | Tạo bài viết mới |
| PUT | `/api/posts/:id` | Cập nhật bài viết |
| PATCH | `/api/posts/:id/status` | Đổi trạng thái bài viết |
| DELETE | `/api/posts/:id` | Xóa bài viết |

### Comments
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/posts/:id/comments` | Lấy bình luận của bài viết |
| POST | `/api/posts/:id/comments` | Thêm bình luận |
| DELETE | `/api/comments/:id` | Xóa bình luận |

## 📸 Screenshots

### Trang chủ
- Hiển thị danh sách bài viết đã xuất bản
- Click vào tiêu đề để xem chi tiết

### Viết bài
- Form nhập tiêu đề, tác giả, nội dung
- Chọn trạng thái xuất bản

### Quản lý bài viết
- Xem tất cả bài viết
- Lọc theo trạng thái
- Sửa/Xóa/Đổi trạng thái

### Chi tiết bài viết
- Xem nội dung đầy đủ
- Đọc và viết bình luận

## 👨‍💻 Tác giả

Phát triển cho môn Phát triển ứng dụng web - HK2 2025-2026

## 📄 License

MIT License

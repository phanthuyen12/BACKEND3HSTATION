# API Quick Start Guide

Hướng dẫn nhanh để bắt đầu sử dụng API.

## 1. Cài đặt và chạy server

```bash
# Cài đặt dependencies
npm install

# Chạy migrations
npm run migrate

# Khởi động server
npm start
```

Server sẽ chạy tại: `https://api.aetrading.vn`

## 2. Đăng ký tài khoản đầu tiên

```bash
curl -X POST https://api.aetrading.vn/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "password123",
    "phone": "0123456789"
  }'
```

**Lưu ý:** Bạn cần set role `admin` cho user đầu tiên trực tiếp trong database:
```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

## 3. Đăng nhập và lấy token

```bash
curl -X POST https://api.aetrading.vn/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

Response sẽ chứa `token` - sử dụng token này cho các request tiếp theo.

## 4. Sử dụng token

Thêm header vào mọi request cần authentication:

```
Authorization: Bearer YOUR_TOKEN_HERE
```

## 5. Các API thường dùng

### Tạo danh mục khoá học

```bash
curl -X POST https://api.aetrading.vn/api/elearning/categories \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Web Development"
  }'
```

### Tạo khoá học

```bash
curl -X POST https://api.aetrading.vn/api/elearning/courses \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "JavaScript Fundamentals",
    "description": "Learn JavaScript from scratch",
    "categoryId": "1",
    "price": "299000",
    "level": "beginner",
    "status": "active"
  }'
```

### Lấy danh sách khoá học (Client - Public)

```bash
curl -X GET "https://api.aetrading.vn/api/client/elearning/courses?page=1&limit=20"
```

### Tạo gói VPS

```bash
curl -X POST https://api.aetrading.vn/api/vps/plans \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "vps-basic",
    "name": "VPS Basic",
    "price": "500000",
    "unit": "month",
    "cpu": "2 cores",
    "ram": "4GB",
    "ssd": "50GB",
    "bandwidth": "100Mbps",
    "status": "active"
  }'
```

## 6. Test với Postman

1. Import file `LabTest_API.postman_collection.json` (nếu có)
2. Set environment variable `base_url` = `https://api.aetrading.vn/api`
3. Set environment variable `token` = token từ login response
4. Chạy các request trong collection

## 7. Cấu trúc Response

### Success
```json
{
  "success": true,
  "data": { ... },
  "message": "Success message"
}
```

### Error
```json
{
  "success": false,
  "message": "Error message"
}
```

## 8. Common Issues

### 401 Unauthorized
- Kiểm tra token có đúng không
- Kiểm tra token có hết hạn không
- Đảm bảo header format: `Authorization: Bearer <token>`

### 403 Forbidden
- User không có quyền admin
- Kiểm tra role trong database

### 400 Bad Request
- Kiểm tra format JSON
- Kiểm tra các field required
- Kiểm tra validation rules

## 9. Next Steps

- Đọc file `API_DOCUMENTATION.md` để xem chi tiết tất cả các API
- Xem file `migrations/README.md` để hiểu về database structure
- Kiểm tra các examples trong documentation














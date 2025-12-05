# Database Migrations

Thư mục này chứa các file migration SQL để tạo và cập nhật cấu trúc database.

## Cách sử dụng

### 1. Chạy migrations thủ công (Đơn giản)

Sử dụng file `001_create_base_tables_simple.sql` nếu bạn muốn chạy thủ công:

```bash
mysql -u your_username -p your_database < migrations/001_create_base_tables_simple.sql
mysql -u your_username -p your_database < migrations/002_create_course_sections.sql
mysql -u your_username -p your_database < migrations/003_create_workflow_steps.sql
mysql -u your_username -p your_database < migrations/004_create_indexes.sql
```

**Lưu ý:** File `001_create_base_tables_simple.sql` sẽ báo lỗi nếu columns đã tồn tại. Bạn có thể bỏ qua các lỗi đó hoặc comment các dòng ALTER TABLE tương ứng.

### 2. Sử dụng script migration (Khuyến nghị - Tự động kiểm tra)

Sử dụng file `001_create_base_tables.sql` với script tự động:

```bash
npm run migrate
```

hoặc

```bash
node migrate.js
```

Script này sẽ tự động:
- Kiểm tra xem migration đã chạy chưa
- Kiểm tra xem columns/tables đã tồn tại chưa
- Chỉ chạy các migrations chưa được thực thi

## Thứ tự migration

1. **001_create_base_tables.sql** - Tạo các bảng cơ bản và cập nhật các bảng hiện có
2. **002_create_course_sections.sql** - Tạo bảng sections và lessons cho courses (optional)
3. **003_create_workflow_steps.sql** - Tạo bảng steps cho workflows (optional)
4. **004_create_indexes.sql** - Tạo các indexes để tối ưu performance

## Lưu ý

- **Backup database** trước khi chạy migrations
- Một số câu lệnh `ALTER TABLE` sử dụng `IF NOT EXISTS` - nếu MySQL version của bạn không hỗ trợ, hãy kiểm tra và chỉnh sửa
- Các bảng `users`, `categories`, `courses`, `videos`, `documents`, `user_course` được giả định đã tồn tại
- Nếu các bảng này chưa tồn tại, bạn cần tạo chúng trước

## Cấu trúc database sau khi migration

### Bảng mới được tạo:
- `vps_plans` - Quản lý gói VPS
- `workflow_categories` - Danh mục workflows
- `workflows` - Workflows
- `workflow_registrations` - Đăng ký workflows của users
- `workflow_steps` - Các bước trong workflow
- `topups` - Giao dịch nạp tiền
- `orders` - Đơn hàng
- `banks` - Thông tin ngân hàng
- `course_sections` - Sections của course (optional)
- `course_lessons` - Lessons của course (optional)

### Bảng được cập nhật:
- `users` - Thêm: phone, balance, status, address, last_login_at
- `courses` - Thêm: short_description, level, students, rating, duration, lessons, status, content


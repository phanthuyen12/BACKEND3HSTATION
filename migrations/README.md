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

Script migration hiện tại chạy theo **tên file đầy đủ sau khi sort alphabet**.

Lưu ý quan trọng:
- Thư mục này hiện có một số file **trùng số prefix** như `006`, `007`, `009`, `026`.
- Đây **không phải thiếu migration**. Chúng là các migration được thêm ở các giai đoạn khác nhau nhưng vẫn có tên file khác nhau nên vẫn chạy bình thường.
- Migration được đánh dấu đã chạy theo `filename` trong bảng `migrations`, không chỉ theo số thứ tự.

## Danh sách migration hiện tại

### Core / base
- `000_create_core_tables.sql`
- `001_create_base_tables.sql`
- `001_create_base_tables_simple.sql`
- `002_create_course_sections.sql`
- `003_create_workflow_steps.sql`
- `004_create_indexes.sql`
- `005_add_section_id_to_videos.sql`
- `006_add_img_banner_to_videos.sql`
- `006_create_vps_instances.sql`
- `007_add_status_to_documents.sql`
- `007_add_status_to_documents_fixed.sql`
- `007_add_status_to_documents_simple.sql`
- `008_update_vps_status.sql`
- `009_add_billing_columns_vps_instances.sql`
- `009_create_payments_table.sql`
- `010_update_orders_status_enum.sql`
- `011_update_user_add_ref.sql`
- `012_create_workflow_links.sql`
- `013_create_nodeverse_vps.sql`
- `014_update_orders_type_enum.sql`
- `015_enhance_nodeverse_instances.sql`
- `016_add_container_columns.sql`
- `017_add_container_columns_vps.sql`
- `018_add_reset_password_to_users.sql`
- `019_create_tool_key_tables.sql`
- `020_update_orders_type_tool_key.sql`
- `021_create_tool_package_prices.sql`
- `022_add_is_activation_email_sent_to_vps.sql`
- `023_create_ranks_rank_courses_and_progress.sql`
- `024_alter_courses_content_longtext.sql`

### Support / elearning
- `025_create_support_requests.sql`
- `026_add_ref_fields_to_support_requests.sql`
- `026_add_video_progress_tracking.sql`

### Facebook / AI
- `026_create_facebook_ai_chat_tables.sql`
- `027_add_tags_and_sale_agent_to_facebook_leads.sql`
- `028_create_facebook_tags_and_agents.sql`
- `029_create_ai_ingestion_records.sql`
- `030_add_dify_flow_state_to_facebook_leads.sql`

## Lưu ý

- **Backup database** trước khi chạy migrations
- Một số câu lệnh `ALTER TABLE` sử dụng `IF NOT EXISTS` - nếu MySQL version của bạn không hỗ trợ, hãy kiểm tra và chỉnh sửa
- Các bảng `users`, `categories`, `courses`, `videos`, `documents`, `user_course` được giả định đã tồn tại
- Nếu các bảng này chưa tồn tại, bạn cần tạo chúng trước
- Nếu bạn thấy prefix số bị trùng, hãy kiểm tra **toàn bộ tên file** thay vì chỉ nhìn số đầu file
- Không nên tự ý rename migration đã từng chạy trên môi trường thật, vì bảng `migrations` đang lưu theo `filename`

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

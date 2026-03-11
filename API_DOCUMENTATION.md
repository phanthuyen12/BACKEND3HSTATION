# LabTest API Guide

Tài liệu này được biên soạn trực tiếp từ các router/controllers trong thư mục `src/`, giúp bạn nắm rõ cách gọi API, yêu cầu xác thực và tình trạng implement hiện tại.

## 1. Quy định chung

### 1.1 Base URL
```
http://localhost:3000/api
```

### 1.2 Authentication
- JWT cần đưa vào header `Authorization: Bearer <token>`.
- Middleware `authenticate` kiểm tra token và gán `req.user`.
- Token được tạo bằng `src/utils/jwt.js` trong `authService.login/register`.

### 1.3 Authorization
- `authorizeRoles('admin')` dùng cho các API quản trị (users, admin elearning, vps, workflows, topups…).
- Client endpoints chỉ cần user đăng nhập (`authenticate`) hoặc public (không middleware).

### 1.4 Validation
- Middleware `src/middlewares/validate.js` + Joi.
- Nếu dữ liệu không hợp lệ → HTTP 422 và message `Validation error`.
- Các schemas được định nghĩa ngay tại từng route.

### 1.5 Error handling
- Bắn `ApiError` → `errorHandler` trả về JSON `{ success:false, message }` với code tương ứng.
- Lỗi không xác định → 500, kèm stack trace ở môi trường `!production`.

### 1.6 Pagination
- `buildPagination(page, limit)` (default 1/20, tối đa 100). Result trả về `{ data, pagination: { page, limit, total, totalPages } }`.

### 1.7 Response envelope
```json
{
  "success": true|false,
  "data": { ...payload },
  "message": "Success message"
}
```
*Một số controllers (workflows/topups phía admin & client) hiện mới trả về dữ liệu mẫu (stub).* 

### 1.8 Health check
- `GET /health` (public) để kiểm tra trạng thái service.

---

## 2. Authentication & Session APIs (`src/routes/authRoutes.js`)

| Method & Path | Auth | Validation | Controller | Notes |
| --- | --- | --- | --- | --- |
| `POST /auth/login` | public | body `{ email, password }` ≥6 ký tự | `authController.login` | trả về `{ token, user }`. Lỗi đăng nhập → 401 `Invalid credentials`. |
| `POST /auth/register` | public | body `{ name(2-100), email, password≥6, phone? }` | `authController.register` | tạo user + auto đăng nhập (trả token). Email trùng → 400. |
| `POST /auth/logout` | user/admin | none | `authController.logout` | hiện chỉ trả “Logout success”, chưa blacklist token. |
| `POST /auth/refresh-token` | public | body `{ refreshToken }` | `authController.refreshToken` | hiện ném lỗi 400 “Refresh token not implemented”. |
| `POST /auth/forgot-password` | public | body `{ email }` | `authController.forgotPassword` | luôn trả success để tránh lộ email. |
| `POST /auth/reset-password` | public | body `{ token, newPassword }` | `authController.resetPassword` | chưa implement, trả lỗi 400. |

---

## 3. E-Learning APIs

### 3.1 Admin – Danh mục khoá học (`src/routes/elearning/categoryRoutes.js`)

#### 3.1.1. Lấy danh sách tất cả danh mục
- **Method**: `GET`
- **Path**: `/elearning/categories`
- **Auth**: Không yêu cầu (public)
- **Query params**: Không có
- **Request body**: Không có
- **Response (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "courseCount": "number",
      "createdAt": "datetime",
      "updatedAt": "datetime"
    }
  ],
  "total": "number"
}
```

#### 3.1.2. Tạo danh mục khoá học mới
- **Method**: `POST`
- **Path**: `/elearning/categories`
- **Auth**: Bắt buộc (`authenticate` + `authorizeRoles('admin')`)
- **Headers**: `Authorization: Bearer <token>`
- **Request body**:
```json
{
  "name": "Tên danh mục (string, 2-100 ký tự, required)"
}
```
- **Validation**:
  - `name`: string, min 2 ký tự, max 100 ký tự, required
- **Response (201)**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "courseCount": 0,
    "createdAt": "datetime",
    "updatedAt": "datetime"
  },
  "message": "Category created"
}
```
- **Error cases**:
  - 401: Chưa đăng nhập hoặc không phải admin
  - 422: Validation error (tên quá ngắn/dài)
  - 400: Tên danh mục đã tồn tại

#### 3.1.3. Cập nhật danh mục khoá học
- **Method**: `PUT`
- **Path**: `/elearning/categories/:id`
- **Auth**: Bắt buộc (`authenticate` + `authorizeRoles('admin')`)
- **Headers**: `Authorization: Bearer <token>`
- **URL params**:
  - `id` (string, required) - ID của danh mục cần cập nhật
- **Request body**:
```json
{
  "name": "Tên danh mục mới (string, 2-100 ký tự, required)"
}
```
- **Validation**:
  - `id`: string, required (trong params)
  - `name`: string, min 2 ký tự, max 100 ký tự, required
- **Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "courseCount": "number",
    "createdAt": "datetime",
    "updatedAt": "datetime"
  },
  "message": "Category updated"
}
```
- **Error cases**:
  - 401: Chưa đăng nhập hoặc không phải admin
  - 404: Không tìm thấy danh mục với ID này
  - 422: Validation error

#### 3.1.4. Xóa danh mục khoá học
- **Method**: `DELETE`
- **Path**: `/elearning/categories/:id`
- **Auth**: Bắt buộc (`authenticate` + `authorizeRoles('admin')`)
- **Headers**: `Authorization: Bearer <token>`
- **URL params**:
  - `id` (string, required) - ID của danh mục cần xóa
- **Request body**: Không có
- **Validation**:
  - `id`: string, required (trong params)
- **Response (200)**:
```json
{
  "success": true,
  "data": {},
  "message": "Xóa danh mục thành công"
}
```
- **Error cases**:
  - 401: Chưa đăng nhập hoặc không phải admin
  - 404: Không tìm thấy danh mục với ID này
  - 422: Validation error

#### 3.1.5. Lấy thống kê danh mục
- **Method**: `GET`
- **Path**: `/elearning/categories/stats`
- **Auth**: Bắt buộc (`authenticate` + `authorizeRoles('admin')`)
- **Headers**: `Authorization: Bearer <token>`
- **Query params**: Không có
- **Request body**: Không có
- **Response (200)**:
```json
{
  "success": true,
  "data": {
    "totalCourses": "number",
    "totalCategories": "number",
    "avgPerCategory": "number"
  }
}
```
- **Error cases**:
  - 401: Chưa đăng nhập hoặc không phải admin

### 3.2 Admin – Khoá học (`src/routes/elearning/courseRoutes.js`)
- `GET /elearning/courses`: admin; query `{ page?, limit?, search?, category? }`; trả `{ data: Course[], pagination }`. Course gồm đầy đủ metadata (title, descriptions, category info, price, level, students, rating, duration, lessons, status, timestamps).
- `GET /elearning/courses/:id`: admin; params `{ id }`; trả `{ data: CourseDetail }` kèm `sections`.
- `POST /elearning/courses`: admin; body bắt buộc `title`, `description`, `categoryId`, `price`; các field khác optional; trả 201.
- `PUT /elearning/courses/:id`: admin; params `{ id }`; body optional fields; trả cập nhật.
- `DELETE /elearning/courses/:id`: admin; message “Course deleted”.
- `GET /elearning/courses/stats`: admin; `{ totalCourses, totalStudents }`.

### 3.3 Client – E-learning (`src/routes/client/elearningRoutes.js`)
- `GET /client/elearning/courses`: public; query `{ category?, search?, page?, limit? }`; chỉ trả courses `status='active'`.
- `GET /client/elearning/courses/:id`: public; trả chi tiết course active, 404 nếu khóa học inactive.
- `GET /client/elearning/categories`: public; chỉ danh mục có ít nhất 1 course active (kèm `courseCount`).

### 3.4 Admin – Course Sections (`src/routes/courseSectionRoutes.js`)

#### 3.4.1. Lấy danh sách sections theo khoá học
- **Method**: `GET`
- **Path**: `/elearning/courses/:course_id/sections`
- **Auth**: Không bắt buộc (`optionalAuth` - có thể có hoặc không có token)
- **Headers**: `Authorization: Bearer <token>` (optional)
- **URL params**:
  - `course_id` (number, integer, positive, required) - ID của khoá học
- **Request body**: Không có
- **Response (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "number",
      "course_id": "number",
      "title": "string",
      "order": "number",
      "created_at": "datetime",
      "updated_at": "datetime",
      "lessons": [
        {
          "id": "number",
          "section_id": "number",
          "course_id": "number",
          "title": "string",
          "duration": "string",
          "type": "video|text|quiz",
          "content": "string",
          "order": "number",
          "created_at": "datetime",
          "updated_at": "datetime"
        }
      ]
    }
  ]
}
```
- **Lưu ý**: Sections được sắp xếp theo `order` tăng dần, mỗi section kèm danh sách lessons
- **Error cases**:
  - 404: Không tìm thấy khoá học với ID này
  - 422: Validation error (course_id không hợp lệ)

#### 3.4.2. Lấy chi tiết một section
- **Method**: `GET`
- **Path**: `/elearning/sections/:id`
- **Auth**: Không bắt buộc (`optionalAuth`)
- **Headers**: `Authorization: Bearer <token>` (optional)
- **URL params**:
  - `id` (number, integer, positive, required) - ID của section
- **Request body**: Không có
- **Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "number",
    "course_id": "number",
    "title": "string",
    "order": "number",
    "created_at": "datetime",
    "updated_at": "datetime"
  }
}
```
- **Error cases**:
  - 404: Không tìm thấy section với ID này
  - 422: Validation error

#### 3.4.3. Tạo section mới cho khoá học
- **Method**: `POST`
- **Path**: `/elearning/courses/:course_id/sections`
- **Auth**: Bắt buộc (`authenticate` + `authorizeRoles('admin')`)
- **Headers**: `Authorization: Bearer <token>`
- **URL params**:
  - `course_id` (number, integer, positive, required) - ID của khoá học
- **Request body**:
```json
{
  "title": "Tiêu đề section (string, 1-255 ký tự, required)",
  "order": "Thứ tự hiển thị (number, integer, min 0, optional)"
}
```
- **Validation**:
  - `course_id`: number, integer, positive, required (trong params)
  - `title`: string, min 1 ký tự, max 255 ký tự, required
  - `order`: number, integer, min 0, optional (mặc định 0)
- **Response (201)**:
```json
{
  "success": true,
  "data": {
    "id": "number",
    "course_id": "number",
    "title": "string",
    "order": "number",
    "created_at": "datetime",
    "updated_at": "datetime"
  },
  "message": "Section created"
}
```
- **Error cases**:
  - 401: Chưa đăng nhập hoặc không phải admin
  - 404: Không tìm thấy khoá học với ID này
  - 400: Order đã tồn tại cho khoá học này
  - 422: Validation error

#### 3.4.4. Cập nhật section
- **Method**: `PUT`
- **Path**: `/elearning/sections/:id`
- **Auth**: Bắt buộc (`authenticate` + `authorizeRoles('admin')`)
- **Headers**: `Authorization: Bearer <token>`
- **URL params**:
  - `id` (number, integer, positive, required) - ID của section cần cập nhật
- **Request body** (tất cả fields đều optional):
```json
{
  "title": "Tiêu đề section (string, 1-255 ký tự, optional)",
  "order": "Thứ tự hiển thị (number, integer, min 0, optional)"
}
```
- **Validation**:
  - `id`: number, integer, positive, required (trong params)
  - Tất cả fields trong body đều optional
- **Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "number",
    "course_id": "number",
    "title": "string",
    "order": "number",
    "created_at": "datetime",
    "updated_at": "datetime"
  },
  "message": "Section updated"
}
```
- **Error cases**:
  - 401: Chưa đăng nhập hoặc không phải admin
  - 404: Không tìm thấy section với ID này
  - 400: Order đã tồn tại cho khoá học này
  - 422: Validation error

#### 3.4.5. Xóa section
- **Method**: `DELETE`
- **Path**: `/elearning/sections/:id`
- **Auth**: Bắt buộc (`authenticate` + `authorizeRoles('admin')`)
- **Headers**: `Authorization: Bearer <token>`
- **URL params**:
  - `id` (number, integer, positive, required) - ID của section cần xóa
- **Request body**: Không có
- **Validation**:
  - `id`: number, integer, positive, required (trong params)
- **Response (200)**:
```json
{
  "success": true,
  "data": {},
  "message": "Section deleted"
}
```
- **Lưu ý**: Khi xóa section, tất cả lessons trong section đó cũng sẽ bị xóa (CASCADE DELETE)
- **Error cases**:
  - 401: Chưa đăng nhập hoặc không phải admin
  - 404: Không tìm thấy section với ID này
  - 422: Validation error

### 3.5 Admin – Course Lessons (`src/routes/courseLessonRoutes.js`)

#### 3.5.1. Lấy danh sách lessons theo section
- **Method**: `GET`
- **Path**: `/elearning/sections/:section_id/lessons`
- **Auth**: Không bắt buộc (`optionalAuth`)
- **Headers**: `Authorization: Bearer <token>` (optional)
- **URL params**:
  - `section_id` (number, integer, positive, required) - ID của section
- **Request body**: Không có
- **Response (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "number",
      "section_id": "number",
      "course_id": "number",
      "title": "string",
      "duration": "string",
      "type": "video|text|quiz",
      "content": "string",
      "order": "number",
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  ]
}
```
- **Lưu ý**: Lessons được sắp xếp theo `order` tăng dần
- **Error cases**:
  - 404: Không tìm thấy section với ID này
  - 422: Validation error

#### 3.5.2. Lấy danh sách lessons theo khoá học
- **Method**: `GET`
- **Path**: `/elearning/courses/:course_id/lessons`
- **Auth**: Không bắt buộc (`optionalAuth`)
- **Headers**: `Authorization: Bearer <token>` (optional)
- **URL params**:
  - `course_id` (number, integer, positive, required) - ID của khoá học
- **Request body**: Không có
- **Response (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "number",
      "section_id": "number",
      "course_id": "number",
      "title": "string",
      "duration": "string",
      "type": "video|text|quiz",
      "content": "string",
      "order": "number",
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  ]
}
```
- **Error cases**:
  - 404: Không tìm thấy khoá học với ID này
  - 422: Validation error

#### 3.5.3. Lấy chi tiết một lesson
- **Method**: `GET`
- **Path**: `/elearning/lessons/:id`
- **Auth**: Không bắt buộc (`optionalAuth`)
- **Headers**: `Authorization: Bearer <token>` (optional)
- **URL params**:
  - `id` (number, integer, positive, required) - ID của lesson
- **Request body**: Không có
- **Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "number",
    "section_id": "number",
    "course_id": "number",
    "title": "string",
    "duration": "string",
    "type": "video|text|quiz",
    "content": "string",
    "order": "number",
    "created_at": "datetime",
    "updated_at": "datetime"
  }
}
```
- **Error cases**:
  - 404: Không tìm thấy lesson với ID này
  - 422: Validation error

#### 3.5.4. Tạo lesson mới cho section
- **Method**: `POST`
- **Path**: `/elearning/sections/:section_id/lessons`
- **Auth**: Bắt buộc (`authenticate` + `authorizeRoles('admin')`)
- **Headers**: `Authorization: Bearer <token>`
- **URL params**:
  - `section_id` (number, integer, positive, required) - ID của section
- **Request body**:
```json
{
  "course_id": "ID khoá học (number, integer, positive, required)",
  "title": "Tiêu đề lesson (string, 1-255 ký tự, required)",
  "duration": "Thời lượng (string, optional)",
  "type": "Loại lesson: video|text|quiz (string, optional, mặc định 'video')",
  "content": "Nội dung lesson (string, optional)",
  "order": "Thứ tự hiển thị (number, integer, min 0, optional)"
}
```
- **Validation**:
  - `section_id`: number, integer, positive, required (trong params)
  - `course_id`: number, integer, positive, required
  - `title`: string, min 1 ký tự, max 255 ký tự, required
  - `duration`: string, optional
  - `type`: string, phải là một trong: 'video', 'text', 'quiz', optional (mặc định 'video')
  - `content`: string, optional
  - `order`: number, integer, min 0, optional (mặc định 0)
- **Response (201)**:
```json
{
  "success": true,
  "data": {
    "id": "number",
    "section_id": "number",
    "course_id": "number",
    "title": "string",
    "duration": "string",
    "type": "video|text|quiz",
    "content": "string",
    "order": "number",
    "created_at": "datetime",
    "updated_at": "datetime"
  },
  "message": "Lesson created"
}
```
- **Error cases**:
  - 401: Chưa đăng nhập hoặc không phải admin
  - 404: Không tìm thấy section hoặc course với ID này
  - 400: Section không thuộc course này hoặc order đã tồn tại
  - 422: Validation error

#### 3.5.5. Cập nhật lesson
- **Method**: `PUT`
- **Path**: `/elearning/lessons/:id`
- **Auth**: Bắt buộc (`authenticate` + `authorizeRoles('admin')`)
- **Headers**: `Authorization: Bearer <token>`
- **URL params**:
  - `id` (number, integer, positive, required) - ID của lesson cần cập nhật
- **Request body** (tất cả fields đều optional):
```json
{
  "title": "Tiêu đề lesson (string, 1-255 ký tự, optional)",
  "duration": "Thời lượng (string, optional)",
  "type": "Loại lesson: video|text|quiz (string, optional)",
  "content": "Nội dung lesson (string, optional)",
  "order": "Thứ tự hiển thị (number, integer, min 0, optional)"
}
```
- **Validation**:
  - `id`: number, integer, positive, required (trong params)
  - Tất cả fields trong body đều optional
  - `type`: nếu có, phải là một trong: 'video', 'text', 'quiz'
- **Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "number",
    "section_id": "number",
    "course_id": "number",
    "title": "string",
    "duration": "string",
    "type": "video|text|quiz",
    "content": "string",
    "order": "number",
    "created_at": "datetime",
    "updated_at": "datetime"
  },
  "message": "Lesson updated"
}
```
- **Error cases**:
  - 401: Chưa đăng nhập hoặc không phải admin
  - 404: Không tìm thấy lesson với ID này
  - 400: Order đã tồn tại cho section này
  - 422: Validation error

#### 3.5.6. Xóa lesson
- **Method**: `DELETE`
- **Path**: `/elearning/lessons/:id`
- **Auth**: Bắt buộc (`authenticate` + `authorizeRoles('admin')`)
- **Headers**: `Authorization: Bearer <token>`
- **URL params**:
  - `id` (number, integer, positive, required) - ID của lesson cần xóa
- **Request body**: Không có
- **Validation**:
  - `id`: number, integer, positive, required (trong params)
- **Response (200)**:
```json
{
  "success": true,
  "data": {},
  "message": "Lesson deleted"
}
```
- **Error cases**:
  - 401: Chưa đăng nhập hoặc không phải admin
  - 404: Không tìm thấy lesson với ID này
  - 422: Validation error

### 3.6 Admin – Videos (`src/routes/elearning/courseRoutes.js`)

**Lưu ý quan trọng**: Videos giờ đây thuộc về `course_sections` thay vì trực tiếp thuộc về `courses`. Một `course_section` có thể có nhiều videos.

#### 3.6.1. Lấy danh sách videos theo khoá học
- **Method**: `GET`
- **Path**: `/elearning/courses/:course_id/videos`
- **Auth**: Không bắt buộc (`optionalAuth` - có thể có hoặc không có token)
- **Headers**: `Authorization: Bearer <token>` (optional)
- **URL params**:
  - `course_id` (number, integer, positive, required) - ID của khoá học
- **Query params**:
  - `section_id` (number, integer, positive, optional) - Lọc videos theo section_id
- **Request body**: Không có
- **Logic**:
  - Nếu khoá học là miễn phí (`is_free = true`) hoặc user là admin → trả về tất cả videos
  - Nếu user đã đăng nhập và đã mua khoá học → trả về tất cả videos
  - Nếu không đăng nhập hoặc chưa mua khoá học → chỉ trả về videos có `preview = true`
- **Response (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "number",
      "course_id": "number",
      "section_id": "number",
      "title": "string",
      "url": "string",
      "duration": "number",
      "order": "number",
      "preview": "boolean",
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  ]
}
```
- **Lưu ý**: Videos được sắp xếp theo `order` tăng dần
- **Error cases**:
  - 404: Không tìm thấy khoá học hoặc section với ID này
  - 400: Section không thuộc về khoá học này
  - 422: Validation error

#### 3.6.2. Tạo video mới cho section
- **Method**: `POST`
- **Path**: `/elearning/courses/:course_id/videos`
- **Auth**: Bắt buộc (`authenticate` + `authorizeRoles('admin')`)
- **Headers**: `Authorization: Bearer <token>`
- **URL params**:
  - `course_id` (number, integer, positive, required) - ID của khoá học
- **Request body**:
```json
{
  "sectionId": "ID của section (number, integer, positive, required)",
  "title": "Tiêu đề video (string, required)",
  "url": "URL video (string, required)",
  "duration": "Thời lượng video tính bằng giây (number, integer, min 0, required)",
  "order": "Thứ tự hiển thị (number, integer, min 0, required)",
  "preview": "Có phải video preview không (boolean, required)"
}
```
- **Validation**:
  - `course_id`: number, integer, positive, required (trong params)
  - `sectionId`: number, integer, positive, required
  - `title`: string, required
  - `url`: string, required
  - `duration`: number, integer, min 0, required
  - `order`: number, integer, min 0, required
  - `preview`: boolean, required
- **Response (201)**:
```json
{
  "success": true,
  "data": {
    "id": "number",
    "course_id": "number",
    "section_id": "number",
    "title": "string",
    "url": "string",
    "duration": "number",
    "order": "number",
    "preview": "boolean",
    "created_at": "datetime",
    "updated_at": "datetime"
  },
  "message": "Video created"
}
```
- **Error cases**:
  - 401: Chưa đăng nhập hoặc không phải admin
  - 404: Không tìm thấy khoá học hoặc section với ID này
  - 400: Section không thuộc về khoá học này hoặc sectionId không được cung cấp
  - 422: Validation error

#### 3.6.3. Cập nhật thông tin video
- **Method**: `PUT`
- **Path**: `/elearning/courses/:course_id/videos/:id`
- **Auth**: Bắt buộc (`authenticate` + `authorizeRoles('admin')`)
- **Headers**: `Authorization: Bearer <token>`
- **URL params**:
  - `course_id` (number, integer, positive, required) - ID của khoá học
  - `id` (number, integer, positive, required) - ID của video cần cập nhật
- **Request body** (tất cả fields đều optional):
```json
{
  "sectionId": "ID của section (number, integer, positive, optional)",
  "title": "Tiêu đề video (string, optional)",
  "url": "URL video (string, optional)",
  "duration": "Thời lượng video tính bằng giây (number, integer, min 0, optional)",
  "order": "Thứ tự hiển thị (number, integer, min 0, optional)",
  "preview": "Có phải video preview không (boolean, optional)"
}
```
- **Validation**:
  - `course_id`: number, integer, positive, required (trong params)
  - `id`: number, integer, positive, required (trong params)
  - Tất cả fields trong body đều optional
- **Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "number",
    "course_id": "number",
    "section_id": "number",
    "title": "string",
    "url": "string",
    "duration": "number",
    "order": "number",
    "preview": "boolean",
    "created_at": "datetime",
    "updated_at": "datetime"
  },
  "message": "Video updated"
}
```
- **Error cases**:
  - 401: Chưa đăng nhập hoặc không phải admin
  - 404: Không tìm thấy video hoặc section với ID này
  - 400: Section không thuộc về khoá học này
  - 422: Validation error

#### 3.6.4. Xóa video
- **Method**: `DELETE`
- **Path**: `/elearning/courses/:course_id/videos/:id`
- **Auth**: Bắt buộc (`authenticate` + `authorizeRoles('admin')`)
- **Headers**: `Authorization: Bearer <token>`
- **URL params**:
  - `course_id` (number, integer, positive, required) - ID của khoá học
  - `id` (number, integer, positive, required) - ID của video cần xóa
- **Request body**: Không có
- **Validation**:
  - `course_id`: number, integer, positive, required (trong params)
  - `id`: number, integer, positive, required (trong params)
- **Response (200)**:
```json
{
  "success": true,
  "data": {},
  "message": "Video deleted"
}
```
- **Error cases**:
  - 401: Chưa đăng nhập hoặc không phải admin
  - 404: Không tìm thấy video với ID này
  - 422: Validation error

---

## 4. VPS APIs

### 4.1 Admin Plans (`src/routes/vps/planRoutes.js`)
- `GET /vps/plans`: admin; query `{ search?, popular? }`; trả `{ data: Plan[], total }`.
- `POST /vps/plans`: admin; body bắt buộc các thông số cấu hình; trả 201.
- `PUT /vps/plans/:id`, `DELETE /vps/plans/:id`: admin; params `{ id }`; cập nhật/xoá.
- `PATCH /vps/plans/:id/toggle-popular`: admin; body `{ popular: boolean }`.
- `GET /vps/plans/stats`: admin; `{ totalPlans, totalPopular, totalConfigs }`.

### 4.2 Client Plans & Orders (`src/routes/client/vpsRoutes.js`)
- `GET /client/vps/plans`: public; trả danh sách plan `status='active'`.
- `POST /client/vps/orders`: user; body `{ planId, paymentMethod }`; controller tạo order thông qua `vpsService.createOrder` → `{ orderId, planId, amount, status, createdAt }`. Nếu plan không active → 404.

---

## 5. Workflows APIs

> *Các controller trong `src/controllers/workflows/*` hiện vẫn là stub (trả dữ liệu rỗng). API contract & validations đã có, nhưng cần implement thêm business logic.*

### 5.1 Admin Categories (`src/routes/workflows/categoryRoutes.js`)
- `GET /workflows/categories`: **public** (chưa gắn auth); trả `{ data: [], total:0 }` hiện tại.
- `POST/PUT/DELETE /workflows/categories`: admin; body `{ name }`; trả message tương ứng.
- `GET /workflows/categories/stats`: admin; `{ totalWorkflows, totalCategories, avgPerCategory }` (stub = 0).

### 5.2 Admin Workflows (`src/routes/workflows/workflowRoutes.js`)
- `GET /workflows`: admin; query `{ page?, limit?, search?, category? }`; trả pagination rỗng.
- `GET /workflows/:id`, `POST`, `PUT`, `DELETE`, `GET /workflows/stats`: admin; validations đã có; controller trả `{}` hoặc số liệu 0.

### 5.3 Admin Registrations (`src/routes/workflows/registrationRoutes.js`)
- `GET /workflows/registrations`: admin; query filter; trả `{ data: [], pagination }`.
- `PATCH /workflows/registrations/:id/approve|reject`: admin; approve → status `da-duyet`, reject → `da-huy`.
- `DELETE /workflows/registrations/:id`: admin; message “Registration deleted”.
- `GET /workflows/registrations/stats`: admin; `{ totalRegistrations, totalWaiting, totalApproved, totalRejected }` hiện 0.

### 5.4 Client Workflows (`src/routes/client/workflowRoutes.js`)
- `GET /client/workflows`: public; query `{ category?, search? }`; trả pagination rỗng.
- `GET /client/workflows/:id`: public; `{}` stub.
- `POST /client/workflows/:id/register`: user; body `{ userId }`; trả `{ id, workflowId, userId, status:'cho-duyet' }`.
- `GET /client/workflows/my-workflows`: user; query `{ status?, userId(required) }`; trả `[]`.

---

## 6. Topup APIs

### 6.1 Admin (`src/routes/topups/topupRoutes.js`)
- `GET /topups`: admin; query `{ status?, topupStatus?, search?, page?, limit? }`; trả `{ data: [], pagination }`.
- `GET /topups/:code`: admin; trả `{ data: {} }`.
- `PATCH /topups/:code/approve`: admin; body `{ note? }`; trả `{ code, status:'da-duyet', userBalance }` (0 hiện tại).
- `PATCH /topups/:code/reject`: admin; body `{ reason }`; trả `{ code, status:'da-huy' }`.
- `GET /topups/stats`: admin; `{ totalTopups, totalPending, totalApproved, totalRejected, totalAmount }` (0).

### 6.2 Client (`src/routes/client/topupRoutes.js`)
- `POST /client/topups/create`: user; body `{ userId, amount>=0, bank, paymentMethod('bank'|'card'), cardInfo? }`; controller hiện trả `{ code:'TEMP', amount:0, status:'cho-duyet' }` (chưa lưu dữ liệu).
- `POST /client/topups/:code/upload-proof`: user; params `{ code }`; route yêu cầu file nhưng chưa có middleware upload → trả `{ code, paymentProof:'' }`.
- `GET /client/topups/history`: user; query `{ userId(required), status?, page?, limit? }`; trả `{ data: [], pagination }`.
- `GET /client/topups/banks`: public; trả danh sách rỗng.

---

## 7. User APIs

### 7.1 Admin (`src/routes/userRoutes.js`)
- `GET /users`: admin; query `{ search?, status?, page?, limit? }`; trả `{ data: UserSummary[], pagination }`.
- `GET /users/:id`: admin; params `{ id }`; trả chi tiết + thống kê orders (`total`, `courses`, `workflows`, `vps`).
- `POST /users`: admin; body `{ name, email, phone?, password, status? }`; tạo user (hash password) → 201.
- `PUT /users/:id`: admin; body optional fields; kiểm tra trùng email.
- `PATCH /users/:id/toggle-lock`: admin; body `{ status:'active'|'locked' }`.
- `DELETE /users/:id`: admin; xoá user.
- `PATCH /users/:id/balance`: admin; body `{ amount, type('add'|'subtract'|'set'), note? }`; validate không cho âm khi subtract.
- `GET /users/stats`: admin; `{ totalUsers, totalActive, totalLocked }`.

### 7.2 Client (`src/routes/client/userRoutes.js`)
- `GET /client/users/me`: user; trả `{ data: {} }` (chưa implement profile mapping).
- `PUT /client/users/me`: user; body `{ name?, phone?, address?, avatar? }`; trả “Profile updated” nhưng chưa lưu DB.
- `GET /client/users/me/orders`: user; query `{ type?, page?, limit? }`; trả danh sách rỗng + pagination.
- `GET /client/users/me/my-courses`: user; trả `[]`.
> Các controller client user hiện là stub, cần hoàn thiện để đọc/ghi thông tin thực tế.

---

## 8. Orders APIs

### 8.1 Shared `/api/orders`
- `POST /orders`: yêu cầu đăng nhập; body `{ userId, type('course'|'workflow'|'vps'), itemId, paymentMethod('balance'|'bank'|'card') }`. **Bug:** controller đang dùng `_req` nhưng lại tham chiếu `req.body` → sẽ crash. Cần sửa trước khi dùng.

### 8.2 Client Orders (`src/routes/client/orderRoutes.js`)
- `POST /client/orders`: user; body như trên; trả `{ id, type, itemId, amount:0, status:'pending' }` (stub).
- `GET /client/orders/:id`: user; params `{ id }`; trả `{ data: {} }`.
- `POST /client/orders/:id/pay`: user; body `{ paymentMethod }`; trả `{ id, status:'paid' }`.

---

## 9. Ghi chú triển khai & best practices

1. **Authentication**: mọi endpoint không public phải gắn `authenticate`. Khi cần phân quyền admin -> thêm `authorizeRoles('admin')`.
2. **Authorization**: các endpoint client đang yêu cầu `userId` trong body/query, tuy nhiên controller nên đọc từ `req.user`. Nếu triển khai thực tế cần chỉnh lại tránh lộ thông tin.
3. **Validation**: dùng Joi; nếu muốn thêm field mới phải cập nhật cả schema.
4. **Error messages**: dùng `ApiError` để đảm bảo format thống nhất. Ví dụ `ApiError.notFound('Course not found')`.
5. **Pagination**: luôn trả `pagination` object để client dễ render UI.
6. **Stub controllers**: workflows, topups (admin & client), client users/orders/workflows đang trả dữ liệu mẫu → cần implement service + model trước khi đưa vào production.
7. **File upload**: route `/client/topups/:code/upload-proof` chưa có middleware (multer). Khi cần upload thật, bổ sung middleware xử lý multipart.
8. **Testing nhanh**:
   ```bash
   curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/elearning/courses?page=1"
   ```
   hoặc dùng Postman/Hoppscotch dựa theo tài liệu này.

---

## 10. Cập nhật tài liệu
- Khi thêm route mới, cập nhật vào file này cùng mô tả auth/validation/response.
- Nếu chuyển controller từ stub sang implementation thực tế, nhớ chỉnh phần “Implementation status”.

---

## 11. Hỗ trợ
Liên hệ team backend khi cần thêm thông tin hoặc phát hiện sự khác biệt giữa tài liệu và mã nguồn. File này luôn ưu tiên đồng bộ với routers/controllers trong `src/`.






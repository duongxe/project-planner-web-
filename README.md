# AI Planner (UON Tool)

Ứng dụng web hỗ trợ sinh viên lập kế hoạch học tập và theo dõi tiến độ tốt nghiệp. Toàn bộ mã nguồn nằm trong thư mục [unlu-tool/](unlu-tool/).

## Đây là gì

Một cổng tư vấn học vụ (academic advising / degree planning) gồm frontend HTML/CSS/JS thuần và backend Node.js + SQLite. Sinh viên đăng nhập bằng mã số sinh viên, xem tiến độ hoàn thành chương trình học (khối kiến thức đại cương/chuyên ngành/tự chọn, quy định theo cấp độ môn học), khai báo môn đã học/đang học, tự động sinh kế hoạch học theo từng học kỳ, lưu nhiều phiên bản kế hoạch, và điều chỉnh kế hoạch thông qua một trợ lý chat bằng ngôn ngữ tự nhiên.

## Đã làm những gì

**Frontend** (`unlu-tool/`)
- `login.html` + `js/login.js`: đăng nhập bằng mã số sinh viên, lưu phiên trong `localStorage`.
- `planner.html` + `js/dashboard.js`: trang chính gồm thông tin sinh viên/chương trình/chuyên ngành, các chỉ số tiến độ (số tín chỉ đã đạt/còn lại), bảng môn học đã ghi nhận, công cụ tạo/lưu/xuất PDF kế hoạch học, khung chat trợ lý, và lịch sử các phiên bản kế hoạch đã lưu.
- `js/api.js`: lớp gọi API tới backend (`http://localhost:3001/api`).

**Backend** (`unlu-tool/backend/`)
- Kiến trúc phân lớp: repositories → services → routes, dùng Express và SQLite (`better-sqlite3`).
- **Routes**: đăng nhập, chương trình học/chuyên ngành, thông tin môn học, tiến độ sinh viên, danh sách môn đủ điều kiện đăng ký, kế hoạch học (tạo/lưu/xoá/validate), chọn môn cho các "option slot" chuyên ngành, ghi nhận điểm/môn học, và chat trợ lý kế hoạch.
- **Services chính**:
  - `ruleEngineService` — engine đánh giá điều kiện tiên quyết/loại trừ/kiến thức giả định của môn học.
  - `progressService` — tính tiến độ hoàn thành chương trình (tín chỉ, các khối yêu cầu, phân bố theo cấp độ).
  - `studyPlanService` — sinh, xác thực, lưu và quản lý phiên bản kế hoạch học theo học kỳ.
  - `majorOptionService` — quản lý lựa chọn môn học cho các option slot của chuyên ngành.
  - `catalogService` — tổng hợp dữ liệu chương trình/chuyên ngành/môn học.
  - `ollamaProvider` + `plannerChatService` — dùng Ollama (model `gemma3`) để phân tích yêu cầu bằng ngôn ngữ tự nhiên (VD: giảm tải học kỳ, dời môn, hỏi giả định "what-if") thành các thay đổi cụ thể lên kế hoạch học.
- **Database**: SQLite với schema gồm chương trình học, chuyên ngành, môn học, các khối yêu cầu (kèm bảng nối), quy định theo cấp độ môn học, luật tiên quyết/loại trừ, hồ sơ sinh viên, lịch sử môn học của sinh viên, lựa chọn option slot, và các phiên bản kế hoạch học đã lưu. Có sẵn seed dữ liệu mẫu cho ngành Cử nhân CNTT và Cử nhân Khoa học Máy tính (AI).

## Chạy thử

```bash
cd unlu-tool/backend
npm install
npm start
```

Server chạy ở cổng `3001` (có thể đổi qua biến môi trường `PORT`) và cũng phục vụ luôn phần frontend tĩnh, nên chỉ cần mở `http://localhost:3001/login.html`.

Tính năng chat trợ lý kế hoạch cần có [Ollama](https://ollama.com) chạy local với model `gemma3` ở cổng `11434`.

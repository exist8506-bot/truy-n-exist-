# Deploy backend public

GitHub Pages chỉ chạy frontend tĩnh. Backend SQLite cần một máy chủ Node/Docker có persistent disk.

## Render

1. Tạo Web Service từ repository này.
2. Chọn Docker.
3. Render sẽ đọc `render.yaml` nếu dùng Blueprint.
4. Persistent disk phải mount tại `/app/server-data` để giữ SQLite và cover. `KHO_DATA_DIR` cũng phải trỏ tới `/app/server-data`.
5. Sau khi deploy, kiểm tra `/api/v1/health`.
6. Lấy URL API dạng `https://<service>.onrender.com/api/v1`.
7. Mở GitHub Pages → nút 🌐 → nhập URL API.

### Biến môi trường

- `PORT`: Render cấp port; container mặc định dùng 8787.
- `TRUST_PROXY=1`: bật khi đứng sau reverse proxy như Render.

## Lưu ý dữ liệu

Không commit `server/kho_truyen.sqlite`, token, mật khẩu hoặc backup chứa tài khoản thật vào Git. Persistent disk là bắt buộc nếu muốn SQLite không mất dữ liệu khi container restart/redeploy.

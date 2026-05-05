# 📓 Sổ bán hàng

App quản lý khách hàng và lên đơn cá nhân — viết bằng React + Vite. Chạy được trên cả web và mobile (responsive).

## ✨ Tính năng

- **Trang chủ** — lời chào theo giờ, số liệu hôm nay, nhắc việc cần làm
- **Khách hàng** — quản lý 7 nhóm tag, tìm kiếm, lọc, sắp xếp
- **Lên đơn nhanh** — chọn khách → thêm sản phẩm → giảm giá → xác nhận
- **Nhắc nhở** — phân nhóm Quá hạn / Hôm nay / Tuần này / Sau này
- **Báo cáo** — 6 biểu đồ: doanh thu, top khách, top sản phẩm, phân bố, so sánh kỳ, heatmap
- **Tích hợp Zalo / SMS** — gửi tin qua deep link, có template library
- **Import / Export** — paste data từ Excel, xuất Excel/CSV/Google Sheets
- **Lưu trữ** — data lưu trong trình duyệt (localStorage), không cần server

## 🚀 Cách chạy local

### 1. Cài đặt Node.js
Tải tại [nodejs.org](https://nodejs.org) — chọn bản LTS (khuyên dùng v20 hoặc v22).
Kiểm tra cài đặt:
```bash
node -v   # phải hiện v20.x.x hoặc cao hơn
npm -v
```

### 2. Cài dependencies
Mở Terminal/PowerShell trong thư mục project:
```bash
npm install
```
*Đợi 1-2 phút cho npm tải các package.*

### 3. Chạy dev server
```bash
npm run dev
```
Mở trình duyệt vào `http://localhost:5173` để xem app.

### 4. Build bản production
```bash
npm run build
```
Output sẽ ở thư mục `dist/`.

---

## 📦 Đẩy lên GitHub

### Bước 1: Tạo tài khoản GitHub
Đăng ký tại [github.com](https://github.com) (miễn phí).

### Bước 2: Tạo repository mới
1. Vào [github.com/new](https://github.com/new)
2. Đặt tên repo, ví dụ: `so-ban-hang`
3. Chọn **Public** hoặc **Private** (tuỳ ý)
4. **KHÔNG tick** "Initialize with README" (vì mình đã có README rồi)
5. Bấm **Create repository**

### Bước 3: Push code lên
Mở Terminal trong thư mục project, chạy lần lượt:

```bash
git init
git add .
git commit -m "App ban dau"
git branch -M main
git remote add origin https://github.com/TEN_USERNAME/so-ban-hang.git
git push -u origin main
```

> Thay `TEN_USERNAME` bằng username GitHub của bạn.

Lần đầu push sẽ hỏi đăng nhập — dùng **Personal Access Token** (PAT) thay cho mật khẩu:
- Vào [github.com/settings/tokens](https://github.com/settings/tokens)
- Bấm **Generate new token (classic)**
- Tick quyền **repo**
- Copy token và paste khi git hỏi password

---

## 🌐 Deploy lên web

### ⭐ Cách 1: Vercel (khuyên dùng — dễ nhất)

1. Vào [vercel.com](https://vercel.com), đăng nhập bằng GitHub
2. Bấm **Add New → Project**
3. Chọn repo `so-ban-hang` vừa push
4. Bấm **Deploy** (Vercel tự nhận diện Vite, không cần config)
5. Sau ~1 phút, app có URL dạng `https://so-ban-hang-abc.vercel.app`

✅ **Ưu điểm:** Mỗi lần `git push`, Vercel tự build và deploy lại. Free 100% cho dự án cá nhân.

### Cách 2: GitHub Pages

1. Mở `vite.config.js`, đổi:
   ```js
   base: '/so-ban-hang/',  // thay bằng tên repo của bạn
   ```

2. Cài thêm package:
   ```bash
   npm install --save-dev gh-pages
   ```

3. Mở `package.json`, thêm vào `scripts`:
   ```json
   "predeploy": "npm run build",
   "deploy": "gh-pages -d dist"
   ```

4. Deploy:
   ```bash
   npm run deploy
   ```

5. Vào GitHub repo → **Settings → Pages** → chọn nguồn là branch `gh-pages`. App sẽ ở `https://TEN_USERNAME.github.io/so-ban-hang/`

### Cách 3: Netlify
Tương tự Vercel: vào [netlify.com](https://netlify.com), connect GitHub, chọn repo, deploy.

---

## 💾 Dữ liệu lưu ở đâu?

App lưu data trong **localStorage** của trình duyệt — không cần server, không cần đăng ký. Hạn chế:
- Data chỉ có trên thiết bị + trình duyệt đó
- Nếu xoá lịch sử trình duyệt → mất data
- Dung lượng tối đa ~5MB (đủ cho vài nghìn đơn hàng)

> **Khuyên:** Định kỳ vào **Báo cáo → Xuất báo cáo → Excel** để backup.

Nếu cần dùng chung cho 2-10 người, có thể nâng cấp lên **Supabase** hoặc **Firebase** sau (chi phí ~0đ cho quy mô nhỏ).

---

## 🛠 Tuỳ biến

### Đổi tên app, màu sắc, logo
- Tên trang: sửa trong `index.html` (`<title>`)
- Tên trên sidebar: sửa trong `src/App.jsx`, tìm `Sổ bán hàng`
- Bảng màu: sửa object `COLORS` ở đầu file `App.jsx`

### Đặt tên cá nhân, tên shop
Vào app → bấm icon **Cài đặt** (góc phải dưới sidebar) → tab **Cửa hàng**.

### Bật gửi Zalo / SMS qua API
Vào **Cài đặt → Zalo API** hoặc **SMS API**. Cần backend proxy — xem hướng dẫn trong modal.

---

## 📥 Import data cũ

1. Vào tab **Khách hàng** → bấm **Import**
2. Mở Excel/Google Sheets, copy bảng (kèm dòng tiêu đề) → Ctrl+C
3. Paste vào ô textarea → bấm **Phân tích**
4. App tự khớp cột, xem preview, bấm Import

Tương tự cho **Sản phẩm** (vào tab Báo cáo).

---

## 🐛 Gặp lỗi?

### `npm install` lỗi
```bash
# Xoá cache và thử lại
rm -rf node_modules package-lock.json
npm install
```

### App không chạy được trên Vercel
- Kiểm tra `vite.config.js` có `base: '/'` (không có path)
- Kiểm tra log build trên Vercel dashboard

### Trên GitHub Pages bị trang trắng
- Kiểm tra `base` trong `vite.config.js` đúng tên repo
- Đảm bảo đã `npm run deploy` lại sau khi sửa config

---

## 📄 License

MIT — dùng tự do cho mục đích cá nhân và thương mại.

---

*Made with 🌿 by Claude*

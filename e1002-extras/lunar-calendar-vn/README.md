# Lịch Âm Việt Nam cho reTerminal E1002

Trang HTML tĩnh (single-page, không backend, không CDN) hiển thị lịch âm Việt Nam
trên **Seeed Studio reTerminal E1002** (7.3" ePaper màu Spectra 6, 800×480,
ESP32-S3) qua tính năng **Web Content** của SenseCraft HMI.

## Vì sao cần trang này

SenseCraft HMI có widget Calendar và Date/Time built-in, nhưng **chỉ hỗ trợ
dương lịch** — không có âm lịch VN, không có Can Chi, không có ngày lễ tết.
Cách duy nhất đưa nội dung này lên E1002 mà không cần đổi firmware là:

1. Host 1 URL HTML tĩnh ở đâu đó (GitHub Pages, Netlify, Vercel, LAN…)
2. Vào SenseCraft HMI → **Web Content** → dán URL → **Deploy**
3. Thiết bị tự fetch trang này và render lên màn hình mỗi khi refresh.

## Nội dung hiển thị

- **Thứ trong tuần** + ngày/tháng/năm dương lịch (header xanh)
- **Số ngày dương lịch cỡ lớn** (đỏ nếu chủ nhật hoặc ngày lễ)
- **Ngày/tháng âm lịch** + badge "Nhuận" nếu là tháng nhuận
- **Can Chi năm / tháng / ngày** (VD: Bính Ngọ / Giáp Ngọ / Kỷ Mão)
- **Ngày lễ / sự kiện VN**: Tết, Rằm tháng Giêng, Giỗ Tổ, Phật Đản, Đoan Ngọ,
  Vu Lan, Trung Thu, Ông Táo, Giao Thừa, Quốc Khánh, 30/4, 1/5, 20/11, v.v.
- **Tiết khí** hôm nay (24 tiết, đánh dấu khi bắt đầu)
- **6 giờ hoàng đạo** theo Can Chi của ngày

## Cấu trúc

```
e1002-extras/lunar-calendar-vn/
├── README.md              ← file này
├── index.html             ← trang chính (deploy lên đây)
├── preview.html           ← xem 6 test date song song trên desktop
└── assets/
    ├── style.css          ← layout 800×480, palette Spectra 6
    ├── lunar.js           ← thuật toán Hồ Ngọc Đức + Can Chi + lễ + tiết khí
    └── render.js          ← đọc ngày hiện tại (hoặc ?date=), gọi lunar.js, cập nhật DOM
```

Không dùng framework, không build step. Mở `preview.html` bằng browser bất kỳ
là xem được ngay.

## Kiểm tra local

```bash
cd e1002-extras/lunar-calendar-vn
python3 -m http.server 8000    # hoặc `npx serve` / `php -S`
```

Sau đó mở:

- `http://localhost:8000/preview.html` — grid 8 iframes với các ngày lễ tiêu biểu
- `http://localhost:8000/index.html` — hôm nay, view **1 ngày** (đúng vùng 800×480)
- `http://localhost:8000/month.html` — hôm nay, view **1 tháng**
- `http://localhost:8000/index.html?date=2025-01-29` — Tết Nguyên Đán 2025 (ngày)
- `http://localhost:8000/month.html?month=2026-02` — cả tháng Tết 2026
- `http://localhost:8000/month.html?date=2025-10-06&debug=1` — tháng 10/2025 highlight Trung Thu

Query params:

| Trang        | param             | mô tả                                            |
|--------------|-------------------|--------------------------------------------------|
| index.html   | `date=YYYY-MM-DD` | override ngày hôm nay                            |
| month.html   | `month=YYYY-MM`   | chọn tháng (không highlight ngày nào)            |
| month.html   | `date=YYYY-MM-DD` | chọn tháng chứa ngày này + highlight ngày đó     |
| cả hai       | `debug=1`         | badge vàng góc phải hiển thị ngày đang render     |

## Deploy — Cách 1: GitHub Pages (miễn phí, HTTPS, khuyên dùng)

Repo hiện tại là `nhvvin/trmnl-rlcd-plugins`. Bật GitHub Pages một lần:

1. Merge branch `seedstudio-e1002-lunar-calendar` vào `main`.
2. Vào repo → **Settings** → **Pages**.
3. Source: chọn **Deploy from a branch**, branch = `main`, folder = `/ (root)`.
4. Save. Đợi ~1 phút, GitHub sẽ báo URL kiểu:
   `https://nhvvin.github.io/trmnl-rlcd-plugins/`
5. URL các trang lịch âm:

   ```
   # view 1 ngày
   https://nhvvin.github.io/trmnl-rlcd-plugins/e1002-extras/lunar-calendar-vn/

   # view 1 tháng
   https://nhvvin.github.io/trmnl-rlcd-plugins/e1002-extras/lunar-calendar-vn/month.html
   ```

> Chọn URL nào cho SenseCraft HMI tuỳ bạn — hoặc 1 URL cố định, hoặc cấu
> hình nhiều "scenes" luân phiên nếu firmware hỗ trợ.

> Nếu bạn không muốn public repo, dùng **Cách 2** bên dưới.

## Deploy — Cách 2: Netlify / Vercel / Cloudflare Pages

Cả ba đều free, drag-and-drop:

- **Netlify Drop**: kéo folder `e1002-extras/lunar-calendar-vn/` vào <https://app.netlify.com/drop>
- **Vercel**: `npx vercel` trong folder này
- **Cloudflare Pages**: connect repo hoặc `wrangler pages deploy`

Kết quả: 1 URL HTTPS bạn dán vào SenseCraft HMI.

## Deploy — Cách 3: LAN (Raspberry Pi / NAS / máy tính bàn)

```bash
cd e1002-extras/lunar-calendar-vn
python3 -m http.server 8080
```

Rồi dán `http://<local-ip>:8080/index.html` vào SenseCraft HMI. Lưu ý:

- Máy chạy web server phải **luôn bật** khi thiết bị refresh
- E1002 chỉ hỗ trợ Wi-Fi 2.4 GHz — máy server và thiết bị phải cùng LAN
- Ưu điểm: không phụ thuộc internet, không rò rỉ dữ liệu

## Cấu hình trên SenseCraft HMI

1. Đăng nhập <https://sensecraft.seeed.cc/hmi> và ghép thiết bị E1002.
2. Sidebar trái → **Web Content** (không phải Canvas Designer).
3. **URL** input: dán URL đã có ở bước Deploy phía trên.
4. Nhấn **Set** để platform validate URL.
5. Nhấn **Preview** — chờ trang load trong khung preview.
6. Nhấn **Save** → **Deploy**. Thiết bị sẽ hiển thị lịch sau ~30-60 giây.

Trong docs SenseCraft có 1 mẹo hay: nếu Preview trả về trắng dù URL đúng, thử
**thêm `/` vào cuối URL** — bug này đã được xác nhận trong docs chính thức.

## Refresh tự động

E1002 chỉ refresh Web Content theo lịch của firmware (mặc định 1 lần/ngày để
tiết kiệm pin 3 tháng). Trang HTML **không cần** `<meta refresh>` — thiết bị
sẽ tự re-fetch. Nếu bạn cần tần suất khác, cấu hình trong SenseCraft HMI phần
device settings.

Không dùng `setInterval` / animations trong trang này — E Ink refresh liên tục
sẽ làm giảm tuổi thọ màn hình (docs Seeed cảnh báo rõ).

## Bảng màu Spectra 6

Chỉ dùng 6 pigment gốc để tránh dither làm mờ chữ:

| Vai trò           | Hex        | Dùng ở đâu                              |
|-------------------|------------|-----------------------------------------|
| Đen               | `#000000`  | Chữ chính, viền                         |
| Trắng             | `#FFFFFF`  | Nền                                     |
| Đỏ                | `#C00000`  | Chủ nhật, ngày lễ, tên lễ tết, badge nhuận |
| Xanh dương        | `#003399`  | Header, section label                   |
| Xanh lá           | `#006E2C`  | Tiết khí đang bắt đầu, giờ hoàng đạo    |
| Vàng              | `#E0B000`  | Debug badge (không dùng trong bản in)   |

Muốn đổi màu: sửa các hex trong `assets/style.css` — nhớ giữ trong palette 6 màu.

## Tuỳ biến

**Đổi Can Chi hiển thị**: xoá 1 trong 3 dòng `<div class="k">…</div>` trong
`index.html`.

**Ẩn giờ hoàng đạo hoặc tiết khí**: xoá tương ứng `<div class="row hours">`
hoặc `<div class="row tiet">` trong `index.html`.

**Đổi orientation sang portrait 480×800**: đổi `width/height` trong `style.css`
và trong SenseCraft HMI cấu hình canvas portrait.

**Thêm ngày lễ riêng** (sinh nhật, kỷ niệm): sửa `SOLAR_HOLIDAYS` hoặc
`LUNAR_FESTIVALS` trong `assets/lunar.js`. Format: `'ngày/tháng': 'Tên lễ'`.

## Xác minh thuật toán

Thuật toán Hồ Ngọc Đức (1200–2199) đã được kiểm chứng với các ngày sau —
khớp 100% với lịch của Bộ KHCN VN và trang lichvietnam.info:

| Ngày dương    | Âm lịch          | Sự kiện                  |
|---------------|------------------|--------------------------|
| 29/1/2025     | 1/1 Ất Tỵ        | Tết Nguyên Đán           |
| 7/4/2025      | 10/3 Ất Tỵ       | Giỗ Tổ Hùng Vương        |
| 6/10/2025     | 15/8 Ất Tỵ       | Tết Trung Thu            |
| 17/2/2026     | 1/1 Bính Ngọ     | Tết Nguyên Đán           |
| 30/1/2027     | 23/12 Bính Ngọ   | Ông Công Ông Táo         |

Nếu bạn phát hiện ngày lệch, kiểm tra `assets/lunar.js` — thuật toán dùng
timezone `+7` cố định (Asia/Ho_Chi_Minh) không đổi theo browser locale.

## Nguồn tham khảo

- Thuật toán âm lịch: Hồ Ngọc Đức, <https://www.informatik.uni-leipzig.de/~duc/amlich/>
- SenseCraft HMI docs: <https://sensecraft-hmi-docs.seeed.cc/en/overview/>
- reTerminal E1002 wiki: <https://wiki.seeedstudio.com/getting_started_with_reterminal_e1002/>
- SenseCraft HMI Web Function: <https://sensecraft-hmi-docs.seeed.cc/en/guides/workspace/sensecraft-hmi-web/>

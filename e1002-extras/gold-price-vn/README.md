# Giá vàng — reTerminal E1002

Widget hiển thị giá vàng Việt Nam theo ngày, thiết kế riêng cho reTerminal
E1002 (7.3" Spectra 6 ePaper, 800×480, không có mạng nội bộ ổn định →
mọi thứ đều là HTML tĩnh).

**Live**: <https://nhvvin.github.io/trmnl-rlcd-plugins/e1002-extras/gold-price-vn/>

## Nội dung hiển thị

- **SJC 1L** — vàng miếng SJC loại 1 lượng (miếng chuẩn)
- **Nữ Trang 9999** — vàng nữ trang 4 số 9
- **Nhẫn 9999** — nhẫn tròn trơn 4 số 9 (Hưng Thịnh Vượng)

Mỗi loại: giá **Mua**, giá **Bán**, và **% thay đổi giá bán so với hôm qua**.

Card có %Δ tuyệt đối lớn nhất (≥ 0.5%) được đánh dấu bằng **vạch vàng bên trái**.

## Kiến trúc

```
Trình duyệt E1002                       GitHub Actions (2×/ngày)
────────────────                        ─────────────────────────
    fetch                                    fetch
     │                                        │
     ▼                                        ▼
 data/gold.json  ◀────── commit ───────  DOJI XML feed
     │                                   (public, no auth)
     ▼
 render.js → 3 cards + delta
```

Không có backend riêng, không CORS proxy. Toàn bộ vòng cập nhật chạy
trong GitHub Actions rồi commit thẳng vào repo → GitHub Pages phục vụ
file JSON tĩnh.

## Cấu trúc thư mục

```
e1002-extras/gold-price-vn/
├── README.md                (file này)
├── index.html               (trang chính, 800×480)
├── preview.html             (xem 4 kịch bản side-by-side)
├── assets/
│   ├── style.css            (Spectra 6 palette)
│   └── render.js            (đọc JSON, tính %Δ, render cards)
└── data/
    ├── gold.json            (dữ liệu live — bot commit)
    ├── gold-first-run.json  (fixture: yesterday=null)
    └── gold-big-moves.json  (fixture: ±14% delta)
```

Workflow ở `../../.github/workflows/update-gold-price.yml`
gọi `../../scripts/fetch-gold-price.mjs` (Node 20, không có dependency).

## Query params

| Param              | Mặc định           | Mô tả                                 |
| ------------------ | ------------------ | ------------------------------------- |
| `?data=<path>`     | `data/gold.json`   | Ghi đè nguồn dữ liệu (dùng khi test)  |

## Nguồn dữ liệu

- **DOJI XML feed**: `https://update.giavang.doji.vn/banggia/doji_92409/92409`
- Vùng: **CHI NHÁNH HỒ CHÍ MINH · Miền Nam** — feed này liệt kê cả giá
  SJC nên đủ cho các loại vàng chuẩn quốc gia.
- Nếu muốn đổi sang chi nhánh Đà Nẵng, đổi endpoint sang
  `doji_92411/92411` — WATCHED patterns đã match cả hai định dạng row-name.
- Đơn vị lưu trong JSON: **VND / chỉ** (integer). Trong `fetch-gold-price.mjs`
  chúng ta nhân giá gốc (thousand VND per chỉ) với 1000.

Nếu DOJI đổi schema, chỉnh `WATCHED` và regex trong
`scripts/fetch-gold-price.mjs`.

## Rotation

`update-gold-price.yml` chạy 2 lần/ngày (09:00 và 15:00 giờ VN):

1. Fetch DOJI XML.
2. Parse `<Row>` matching `WATCHED`.
3. Nếu `fetched.date === existing.today.date`: cập nhật (mid-day refresh).
4. Nếu `fetched.date > existing.today.date`: rotate `today → yesterday`.
5. Commit `data/gold.json` (chỉ khi có thay đổi thực sự).

Có thể trigger tay: **Actions → Update gold price → Run workflow**.

## Dev

```bash
# Bootstrap JSON từ nguồn thật (dùng local Node 20+).
node scripts/fetch-gold-price.mjs

# Chạy dev server.
cd e1002-extras/gold-price-vn && python3 -m http.server 8766
```

- `http://localhost:8766/`               → trang chính (live JSON)
- `http://localhost:8766/preview.html`   → 4 kịch bản (default, first-run, biến động lớn, live)
- `http://localhost:8766/?data=data/gold-big-moves.json` → override

## Deploy lên SenseCraft

Copy đúng URL này vào SenseCraft HMI → Web Content:

```
https://nhvvin.github.io/trmnl-rlcd-plugins/e1002-extras/gold-price-vn/
```

# TRMNL Vàng DOJI Việt Nam — giavang.doji.vn (RLCD 1-bit friendly)

Giá vàng miếng SJC / nhẫn 9999 / nữ trang / nguyên liệu lấy trực
tiếp từ endpoint XML công khai của DOJI (không cần API key, không qua
Cloudflare). Hiển thị trên Waveshare ESP32-S3-RLCD-4.2 400×300 1-bit.

## Layout (400×300)

```
┌───────────────────────────────────────┐
│ GIÁ VÀNG DOJI     17:16 05/07/2026 │  ← IGPList DateTime
├───────────────────────────────────────┤
│ LOẠI              MUA         BÁN │
│ SJC 1L · HCM LẸ    14,840   15,140 │
│ SJC 1L · HCM BUÔN  14,840   15,140 │
│ NHẪN 9999 · HTV    14,840   15,140 │
│ VÀNG 24K          14,100   14,600 │
│ NGUYÊN LIỆU 18K   10,095       —   │
│ NGUYÊN LIỆU 14K    7,656       —   │
├───────────────────────────────────────┤
│ Đơn vị: 1000₫/chỉ      GIAVANG.DOJI.VN │
└───────────────────────────────────────┘
```

## Tại sao đổi từ SJC → DOJI

**SJC (`sjc.com.vn`) ở sau Cloudflare bot management.** Từ VPS Vultr
(`45.76.179.84`), Cloudflare trả về HTTP 403 với header `cf-mitigated:
challenge` và body là trang challenge HTML (`<title>Just a moment...</title>`)
cho mọi request, kể cả đã set `User-Agent: Mozilla/5.0`. Cloudflare
decision dựa vào **IP reputation** + JA3 TLS fingerprint của Terminus's
Faraday HTTP client, không chỉ UA. Từ IP nhà (residential ISP) thì
`Mozilla/5.0` được chấp nhận — không thể fake từ VPS.

**DOJI (`giavang.doji.vn`)** — endpoint cũ, không CF, chấp nhận mọi UA
không phải bot signature. XML public, HTTP 200 từ VPS.

## Source

- **Endpoint**: `https://giavang.doji.vn/api/prices`
- **Method**: GET
- **Headers**: `User-Agent: Mozilla/5.0` (để chắc không bị 403 ở bất kỳ
layer nào)
- **Response**: `text/xml` — Terminus lưu vào `source_1.body` dạng string
- **Interval**: 30 phút

Structure:

```xml
<GoldList>
  <DGPlist>
    <DateTime>07:00 01/01/1970</DateTime>      <!-- ⚠ thường stale -->
    <Row Name='DOJI HN lẻ' Sell='151,400' Buy='148,400' />   (nghìn/lượng)
    <Row Name='DOJI HCM lẻ' Sell='15,140' Buy='14,840' />   (nghìn/chỉ)
    <Row Name='DOJI HCM buôn' Sell='15,140' Buy='14,840' />
    ...
  </DGPlist>
  <IGPList>
    <DateTime>17:16 05/07/2026</DateTime>       <!-- ✅ timestamp fresh -->
    <Row Name='USD/VND' Sell='22,611' Buy='22,517' />
  </IGPList>
  <JewelryList>
    <Row Name='Vàng 24k (nghìn/chỉ)' Sell='14,600' Buy='14,100' />
    <Row Name='Giá Nguyên Liệu 18K' Sell='-' Buy='10,095' />
    <Row Name='Nhẫn Tròn 9999 Hưng Thịnh Vượng' Sell='15,140' Buy='14,840' />
    ...
  </JewelryList>
</GoldList>
```

## Gotcha #12 — DOJI XML mixes units in JewelryList

DOJI dùng **hai unit khác nhau** trong cùng file XML:

- `DOJI HN lẻ`, Âu Vàng Phúc Long → **nghìn₫/lượng** (ví dụ 148,400)
- `DOJI HCM lẻ`, Nhẫn 9999, 24K, 18K → **nghìn₫/chỉ** (ví dụ 14,840)
- Tệ hơn: `DOJI HCM lẻ` xuất hiện cả trong `<DGPlist>` (chỉ: 14,840)
  VÀ `<JewelryList>` (lượng: 151,400).

**Fix trong template**: split `body` thành `dgp` (DGPlist block) và `jl`
(JewelryList block) trước, rồi mới extract row. Các row miếng lấy từ
`dgp` (đảm bảo chỉ), các row nhẫn/24K/18K/14K lấy từ `jl`.

## Gotcha #13 — Liquid không parse XML, phải string-split

Terminus parse JSON tự động vảo `source_1.<field>`. Với XML,
`source_1.body` = raw text. Phải dùng `| split` từng bước:

```liquid
{% assign _row = jl | split: "Name='Vàng 24k (nghìn/chỉ)'" | last
                    | split: "/>" | first %}
{% assign sell = _row | split: "Sell='" | last | split: "'" | first %}
{% assign buy  = _row | split: "Buy='"  | last | split: "'" | first %}
```

Để ý:

- `| last` sau `split` = đoạn text SAU dấu phân cách cuối cùng.
- `| first` = đoạn text TRƯỚC dấu phân cách đầu tiên.
- Nếu Name không tồn tại, `| last` trả về toàn bộ string ban đầu —
  KHÔNG raise. Sau đó `| split: "/>"` vẫn chạy, kết quả rubbish. Cẩn
  thận khi thay đổi số row.

## Timestamp

DOJI đặt `<DateTime>07:00 01/01/1970</DateTime>` cho `DGPlist` và
`JewelryList` (tức tự nhận là "never updated"). Chỉ `<IGPList>` có
timestamp thật (cập nhật USD/VND). Template hiển thị `IGPList
DateTime` — đủ tươi để xem lần cuối DOJI online là khi nào.

Giá vàng VN chủ yếu ăn theo SJC (SJC cập nhật được vài lần/ngày), nên
khoảng trễ 30-60 phút chấp nhận được cho một display panel.

## RLCD typography rules

Ap dụng như 4 plugin khác — body 16-17px, `Helvetica`/`Menlo`, pure
`#000`/`#fff`, `1-2px solid #000` borders, `font-weight: 700`,
`-webkit-font-smoothing: none`.

## Build

```
ruby firmware-extras/trmnl-gold-vn/build_zip.rb
```

→ `dist/gold_vn.zip` (~2.8 KB) chứa `configuration.yml` +
`template.html.liquid`.

## Upload

1. Xóa ext 14 cũ (nếu đang giữ URL SJC cũ) — `/extensions/14` → Delete.
2. `/extensions` → Import → chọn `dist/gold_vn.zip`.
3. Mở ext mới → **Kind = Poll**, **Mode = Text**, bind **Model 47**
   (Waveshare RLCD) → Save.
4. Sau ~30 phút (hoặc bấm "Rebuild") → screen render.

## Rows mở rộng

Chỉnh 6 hàng trong `liquid/full.liquid` — các biến `_r1..._r6`. Row hiển
có sẵn:

| # | XML source                                  | Field split key                                |
|---|---------------------------------------------|------------------------------------------------|
| 1 | `<DGPlist>` DOJI HCM lẻ                     | `dgp → Name='DOJI HCM lẻ'`                     |
| 2 | `<DGPlist>` DOJI HCM buôn                   | `dgp → Name='DOJI HCM buôn'`                   |
| 3 | `<JewelryList>` Nhẫn Tròn 9999 Hưng Thịnh   | `jl → Name='Nhẫn Tròn 9999 Hưng Thịnh Vượng'` |
| 4 | `<JewelryList>` Vàng 24k                    | `jl → Name='Vàng 24k (nghìn/chỉ)'`             |
| 5 | `<JewelryList>` NL 18K (buy only)           | `jl → Name='Giá Nguyên Liệu 18K'`               |
| 6 | `<JewelryList>` NL 14K (buy only)           | `jl → Name='Giá Nguyên Liệu 14K'`               |

Rồng thêm có `Giá Nguyên Liệu 16K` (8,808), `15K` (7,995), `10K` (5,556),
USD/VND (từ `<IGPList>`).

## Gotchas kế thừa

- **#5** Terminus screen enum: `screen.kind == "user_bmp"`, cần cast enum
  ở Postgres.
- **#7** Liquid so sánh số dạng chuỗi: dùng `{{ x | plus: 0.0 }}`.
- **#8** Form PUT wipes bindings — luôn resend `model_ids[]=47`.
- **#9** Xóa exchange record wipe polling.
- **#10** POST `/extensions/N/build` dedupe silently.
- **#11** Server-side POST/PUT stuck vì Sidekiq retry loop — cần
  `docker restart terminus-web-1`.
- **#12** DOJI XML mixed units (xem trên).
- **#13** Liquid + XML = string-split thủ công.
- **#14** Cloudflare IP reputation chặn Terminus từ VPS (không thể fix bằng
  UA — phải đổi nguồn).

Giá vàng SJC / nhẫn / nữ trang lấy trực tiếp từ endpoint công khai của
SJC (không cần API key). Hiển thị trên Waveshare ESP32-S3-RLCD-4.2
400×300 1-bit.

## Layout (400×300)

```
┌─────────────────────────────────────┐
│ GIÁ VÀNG SJC       13:43 04/07/2026 │  ← latestDate từ API
├─────────────────────────────────────┤
│ LOẠI                MUA         BÁN │
│ SJC 1L · HCM     148,400    151,400 │
│ SJC 1L · MB      148,400    151,400 │
│ NHẪN 99.99 · 1C  148,300    151,300 │
│ NHẪN 99.99 · 0.5C 148,300   151,400 │
│ NỮ TRANG 99.99   146,300    149,800 │
│ NỮ TRANG 75%     103,011    112,511 │
├─────────────────────────────────────┤
│ Đơn vị: 1000₫/chỉ         SJC.COM.VN │
└─────────────────────────────────────┘
```

## Source

- **Endpoint**: `https://sjc.com.vn/GoldPrice/Services/PriceService.ashx`
- **Method**: GET (no headers, no auth)
- **Interval**: 30 phút (giá SJC cập nhật vài lần/ngày, không realtime)
- **Response shape**:

  ```json
  {
    "success": true,
    "latestDate": "13:43 04/07/2026",
    "data": [
      { "Id": 1, "TypeName": "Vàng SJC 1L, 10L, 1KG",
        "BranchName": "Hồ Chí Minh",
        "Buy": "148,400", "BuyValue": 148400000.0,
        "Sell": "151,400", "SellValue": 151400000.0,
        "BuyDiffer": null, "SellDiffer": null },
      ...
    ]
  }
  ```

23 records tổng cộng (12 loại × chi nhánh). Template lọc 6 dòng cần
thiết theo cặp `(TypeName, BranchName)`.

## Rows hiển thị

| # | TypeName (SJC)                            | Branch      | Ý nghĩa                      |
|---|-------------------------------------------|-------------|-------------------------------|
| 1 | `Vàng SJC 1L, 10L, 1KG`                   | Hồ Chí Minh | Vàng miếng flagship phía Nam  |
| 2 | `Vàng SJC 1L, 10L, 1KG`                   | Miền Bắc    | Vàng miếng flagship phía Bắc  |
| 3 | `Vàng nhẫn SJC 99,99% 1 chỉ, 2 chỉ, 5 chỉ`| Hồ Chí Minh | Nhẫn tròn trơn (mua nhiều)    |
| 4 | `Vàng nhẫn SJC 99,99% 0.5 chỉ, 0.3 chỉ`   | Hồ Chí Minh | Nhẫn nhỏ                       |
| 5 | `Nữ trang 99,99%`                         | Hồ Chí Minh | Vàng nữ trang cao cấp         |
| 6 | `Nữ trang 75%`                            | Hồ Chí Minh | Vàng 18K (75%)                |

Chỉnh 6 hàng này trong `liquid/full.liquid` (block `{% for r in
source_1.data %}`) nếu muốn ưu tiên loại vàng khác. Đơn vị hiển thị là
`1000₫/chỉ` (SJC trả về chuỗi format sẵn dấu phẩy nghìn — không cần
convert Liquid).

## RLCD typography rules

Áp dụng như 4 plugin khác:

- Body 16–17px, title 20px, header column 13px.
- `Helvetica, Arial` cho chữ; `Menlo, "Courier New"` cho số (căn cột).
- Pure `#000` / `#fff` — không grey.
- `1–2px solid #000` borders.
- `-webkit-font-smoothing: none` + `text-rendering: geometricPrecision`.
- `font-weight: 700` mọi nơi.

## Build

```
ruby firmware-extras/trmnl-gold-vn/build_zip.rb
```

→ `dist/gold_vn.zip` (~2.3 KB) chứa `configuration.yml` + `template.html.liquid`.

## Upload

Terminus UI: `/extensions/import` → chọn `dist/gold_vn.zip` → sau khi
tạo, gán vào Custom Model 47 (Waveshare RLCD) và playlist 2.

## Gotchas kế thừa (xem README plugin khác cho chi tiết)

- **#5** Terminus screen enum: `screen.kind == "user_bmp"`, cần cast enum ở Postgres.
- **#7** Liquid so sánh số dạng chuỗi: dùng `{{ x | plus: 0.0 }}` khi cần compare numeric — plugin này không dùng compare.
- **#8** Form PUT wipes bindings — luôn resend `model_ids[]=47`.
- **#9** Xoá exchange record wipe polling — polling URLs sống trong `exchange.template`.
- **#10** POST `/extensions/N/build` dedupe silently — dùng edit+save hoặc chờ cron.

## ⚠️ Cloudflare bot challenge

`sjc.com.vn` sits behind Cloudflare, which blocks HTTP clients with default
`curl/*` or missing User-Agent (returns `403 cf-mitigated: challenge` with
an HTML challenge page). Terminus's Faraday-based poller trips this.

**Fix**: `polling_headers` in `liquid/settings.yml` sets `User-Agent: Mozilla/5.0`
(11 chars, minimum that passes CF). `build_zip.rb` bakes these headers into
`exchanges[0].headers` in `configuration.yml`.

Empirically tested UAs that pass:

| UA (len) | Result |
| --- | --- |
| _(default curl/8.x)_ | 403 (blocked) |
| `Mozilla/5.0` (11) | 200 ✅ |
| `Mozilla/5.0 (Firefox)` (21) | 200 ✅ |
| Full Chrome/Firefox UA | 200 ✅ |

Any UA starting with `Mozilla/5.0` is accepted; Cloudflare only rejects
the raw curl/wget/bot signatures at this tier.

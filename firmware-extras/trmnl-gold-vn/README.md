# TRMNL Vàng SJC Việt Nam — sjc.com.vn (RLCD 1-bit friendly)

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

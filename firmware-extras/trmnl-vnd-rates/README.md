# VND Rates — TRMNL BYOS plugin (Vietcombank FX)

Tỷ giá ngoại tệ Vietcombank cập nhật hàng ngày, hiển thị trên 400×300 mono e-ink.

Hiển thị 3 cột rate chuẩn ngân hàng Việt Nam: **Mua tiền mặt / Mua chuyển khoản / Bán** — đúng định dạng các bảng điện tử ở chi nhánh VCB.

## Output

```
TỶ GIÁ VCB                          30/06/2026 · 1 → VND
─────────────────────────────────────────────────────────
CCY    MUA TM       MUA CK       BÁN
USD    26,076       26,106       26,466
EUR    29,214       29,509       30,766
GBP    33,906       34,248       35,358
JPY       157          158          167
CNY     3,567        3,604        3,720
KRW       16           17           19
SGD    19,792       19,992       20,681
THB       696          774          807
─────────────────────────────────────────────────────────
NGUỒN: VIETCOMBANK    TM=Tiền mặt · CK=Chuyển khoản
```

## Configurable fields

| Field | Default | Description |
|---|---|---|
| `symbols` | `USD,EUR,GBP,JPY,CNY,KRW,SGD,THB` | Comma-separated currency codes. Max 8 fit the layout. |

VCB trả 20 currency: AUD, CAD, CHF, CNY, DKK, EUR, GBP, HKD, INR, JPY, KRW, KWD, MYR, NOK, RUB, SAR, SEK, SGD, THB, USD.

## Tại sao không dùng Frankfurter?

Plugin Currency Index (folder `trmnl-currency-index`) dùng Frankfurter (ECB) — chỉ track 30 currency của ECB, **không có VND**. Khi đặt `base_currency=VND` sẽ trả lỗi `422 Unprocessable Entity`.

VCB API là Vietnam-native:

- Free, no API key, no rate limit observed
- JSON format ổn định nhiều năm nay
- Rate official ngân hàng — đúng số dùng để mua/bán thực tế
- Có cả 3 rate (cash/transfer/sell) — `open.er-api.com` chỉ có midmarket

## Build & install

```bash
ruby build_zip.rb                              # build only
ruby build_zip.rb upload 45.76.179.84:2300     # build + upload
```

Sau khi import:

1. Bind extension vào `extension_model` (không bind device — xem gotcha #4 trong `trmnl-currency-index/README.md`)
2. Add screen vào playlist
3. Sidekiq cron tự register, refresh 30 phút/lần

## Endpoint chi tiết

```
GET https://www.vietcombank.com.vn/api/exchangerates?date=YYYY-MM-DD
```

Trả về:

```json
{
  "Count": 20,
  "Date": "2026-06-30T00:00:00",
  "UpdatedDate": "2026-06-30T08:30:00",
  "Data": [
    {"currencyCode": "USD", "currencyName": "US DOLLAR", "cash": 26076.00, "transfer": 26106.00, "sell": 26466.00},
    ...
  ]
}
```

Field `cash = 0` cho một số currency (như EUR ở vài chi nhánh không nhận tiền mặt) — template hiển thị `—`.

## Gotchas

Same 4 gotchas as Currency Index (xem `trmnl-currency-index/README.md`):

1. Pure HTML/CSS — no JavaScript
2. `mode: text` (1-bit BMP)
3. Strict semver `1.0.0`
4. NO `extension_device` row → bind via `extension_model` only

Plus VCB-specific:

1. **Weekend = stale data.** VCB không update rate cuối tuần. Cron 30 phút vẫn poll nhưng kết quả không đổi. OK chấp nhận được.
2. **`Date` field là ISO string** (`"2026-06-30T00:00:00"`) — template dùng `| date: "%d/%m/%Y"` chuyển sang format VN.

## Files

```
liquid/
├── full.liquid       # pure HTML/CSS table
└── settings.yml      # TRMNL store format (kind=poll, mode=text)
build_zip.rb          # TRMNL → Terminus bundle
dist/                 # build output (gitignored)
```

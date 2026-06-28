# VN Stock Dashboard — TRMNL Private Plugin

E-ink dashboard hiển thị **VN-Index + 8 cổ phiếu blue chip + VN30** trên màn 400×300 mono (Waveshare ESP32-S3-RLCD-4.2). Data từ **SSI iBoard API** — free, không cần đăng ký, không API key.

![preview](preview/full.png)

---

## Datasource

**SSI iBoard chart history** (`iboard-api.ssi.com.vn`) — endpoint TradingView UDF format, trả về OHLCV array cho 1 ticker / 1 timeframe:

```
GET https://iboard-api.ssi.com.vn/statistics/charts/history
    ?resolution=1D
    &symbol={TICKER}
    &from={UNIX_TS_30_DAYS_AGO}
    &to={UNIX_TS_NOW}
```

Response (verified live):

```json
{
  "code": "SUCCESS",
  "data": {
    "t": [1780012800, 1780272000, ...],
    "o": [57.13, 57.32, ...],
    "h": [57.42, 57.42, ...],
    "l": [57.03, 56.94, ...],
    "c": [57.32, 57.23, ...],
    "v": [1960700, 2259500, ...],
    "s": "ok"
  }
}
```

Trả về tối đa ~21 daily bars trong window 30 ngày.

**Symbols hỗ trợ** (đã verify):

- ✅ Indexes: `VNINDEX`, `VN30`
- ✅ Blue chips HoSE: `VNM`, `FPT`, `MSN`, `VIC`, `VHM`, `HPG`, `VCB`, `MWG`, `TCB`, `BID`, `CTG`, `GAS`, `PLX`, `SAB`, `STB`, `SSI`, ...
- ✅ HNX/UPCOM tickers theo mã (vd `PVS`, `SHS`)
- ❌ `HNX-INDEX`, `UPCOM-INDEX` (chưa tìm được symbol đúng)

---

## Plugin layout (10 sources)

| Source | Symbol | Hiển thị |
|---|---|---|
| `source_1` | VNINDEX | Header hero — last + change + % |
| `source_2..source_9` | 8 user-pickable tickers | Bảng 8 dòng: code · last · ▲▼ · %chg · vol |
| `source_10` | VN30 | Footer mini: VN30 + % chg |

Default 8 tickers: **VNM, FPT, MSN, VIC, VHM, HPG, VCB, MWG**.

---

## Install vào Terminus

### Option A: Import manual (recommended cho self-hosted)

1. **Tạo Extension** trong Terminus:
   - Extensions → **New**
   - Name: `vn_stock_dashboard`
   - Label: `VN Stock Dashboard`
   - Kind: `Poll`
   - Mode: `text`
   - Interval: `30`, Unit: `minute` (refresh mỗi 30 phút)
   - Start at: hôm nay
   - Model: chọn **`waveshare_esp32_s3_rlcd_4_2`** (KHÔNG phải `og_plus`)
   - Save

2. **Paste Template** (từ `liquid/full.liquid`) vào field Template → Save.

3. **Tạo 1 Exchange duy nhất** chứa cả 10 URLs:
   - Mở extension → Exchanges → **New**
   - Verb: `GET`
   - Headers: (trống)
   - Body: (trống)
   - Template (URLs):

     ```
     https://iboard-api.ssi.com.vn/statistics/charts/history?resolution=1D&symbol=VNINDEX&from={{ "now" | date: "%s" | minus: 2592000 }}&to={{ "now" | date: "%s" }}
     https://iboard-api.ssi.com.vn/statistics/charts/history?resolution=1D&symbol=VNM&from={{ "now" | date: "%s" | minus: 2592000 }}&to={{ "now" | date: "%s" }}
     https://iboard-api.ssi.com.vn/statistics/charts/history?resolution=1D&symbol=FPT&from={{ "now" | date: "%s" | minus: 2592000 }}&to={{ "now" | date: "%s" }}
     https://iboard-api.ssi.com.vn/statistics/charts/history?resolution=1D&symbol=MSN&from={{ "now" | date: "%s" | minus: 2592000 }}&to={{ "now" | date: "%s" }}
     https://iboard-api.ssi.com.vn/statistics/charts/history?resolution=1D&symbol=VIC&from={{ "now" | date: "%s" | minus: 2592000 }}&to={{ "now" | date: "%s" }}
     https://iboard-api.ssi.com.vn/statistics/charts/history?resolution=1D&symbol=VHM&from={{ "now" | date: "%s" | minus: 2592000 }}&to={{ "now" | date: "%s" }}
     https://iboard-api.ssi.com.vn/statistics/charts/history?resolution=1D&symbol=HPG&from={{ "now" | date: "%s" | minus: 2592000 }}&to={{ "now" | date: "%s" }}
     https://iboard-api.ssi.com.vn/statistics/charts/history?resolution=1D&symbol=VCB&from={{ "now" | date: "%s" | minus: 2592000 }}&to={{ "now" | date: "%s" }}
     https://iboard-api.ssi.com.vn/statistics/charts/history?resolution=1D&symbol=MWG&from={{ "now" | date: "%s" | minus: 2592000 }}&to={{ "now" | date: "%s" }}
     https://iboard-api.ssi.com.vn/statistics/charts/history?resolution=1D&symbol=VN30&from={{ "now" | date: "%s" | minus: 2592000 }}&to={{ "now" | date: "%s" }}
     ```

     > Terminus's URIBuilder split URLs theo whitespace → mỗi URL thành `source_1..source_10`.
   - Save → tab Data verify cả 10 sources có data, tab Errors trống.

4. **Add to Playlist**:
   - Playlists → Default → + Item → Screen = `VN Stock Dashboard` screen → Position phù hợp.
   - Devices → assign Playlist.

5. **Refresh device** (wake / reset).

### Option B: Import từ TRMNL.com plugin store

(Chưa publish lên store, chỉ option A.)

---

## Customize tickers

Mặc định plugin show VNM/FPT/MSN/VIC/VHM/HPG/VCB/MWG. Đổi sang ticker khác (vd thêm SSI, TCB, BID...):

### Cách 1: Edit Exchange URL list (đơn giản)

Mở Extension → Exchange → Template → thay 8 ticker bên trong URL list (giữ nguyên thứ tự VNINDEX + 8 ticker + VN30).

Đồng thời edit **Liquid template** (field Template của Extension) → thay 8 default trong block `{% case %}`:

```liquid
{%- when 2 -%}{%- assign label = trmnl.plugin_settings.custom_fields_values.t1 | default: "VNM" -%}
                                                                                              ^^^
                                                                                              đổi đây
```

### Cách 2: Dùng Custom Fields t1..t8 (nếu Terminus của bạn hỗ trợ)

Hiện Terminus's UI có thể hoặc không có Custom Fields editor cho extension tự tạo. Nếu CÓ:

1. Mở extension → tab Fields → fill 8 ô `t1..t8` với mã ticker.
2. Save → URL template auto-render với mã mới (nhờ Liquid `{{ ... | default: 'VNM' }}` fallback).

Nếu KHÔNG → dùng Cách 1.

---

## Refresh schedule

Plugin set `interval=30, unit=minute` — refresh **mỗi 30 phút**.

Lý do: VN market giao dịch 9:00–11:30 + 13:00–15:00 ICT (Mon–Fri). Refresh 30 phút đủ "fresh" cho dashboard mà không vắt kiệt SSI server.

Để tiết kiệm pin board hơn, tăng lên 60 phút trong giờ giao dịch. Ngoài giờ giao dịch / cuối tuần data không đổi → board sẽ render image y hệt → board sẽ skip download nhờ checksum match.

> ⚠️ Verify Sidekiq worker đang chạy trên VPS, không thì cron không fire:
>
> ```bash
> docker compose ps     # phải thấy 'worker' Up
> ```

---

## Troubleshoot

| Triệu chứng | Nguyên nhân & Fix |
|---|---|
| Bảng trống hết 8 ticker | Exchange chưa fetch. Kiểm tra tab Errors. |
| 1-2 dòng trống "no data" | Ticker đó không tồn tại hoặc bị typo. Verify bằng curl manual. |
| Time hiện sai timezone | Template hardcode UTC+7 (`plus: 25200`). Đổi số này nếu múi giờ khác. |
| Image cũ không refresh | Sidekiq worker chưa chạy. `docker compose up -d worker`. |
| Cropped trên board | Browser của Terminus có thể render với default font khác. Verify `<style>` block đã apply. |
| 503/504 từ SSI | SSI server overload (hiếm). Plugin sẽ retry ở refresh tiếp theo. |

---

---

## 📤 Upload lên Terminus

Terminus (self-hosted BYOS Hanami) hỗ trợ **2 cơ chế import**, khác nhau:

| Cơ chế | Đầu vào | URL endpoint | Use case |
|---|---|---|---|
| **Remote** | Plugin ID trên usetrmnl.com | tự fetch `https://usetrmnl.com/api/plugin_settings/{ID}/archive` | Plugin đã publish lên store |
| **Local** | ZIP file upload | `POST /extensions/import` (multipart) | **Plugin tự build** ← bạn dùng cái này |

ZIP đã build sẵn ở `dist/vn-stock-dashboard.zip`, chứa 2 files:

```
configuration.yml       ← Terminus native schema (KHÔNG phải settings.yml format TRMNL.com)
template.html.liquid    ← Liquid template (rename từ full.liquid)
```

### Way 1 — Web UI (đơn giản nhất)

1. Mở Terminus: `http://45.76.179.84:2300/extensions`
2. Click **Upload** button (góc phải)
3. Popover "Extension Import" mở → chọn file `dist/vn-stock-dashboard.zip`
4. Submit → Terminus tự tạo:
   - 1 Extension record (`vn_stock_dashboard`)
   - 1 Exchange record (10 URLs)
   - Cron job đăng ký vào Sidekiq (`*/30 * * * *`)
5. Extension xuất hiện trong list → click vào → tab **Models** → chọn `waveshare_esp32_s3_rlcd_4_2`
6. Playlists → Default → + Item → chọn screen `extension-vn_stock_dashboard` → Save
7. Wake board

### Way 2 — curl (automate)

```bash
curl -sS -i \
  -F extension_attachment=@firmware-extras/trmnl-vn-stock/dist/vn-stock-dashboard.zip \
  http://45.76.179.84:2300/extensions/import
```

Response 302 redirect = OK. Sau đó vẫn vào UI để assign Model + Playlist (bước 5-6 ở trên).

### Way 3 — Rebuild ZIP (khi đổi template / ticker / interval)

```bash
# Cài rubyzip nếu chưa có:
gem install --user-install rubyzip -v 2.4.1

# Rebuild từ settings.yml + full.liquid:
ruby -I"$(gem env gemdir)/gems/rubyzip-2.4.1/lib" \
     firmware-extras/trmnl-vn-stock/build_zip.rb

# Hoặc build + upload trong 1 lệnh:
ruby -I"..."  firmware-extras/trmnl-vn-stock/build_zip.rb upload 45.76.179.84:2300
```

---

## 🔄 Cập nhật plugin sau khi upload

Sau import lần đầu, Terminus đã có record trong DB. Nếu sửa template / URL list:

- **Cách lazy**: Vào UI extension → Edit Template + Edit Exchange → Save (không cần re-upload ZIP)
- **Cách clean**: Xoá extension cũ qua UI → re-upload ZIP mới

Edit qua UI nhanh hơn cho thử nghiệm.

---

## ⚠️ Gotchas khi import vào Terminus (đã verify với Terminus 0.63)

Đây là các bug khám phá ra qua thực tế live debugging trên VPS:

### 1. `version` PHẢI là strict semver

Terminus `lib/terminus/types.rb` quy định:

```ruby
Version = String.constrained(format: /\A\d+\.\d+\.\d+\Z/)
```

→ Chỉ chấp nhận `1.0.0`, `0.63.0`. KHÔNG chấp nhận `latest`, `v1.0.0`, `1.0`. `build_zip.rb` mặc định `1.0.0`.

### 2. `mode` chỉ có 2 giá trị hợp lệ: `text` hoặc `dither`

**KHÔNG có `html`**. Ý nghĩa thực tế:

- `text` → **1-bit BMP** (cho monochrome e-ink)
- `dither` → **24-bit BMP với dithering** (cho color displays)

Waveshare ESP32-S3-RLCD-4.2 (ST7305) là **monochrome 1-bit** → **PHẢI dùng `mode: text`**.
Dùng `dither` → BMP 24-bit (~360KB) → firmware reject.

### 3. KHÔNG assign device trực tiếp vào Extension

Logic `Jobs::Batches::Extension`:

```ruby
extension.devices.any? ? enqueue_devices(extension) : enqueue_models(extension)
```

- Có device → tạo Screen với `device_id=X`
- Chỉ model → tạo Screen với `device_id=NULL`

Constraint DB: `UNIQUE (device_id, kind) WHERE device_id IS NOT NULL`. Mỗi device chỉ 1 screen với `kind='general'` (mặc định). Nếu 2 extension cùng assign device 1 → unique violation, retry forever.

**Đúng pattern**: chỉ check **model** ở extension, dùng **Playlist** để bind screen→device. Multi extension/device.

### 4. CSRF token phải gửi qua header `X-Csrf-Token` cho mutation requests

Khi PUT/DELETE qua curl/script, gửi body `_csrf_token` KHÔNG đủ — Terminus reject với 500. Phải kèm:

```
-H "X-Csrf-Token: <token>"
```

### 5. Workflow đúng sau import

1. Import ZIP qua UI `/extensions` → Upload button (hoặc curl `POST /extensions/import`)
2. Vào extension `vn_stock_dashboard` → tab **Models**: check **Waveshare ESP32-S3-RLCD-4.2** (id=47), bỏ default `og_plus`
3. **Devices**: để TRỐNG (không check device nào) **NGAY LẦN ĐẦU** — xem gotcha 6
4. Save
5. Click button **Build** → trigger render → Screen sẽ tạo (verify ở `/screens`)
6. Vào **Playlists** → playlist của device (vd `Device 1`) → **Items** → **+ New** → chọn screen `Extension VN Stock Dashboard` → Save
7. Wake board → fetch playlist → cycle qua VN Stock screen

### 6. ⚠️ NGUY HIỂM: Đã từng tick device → có stuck Sidekiq retries → file BMP bị xoá định kỳ

Khi extension đã từng tick `device_ids=[1]` rồi gỡ ra:

- Mỗi 30 min (interval), cron `Batches::Extension(8)` enqueue `Jobs::Extensions::Screen(8, nil, 1)` (vì lúc đó device 1 còn được attach)
- Job đó tries to UPDATE screen, set `device_id=1, kind='general'` → conflict với Weather screen 7 (đã chiếm slot)
- Job throw `UniqueConstraintError` → Sidekiq retry 25 lần (~21 ngày)
- **Critical**: Trước khi UPDATE fail, code đã chạy `record.replace(io)` → **vật lý xoá file BMP cũ trên disk**, upload file mới. Khi UPDATE fail và rollback DB, image_data trong DB unchanged (vẫn trỏ file cũ) NHƯNG file cũ đã bị xoá → device fetch 404 → `ESP_FAIL`.

**Triệu chứng**: VN Stock screen chốc OK chốc 404, device báo `No image: ESP_FAIL` xen kẽ với màn hình bình thường.

**Fix**:

- **Option A (browser)**: Đăng nhập <http://VPS:2300>, mở `/sidekiq/retries`, click button **"Delete All"** (button đỏ ở dưới). Sidekiq Web có CSRF, browser chạy được, curl không.
- **Option B (SSH)**: SSH vào VPS, find container Sidekiq, chạy 1 dòng:

  ```bash
  # Nếu Terminus deploy bằng Docker Compose:
  docker exec -i $(docker ps -qf name=redis) redis-cli DEL terminus:retry
  # Hoặc nuke toàn bộ retry queue của Sidekiq:
  docker exec -i $(docker ps -qf name=redis) redis-cli --no-raw EVAL "local k=redis.call('KEYS','*retry*'); for _,v in ipairs(k) do redis.call('DEL',v) end; return #k" 0
  ```

- **Option C (chờ)**: Không làm gì, sau ~21 ngày Sidekiq tự đẩy retry vào Dead set, không còn fire nữa. Trong lúc đó accept intermittent failure.

**Phòng tránh**: Khi import lại extension, KHÔNG BAO GIỜ tick device 1 trên Extension page. Chỉ dùng Playlist để bind.

## File layout

```
firmware-extras/trmnl-vn-stock/
├── README.md                  ← bạn đang đọc
├── liquid/
│   ├── settings.yml           ← plugin manifest (TRMNL plugin format)
│   └── full.liquid            ← display template 400×300
└── preview/
    ├── full.html              ← rendered HTML preview (live data)
    └── full.png               ← 400×300 screenshot
```

---

## License

MIT. Free to fork/remix.

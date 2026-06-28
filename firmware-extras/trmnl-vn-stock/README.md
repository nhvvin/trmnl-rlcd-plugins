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

### 6. ⚠️ NGUY HIỂM: Đã từng tick device → stuck Sidekiq retries → file BMP biến mất khỏi disk (verified & fixed 2026-06-28)

**Nguồn gốc**: Khi import extension từng tick `device_ids=[1]` rồi gỡ ra, các job đã enqueue trước đó với args `(extension_id, nil, device_id=1)` vẫn nằm trong Sidekiq `retry` sorted set. Mỗi lần retry fire (Sidekiq retry policy 25 lần ≈ 21 ngày exponential backoff), chúng tự reproduce bug.

**Cơ chế chi tiết** (đã trace source code `app/aspects/screens/mold_builder.rb` + `app/repositories/screen.rb` + `app/structs/screen.rb`):

1. Retry runs `Jobs::Extensions::Screen.perform(8, nil, 1)` — model_id=nil, device_id=1.
2. `MoldBuilder` gọi `finder.call(model_id: nil, device_id: 1)` → fallback **device 1 → model 47** → mold có `model_id=47, device_id=1`.
3. `Repository#upsert_with_image` find Screen 278 (name=`extension-vn_stock_dashboard`, model_id=47).
4. Gọi `record.replace(io)` — implementation trong `Terminus::Structs::Screen`:

   ```ruby
   def replace(io, **)
     image_destroy  # ← physical delete of old file on disk
     upload(io, **) # ← physical write of new file on disk
     self
   end
   ```

5. Sau replace: file mới đã ở disk, file cũ đã bị xóa.
6. Gọi `update record.id, image_data: ..., device_id: 1, kind: 'general'` → UPDATE Screen 278 SET device_id=1.
7. **Constraint violation**: Partial unique index `UNIQUE (device_id, kind) WHERE device_id IS NOT NULL` đã có row (Screen 7, device_id=1, kind='general' — Weather). UPDATE raise.
8. DB rollback → Screen 278.image_data **không đổi** (vẫn trỏ hash cũ).
9. NHƯNG file cũ đã bị `image_destroy` xóa ở step 4 → DB references file đã gone → **404**.
10. Sidekiq tăng retry counter → job sẽ chạy lại sau (1m, 4m, 16m, ... lên tới ngày 21).

**Triệu chứng device**: VN Stock screen chốc 200 chốc 404. Firmware báo `No image: ESP_FAIL` xen kẽ với màn hình bình thường. Pattern: mới Build xong → OK vài phút → retry fire → 404 → next cron fire → OK lại → repeat.

**Diagnostic procedure** (đã verify hoạt động trên `terminus-keyvalue-1` Valkey 9 + `terminus-worker-1`):

```bash
# 0. Lấy Valkey password từ env của terminus-web-1
PASS=$(docker exec terminus-web-1 sh -c 'echo $KEYVALUE_URL' | sed -E 's|.*://[^:]*:([^@]+)@.*|\1|')

# 1. Đo retry queue size
docker exec terminus-keyvalue-1 valkey-cli -a "$PASS" ZCARD retry
#  → bao nhiêu retry stuck (ví dụ 23)

# 2. Inspect 1 retry job để confirm args
docker exec terminus-keyvalue-1 valkey-cli -a "$PASS" ZRANGE retry 0 0
#  → JSON, look for "class":"Terminus::Jobs::Extensions::Screen","args":[8,null,1]

# 3. (CHỈ chạy khi confirm bug) Xóa toàn bộ retry set
docker exec terminus-keyvalue-1 valkey-cli -a "$PASS" DEL retry

# 4. Verify clear xong
docker exec terminus-keyvalue-1 valkey-cli -a "$PASS" ZCARD retry  # → 0
```

**Verify fix** bằng cách enqueue manual job với args đúng:

```bash
NOW=$(date +%s)
JID=$(date +%s%N | sha256sum | head -c 24)
PAYLOAD="{\"retry\":false,\"queue\":\"within_1_minute\",\"class\":\"Terminus::Jobs::Extensions::Screen\",\"args\":[8,47,null],\"jid\":\"$JID\",\"created_at\":$NOW.0,\"enqueued_at\":$NOW.0}"
docker exec terminus-keyvalue-1 valkey-cli -a "$PASS" LPUSH 'queue:within_1_minute' "$PAYLOAD"

sleep 15
# Check file ra disk
docker exec terminus-web-1 ls -lat public/uploads/ | head -3
# Check serve
curl -sS -o /dev/null -w "%{http_code} %{size_download}\n" "http://VPS:2300/uploads/<NEW_HASH>.bmp"
```

**Phòng tránh**:

- KHÔNG BAO GIỜ tick `device_ids=[1]` trên Extension page.
- Chỉ tick `model_ids=[47]` trong Extension.
- Dùng **Playlist** để bind screen → device (Playlist 2 → Screen 7 + Screen 278).
- Sau khi cron `Batches::Extension(N)` chạy: extension không có devices → fan-out đi đường `enqueue_models` → `Screen.perform_async(N, model_id, nil)` → mold có `device_id=NULL` → UPDATE Screen SET device_id=NULL → KHÔNG conflict với Screen 7. An toàn vĩnh viễn.

**Long-term upstream fix** (đề xuất gửi PR Terminus): swap thứ tự trong `Screen#replace` — upload trước, image_destroy sau khi DB commit:

```ruby
def replace(io, **)
  old_id = image_id
  upload(io, **)              # write new first
  yield if block_given?       # caller commits DB here
  store.delete old_id if old_id && old_id != image_id
end
```

Và/hoặc bọc `update_with_image` trong DB transaction với on-rollback hook xóa file mới.

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

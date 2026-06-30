# Currency Index — TRMNL BYOS plugin

USD-index style FX dashboard for [Terminus](https://github.com/usetrmnl/byos_hanami) BYOS server.
Shows a 30-day comparison table of one **base currency** versus up to **6 quote symbols**,
sourced from the free [Frankfurter](https://www.frankfurter.dev) (ECB) API — no API key required.

Optimised for the **Waveshare ESP32-S3-RLCD-4.2** (mono, 400×300, 1-bit).

## Output

```
USD INDEX                   2026-05-30 → 2026-06-29 · 23d
─────────────────────────────────────────────────────────
SYM    NOW       START      Δ%
EUR    0.8767    0.8588     +2.09%
GBP    0.7559    0.7448     +1.49%
JPY    161.86    159.28     +1.62%
CAD    1.4204    1.3806     +2.89%
AUD    1.4493    1.3945     +3.93%
CNY    6.7940    6.7670     +0.40%
─────────────────────────────────────────────────────────
FRANKFURTER · ECB                          Currency Index
```

## Configurable fields (per Terminus instance)

| Field | Default | Description |
|---|---|---|
| `base_currency` | `USD` | ISO 4217 code for the base. |
| `currencies` | `EUR,GBP,JPY,CAD,AUD,CNY` | Comma-separated quote symbols. Max 6 fit the layout. |

The 30-day window is hardcoded in `polling_url` (`'now' - 2592000s`). Change it there if you want a different period.

## Build & install

```bash
# build the ZIP only
ruby build_zip.rb

# build + curl-upload to a Terminus instance
ruby build_zip.rb upload <HOST:PORT>
# e.g.  ruby build_zip.rb upload 45.76.179.84:2300
```

The Terminus import page is `POST /extensions/import` with form field `extension_attachment=@<zip>`.
After import, link the extension to a model (e.g. `waveshare_esp32_s3_rlcd_4_2` in our setup) and add
it to a playlist position.

## Verified gotchas (from getting this working)

These bit us hard while bringing the plugin up. All fixes are baked into the files in this folder.

1. **Pure HTML/CSS — no JavaScript.**
   Terminus renders templates via Ferrum/Chromium with `page.content = HTML` and
   `wait_for_idle 5s`. External `<script src="…cdn…">` tags do not reliably load
   in that flow and trigger `Ferrum::BrowserError: Unable to capture screenshot due to an instance error`.
   The first iteration used Highcharts from a CDN — every render crashed. The
   working template is a plain `<table>` with inline styles.

2. **`mode: text` (1-bit BMP).**
   The ST7305 firmware decoder only accepts 1-bit BMP. `mode: dither` produces a
   24-bit BMP and the firmware rejects the response.

3. **Strict semver `1.0.0` for `version`.**
   Terminus `Types::Version` regex is `\A\d+\.\d+\.\d+\Z`. `1.0` or `v1.0.0` fails import.

4. **NO `extension_device` row.**
   `Jobs::Batches::Extension` routes via `extension.devices.any? ? enqueue_devices : enqueue_models`.
   If you bind the extension to a specific device, Terminus tries to write the
   resulting screen with `device_id=N` and that collides with the unique
   constraint `screen_device_id_kind_index (device_id, kind)` if any other
   extension already owns `(N, 'general')`. Symptom: poll succeeds, exchange
   updates, but the screen row is never refreshed.
   **Fix:** bind via `extension_model` only. Verify with:

   ```sql
   SELECT * FROM extension_device WHERE extension_id = <id>;  -- should be empty
   SELECT * FROM extension_model  WHERE extension_id = <id>;  -- should bind to your custom model
   ```

5. **Custom Model for the Waveshare RLCD.**
   Create the model row (e.g. `waveshare_esp32_s3_rlcd_4_2`) with `mime=image/bmp`,
   `bit_depth=1`, `width=400`, `height=300`. The exporter pipeline produces the
   1-bit BMP from the rendered PNG via the model's `bit_depth`.

## Files

```
liquid/
├── full.liquid       # rendered template (pure HTML/CSS)
└── settings.yml      # TRMNL store format (kind=poll, mode=text via build_zip.rb)
build_zip.rb          # converts to Terminus local-import ZIP + optional upload
dist/                 # build output (gitignored)
└── currency-index.zip
```

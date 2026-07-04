# trmnl-rlcd-plugins

TRMNL BYOS plugins targeting the **Waveshare ESP32-S3-RLCD-4.2** board (ST7305, monochrome 400×300, 1-bit), plus **SenseCraft HMI Web Content** pages targeting **Seeed Studio reTerminal E1002** (7.3" color Spectra 6, 800×480).

This is the **plugins / dashboard** side. The Waveshare **firmware** lives in a separate repo:
👉 <https://github.com/nhvvin/trmnl-waveshare-esp32-s3-rlcd-4.2>

## Layout

```
firmware-extras/        # Waveshare RLCD 4.2 — TRMNL Liquid plugins
└── trmnl-vn-stock/
    ├── liquid/         # Liquid template + settings.yml
    ├── preview/        # Static HTML / BMP / PNG preview for verification
    ├── dist/           # Built .zip ready to import into Terminus
    └── build_zip.rb    # Local build script (Terminus-compatible bundle)

e1002-extras/           # reTerminal E1002 — SenseCraft HMI Web Content pages
├── lunar-calendar-vn/  # Vietnamese lunar calendar (dương/âm/Can Chi/lễ/tiết khí)
│   ├── index.html      # single-day view
│   ├── month.html      # month grid (6×7) view
│   ├── preview.html    # desktop grid preview
│   └── assets/         # style.css, month.css, lunar.js (Hồ Ngọc Đức), render.js, month-render.js
└── gold-price-vn/      # Vietnamese gold price (SJC / Nữ Trang / Nhẫn 9999)
    ├── index.html      # 800×480 giaVang page
    ├── preview.html    # 4-scenario preview
    ├── assets/         # style.css, render.js
    └── data/           # gold.json (updated by GitHub Actions cron 2×/day)
```

The gold-price widget also drives a scheduled GitHub Actions workflow:

```
scripts/fetch-gold-price.mjs          # Node 20, no npm deps
.github/workflows/update-gold-price.yml  # cron 09:00 & 15:00 VN time
```

## Companion server

The `firmware-extras/*` plugins target the [Terminus](https://github.com/usetrmnl/byos_hanami) BYOS server.
The `e1002-extras/*` pages are static HTML — no server needed beyond a static host (GitHub Pages, Netlify, LAN).

## Status / known gotchas

- All plugins use `mode: text` (server renders to 1-bit BMP for the ST7305 display)
- Templates must be **pure HTML/CSS** — no external JavaScript (Ferrum browser used by Terminus cannot reliably load external CDN scripts in `wait_for_idle 5s`)
- See per-plugin `README.md` for verified root causes & debug procedures

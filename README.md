# trmnl-rlcd-plugins

TRMNL BYOS plugins targeting the **Waveshare ESP32-S3-RLCD-4.2** board (Reflective LCD ST7305, monochrome 400×300, 1-bit).

This is the **plugins / dashboard** side. The **firmware** lives in a separate repo:
👉 <https://github.com/nhvvin/trmnl-waveshare-esp32-s3-rlcd-4.2>

## Layout

```
firmware-extras/
└── trmnl-vn-stock/   # Vietnam stock dashboard plugin (importable .zip for Terminus)
    ├── liquid/        # Liquid template + settings.yml
    ├── preview/       # Static HTML / BMP / PNG preview for verification
    ├── dist/          # Built .zip ready to import into Terminus
    └── build_zip.rb   # Local build script (Terminus-compatible bundle)
```

## Companion server

These plugins are built for the [Terminus](https://github.com/usetrmnl/byos_hanami) BYOS server.

## Status / known gotchas

- All plugins use `mode: text` (server renders to 1-bit BMP for the ST7305 display)
- Templates must be **pure HTML/CSS** — no external JavaScript (Ferrum browser used by Terminus cannot reliably load external CDN scripts in `wait_for_idle 5s`)
- See per-plugin `README.md` for verified root causes & debug procedures

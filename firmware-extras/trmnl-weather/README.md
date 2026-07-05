# TRMNL Weather — Open-Meteo (RLCD 1-bit friendly)

Free weather forecast from Open-Meteo (no API key). Optimised for the
Waveshare ESP32-S3-RLCD-4.2 400×300 1-bit reflective LCD.

## Layout (400×300)

```
┌───────────────────────────────────┐
│ ASIA/HO CHI MINH  Sun 05/07 15:15 │  ← location · timestamp
├───────────────────────────────────┤
│ 31°       CLOUDS · FEELS 36°      │  ← hero temp + condition
├───────────────────────────────────┤
│ HUMID   WIND    RISE    SET       │
│  65%   4km/h   05:35   18:19      │  ← 4 metrics
├───────────────────────────────────┤
│ MON  TUE  WED  THU  FRI           │  ← 5-day forecast
│ 31°  31°  31°  32°  33°           │      max
│ 25°  25°  26°  26°  26°           │      min
│ TS   SHW  TS   TS   TS            │      short code
├───────────────────────────────────┤
│ OPEN-METEO · 15:15                │  ← footer
└───────────────────────────────────┘
```

## Custom fields

| keyname | default    | notes                                  |
| ------- | ---------- | -------------------------------------- |
| `lat`   | `10.7748`  | Latitude (Ho Chi Minh City default).   |
| `lon`   | `106.7833` | Longitude (Ho Chi Minh City default).  |

## RLCD typography rules applied

Same rules used by `trmnl-currency-index`, `trmnl-vn-stock`, `trmnl-vnd-rates`:

- Body ≥ 17px, title 20-22px, hero temp 64px.
- Pure `#000` / `#fff` only — no greys (RLCD dithers them into speckle noise).
- Solid `1-2px #000` borders — no dotted (they render as unreadable dot fields).
- `Helvetica, Arial` for text, `Menlo, "Courier New"` for numbers (aligned digits).
- `-webkit-font-smoothing: none` + `text-rendering: geometricPrecision`.
- Weight `700+` throughout (thin strokes disappear on the RLCD panel).
- Uppercase labels, letter-spacing bumped for readability.
- Cut 7-day forecast → 5-day (each cell 76×130px, comfortable at 17px body).

## Build

```
ruby firmware-extras/trmnl-weather/build_zip.rb
```

Produces `dist/weather.zip` (configuration.yml + template.html.liquid).

## Upload

```
ruby firmware-extras/trmnl-weather/build_zip.rb upload 45.76.179.84:2300
```

Or via Terminus UI: `/extensions/import` → pick the ZIP.

## Deployment notes

Same gotchas as sibling plugins — see `../trmnl-vnd-rates/README.md` for the
full list (Liquid `String > 0` bug, `screen.kind` enum cast, form PUT that
wipes bindings, exchange-delete wiping polling config, etc.).

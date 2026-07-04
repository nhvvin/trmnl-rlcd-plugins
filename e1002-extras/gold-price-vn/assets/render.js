/* ============================================================================
 * Giá vàng render — reads data/gold.json, computes %Δ (sell price) vs
 * yesterday, and paints 3 cards.
 * ========================================================================== */

(() => {
  

  var VN_MONTHS = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
  ];

  // Format 14840000 → "14.840.000"
  function fmtVnd(n) {
    if (n === null || n === undefined) return "—";
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  // Delta percentage as string with sign, 2 decimals when < 10%, else 1.
  function fmtPct(pct) {
    if (pct === null) return "—";
    var abs = Math.abs(pct);
    var digits = abs >= 10 ? 1 : 2;
    var s = abs.toFixed(digits);
    var sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
    return sign + s + "%";
  }

  function pctChange(today, yesterday) {
    if (
      today === null ||
      today === undefined ||
      yesterday === null ||
      yesterday === undefined ||
      yesterday === 0
    ) {
      return null;
    }
    return ((today - yesterday) / yesterday) * 100;
  }

  function directionClass(pct) {
    if (pct === null) return "na";
    // Threshold: anything under ±0.005% is "flat" (rounding artefact).
    if (pct > 0.005) return "up";
    if (pct < -0.005) return "down";
    return "flat";
  }

  function directionArrow(pct) {
    if (pct === null) return "—";
    if (pct > 0.005) return "▲";
    if (pct < -0.005) return "▼";
    return "◆";
  }

  function formatStamp(iso, date, time) {
    // e.g. "Cập nhật 08:47 · 4/7/2026"
    var d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return "Cập nhật " + (time || "") + " · " + (date || "");
    }
    // Prefer the raw local time from the feed to avoid TZ drift.
    var parts = String(date).split("-");
    if (parts.length === 3) {
      var dd = Number.parseInt(parts[2], 10);
      var mm = Number.parseInt(parts[1], 10) - 1;
      var yy = parts[0];
      return "Cập nhật " + time + " · " + dd + "/" + VN_MONTHS[mm] + "/" + yy;
    }
    return "Cập nhật " + time + " · " + date;
  }

  // Pair up today's item with yesterday's by key, compute deltas.
  function pairItems(todayItems, yesterdayItems) {
    var yMap = {};
    if (yesterdayItems) {
      for (var i = 0; i < yesterdayItems.length; i++) {
        yMap[yesterdayItems[i].key] = yesterdayItems[i];
      }
    }
    return todayItems.map((t) => {
      var y = yMap[t.key] || null;
      var buyPct = y ? pctChange(t.buy, y.buy) : null;
      var sellPct = y ? pctChange(t.sell, y.sell) : null;
      // Headline delta is the SELL price (what shops quote at customers).
      return {
        key: t.key,
        label: t.label,
        buy: t.buy,
        sell: t.sell,
        buyPct: buyPct,
        sellPct: sellPct,
        headlinePct: sellPct,
      };
    });
  }

  function pickTopMover(paired) {
    var top = null;
    var topAbs = -Infinity;
    for (var i = 0; i < paired.length; i++) {
      if (paired[i].headlinePct === null) continue;
      var abs = Math.abs(paired[i].headlinePct);
      if (abs > topAbs) {
        topAbs = abs;
        top = paired[i];
      }
    }
    // Only highlight when the mover crosses a meaningful threshold.
    if (top && topAbs >= 0.5) return top.key;
    return null;
  }

  function renderCard(item, topMoverKey) {
    var card = document.createElement("section");
    card.className = "card " + directionClass(item.headlinePct);
    if (topMoverKey && item.key === topMoverKey) {
      card.classList.add("top-mover");
    }

    var label = document.createElement("div");
    label.className = "label";
    label.textContent = item.label;

    var prices = document.createElement("div");
    prices.className = "prices";
    var mkSpan = (cls, text) => {
      var s = document.createElement("span");
      s.className = cls;
      s.textContent = text;
      return s;
    };
    prices.appendChild(mkSpan("tag", "Mua"));
    prices.appendChild(mkSpan("value", fmtVnd(item.buy)));
    prices.appendChild(mkSpan("tag", "Bán"));
    prices.appendChild(mkSpan("value", fmtVnd(item.sell)));
    prices.appendChild(mkSpan("unit", "₫ / chỉ"));

    var delta = document.createElement("div");
    delta.className = "delta";
    delta.appendChild(mkSpan("arrow", directionArrow(item.headlinePct)));
    delta.appendChild(mkSpan("pct", fmtPct(item.headlinePct)));
    delta.appendChild(mkSpan("side", "so với hôm qua (bán)"));

    card.appendChild(label);
    card.appendChild(prices);
    card.appendChild(delta);
    return card;
  }

  function render(data) {
    var stamp = document.getElementById("stamp");
    var cards = document.getElementById("cards");
    var source = document.getElementById("source");
    var hint = document.getElementById("delta-hint");

    if (!data || !data.today) {
      document.getElementById("error").hidden = false;
      return;
    }

    stamp.textContent = formatStamp(
      data.today.iso,
      data.today.date,
      data.today.time,
    );

    var paired = pairItems(
      data.today.items,
      data.yesterday ? data.yesterday.items : null,
    );

    var topMoverKey = pickTopMover(paired);

    cards.replaceChildren();
    for (var i = 0; i < paired.length; i++) {
      cards.appendChild(renderCard(paired[i], topMoverKey));
    }

    var src = data.today.source || {};
    source.replaceChildren();
    source.appendChild(document.createTextNode("Nguồn: "));
    var brand = document.createElement("span");
    brand.className = "brand";
    brand.textContent = src.name || "?";
    source.appendChild(brand);
    source.appendChild(document.createTextNode(" · " + (src.area || "")));

    if (data.yesterday) {
      hint.textContent = "Δ tính theo giá bán so với " + data.yesterday.date;
    } else {
      hint.textContent = "Chưa có dữ liệu hôm qua để so sánh";
    }
  }

  // Query-string override for testing:
  //   ?data=path/to/custom.json
  function dataUrl() {
    var p = new URLSearchParams(window.location.search);
    return p.get("data") || "data/gold.json";
  }

  function boot() {
    var url = dataUrl();
    fetch(url + "?_=" + Date.now(), { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(render)
      .catch((err) => {
        console.error("Gold price load failed:", err);
        var e = document.getElementById("error");
        e.textContent = "Không tải được dữ liệu giá vàng: " + err.message;
        e.hidden = false;
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

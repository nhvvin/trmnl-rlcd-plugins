/*
 * Render one full month for reTerminal E1002.
 *
 *   Default:   this month, today highlighted.
 *   Override:  ?month=YYYY-MM        (show that month, no highlight)
 *              ?date=YYYY-MM-DD      (show that month, that day highlighted)
 *              ?debug=1              (show a debug badge)
 */

(() => {
	// Priority for choosing 1 short tag per cell when multiple events fall
	// on the same day. Higher wins. Legend still lists all events.
	var KIND_PRIORITY = { major: 3, observance: 2, world: 1 };

	function pad2(n) {
		return n < 10 ? "0" + n : "" + n;
	}

	function todayInVN() {
		var now = new Date();
		var utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
		var vn = new Date(utcMs + 7 * 3600 * 1000);
		return {
			day: vn.getDate(),
			month: vn.getMonth() + 1,
			year: vn.getFullYear(),
		};
	}

	function parseQuery() {
		var q = {};
		(location.search || "")
			.replace(/^\?/, "")
			.split("&")
			.forEach((kv) => {
				if (!kv) return;
				var i = kv.indexOf("=");
				q[decodeURIComponent(kv.substr(0, i < 0 ? kv.length : i))] =
					i < 0 ? "" : decodeURIComponent(kv.substr(i + 1));
			});
		return q;
	}

	function daysInMonth(y, m) {
		return new Date(Date.UTC(y, m, 0)).getUTCDate();
	}

	function weekdayVN(y, m, d) {
		// 0=Mon..6=Sun (Vietnamese convention)
		var jsDow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
		return (jsDow + 6) % 7;
	}

	function prevMonth(y, m) {
		if (m === 1) return { y: y - 1, m: 12 };
		return { y: y, m: m - 1 };
	}

	function nextMonth(y, m) {
		if (m === 12) return { y: y + 1, m: 1 };
		return { y: y, m: m + 1 };
	}

	function resolveTarget() {
		var q = parseQuery();
		if (q.date && /^\d{4}-\d{1,2}-\d{1,2}$/.test(q.date)) {
			var d = q.date.split("-").map(Number);
			return { year: d[0], month: d[1], highlight: d[2] };
		}
		if (q.month && /^\d{4}-\d{1,2}$/.test(q.month)) {
			var m = q.month.split("-").map(Number);
			return { year: m[0], month: m[1], highlight: null };
		}
		var t = todayInVN();
		return { year: t.year, month: t.month, highlight: t.day };
	}

	function render(target) {
		var L = window.VNLunar;
		var y = target.year;
		var m = target.month;
		var highlight = target.highlight;

		// ---- Header ----
		// Year/month Can Chi: use lunar year of the 1st of the solar month
		// (approximation; enough for display purposes)
		var firstLunar = L.solarToLunar(1, m, y);
		var lastLunar = L.solarToLunar(daysInMonth(y, m), m, y);

		document.getElementById("title").textContent = "Tháng " + m + ", " + y;

		var metaHtml = document.getElementById("meta");
		// meta shows: lunar span + year Can Chi
		var yearsInvolved =
			firstLunar.year === lastLunar.year
				? L.canChiOfYear(firstLunar.year)
				: L.canChiOfYear(firstLunar.year) +
					" → " +
					L.canChiOfYear(lastLunar.year);
		var lunarSpan =
			"Âm lịch: " +
			firstLunar.day +
			"/" +
			firstLunar.month +
			" → " +
			lastLunar.day +
			"/" +
			lastLunar.month;
		metaHtml.textContent = lunarSpan + "   ·   Năm " + yearsInvolved;

		// ---- Grid ----
		var grid = document.getElementById("grid");
		while (grid.firstChild) grid.removeChild(grid.firstChild);

		var firstCol = weekdayVN(y, m, 1); // 0..6
		var totalDays = daysInMonth(y, m);
		var totalCells = 42; // always 6 rows x 7 cols

		// Pre-month padding: days from previous month
		var pm = prevMonth(y, m);
		var pmDays = daysInMonth(pm.y, pm.m);

		var legendItems = [];

		for (var i = 0; i < totalCells; i++) {
			var col = i % 7;
			var isSunCol = col === 6;

			var cellY, cellM, cellD, isOther;
			if (i < firstCol) {
				cellY = pm.y;
				cellM = pm.m;
				cellD = pmDays - (firstCol - 1 - i);
				isOther = true;
			} else if (i - firstCol < totalDays) {
				cellY = y;
				cellM = m;
				cellD = i - firstCol + 1;
				isOther = false;
			} else {
				var nm = nextMonth(y, m);
				cellY = nm.y;
				cellM = nm.m;
				cellD = i - firstCol - totalDays + 1;
				isOther = true;
			}

			var lunar = L.solarToLunar(cellD, cellM, cellY);

			// Festival lookup — only for in-month cells (avoid clutter)
			var cellEvents = [];
			var topEvent = null;
			if (!isOther) {
				cellEvents = L.festival(cellD, cellM, cellY, lunar.day, lunar.month, lunar.leap);
				if (cellEvents.length > 0) {
					topEvent = cellEvents.reduce((best, e) => KIND_PRIORITY[e.kind] > KIND_PRIORITY[best.kind] ? e : best, cellEvents[0]);
					cellEvents.forEach((e) => {
						legendItems.push({ day: cellD, event: e });
					});
				}
			}

			// Cell DOM
			var cell = document.createElement("div");
			cell.className = "cell";
			if (isSunCol) cell.classList.add("sun");
			if (isOther) cell.classList.add("other");
			if (!isOther && cellD === highlight && cellM === m && cellY === y) {
				cell.classList.add("today");
			}
			if (topEvent) cell.classList.add("has-fest", "fest-" + topEvent.kind);

			var solarEl = document.createElement("div");
			solarEl.className = "solar";
			solarEl.textContent = cellD;
			cell.appendChild(solarEl);

			var lunarEl = document.createElement("div");
			lunarEl.className = "lunar";
			if (lunar.day === 1) {
				lunarEl.classList.add("first");
				lunarEl.textContent = "1/" + lunar.month + (lunar.leap ? "*" : "");
			} else {
				lunarEl.textContent = String(lunar.day);
			}
			cell.appendChild(lunarEl);

			if (topEvent) {
				var festEl = document.createElement("div");
				festEl.className = "fest fest-" + topEvent.kind;
				festEl.textContent = topEvent.short;
				cell.appendChild(festEl);
			}

			grid.appendChild(cell);
		}

		// ---- Legend ----
		var legend = document.getElementById("legend");
		while (legend.firstChild) legend.removeChild(legend.firstChild);

		if (legendItems.length === 0) {
			var empty = document.createElement("div");
			empty.className = "empty";
			empty.textContent = "Không có lễ / sự kiện đặc biệt trong tháng.";
			legend.appendChild(empty);
		} else {
			// Sort by (day, priority desc) so same-day events with higher tier show first.
			legendItems.sort((a, b) => {
				if (a.day !== b.day) return a.day - b.day;
				return KIND_PRIORITY[b.event.kind] - KIND_PRIORITY[a.event.kind];
			});
			legendItems.forEach((it) => {
				var wrap = document.createElement("div");
				wrap.className = "item item-" + it.event.kind;
				var dayEl = document.createElement("span");
				dayEl.className = "day";
				dayEl.textContent = String(it.day);
				var nameEl = document.createElement("span");
				nameEl.className = "name";
				nameEl.textContent = it.event.short;
				wrap.appendChild(dayEl);
				wrap.appendChild(nameEl);
				legend.appendChild(wrap);
			});
		}

		// ---- Debug ----
		if (parseQuery().debug) {
			document.body.classList.add("debug");
			document.getElementById("debug-badge").textContent =
				"DEBUG " + y + "-" + pad2(m) + (highlight ? "-" + pad2(highlight) : "");
		}
	}

	function showFatal(err) {
		while (document.body.firstChild)
			document.body.removeChild(document.body.firstChild);
		var pre = document.createElement("pre");
		pre.style.cssText = "padding:24px;font:14px monospace;color:#c00";
		pre.textContent = err && err.stack ? err.stack : String(err);
		document.body.appendChild(pre);
	}

	function boot() {
		try {
			render(resolveTarget());
		} catch (err) {
			showFatal(err);
		}
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", boot);
	} else {
		boot();
	}
})();

/*
 * Render the lunar-calendar page for reTerminal E1002.
 *
 * Uses today's Vietnam-local date by default.
 * For testing you can override the date with the query string:
 *     ?date=2025-01-29         (Tết 2025)
 *     ?date=2026-02-17         (Tết 2026)
 *     ?date=2025-10-06&debug=1 (Trung Thu 2025 with debug badge)
 */

(() => {
	function pad2(n) {
		return n < 10 ? "0" + n : "" + n;
	}

	function todayInVN() {
		// Convert current UTC to Asia/Ho_Chi_Minh (+7) without depending on
		// Intl.DateTimeFormat (the embedded browser may lack tz data).
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

	function resolveDate() {
		var q = parseQuery();
		if (q.date && /^\d{4}-\d{1,2}-\d{1,2}$/.test(q.date)) {
			var parts = q.date.split("-").map(Number);
			return { year: parts[0], month: parts[1], day: parts[2] };
		}
		return todayInVN();
	}

	function set(id, text) {
		var el = document.getElementById(id);
		if (el) el.textContent = text;
	}

	function render(sDate) {
		var L = window.VNLunar;
		var lunar = L.solarToLunar(sDate.day, sDate.month, sDate.year);

		// ---- Header ----
		set("dow", L.dayOfWeekVN(sDate.day, sDate.month, sDate.year));
		set(
			"solar-date",
			"Ngày " + sDate.day + " tháng " + sDate.month + ", " + sDate.year,
		);

		// ---- Today block ----
		set("month-label", "THÁNG " + sDate.month);
		set("day-number", pad2(sDate.day));
		set("year-label", "Năm " + sDate.year);

		// Sunday / holiday highlight for the big number
		var jsDate = new Date(Date.UTC(sDate.year, sDate.month - 1, sDate.day));
		var isSunday = jsDate.getUTCDay() === 0;
		var events = L.festival(
			sDate.day,
			sDate.month,
			sDate.year,
			lunar.day,
			lunar.month,
			lunar.leap,
		);
		var dayNumEl = document.getElementById("day-number");
		dayNumEl.classList.toggle("sunday", isSunday);
		// Actual `holiday` toggle happens below once we know the event tier.

		// ---- Lunar block ----
		set("lunar-day", pad2(lunar.day));
		set("lunar-month", pad2(lunar.month));
		document.getElementById("leap-tag").hidden = !lunar.leap;

		set("cc-year", L.canChiOfYear(lunar.year));
		set("cc-month", L.canChiOfMonth(lunar.month, lunar.year));
		set("cc-day", L.canChiOfDay(sDate.day, sDate.month, sDate.year));

		// Festival (join multiple with " · ")
		set("festival", events.map((e) => e.full).join("  ·  "));

		// Highlight the big day number only for major-tier events so world
		// observance days (Water Day, etc.) don't paint the number red.
		var hasMajor = events.some((e) => e.kind === "major");
		dayNumEl.classList.toggle("holiday", hasMajor);

		// ---- Footer ----
		var term = L.solarTerm(sDate.day, sDate.month, sDate.year);
		var termEl = document.getElementById("tiet-khi");
		termEl.textContent =
			term.name + (term.isStart ? "  (bắt đầu hôm nay)" : "");
		termEl.classList.toggle("starts", term.isStart);

		set(
			"lucky-hours",
			L.luckyHours(sDate.day, sDate.month, sDate.year).join(", "),
		);

		// ---- Debug badge ----
		if (parseQuery().debug) {
			document.body.classList.add("debug");
			document.getElementById("debug-badge").textContent =
				"DEBUG " + sDate.year + "-" + pad2(sDate.month) + "-" + pad2(sDate.day);
		}
	}

	function showFatal(err) {
		// Wipe the page and render the stack as plain text — safer than innerHTML
		// and easier to eyeball on the E1002 if the algorithm ever throws.
		while (document.body.firstChild)
			document.body.removeChild(document.body.firstChild);
		var pre = document.createElement("pre");
		pre.style.cssText = "padding:24px;font:14px monospace;color:#c00";
		pre.textContent = err && err.stack ? err.stack : String(err);
		document.body.appendChild(pre);
	}

	function boot() {
		try {
			render(resolveDate());
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

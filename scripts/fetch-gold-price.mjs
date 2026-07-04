#!/usr/bin/env node
// Fetch DOJI gold price XML, parse the rows we care about, and merge into
// e1002-extras/gold-price-vn/data/gold.json.
//
// Behaviour (idempotent, so schedule can fire whenever):
//   1. Read the existing JSON (if present); it may already have today's + yesterday's snapshots.
//   2. Fetch fresh XML from DOJI.
//   3. Parse rows into a normalized shape (name, buy, sell in VND per chỉ).
//   4. Convert timestamp to Asia/Ho_Chi_Minh date (YYYY-MM-DD).
//   5. If the fetched date === existing.today.date  → replace today (mid-day update).
//   6. If the fetched date >   existing.today.date  → rotate today → yesterday, install fresh today.
//   7. If the fetched date <   existing.today.date  → clock skew, ignore.
//
// No npm deps: DOJI XML is simple attribute-only rows so a regex parse is enough.
//
// Env override for local testing:
//   DOJI_URL=http://... node scripts/fetch-gold-price.mjs

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");
const OUT_PATH = resolve(
	REPO_ROOT,
	"e1002-extras/gold-price-vn/data/gold.json",
);

const DOJI_URL =
	process.env.DOJI_URL ||
	"https://update.giavang.doji.vn/banggia/doji_92409/92409";

// Rows we want to surface on the E1002 (short label, matcher pattern).
// The E1002 has room for ~3 cards → keep this list tight.
// The feed exposes an <info Name='...' area='...' /> tag we surface
// verbatim on the page footer. Fallbacks below match the 92409 (HCM) shape.
const DOJI_BRANCH_FALLBACK = "CHI NHÁNH HỒ CHÍ MINH";
const DOJI_REGION_FALLBACK = "Miền Nam";

// Row-name variance between DOJI regional feeds:
//   92409 (HCM):     "SJC -Bán Lẻ"
//                    "Nữ Trang 9999 - Bán Lẻ"
//                    "Nhẫn Tròn 9999 (Hưng Thịnh Vượng) - Bán Lẻ)"
//   92411 (Đà Nẵng): "Miếng SJC (Loại 1L) - Bán Lẻ"
//                    "Nữ Trang 9999 - Bán Lẻ"
//                    "NHẪN TRÒN 9999 HƯNG THỊNH VƯỢNG"
// Patterns match both so swapping endpoints is code-free.
const WATCHED = [
	{ key: "sjc_1l", label: "SJC 1L", match: /(Miếng SJC|^SJC[\s\-])/i },
	{ key: "nu_trang_9999", label: "Nữ Trang 9999", match: /^Nữ Trang 9999/i },
	{
		key: "nhan_9999",
		label: "Nhẫn 9999",
		match: /Nhẫn.*9999|NHẪN.*9999/i,
	},
];

async function fetchXml() {
	const res = await fetch(DOJI_URL, {
		headers: { "User-Agent": "trmnl-rlcd-plugins/1.0 (+github-actions)" },
	});
	if (!res.ok) {
		throw new Error(`DOJI fetch failed: HTTP ${res.status}`);
	}
	return await res.text();
}

// XML shape (from live feed):
//   <info Name='CHI NHÁNH HỒ CHÍ MINH' area='Miền Nam' hotline='' />
//   <DateTime>08:47 04-07-2026</DateTime>
//   <Row Name='...' Key='doji_0' Sell='15,140' Buy='14,840' />
function parseXml(xml) {
	const dt = xml.match(/<DateTime>([^<]+)<\/DateTime>/);
	const rawTs = dt ? dt[1].trim() : null;

	const info = xml.match(/<info\s+Name='([^']+)'\s+area='([^']+)'/);
	const branch = info ? info[1].trim() : null;
	const region = info ? info[2].trim() : null;

	const rows = [];
	const rowRe =
		/<Row\s+Name='([^']+)'\s+Key='([^']+)'\s+Sell='([^']+)'\s+Buy='([^']+)'\s*\/>/g;
	let m;
	while ((m = rowRe.exec(xml)) !== null) {
		rows.push({
			name: m[1],
			key: m[2],
			sell: m[3],
			buy: m[4],
		});
	}
	return { rawTs, rows, branch, region };
}

// DOJI publishes prices in thousand VND per chỉ (e.g. "15,140" = 15,140,000
// VND per chỉ). We store as integer VND per chỉ so the frontend can format
// without further parsing.
function parseVnd(str) {
	if (!str || str === "-") return null;
	const digits = str.replace(/[,\s.]/g, "");
	const n = Number.parseInt(digits, 10);
	if (Number.isNaN(n)) return null;
	return n * 1000; // → VND per chỉ
}

// DateTime looks like "08:47 04-07-2026" (VN local). Convert to
//   { date: "YYYY-MM-DD", time: "HH:MM", iso: "..." }
// treating the source as +07:00.
function normalizeTimestamp(raw) {
	if (!raw) {
		const now = new Date();
		return {
			date: now.toISOString().slice(0, 10),
			time: now.toISOString().slice(11, 16),
			iso: now.toISOString(),
			source: null,
		};
	}
	const m = raw.match(/(\d{2}):(\d{2})\s+(\d{2})-(\d{2})-(\d{4})/);
	if (!m) {
		return {
			date: new Date().toISOString().slice(0, 10),
			time: "00:00",
			iso: new Date().toISOString(),
			source: raw,
		};
	}
	const [, hh, mm, DD, MM, YYYY] = m;
	const iso = `${YYYY}-${MM}-${DD}T${hh}:${mm}:00+07:00`;
	return {
		date: `${YYYY}-${MM}-${DD}`,
		time: `${hh}:${mm}`,
		iso,
		source: raw,
	};
}

function pickWatched(rows) {
	const out = [];
	for (const w of WATCHED) {
		const r = rows.find((x) => w.match.test(x.name));
		if (!r) continue;
		out.push({
			key: w.key,
			label: w.label,
			raw: r.name,
			buy: parseVnd(r.buy),
			sell: parseVnd(r.sell),
		});
	}
	return out;
}

function readExisting() {
	if (!existsSync(OUT_PATH)) return null;
	try {
		return JSON.parse(readFileSync(OUT_PATH, "utf8"));
	} catch (_e) {
		return null;
	}
}

function writeJson(data) {
	mkdirSync(dirname(OUT_PATH), { recursive: true });
	writeFileSync(OUT_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function main() {
	const xml = await fetchXml();
	const { rawTs, rows, branch, region } = parseXml(xml);
	if (rows.length === 0) {
		throw new Error("DOJI XML parse produced 0 rows — feed shape changed?");
	}
	const ts = normalizeTimestamp(rawTs);
	const items = pickWatched(rows);
	if (items.length === 0) {
		throw new Error("No watched row matched — check WATCHED patterns.");
	}

	const fresh = {
		date: ts.date,
		time: ts.time,
		iso: ts.iso,
		source: {
			name: "DOJI",
			branch: branch || DOJI_BRANCH_FALLBACK,
			area: region || DOJI_REGION_FALLBACK,
			url: DOJI_URL,
			raw: ts.source,
		},
		items,
	};

	const existing = readExisting();
	let out;
	if (!existing || !existing.today) {
		// Bootstrap: no previous snapshot yet.
		out = { today: fresh, yesterday: null };
	} else if (fresh.date === existing.today.date) {
		// Same day, mid-day update.
		out = { today: fresh, yesterday: existing.yesterday };
	} else if (fresh.date > existing.today.date) {
		// New day rolled over: promote today → yesterday.
		out = { today: fresh, yesterday: existing.today };
	} else {
		// Clock skew or replay — keep existing.
		console.warn(
			`Fetched date ${fresh.date} < existing today ${existing.today.date}; ignoring.`,
		);
		return;
	}

	writeJson(out);
	var yDate = out.yesterday && out.yesterday.date ? out.yesterday.date : "-";
	console.log(
		"Wrote " +
			OUT_PATH +
			"\n  today=" +
			out.today.date +
			" " +
			out.today.time +
			"  yesterday=" +
			yDate +
			"  items=" +
			items.length,
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});

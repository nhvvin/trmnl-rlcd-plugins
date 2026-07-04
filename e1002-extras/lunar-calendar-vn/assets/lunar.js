/*
 * Vietnamese Lunar Calendar library
 * ---------------------------------
 * Algorithm: Ho Ngoc Duc (2004), the de-facto reference used by
 *            Vietnamese calendar makers and khoahoc.tv / lichvietnam.info.
 * Reference: https://www.informatik.uni-leipzig.de/~duc/amlich/
 *
 * Timezone: fixed to +7 (Asia/Ho_Chi_Minh) so the same date shows the same
 *           lunar day regardless of where the reTerminal is deployed.
 *
 * Public API:
 *   solarToLunar(dd, mm, yy)  -> { day, month, year, leap }
 *   canChiOfYear(lunarYear)   -> "Ất Tỵ"
 *   canChiOfMonth(lunarMonth, lunarYear) -> "Mậu Dần"
 *   canChiOfDay(dd, mm, yy)   -> "Đinh Sửu"
 *   canChiOfHour(hour24, dayCanIdx) -> "Nhâm Tý"
 *   luckyHours(dd, mm, yy)    -> ["Tý (23-01)", "Sửu (01-03)", ...]
 *   festival(dd, mm, yy, ld, lm) -> { name, kind } | null
 *   solarTerm(dd, mm, yy)     -> { name, isStart } | null    (only shown if starts today)
 *   dayOfWeekVN(dd, mm, yy)   -> "Thứ Sáu"
 */

((root) => {
	var CAN = [
		"Giáp",
		"Ất",
		"Bính",
		"Đinh",
		"Mậu",
		"Kỷ",
		"Canh",
		"Tân",
		"Nhâm",
		"Quý",
	];
	var CHI = [
		"Tý",
		"Sửu",
		"Dần",
		"Mão",
		"Thìn",
		"Tỵ",
		"Ngọ",
		"Mùi",
		"Thân",
		"Dậu",
		"Tuất",
		"Hợi",
	];

	// Vietnamese lunar month names use Chi order shifted so that lunar month 1 = Dần.
	// Hence lunar-month->chi index: (lm + 1) % 12 with 0=Tý.
	var LUNAR_MONTH_NAMES = [
		"Giêng",
		"Hai",
		"Ba",
		"Tư",
		"Năm",
		"Sáu",
		"Bảy",
		"Tám",
		"Chín",
		"Mười",
		"Một",
		"Chạp",
	];

	var DAY_OF_WEEK = [
		"Chủ nhật",
		"Thứ hai",
		"Thứ ba",
		"Thứ tư",
		"Thứ năm",
		"Thứ sáu",
		"Thứ bảy",
	];

	var SOLAR_TERMS = [
		"Xuân phân",
		"Thanh minh",
		"Cốc vũ",
		"Lập hạ",
		"Tiểu mãn",
		"Mang chủng",
		"Hạ chí",
		"Tiểu thử",
		"Đại thử",
		"Lập thu",
		"Xử thử",
		"Bạch lộ",
		"Thu phân",
		"Hàn lộ",
		"Sương giáng",
		"Lập đông",
		"Tiểu tuyết",
		"Đại tuyết",
		"Đông chí",
		"Tiểu hàn",
		"Đại hàn",
		"Lập xuân",
		"Vũ thủy",
		"Kinh trập",
	];

	var TIMEZONE_VN = 7;

	// ------------------------------------------------------------------
	//  Julian Day Number helpers
	// ------------------------------------------------------------------

	function jdFromDate(dd, mm, yy) {
		var a = Math.floor((14 - mm) / 12);
		var y = yy + 4800 - a;
		var m = mm + 12 * a - 3;
		var jd =
			dd +
			Math.floor((153 * m + 2) / 5) +
			365 * y +
			Math.floor(y / 4) -
			Math.floor(y / 100) +
			Math.floor(y / 400) -
			32045;
		if (jd < 2299161) {
			jd =
				dd +
				Math.floor((153 * m + 2) / 5) +
				365 * y +
				Math.floor(y / 4) -
				32083;
		}
		return jd;
	}

	// ------------------------------------------------------------------
	//  Astronomical helpers (Ho Ngoc Duc)
	// ------------------------------------------------------------------

	function NewMoon(k) {
		var T = k / 1236.85;
		var T2 = T * T;
		var T3 = T2 * T;
		var dr = Math.PI / 180;
		var Jd1 =
			2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
		Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
		var M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
		var Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
		var F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
		var C1 =
			(0.1734 - 0.000393 * T) * Math.sin(M * dr) +
			0.0021 * Math.sin(2 * dr * M);
		C1 -= 0.4068 * Math.sin(Mpr * dr) - 0.0161 * Math.sin(dr * 2 * Mpr);
		C1 -= 0.0004 * Math.sin(dr * 3 * Mpr);
		C1 += 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
		C1 -=
			0.0074 * Math.sin(dr * (M - Mpr)) - 0.0004 * Math.sin(dr * (2 * F + M));
		C1 -=
			0.0004 * Math.sin(dr * (2 * F - M)) -
			0.0006 * Math.sin(dr * (2 * F + Mpr));
		C1 +=
			0.001 * Math.sin(dr * (2 * F - Mpr)) +
			0.0005 * Math.sin(dr * (2 * Mpr + M));
		var deltat;
		if (T < -11) {
			deltat =
				0.001 +
				0.000839 * T +
				0.0002261 * T2 -
				0.00000845 * T3 -
				0.000000081 * T * T3;
		} else {
			deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
		}
		return Jd1 + C1 - deltat;
	}

	function SunLongitude(jdn) {
		var T = (jdn - 2451545.0) / 36525;
		var T2 = T * T;
		var dr = Math.PI / 180;
		var M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
		var L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
		var DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
		DL +=
			(0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) +
			0.00029 * Math.sin(dr * 3 * M);
		var L = L0 + DL;
		L = L * dr;
		L = L - Math.PI * 2 * Math.floor(L / (Math.PI * 2));
		return L;
	}

	function getSunLongitudeIndex(dayNumber, tz) {
		// returns 0..11 (major solar terms, used for leap-month calculation)
		return Math.floor((SunLongitude(dayNumber - 0.5 - tz / 24) / Math.PI) * 6);
	}

	function getNewMoonDay(k, tz) {
		return Math.floor(NewMoon(k) + 0.5 + tz / 24);
	}

	function getLunarMonth11(yy, tz) {
		var off = jdFromDate(31, 12, yy) - 2415021;
		var k = Math.floor(off / 29.530588853);
		var nm = getNewMoonDay(k, tz);
		var sunLong = getSunLongitudeIndex(nm, tz);
		if (sunLong >= 9) {
			nm = getNewMoonDay(k - 1, tz);
		}
		return nm;
	}

	function getLeapMonthOffset(a11, tz) {
		var k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
		var last = 0;
		var i = 1;
		var arc = getSunLongitudeIndex(getNewMoonDay(k + i, tz), tz);
		do {
			last = arc;
			i++;
			arc = getSunLongitudeIndex(getNewMoonDay(k + i, tz), tz);
		} while (arc !== last && i < 14);
		return i - 1;
	}

	// ------------------------------------------------------------------
	//  Solar -> Lunar conversion
	// ------------------------------------------------------------------

	function solarToLunar(dd, mm, yy, tz) {
		tz = tz == null ? TIMEZONE_VN : tz;
		var dayNumber = jdFromDate(dd, mm, yy);
		var k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
		var monthStart = getNewMoonDay(k + 1, tz);
		if (monthStart > dayNumber) {
			monthStart = getNewMoonDay(k, tz);
		}
		var a11 = getLunarMonth11(yy, tz);
		var b11 = a11;
		var lunarYear;
		if (a11 >= monthStart) {
			lunarYear = yy;
			a11 = getLunarMonth11(yy - 1, tz);
		} else {
			lunarYear = yy + 1;
			b11 = getLunarMonth11(yy + 1, tz);
		}
		var lunarDay = dayNumber - monthStart + 1;
		var diff = Math.floor((monthStart - a11) / 29);
		var lunarLeap = 0;
		var lunarMonth = diff + 11;
		if (b11 - a11 > 365) {
			var leapMonthDiff = getLeapMonthOffset(a11, tz);
			if (diff >= leapMonthDiff) {
				lunarMonth = diff + 10;
				if (diff === leapMonthDiff) {
					lunarLeap = 1;
				}
			}
		}
		if (lunarMonth > 12) lunarMonth -= 12;
		if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
		return {
			day: lunarDay,
			month: lunarMonth,
			year: lunarYear,
			leap: lunarLeap,
		};
	}

	// ------------------------------------------------------------------
	//  Can Chi
	// ------------------------------------------------------------------

	function canChiOfYear(lunarYear) {
		return CAN[(lunarYear + 6) % 10] + " " + CHI[(lunarYear + 8) % 12];
	}

	function canChiOfMonth(lunarMonth, lunarYear) {
		// Month chi is fixed: lunar month 1 = Dần (index 2), month 2 = Mão, ...
		var chiIdx = (lunarMonth + 1) % 12;
		// Month can depends on year's can: year can Giáp/Kỷ -> Jan is Bính Dần; Ất/Canh -> Mậu Dần; ...
		var yearCanIdx = (lunarYear + 6) % 10;
		var startCan = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0][yearCanIdx]; // Bính, Mậu, Canh, Nhâm, Giáp
		var canIdx = (startCan + lunarMonth - 1) % 10;
		return CAN[canIdx] + " " + CHI[chiIdx];
	}

	function canIdxOfDay(dd, mm, yy) {
		return (jdFromDate(dd, mm, yy) + 9) % 10;
	}

	function chiIdxOfDay(dd, mm, yy) {
		return (jdFromDate(dd, mm, yy) + 1) % 12;
	}

	function canChiOfDay(dd, mm, yy) {
		return CAN[canIdxOfDay(dd, mm, yy)] + " " + CHI[chiIdxOfDay(dd, mm, yy)];
	}

	function canChiOfHour(hour24, dayCanIdx) {
		// Hour chi: 23-01 = Tý, 01-03 = Sửu, ...
		var hourChiIdx = Math.floor(((hour24 + 1) % 24) / 2);
		var startCan = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8][dayCanIdx]; // Giáp/Kỷ -> Giáp Tý, ...
		var hourCanIdx = (startCan + hourChiIdx) % 10;
		return CAN[hourCanIdx] + " " + CHI[hourChiIdx];
	}

	// ------------------------------------------------------------------
	//  Giờ hoàng đạo (lucky hours)
	//  Reference table indexed by day chi:
	//    Tý/Ngọ:  Tý  Sửu  Mão  Ngọ  Thân  Dậu
	//    Sửu/Mùi: Dần Mão  Tỵ  Thân Tuất Hợi
	//    Dần/Thân:Tý  Sửu  Thìn Tỵ  Mùi  Tuất
	//    Mão/Dậu: Tý  Dần  Mão  Ngọ Mùi  Dậu
	//    Thìn/Tuất:Dần Thìn Tỵ  Thân Dậu Hợi
	//    Tỵ/Hợi:  Sửu Thìn Ngọ Mùi  Tuất Hợi
	// ------------------------------------------------------------------

	var LUCKY_HOURS_BY_CHI = {
		0: [0, 1, 3, 6, 8, 9], // Tý
		1: [2, 3, 5, 8, 10, 11], // Sửu
		2: [0, 1, 4, 5, 7, 10], // Dần
		3: [0, 2, 3, 6, 7, 9], // Mão
		4: [2, 4, 5, 8, 9, 11], // Thìn
		5: [1, 4, 6, 7, 10, 11], // Tỵ
		6: [0, 1, 3, 6, 8, 9], // Ngọ
		7: [2, 3, 5, 8, 10, 11], // Mùi
		8: [0, 1, 4, 5, 7, 10], // Thân
		9: [0, 2, 3, 6, 7, 9], // Dậu
		10: [2, 4, 5, 8, 9, 11], // Tuất
		11: [1, 4, 6, 7, 10, 11], // Hợi
	};

	var CHI_HOUR_RANGES = [
		"23-01",
		"01-03",
		"03-05",
		"05-07",
		"07-09",
		"09-11",
		"11-13",
		"13-15",
		"15-17",
		"17-19",
		"19-21",
		"21-23",
	];

	function luckyHours(dd, mm, yy) {
		var chiIdx = chiIdxOfDay(dd, mm, yy);
		var indices = LUCKY_HOURS_BY_CHI[chiIdx];
		return indices.map((i) => CHI[i] + " (" + CHI_HOUR_RANGES[i] + ")");
	}

	// ------------------------------------------------------------------
	//  Festivals / holidays
	//  Each entry: { full: '...', short: '...', kind: '...' }
	//    kind = 'major'       — lễ lớn / nghỉ lễ / văn hoá trọng điểm (màu đỏ nổi)
	//    kind = 'observance'  — ngày kỷ niệm Việt Nam (không nghỉ nhưng phổ biến)
	//    kind = 'world'       — International Day (LHQ / WHO / UNESCO...)
	//
	//  For cell display the `short` is used (must fit ~14 chars in month grid).
	// ------------------------------------------------------------------

	var LUNAR_FESTIVALS = {
		"1/1": { full: "Tết Nguyên Đán", short: "Tết", kind: "major" },
		"2/1": { full: "Mùng 2 Tết", short: "Mùng 2 Tết", kind: "major" },
		"3/1": { full: "Mùng 3 Tết", short: "Mùng 3 Tết", kind: "major" },
		"4/1": { full: "Hóa vàng", short: "Hóa vàng", kind: "observance" },
		"15/1": {
			full: "Rằm Tháng Giêng (Thượng Nguyên)",
			short: "Rằm Giêng",
			kind: "major",
		},
		"3/3": {
			full: "Tết Hàn Thực (bánh trôi bánh chay)",
			short: "Hàn Thực",
			kind: "major",
		},
		"10/3": { full: "Giỗ Tổ Hùng Vương", short: "Giỗ Tổ", kind: "major" },
		"8/4": { full: "Lễ Tắm Phật", short: "Tắm Phật", kind: "observance" },
		"15/4": { full: "Đại lễ Phật Đản", short: "Phật Đản", kind: "major" },
		"5/5": {
			full: "Tết Đoan Ngọ (diệt sâu bọ)",
			short: "Đoan Ngọ",
			kind: "major",
		},
		"15/7": {
			full: "Vu Lan Báo Hiếu (Trung Nguyên)",
			short: "Vu Lan",
			kind: "major",
		},
		"15/8": { full: "Tết Trung Thu", short: "Trung Thu", kind: "major" },
		"9/9": { full: "Tết Trùng Cửu", short: "Trùng Cửu", kind: "observance" },
		"10/10": {
			full: "Tết Thường Tân (cơm mới)",
			short: "Thường Tân",
			kind: "observance",
		},
		"15/10": { full: "Tết Hạ Nguyên", short: "Hạ Nguyên", kind: "observance" },
		"1/12": {
			full: "Lễ Tất Niên sớm (khởi cúng)",
			short: "Tất Niên",
			kind: "observance",
		},
		"23/12": {
			full: "Ông Công Ông Táo về trời",
			short: "Ông Táo",
			kind: "major",
		},
	};

	var SOLAR_HOLIDAYS = {
		// -------- Tháng 1 --------
		"1/1": { full: "Tết Dương Lịch", short: "Tết DL", kind: "major" },
		"9/1": {
			full: "Ngày Sinh viên Việt Nam",
			short: "Sinh viên VN",
			kind: "observance",
		},
		// -------- Tháng 2 --------
		"3/2": {
			full: "Thành lập Đảng Cộng sản Việt Nam",
			short: "ĐCS VN",
			kind: "observance",
		},
		"14/2": {
			full: "Valentine (Ngày Lễ Tình Nhân)",
			short: "Valentine",
			kind: "observance",
		},
		"27/2": {
			full: "Ngày Thầy thuốc Việt Nam",
			short: "Thầy thuốc VN",
			kind: "observance",
		},
		// -------- Tháng 3 --------
		"8/3": { full: "Quốc tế Phụ nữ", short: "QT Phụ nữ", kind: "major" },
		"20/3": {
			full: "Hạnh phúc Thế giới (UN)",
			short: "Hạnh phúc",
			kind: "world",
		},
		"21/3": { full: "Quốc tế Rừng", short: "Rừng QT", kind: "world" },
		"22/3": { full: "Quốc tế Nước", short: "Nước QT", kind: "world" },
		"26/3": {
			full: "Thành lập Đoàn TNCS Hồ Chí Minh",
			short: "Đoàn TN",
			kind: "observance",
		},
		// -------- Tháng 4 --------
		"1/4": {
			full: "Cá tháng Tư (Ngày Nói Dối)",
			short: "Cá Tháng Tư",
			kind: "observance",
		},
		"7/4": {
			full: "Sức khoẻ Thế giới (WHO)",
			short: "Sức khoẻ",
			kind: "world",
		},
		"21/4": {
			full: "Ngày Sách Việt Nam",
			short: "Sách VN",
			kind: "observance",
		},
		"22/4": { full: "Ngày Trái Đất", short: "Trái Đất", kind: "world" },
		"23/4": {
			full: "Ngày Sách và Bản quyền Thế giới",
			short: "Sách QT",
			kind: "world",
		},
		"30/4": { full: "Giải Phóng Miền Nam", short: "Giải Phóng", kind: "major" },
		// -------- Tháng 5 --------
		"1/5": { full: "Quốc tế Lao động", short: "QT Lao động", kind: "major" },
		"3/5": {
			full: "Tự do Báo chí Thế giới",
			short: "Tự do Báo chí",
			kind: "world",
		},
		"7/5": {
			full: "Chiến thắng Điện Biên Phủ",
			short: "ĐB Phủ",
			kind: "observance",
		},
		"13/5": {
			full: "Ngày của Mẹ (Chủ nhật 2 tháng 5)",
			short: "Ngày của Mẹ",
			kind: "observance",
		},
		"15/5": {
			full: "Thành lập Đội TNTP Hồ Chí Minh",
			short: "Đội TNTP",
			kind: "observance",
		},
		"19/5": {
			full: "Kỷ niệm sinh nhật Bác Hồ",
			short: "Sinh nhật Bác",
			kind: "major",
		},
		"31/5": {
			full: "Không thuốc lá Thế giới (WHO)",
			short: "Không thuốc lá",
			kind: "world",
		},
		// -------- Tháng 6 --------
		"1/6": { full: "Quốc tế Thiếu nhi", short: "QT Thiếu nhi", kind: "major" },
		"5/6": {
			full: "Môi trường Thế giới (UNEP)",
			short: "Môi trường",
			kind: "world",
		},
		"17/6": {
			full: "Ngày của Cha (Chủ nhật 3 tháng 6)",
			short: "Ngày của Cha",
			kind: "observance",
		},
		"21/6": {
			full: "Báo chí Cách mạng Việt Nam",
			short: "Báo chí VN",
			kind: "observance",
		},
		"28/6": {
			full: "Ngày Gia đình Việt Nam",
			short: "Gia đình VN",
			kind: "observance",
		},
		// -------- Tháng 7 --------
		"11/7": { full: "Dân số Thế giới (UN)", short: "Dân số QT", kind: "world" },
		"27/7": { full: "Ngày Thương binh Liệt sĩ", short: "TBLS", kind: "major" },
		"28/7": {
			full: "Thành lập Công đoàn Việt Nam",
			short: "Công đoàn VN",
			kind: "observance",
		},
		// -------- Tháng 8 --------
		"12/8": {
			full: "Quốc tế Thanh niên (UN)",
			short: "QT Thanh niên",
			kind: "world",
		},
		"19/8": { full: "Cách mạng Tháng Tám", short: "CMT8", kind: "major" },
		// -------- Tháng 9 --------
		"2/9": { full: "Quốc Khánh Việt Nam", short: "Quốc Khánh", kind: "major" },
		"5/9": {
			full: "Khai giảng năm học mới",
			short: "Khai giảng",
			kind: "observance",
		},
		"10/9": {
			full: "Phòng chống tự tử Thế giới",
			short: "Ph. tự tử",
			kind: "world",
		},
		"21/9": {
			full: "Quốc tế Hòa bình (UN)",
			short: "Hòa bình QT",
			kind: "world",
		},
		// -------- Tháng 10 --------
		"1/10": { full: "Quốc tế Người cao tuổi", short: "NCT QT", kind: "world" },
		"5/10": { full: "Quốc tế Nhà giáo", short: "Nhà giáo QT", kind: "world" },
		"10/10": {
			full: "Giải phóng Thủ đô Hà Nội",
			short: "GP Thủ đô",
			kind: "observance",
		},
		"13/10": {
			full: "Ngày Doanh nhân Việt Nam",
			short: "Doanh nhân VN",
			kind: "observance",
		},
		"15/10": { full: "Hội LHTN Việt Nam", short: "HLHTN", kind: "observance" },
		"16/10": {
			full: "Lương thực Thế giới (FAO)",
			short: "Lương thực",
			kind: "world",
		},
		"20/10": { full: "Phụ nữ Việt Nam", short: "PN Việt Nam", kind: "major" },
		"24/10": { full: "Ngày Liên Hợp Quốc", short: "LHQ", kind: "world" },
		"31/10": { full: "Halloween", short: "Halloween", kind: "observance" },
		// -------- Tháng 11 --------
		"9/11": {
			full: "Pháp luật Việt Nam",
			short: "Pháp luật VN",
			kind: "observance",
		},
		"14/11": {
			full: "Đái tháo đường Thế giới",
			short: "ĐTĐ QT",
			kind: "world",
		},
		"20/11": { full: "Nhà giáo Việt Nam", short: "Nhà giáo VN", kind: "major" },
		"23/11": {
			full: "Di sản Văn hoá Việt Nam",
			short: "Di sản VN",
			kind: "observance",
		},
		// -------- Tháng 12 --------
		"1/12": { full: "Thế giới Phòng chống AIDS", short: "AIDS", kind: "world" },
		"3/12": {
			full: "Quốc tế Người Khuyết tật",
			short: "NKT QT",
			kind: "world",
		},
		"10/12": {
			full: "Nhân quyền Thế giới (UN)",
			short: "Nhân quyền",
			kind: "world",
		},
		"19/12": {
			full: "Toàn quốc Kháng chiến",
			short: "TQ Kháng chiến",
			kind: "observance",
		},
		"22/12": {
			full: "Quân đội Nhân dân Việt Nam",
			short: "QP Toàn dân",
			kind: "major",
		},
		"24/12": { full: "Đêm Giáng sinh", short: "Noel", kind: "observance" },
		"25/12": { full: "Lễ Giáng sinh", short: "Giáng sinh", kind: "major" },
		"31/12": {
			full: "Tất niên Dương lịch",
			short: "Tất niên",
			kind: "observance",
		},
	};

	function festival(dd, mm, yy, lunarDay, lunarMonth, lunarLeap) {
		var solarKey = dd + "/" + mm;
		var lunarKey = lunarDay + "/" + lunarMonth;
		var events = [];
		if (SOLAR_HOLIDAYS[solarKey]) {
			var s = SOLAR_HOLIDAYS[solarKey];
			events.push({
				full: s.full,
				short: s.short,
				kind: s.kind,
				calendar: "solar",
			});
		}
		if (!lunarLeap && LUNAR_FESTIVALS[lunarKey]) {
			var l = LUNAR_FESTIVALS[lunarKey];
			events.push({
				full: l.full,
				short: l.short,
				kind: l.kind,
				calendar: "lunar",
			});
		}
		// Giao Thừa: last day of lunar month 12 (29 or 30 depending on month length)
		if (!lunarLeap && lunarMonth === 12) {
			// If the JDN of tomorrow maps to lunar 1/1, today is Giao Thừa (Tất Niên).
			var tomorrowJd = jdFromDate(dd, mm, yy) + 1;
			var tomorrow = jdToDate(tomorrowJd);
			var tomorrowLunar = solarToLunar(
				tomorrow.day,
				tomorrow.month,
				tomorrow.year,
			);
			if (tomorrowLunar.day === 1 && tomorrowLunar.month === 1) {
				events.push({
					full: "Giao Thừa (Tất Niên)",
					short: "Giao Thừa",
					kind: "major",
					calendar: "lunar",
				});
			}
		}
		return events;
	}

	function jdToDate(jd) {
		var a, b, c;
		if (jd > 2299160) {
			a = jd + 32044;
			b = Math.floor((4 * a + 3) / 146097);
			c = a - Math.floor((b * 146097) / 4);
		} else {
			b = 0;
			c = jd + 32082;
		}
		var d = Math.floor((4 * c + 3) / 1461);
		var e = c - Math.floor((1461 * d) / 4);
		var m = Math.floor((5 * e + 2) / 153);
		return {
			day: e - Math.floor((153 * m + 2) / 5) + 1,
			month: m + 3 - 12 * Math.floor(m / 10),
			year: b * 100 + d - 4800 + Math.floor(m / 10),
		};
	}

	// ------------------------------------------------------------------
	//  Solar term (tiết khí)
	//  Returns the tiết starting today (if any), else the current tiết we're in.
	// ------------------------------------------------------------------

	function solarTerm(dd, mm, yy) {
		var jd = jdFromDate(dd, mm, yy);
		// Tiết khí at Vietnam local noon (JD offset -0.5 for start of day + 0.5 for noon = 0)
		var todayIdx = Math.floor(
			(SunLongitude(jd - TIMEZONE_VN / 24) / Math.PI) * 12,
		);
		var yesterdayIdx = Math.floor(
			(SunLongitude(jd - 1 - TIMEZONE_VN / 24) / Math.PI) * 12,
		);
		var isStart = todayIdx !== yesterdayIdx;
		return { name: SOLAR_TERMS[todayIdx], isStart: isStart };
	}

	function dayOfWeekVN(dd, mm, yy) {
		// JS Date's getDay is fine for Gregorian dates >= 1582; use UTC to avoid TZ jitter
		var d = new Date(Date.UTC(yy, mm - 1, dd));
		return DAY_OF_WEEK[d.getUTCDay()];
	}

	// ------------------------------------------------------------------
	//  Exports
	// ------------------------------------------------------------------

	var api = {
		CAN: CAN,
		CHI: CHI,
		LUNAR_MONTH_NAMES: LUNAR_MONTH_NAMES,
		solarToLunar: solarToLunar,
		canChiOfYear: canChiOfYear,
		canChiOfMonth: canChiOfMonth,
		canChiOfDay: canChiOfDay,
		canChiOfHour: canChiOfHour,
		canIdxOfDay: canIdxOfDay,
		chiIdxOfDay: chiIdxOfDay,
		luckyHours: luckyHours,
		festival: festival,
		solarTerm: solarTerm,
		dayOfWeekVN: dayOfWeekVN,
		jdFromDate: jdFromDate,
		jdToDate: jdToDate,
	};

	if (typeof module !== "undefined" && module.exports) {
		module.exports = api;
	} else {
		root.VNLunar = api;
	}
})(typeof window !== "undefined" ? window : globalThis);

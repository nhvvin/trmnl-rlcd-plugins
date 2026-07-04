/*
 * Render one full month for reTerminal E1002.
 *
 *   Default:   this month, today highlighted.
 *   Override:  ?month=YYYY-MM        (show that month, no highlight)
 *              ?date=YYYY-MM-DD      (show that month, that day highlighted)
 *              ?debug=1              (show a debug badge)
 */

(() => {
  

  var VN_MONTHS = ['Giêng', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'Tám', 'Chín', 'Mười', 'Một', 'Chạp'];

  // Short festival tags used inside grid cells (long names go into #legend below).
  var LUNAR_FESTIVAL_TAGS = {
    '1/1':   'Tết',
    '2/1':   'Mùng 2',
    '3/1':   'Mùng 3',
    '15/1':  'Rằm G. Giêng',
    '3/3':   'Hàn Thực',
    '10/3':  'Giỗ Tổ',
    '15/4':  'Phật Đản',
    '5/5':   'Đoan Ngọ',
    '15/7':  'Vu Lan',
    '15/8':  'Trung Thu',
    '9/9':   'Trùng Cửu',
    '10/10': 'Thường Tân',
    '15/10': 'Hạ Nguyên',
    '23/12': 'Ông Táo'
  };

  var SOLAR_HOLIDAY_TAGS = {
    '1/1':  'Tết DL',
    '14/2': 'Valentine',
    '8/3':  'QT Phụ nữ',
    '30/4': 'Giải Phóng',
    '1/5':  'QT Lao động',
    '1/6':  'QT Thiếu nhi',
    '27/7': 'TBLS',
    '19/8': 'CMT8',
    '2/9':  'Quốc Khánh',
    '20/10':'PN Việt Nam',
    '20/11':'Nhà giáo',
    '22/12':'Quân đội',
    '25/12':'Giáng sinh'
  };

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function todayInVN() {
    var now = new Date();
    var utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    var vn = new Date(utcMs + 7 * 3600 * 1000);
    return { day: vn.getDate(), month: vn.getMonth() + 1, year: vn.getFullYear() };
  }

  function parseQuery() {
    var q = {};
    (location.search || '').replace(/^\?/, '').split('&').forEach((kv) => {
      if (!kv) return;
      var i = kv.indexOf('=');
      q[decodeURIComponent(kv.substr(0, i < 0 ? kv.length : i))] =
        i < 0 ? '' : decodeURIComponent(kv.substr(i + 1));
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
      var d = q.date.split('-').map(Number);
      return { year: d[0], month: d[1], highlight: d[2] };
    }
    if (q.month && /^\d{4}-\d{1,2}$/.test(q.month)) {
      var m = q.month.split('-').map(Number);
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

    document.getElementById('title').textContent = 'Tháng ' + m + ', ' + y;

    var metaHtml = document.getElementById('meta');
    // meta shows: lunar span + year Can Chi
    var yearsInvolved = firstLunar.year === lastLunar.year
      ? L.canChiOfYear(firstLunar.year)
      : L.canChiOfYear(firstLunar.year) + ' → ' + L.canChiOfYear(lastLunar.year);
    var lunarSpan = 'Âm lịch: ' + firstLunar.day + '/' + firstLunar.month
      + ' → ' + lastLunar.day + '/' + lastLunar.month;
    metaHtml.textContent = lunarSpan + '   ·   Năm ' + yearsInvolved;

    // ---- Grid ----
    var grid = document.getElementById('grid');
    while (grid.firstChild) grid.removeChild(grid.firstChild);

    var firstCol = weekdayVN(y, m, 1);          // 0..6
    var totalDays = daysInMonth(y, m);
    var totalCells = 42;                          // always 6 rows x 7 cols

    // Pre-month padding: days from previous month
    var pm = prevMonth(y, m);
    var pmDays = daysInMonth(pm.y, pm.m);

    var legendItems = [];

    for (var i = 0; i < totalCells; i++) {
      var col = i % 7;
      var isSunCol = col === 6;

      var cellY, cellM, cellD, isOther;
      if (i < firstCol) {
        cellY = pm.y; cellM = pm.m; cellD = pmDays - (firstCol - 1 - i);
        isOther = true;
      } else if (i - firstCol < totalDays) {
        cellY = y; cellM = m; cellD = i - firstCol + 1;
        isOther = false;
      } else {
        var nm = nextMonth(y, m);
        cellY = nm.y; cellM = nm.m; cellD = i - firstCol - totalDays + 1;
        isOther = true;
      }

      var lunar = L.solarToLunar(cellD, cellM, cellY);

      // Festival lookup — only for in-month cells (avoid clutter)
      var festTag = '';
      var festFull = '';
      if (!isOther) {
        var solarKey = cellD + '/' + cellM;
        var lunarKey = lunar.day + '/' + lunar.month;
        if (SOLAR_HOLIDAY_TAGS[solarKey]) {
          festTag = SOLAR_HOLIDAY_TAGS[solarKey];
          festFull = SOLAR_HOLIDAY_TAGS[solarKey];
        }
        if (!lunar.leap && LUNAR_FESTIVAL_TAGS[lunarKey]) {
          festTag = LUNAR_FESTIVAL_TAGS[lunarKey];
          festFull = LUNAR_FESTIVAL_TAGS[lunarKey];
        }
        if (festFull) {
          legendItems.push({ day: cellD, name: festFull });
        }
      }

      // Cell DOM
      var cell = document.createElement('div');
      cell.className = 'cell';
      if (isSunCol) cell.classList.add('sun');
      if (isOther) cell.classList.add('other');
      if (!isOther && cellD === highlight && cellM === m && cellY === y) {
        cell.classList.add('today');
      }
      if (festTag && !isOther) cell.classList.add('has-fest');

      var solarEl = document.createElement('div');
      solarEl.className = 'solar';
      solarEl.textContent = cellD;
      cell.appendChild(solarEl);

      var lunarEl = document.createElement('div');
      lunarEl.className = 'lunar';
      if (lunar.day === 1) {
        lunarEl.classList.add('first');
        lunarEl.textContent = '1/' + lunar.month + (lunar.leap ? '*' : '');
      } else {
        lunarEl.textContent = String(lunar.day);
      }
      cell.appendChild(lunarEl);

      if (festTag && !isOther) {
        var festEl = document.createElement('div');
        festEl.className = 'fest';
        festEl.textContent = festTag;
        cell.appendChild(festEl);
      }

      grid.appendChild(cell);
    }

    // ---- Legend ----
    var legend = document.getElementById('legend');
    while (legend.firstChild) legend.removeChild(legend.firstChild);

    if (legendItems.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'Không có lễ / sự kiện đặc biệt trong tháng.';
      legend.appendChild(empty);
    } else {
      // Deduplicate & sort by day
      legendItems.sort((a, b) => a.day - b.day);
      legendItems.forEach((it) => {
        var wrap = document.createElement('div');
        wrap.className = 'item';
        var dayEl = document.createElement('span');
        dayEl.className = 'day';
        dayEl.textContent = String(it.day);
        var nameEl = document.createElement('span');
        nameEl.className = 'name';
        nameEl.textContent = it.name;
        wrap.appendChild(dayEl);
        wrap.appendChild(nameEl);
        legend.appendChild(wrap);
      });
    }

    // ---- Debug ----
    if (parseQuery().debug) {
      document.body.classList.add('debug');
      document.getElementById('debug-badge').textContent =
        'DEBUG ' + y + '-' + pad2(m) + (highlight ? '-' + pad2(highlight) : '');
    }
  }

  function showFatal(err) {
    while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
    var pre = document.createElement('pre');
    pre.style.cssText = 'padding:24px;font:14px monospace;color:#c00';
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

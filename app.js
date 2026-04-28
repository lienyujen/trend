const BASELINE_DATE = new Date('2026-04-28');

const sourceDirectory = [
  {
    category: 'LCD/OLED 面板報價',
    name: 'TrendForce - WitsView / DRAMeXchange',
    coverage: 'TV、Monitor、NB 面板與記憶體/NAND 報價（多為訂閱）',
    cadence: '日/週',
    access: 'https://www.trendforce.com/'
  },
  {
    category: 'LCD/OLED 面板報價',
    name: 'DSCC (Counterpoint)',
    coverage: '顯示器供需、面板價格、IT/TV Display intelligence',
    cadence: '週/月',
    access: 'https://www.counterpointresearch.com/dscc/'
  },
  {
    category: 'LCD/OLED 面板報價',
    name: 'Omdia Displays',
    coverage: '各尺寸面板價格資料庫與預測',
    cadence: '週/月',
    access: 'https://omdia.tech.informa.com/'
  },
  {
    category: 'IFP / 大型觸控',
    name: 'Futuresource Consulting',
    coverage: '教育/商用 IFP 市場追蹤與價格趨勢',
    cadence: '季/月',
    access: 'https://www.futuresource-consulting.com/'
  },
  {
    category: '觸控面板/玻璃',
    name: 'CINNO Research',
    coverage: '觸控、顯示、材料（含玻璃）追蹤',
    cadence: '週/月',
    access: 'https://www.cinno.com/'
  },
  {
    category: '鋼化玻璃現貨',
    name: 'Made-in-China / Alibaba B2B 報價',
    coverage: '大型鋼化玻璃、觸控蓋板、客製規格即時刊價',
    cadence: '即時刊登',
    access: 'https://www.made-in-china.com/ ; https://www.alibaba.com/'
  },
  {
    category: 'SSD/NAND',
    name: 'CFMFlash',
    coverage: 'NAND Flash 現貨價格與供應鏈資訊',
    cadence: '日/週',
    access: 'https://www.cfmflash.com/'
  },
  {
    category: 'SSD/NAND',
    name: 'SSD Prices Tracker',
    coverage: '消費級 SSD 歷史與當前價格',
    cadence: '日',
    access: 'https://ssdprices.com/'
  },
  {
    category: 'DRAM/記憶體',
    name: 'Tom\'s Hardware RAM Price Trends',
    coverage: 'DDR4/DDR5 消費市場價格趨勢',
    cadence: '月',
    access: 'https://www.tomshardware.com/'
  },
  {
    category: '零組件即時電商',
    name: 'DigiKey / Mouser / Arrow',
    coverage: '工規 SSD、DRAM 模組、控制器即時報價',
    cadence: '即時',
    access: 'https://www.digikey.com/ ; https://www.mouser.com/ ; https://www.arrow.com/'
  }
];

const seriesSeeds = {
  panel: { name: '面板綜合指數', base: 100, drift: -0.01, vol: 0.12 },
  ifp: { name: 'IFP 成品指數', base: 100, drift: -0.005, vol: 0.08 },
  glass: { name: '觸控/鋼化玻璃指數', base: 100, drift: 0.002, vol: 0.09 },
  ssd: { name: 'SSD 指數', base: 100, drift: 0.006, vol: 0.14 },
  memory: { name: 'DRAM 記憶體指數', base: 100, drift: 0.01, vol: 0.2 }
};

let chart;
let timeline = [];
let dataMap = {};

function fmtDate(date) {
  return date.toISOString().slice(0, 10);
}

function buildTimeline(start, end) {
  const out = [];
  const d = new Date(start);
  while (d <= end) {
    out.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return out;
}

function seededNoise(i, key) {
  const seed = key.length * 13 + i * 31;
  return Math.sin(seed) * 0.5 + Math.cos(seed / 2) * 0.5;
}

function generateSeries(seed, dates, baselineIndex, smoothing) {
  let v = seed.base;
  return dates.map((_, i) => {
    const pastOrFutureFactor = i <= baselineIndex ? 1 : 1 + smoothing;
    const n = seededNoise(i, seed.name) * seed.vol * pastOrFutureFactor;
    v = Math.max(40, v * (1 + seed.drift + n / 10));
    return Number(v.toFixed(2));
  });
}

function importData(rawRows) {
  // 預留：可把付費報價平台匯出的 CSV 轉成 dataMap。
  // rawRows 預期格式: [{date:'2026-04-28',panel:100,...}]
  return rawRows;
}

function rebuildData() {
  const historyStart = new Date(document.getElementById('historyStart').value);
  const forecastEnd = new Date(document.getElementById('forecastEnd').value);
  const smoothing = Number(document.getElementById('smoothing').value || 0.35);

  timeline = buildTimeline(historyStart, forecastEnd);
  const baselineIndex = timeline.findIndex((d) => d >= BASELINE_DATE);

  dataMap = Object.fromEntries(
    Object.entries(seriesSeeds).map(([key, seed]) => [
      key,
      {
        name: seed.name,
        values: generateSeries(seed, timeline, baselineIndex, smoothing)
      }
    ])
  );

  setupSlider();
  renderChart();
  updateSnapshot(Number(document.getElementById('dateSlider').value || 0));
}

function setupSlider() {
  const slider = document.getElementById('dateSlider');
  slider.min = 0;
  slider.max = Math.max(0, timeline.length - 1);

  const baselineIndex = Math.max(0, timeline.findIndex((d) => d >= BASELINE_DATE));
  slider.value = baselineIndex;

  document.getElementById('minDate').textContent = fmtDate(timeline[0]);
  document.getElementById('maxDate').textContent = fmtDate(timeline.at(-1));
  document.getElementById('selectedDate').textContent = fmtDate(timeline[baselineIndex]);
}

function renderChart() {
  const labels = timeline.map(fmtDate);
  const datasets = Object.values(dataMap).map((s, idx) => ({
    label: s.name,
    data: s.values,
    borderWidth: 2,
    pointRadius: 0,
    tension: 0.2,
    borderColor: ['#38bdf8', '#22d3ee', '#a78bfa', '#f97316', '#84cc16'][idx]
  }));

  if (chart) chart.destroy();

  chart = new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        y: { title: { display: true, text: '價格指數 (Base=100)' } }
      }
    }
  });
}

function updateSnapshot(index) {
  if (!timeline.length) return;
  document.getElementById('selectedDate').textContent = fmtDate(timeline[index]);
  const box = document.getElementById('snapshotCards');
  box.innerHTML = Object.values(dataMap)
    .map((s) => {
      const current = s.values[index];
      const prev = s.values[Math.max(0, index - 1)];
      const delta = (((current - prev) / prev) * 100).toFixed(2);
      const trend = Number(delta) >= 0 ? '▲' : '▼';
      return `<article class="card"><h3>${s.name}</h3><p><strong>${current}</strong></p><p>${trend} ${delta}%（相對前一期）</p></article>`;
    })
    .join('');
}

function renderSourceTable() {
  const body = document.getElementById('sourceTableBody');
  body.innerHTML = sourceDirectory
    .map(
      (s) => `<tr>
      <td>${s.category}</td>
      <td>${s.name}</td>
      <td>${s.coverage}</td>
      <td>${s.cadence}</td>
      <td>${s.access
        .split(';')
        .map((u) => u.trim())
        .map((u) => `<a href="${u}" target="_blank" rel="noreferrer">${u}</a>`)
        .join('<br/>')}</td>
    </tr>`
    )
    .join('');
}

function initForm() {
  const historyStart = new Date('2023-01-01');
  const forecastEnd = new Date('2028-12-31');
  document.getElementById('historyStart').value = fmtDate(historyStart);
  document.getElementById('forecastEnd').value = fmtDate(forecastEnd);

  document.getElementById('refreshBtn').addEventListener('click', rebuildData);
  document.getElementById('dateSlider').addEventListener('input', (e) => {
    updateSnapshot(Number(e.target.value));
  });
}

initForm();
renderSourceTable();
rebuildData();

window.importData = importData;

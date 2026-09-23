/* Google · Kakao RTB 대시보드 공통 스크립트 — 페이지가 const WEEK(최근 7일)를 먼저 정의한 뒤 이 파일을 불러옵니다 */

const WK_METRICS = [
    { k: 'imp', label: '노출수', color: '#4f6bed', fmt: v => Math.round(v).toLocaleString('ko-KR'), short: v => Math.round(v / 1e4).toLocaleString('ko-KR') + '만' },
    { k: 'clk', label: '클릭수', color: '#ff7a59', fmt: v => Math.round(v).toLocaleString('ko-KR') },
    { k: 'ctr', label: '클릭률 (CTR)', color: '#1fb5a3', fmt: v => v.toFixed(3) + '%' },
    { k: 'roas', label: '세션 ROAS', color: '#f5a524', fmt: v => v + '%' },
    { k: 'spend', label: '소진금액', color: '#9b6bdf', fmt: v => Math.round(v).toLocaleString('ko-KR') + '원', short: v => Math.round(v / 1e4).toLocaleString('ko-KR') + '만원' },
];
(function () {
    const max = Object.fromEntries(WK_METRICS.map(m => [m.k, Math.max(...WEEK.map(r => r[m.k]))]));
    document.getElementById('wkLegend').innerHTML = WK_METRICS.map(m => `<span><i style="background:${m.color}"></i>${m.label}</span>`).join('');
    document.getElementById('wk').innerHTML = WEEK.map((r, i) => `
    <div class="wk-day${i === WEEK.length - 1 ? ' today' : ''}">
      <div class="wk-bars">${WK_METRICS.map(m => `
<div class="wk-col" data-k="${m.k}" title="${r.d} ${m.label}: ${m.fmt(r[m.k])}">
  <b>${(m.short || m.fmt)(r[m.k])}</b>
  <i style="height:${(r[m.k] / max[m.k] * 85).toFixed(1)}%;background:${m.color}"></i>
</div>`).join('')}
      </div>
      <div class="wk-date">${r.d}${i === WEEK.length - 1 ? ' (어제)' : ''}</div>
    </div>`).join('');

    // 바에 마우스를 올리면 같은 지표의 7일 추이를 선으로 연결
    const wk = document.getElementById('wk');
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'wk-line');
    wk.appendChild(svg);
    let cur = null;
    const show = k => {
        if (k === cur) return;
        cur = k;
        const m = WK_METRICS.find(x => x.k === k);
        const box = wk.getBoundingClientRect();
        svg.setAttribute('width', wk.scrollWidth);
        svg.setAttribute('height', wk.clientHeight);
        const pts = [...wk.querySelectorAll(`.wk-col[data-k="${k}"] i`)].map(el => {
            const r = el.getBoundingClientRect();
            return [r.left + r.width / 2 - box.left, r.top - box.top];
        });
        svg.innerHTML = `<polyline fill="none" stroke="${m.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${pts.map(p => p.join(',')).join(' ')}"/>`
            + pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="#fff" stroke="${m.color}" stroke-width="2"/>`).join('');
        wk.classList.add('hl');
        wk.querySelectorAll('.wk-col').forEach(c => c.classList.toggle('on', c.dataset.k === k));
    };
    wk.addEventListener('mouseover', e => { const c = e.target.closest('.wk-col'); if (c) show(c.dataset.k); });
    wk.addEventListener('mouseleave', () => { cur = null; svg.innerHTML = ''; wk.classList.remove('hl'); });

})();

// ② 어제 vs 그제 — 어제 값 + 그제 대비 증감
(function () {
    const Y = WEEK[WEEK.length - 1], B = WEEK[WEEK.length - 2]; // 어제, 그제 (WEEK 마지막 = 어제)
    const YC = '#3446b8', BC = '#b9bfca';
    document.getElementById('ydHead').innerHTML = `<span><i style="background:${YC}"></i>어제 ${Y.d}</span><span><i style="background:${BC}"></i>그제 ${B.d}</span>`;
    document.getElementById('yd').innerHTML = WK_METRICS.map(m => {
        const y = Y[m.k], b = B[m.k];
        const ratio = m.k === 'ctr' || m.k === 'roas';
        const diff = ratio ? y - b : (y / b - 1) * 100;
        const txt = ratio ? `${Math.abs(diff).toFixed(m.k === 'ctr' ? 3 : 0)}%` : `${Math.abs(diff).toFixed(1)}%`;
        const cls = Math.abs(diff) < 0.0005 ? 'flat' : diff > 0 ? 'up' : 'down';
        const arrow = cls === 'flat' ? '−' : diff > 0 ? '▲' : '▼';
        const mx = Math.max(y, b);
        return `<div class="yd-item">
            <div class="yd-top"><span class="yd-label">${m.label}</span><span class="yd-chg ${cls}">${arrow} ${txt}</span></div>
            <div class="yd-row now"><span class="yd-day">어제</span><span class="yd-num">${m.fmt(y)}</span></div>
            <span class="yd-track"><span style="width:${y / mx * 100}%;background:${YC}"></span></span>
            <div class="yd-row"><span class="yd-day">그제</span><span class="yd-num">${m.fmt(b)}</span></div>
            <span class="yd-track"><span style="width:${b / mx * 100}%;background:${BC}"></span></span>
        </div>`;
    }).join('');
})();

// ④ 일별 데이터 그래프 — 지표 다중 선택 (데이터는 ⑤ 표에서 읽음)
(function () {
    const num = t => parseFloat(t.replace(/[^0-9.]/g, ''));
    const DAYS = [...document.querySelectorAll('.scroll tbody tr')].map(tr => {
        const c = [...tr.children].map(td => td.textContent.trim());
        return { d: c[0], imp: num(c[1]), clk: num(c[2]), ctr: num(c[3]), roas: num(c[4]), spend: num(c[5]) };
    }).reverse();
    const sel = new Set(['clk', 'ctr']);
    const box = document.getElementById('dlChart'), svg = document.getElementById('dlSvg'), tip = document.getElementById('dlTip');
    const tg = document.getElementById('dlToggles');

    function drawToggles() {
        tg.innerHTML = WK_METRICS.map(m => `<button type="button" role="checkbox" data-k="${m.k}" style="--c:${m.color}" aria-checked="${sel.has(m.k)}" aria-pressed="${sel.has(m.k)}"><i></i>${m.label}</button>`).join('');
    }
    tg.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        const k = b.dataset.k;
        sel.has(k) ? sel.delete(k) : sel.add(k);
        drawToggles(); draw();
    });

    const L = 24, R = 24, T = 16, B = 30;
    let W = 0, H = 0, xs = [];
    function draw() {
        W = box.clientWidth; H = box.clientHeight;
        svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        const n = DAYS.length, iw = W - L - R, ih = H - T - B;
        xs = DAYS.map((_, i) => L + (n === 1 ? iw / 2 : i / (n - 1) * iw));
        let out = '';
        for (let g = 0; g <= 4; g++) { const y = T + ih * g / 4; out += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="#eceef1"/>`; }
        const fs = iw / Math.max(1, n - 1) < 40 ? 9.5 : 11;   // 날짜 전부 표시 (좁으면 글씨 작게)
        DAYS.forEach((r, i) => { out += `<text x="${xs[i]}" y="${H - 8}" font-size="${fs}" fill="#888" text-anchor="middle">${r.d}</text>`; });
        WK_METRICS.filter(m => sel.has(m.k)).forEach(m => {
            const v = DAYS.map(r => r[m.k]), lo = Math.min(...v), hi = Math.max(...v), pad = (hi - lo || 1) * 0.08;
            const y = x => T + ih - (x - lo + pad) / (hi - lo + pad * 2) * ih;
            const pts = v.map((x, i) => `${xs[i].toFixed(1)},${y(x).toFixed(1)}`).join(' ');
            out += `<polyline fill="none" stroke="${m.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${pts}"/>`;
            out += `<circle cx="${xs[n - 1]}" cy="${y(v[n - 1])}" r="4" fill="${m.color}" stroke="#fff" stroke-width="2"/>`;
            m._y = y;
        });
        out += `<g id="dlHover" visibility="hidden"><line id="dlLine" y1="${T}" y2="${T + ih}" stroke="#9aa0a8" stroke-dasharray="3 3"/>${WK_METRICS.filter(m => sel.has(m.k)).map(m => `<circle data-k="${m.k}" r="5" fill="${m.color}" stroke="#fff" stroke-width="2"/>`).join('')}</g>`;
        if (!sel.size) out += `<text x="${W / 2}" y="${T + ih / 2}" font-size="13" fill="#9aa0a8" text-anchor="middle">위에서 보고 싶은 지표를 선택하세요</text>`;
        svg.innerHTML = out;
    }
    function hover(e) {
        const rect = svg.getBoundingClientRect(), x = e.clientX - rect.left;
        let i = 0; xs.forEach((v, j) => { if (Math.abs(v - x) < Math.abs(xs[i] - x)) i = j; });
        const r = DAYS[i], g = document.getElementById('dlHover'), ln = document.getElementById('dlLine');
        g.setAttribute('visibility', 'visible');
        ln.setAttribute('x1', xs[i]); ln.setAttribute('x2', xs[i]);
        g.querySelectorAll('circle').forEach(c => { const m = WK_METRICS.find(m => m.k === c.dataset.k); c.setAttribute('cx', xs[i]); c.setAttribute('cy', m._y(r[m.k])); });
        tip.innerHTML = `<b>${r.d}</b>` + WK_METRICS.filter(m => sel.has(m.k)).map(m => `<span><em style="font-style:normal"><i style="background:${m.color}"></i>${m.label}</em>${m.fmt(r[m.k])}</span>`).join('');
        tip.hidden = false;
        const tw = tip.offsetWidth;
        tip.style.left = (xs[i] + 14 + tw > W ? xs[i] - 14 - tw : xs[i] + 14) + 'px';
    }
    svg.addEventListener('mousemove', hover);
    svg.addEventListener('mouseleave', () => { tip.hidden = true; const g = document.getElementById('dlHover'); if (g) g.setAttribute('visibility', 'hidden'); });
    window.addEventListener('resize', draw);
    drawToggles(); draw();
})();

// ⑤ 일별 성과 테이블 — 헤더 클릭 정렬 (처음 클릭: 높은 순, 다시 클릭: 낮은 순)
(function () {
    const table = document.querySelector('.scroll table'), tbody = table.querySelector('tbody');
    const num = t => parseFloat(t.replace(/[^0-9.]/g, ''));
    const ths = [...table.querySelectorAll('thead th')];
    ths.forEach((th, i) => {
        th.innerHTML = `<button type="button" class="sort-btn" title="▲ 큰 순 · ▼ 작은 순 (이름을 누르면 번갈아 정렬)">${th.textContent}<span class="arw" aria-hidden="true"><span class="arw-up">▲</span><span class="arw-dn">▼</span></span></button>`;
        th.querySelector('button').addEventListener('click', e => {
            const b = e.currentTarget, hit = e.target.closest('.arw-up, .arw-dn'), dir = hit ? (hit.classList.contains('arw-up') ? 'desc' : 'asc') : (b.dataset.dir === 'desc' ? 'asc' : 'desc');
            ths.forEach(t => { delete t.querySelector('button').dataset.dir; t.removeAttribute('aria-sort'); });
            b.dataset.dir = dir; th.setAttribute('aria-sort', dir === 'desc' ? 'descending' : 'ascending');
            const rows = [...tbody.rows], key = r => i === 0 ? r.cells[0].textContent.trim() : num(r.cells[i].textContent);
            rows.sort((a, c) => { const x = key(a), y = key(c); return (x > y ? 1 : x < y ? -1 : 0) * (dir === 'desc' ? -1 : 1); });
            rows.forEach(r => tbody.appendChild(r));
        });
    });
    // 처음에는 날짜 최신순
    ths[0].querySelector('button').dataset.dir = 'desc'; ths[0].setAttribute('aria-sort', 'descending');
})();

// ⑤ 일별 성과 테이블 — 헤더 바로 아래 합계 행 (정렬해도 고정)
(function () {
    const table = document.querySelector('.scroll table');
    const num = t => parseFloat(t.replace(/[^0-9.]/g, ''));
    const rows = [...table.tBodies[0].rows].map(r => [...r.cells].map(c => c.textContent.trim()));
    const imp = rows.reduce((a, r) => a + num(r[1]), 0);
    const clk = rows.reduce((a, r) => a + num(r[2]), 0);
    const spend = rows.reduce((a, r) => a + num(r[5]), 0);
    const roas = rows.reduce((a, r) => a + num(r[4]) * num(r[5]), 0) / spend;   // 소진금액 가중 평균
    const f = n => Math.round(n).toLocaleString('ko-KR');
    const tr = document.createElement('tr');
    tr.className = 'total-row';
    tr.innerHTML = `<td>합계</td><td>${f(imp)}</td><td>${f(clk)}</td><td>${(clk / imp * 100).toFixed(3)}%</td><td title="소진금액 가중 평균">${Math.round(roas)}%</td><td>${f(spend)}원</td>`;
    table.tHead.appendChild(tr);
})();
document.querySelectorAll('.tabs').forEach(t => t.querySelectorAll('button').forEach(b => b.onclick = () => { t.querySelectorAll('button').forEach(x => x.classList.remove('active')); b.classList.add('active') }));
    

/* 맨 위로 버튼 — 300px 이상 내려가면 표시 */
(function () {
    const b = document.getElementById('toTop');
    const on = () => b.classList.toggle('show', window.scrollY > 300);
    window.addEventListener('scroll', on, { passive: true });
    b.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    on();
})();
    

/* 1. 당월 핵심 성과 — 기간 · 일 평균 보조 지표 (5번 일별 표에서 계산) */
(function () {
    const rows = [...document.querySelectorAll('#dailyTable tbody tr, table tbody tr')].map(tr => [...tr.cells].map(td => td.textContent.trim())).filter(c => /^\d\d\/\d\d$/.test(c[0] || ''));
    if (!rows.length) return;
    const num = s => +String(s).replace(/[^0-9.\-]/g, '');
    const days = rows.length, dates = rows.map(r => r[0]).sort();
    const imp = rows.reduce((a, r) => a + num(r[1]), 0), clk = rows.reduce((a, r) => a + num(r[2]), 0), spend = rows.reduce((a, r) => a + num(r[5]), 0);
    const f = n => Math.round(n).toLocaleString('ko-KR');
    const ctrs = rows.map(r => num(r[3]));
    const per = document.getElementById('kpiPeriod');
    if (per) per.textContent = `${dates[0]} ~ ${dates[dates.length - 1]} · ${days}일 누계`;
    const sub = {
        imp: `일 평균 <b>${f(imp / days)}</b>`,
        clk: `일 평균 <b>${f(clk / days)}</b>`,
        ctr: `일별 최고 <b>${Math.max(...ctrs).toFixed(3)}%</b> · 최저 <b>${Math.min(...ctrs).toFixed(3)}%</b>`,
        roas: `세션매출 ÷ 소진 <span class="pill">24시간</span>`,
        spend: `일 평균 <b>${f(spend / days)}원</b> · CPC <b>${clk ? f(spend / clk) : '−'}원</b>`,
    };
    document.querySelectorAll('.kpi-sub[data-kpi]').forEach(el => { el.innerHTML = sub[el.dataset.kpi] || ''; });
})();
    

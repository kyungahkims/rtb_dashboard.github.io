/* =====================================================================
   프레임 AB 테스트 페이지 공통 스크립트 — 상품 고정 · 상품 오토(웹, 앱) · 비상품 페이지가 함께 씁니다.
   불러오는 순서: frame_timeline.js → frame_common.js → 페이지 스크립트(THEMES · 데이터 · ROWS/DATES/TODAY/PERIOD_FROM 정의 후 initFramePage() 호출 → 페이지 전용 섹션)
   페이지가 정해 두는 것: THEMES, ROWS, DATES, TODAY, PERIOD_FROM, (선택) MIN_IMP
   ===================================================================== */

// 프레임 표시색 (ring이 있으면 테두리색)
const sw = T => `background:${T.color}${T.ring ? `;box-shadow:inset 0 0 0 2px ${T.ring}` : ''}`;
const cv = T => `--c:${T.color}${T.ring ? `;--r:${T.ring}` : ''}`;
const AB_LABEL = { after: 'After · 신규', before: 'Before · 기존' };   // 비포/애프터 비교 표시 (ab: 'after' = 새로 만든 프레임)

const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (s, n) => { const [y, m, d] = s.split('-').map(Number); return ymd(new Date(y, m - 1, d + n)); };
const md = s => s.slice(5).replace('-', '/');

/* ---------- 공통 ---------- */
const MIN = () => typeof MIN_IMP === 'number' ? MIN_IMP : 1;   // 페이지가 MIN_IMP를 정하면 그 미만 노출은 CTR 0 (집계 제외)
const sum = rows => { const o = { imp: 0, clk: 0 }; for (const r of rows) { o.imp += r.imp; o.clk += r.clk; } o.ctr = o.imp >= MIN() ? o.clk / o.imp * 100 : 0; return o; };
const pick = (fn) => ROWS.filter(fn);
const f = n => Math.round(n).toLocaleString('ko-KR');
const pct = v => v.toFixed(3) + '%';
const M3 = [
    { k: 'imp', label: '노출수', fmt: f },
    { k: 'clk', label: '클릭수', fmt: f },
    { k: 'ctr', label: '클릭률 (CTR)', fmt: pct },
];
const theme = id => THEMES.find(t => t.id === id);
// 프레임 이름 — 마우스를 올리면 배너 툴팁 (frameTip · 배너가 있는 프레임만)
const nm = (T, short = false) => `<span class="fname" data-frame-tip="${T.id}">${short ? T.name.replace(' 프레임', '') : T.name}</span>`;
function frameArt(id, o = {}) {
    const T = theme(id), src = o.src || T.src || '';
    const attr = T.tpl ? `data-tpl="${src}"` : `src="${src}"`;
    // img 가 있으면 이미지 배너, src 가 있으면 배너 페이지(iframe), 둘 다 없으면 설명만
    return `<div class="ad ad-slot" data-frame="${id}">${T.img ? `<img src="${T.img}" alt="${T.name}" loading="lazy">` : src ? `<iframe ${attr} title="${T.name}" loading="lazy" scrolling="no"></iframe>` : `<div class="ad-empty">${T.desc}</div>`}</div>`;
}

// 배너 iframe(250px)을 칸 폭에 맞게 축소 — 표가 다시 그려지거나 창 크기가 바뀌면 다시 계산
const BANNER_PX = 250;
const fitBannerSlots = () => document.querySelectorAll('.ad.ad-slot iframe').forEach(f => {
    const w = f.parentElement.clientWidth;
    if (w) f.style.transform = `scale(${w / BANNER_PX})`;
});
// 레드오토(오토 프레임) 템플릿: 뷰어 페이지(dev_openRtbAuto_view.html)와 같은 목 상품 데이터로 채워서 표시
const TPL_MOCK = {
    '{{w}}': BANNER_PX, '{{h}}': BANNER_PX,
    '{{productList}}': `{ pcode: "test-pcode1", pnm: "오토프레임 카라넥 원피스", price: "49,900", prdt_prmct: "39,900", dc_rate: "32",
        img: "https://www.dabagirl.co.kr/web/product/big/202105/04ff60dbb9fa51e3c47fc8e4bdc27c08.jpg", purl: "javascript:void(0)", advrtsReplcCode: "01", advrtsReplcNm: "" }`,
    '{{HTTP}}': 'https://img.mobon.net', '{{HTTP_DR}}': 'https://img.mobon.net',
    '{{wp_imgtag}}': '', '{{UUID}}': 'test-uuid', '{{USER}}': 'test-user', '{{ITL_TP_CODE}}': 'test-code',
};
const tplCache = {};
const fillTemplateBanners = () => document.querySelectorAll('.ad.ad-slot iframe[data-tpl]:not([data-filled])').forEach(f => {
    f.dataset.filled = '1';
    const url = f.dataset.tpl;
    tplCache[url] ??= fetch(url).then(r => r.text()).then(t => Object.entries(TPL_MOCK).reduce((c, [k, v]) => c.split(k).join(v), t));
    tplCache[url].then(html => { f.srcdoc = html; }).catch(err => console.warn('오토 배너 템플릿을 불러오지 못했습니다', err));
});
(function () {
    let queued = false;
    const schedule = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fitBannerSlots(); fillTemplateBanners(); }); };
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
    document.getElementById('tlModal')?.addEventListener('toggle', schedule);   // 모달이 열릴 때 (닫혀 있으면 폭이 0)
    schedule();
})();

// 1위 표시 (왕관 메달) — ① 카드 · ② 어제 vs 그제 · 사이즈/지면 표의 1위 칸
const CROWN = `<svg class="crown" viewBox="0 0 24 28" aria-hidden="true"><path d="M6 1h5l3 8H9z" fill="#3f7ee8"/><path d="M18 1h-5l-3 8h5z" fill="#d7262f"/><circle cx="12" cy="17.5" r="9" fill="#f2b705" stroke="#c98f00" stroke-width="1.5"/><circle cx="12" cy="17.5" r="6.3" fill="none" stroke="#fff3c4" stroke-width="1"/><text x="12" y="21.6" text-anchor="middle" font-size="11" font-weight="800" font-family="Arial, sans-serif" fill="#7a5200">1</text></svg>`;
const MEDAL = n => n === 1 ? CROWN : '';   // ② 어제 vs 그제: 1위(금메달)만 표시, 2·3위는 메달 없음 (툴팁에는 순위 유지)

/* ---------- 표 정렬 + 합계 행 ---------- */
function makeSortable(table) {
    const ths = [...table.querySelectorAll('th[data-col]')];
    ths.forEach(th => {
        th.innerHTML = `<button type="button" class="sort-btn" title="▲ 큰 순 · ▼ 작은 순 (이름을 누르면 번갈아 정렬)">${th.innerHTML}<span class="arw" aria-hidden="true"><span class="arw-up">▲</span><span class="arw-dn">▼</span></span></button>`;
        th.querySelector('button').addEventListener('click', e => {
            const b = e.currentTarget, hit = e.target.closest('.arw-up, .arw-dn'), dir = hit ? (hit.classList.contains('arw-up') ? 'desc' : 'asc') : (b.dataset.dir === 'desc' ? 'asc' : 'desc'), col = +th.dataset.col;
            ths.forEach(t => { delete t.querySelector('button').dataset.dir; t.removeAttribute('aria-sort'); });
            b.dataset.dir = dir; th.setAttribute('aria-sort', dir === 'desc' ? 'descending' : 'ascending');
            const key = r => { const c = r.cells[col]; return c.dataset.v !== undefined ? +c.dataset.v : c.textContent.trim(); };
            [...table.tBodies].forEach(tb => [...tb.rows].filter(r => !r.classList.contains('type-row')).sort((a, c) => { const x = key(a), y = key(c); return (x > y ? 1 : x < y ? -1 : 0) * (dir === 'desc' ? -1 : 1); }).forEach(r => tb.appendChild(r)));
        });
    });
}
const numTd = (v, fmt, cls = '', c = '', tip = '') => `<td class="${cls}" data-v="${v}"${c ? ` style="${cv(c)}"` : ''}>${cls.includes('top') ? `<span class="crown-wrap" data-tip="${tip}">${CROWN}${fmt(v)}</span>` : fmt(v)}</td>`;

// 날짜 칸 어디를 눌러도 달력이 뜨게
// 날짜 칸(①④⑤⑥)은 눌러도 칸 안의 글자가 선택(파랗게)·복사되지 않게 — 포커스 없이 달력만 띄움
document.querySelectorAll('.date-in').forEach(el => {
    el.addEventListener('mousedown', e => { e.preventDefault(); try { el.showPicker(); } catch (err) { } });
    el.addEventListener('keydown', e => { if (e.key !== 'Tab') e.preventDefault(); });   // 키보드 복사·선택 막기 (Tab 이동은 허용)
});
    

/* 맨 위로 버튼 — 300px 이상 내려가면 표시 */
(function () {
    const b = document.getElementById('toTop');
    const on = () => b.classList.toggle('show', window.scrollY > 300);
    window.addEventListener('scroll', on, { passive: true });
    b.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    on();
})();
    

/* ---------- 데이터가 있어야 그릴 수 있는 공통 섹션 ①②③ + 배너 툴팁 + Timeline — 페이지가 데이터를 정의한 뒤 호출 ---------- */
function initFramePage() {
    /* ① 프레임 테마별 성과 */
    function renderThemes(from, to) {
        const inR = r => r.d >= from && r.d <= to;
        const TS = Object.fromEntries(THEMES.map(T => [T.id, sum(pick(r => inR(r) && r.t === T.id))]));
        // 프레임 중 순위 (② 와 같은 표시)
        const themeRank = (id, k) => { const n = TS[id][k] > 0 ? 1 + THEMES.filter(T => TS[T.id][k] > TS[id][k]).length : 0; return n ? `<em class="rk-badge rk${Math.min(n, 3)}">${n}위</em>` : ''; };
        document.getElementById('themes').innerHTML = THEMES.map(T => {
            const s = TS[T.id], ds = [...new Set(pick(r => inR(r) && r.t === T.id).map(r => r.d))].sort();
            const period = !ds.length ? '데이터 없음' : from === to ? `데이터: <b>${md(from)}</b>` : `데이터: <b>${md(ds[0])} ~ ${md(ds[ds.length - 1])}</b>`;
            const view = T.view ? `<a class="theme-view" href="${T.view}" target="_blank" rel="noopener" title="${T.name} 전체 사이즈 미리보기 (새 탭)">프레임 미리보기<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg></a>` : '';
            return `<article class="card theme">
                ${T.view ? `<a class="theme-art" href="${T.view}" target="_blank" rel="noopener" aria-label="${T.name} 미리보기 (새 탭)">${frameArt(T.id)}</a>` : `<div class="theme-art">${frameArt(T.id)}</div>`}
                <div class="theme-body">
                    <div class="theme-name"><span class="dot" style="${sw(T)}"></span>${T.tag ? `<span class="tag-chip">${T.tag}</span>` : ''}${T.ab ? `<span class="ab-chip ${T.ab}">${AB_LABEL[T.ab]}</span>` : ''}${T.kind ? `<span class="kind-chip">${T.kind}</span>` : ''}${T.name}${view}</div>
                    <div class="theme-period">${period}</div>
                    <dl class="theme-stats">
                        <dt>노출수 ${themeRank(T.id, 'imp')}</dt><dd>${s.imp ? f(s.imp) : '−'}</dd>
                        <dt>클릭수 ${themeRank(T.id, 'clk')}</dt><dd>${s.imp ? f(s.clk) : '−'}</dd>
                        <dt>클릭률 (CTR) ${themeRank(T.id, 'ctr')}</dt><dd>${s.imp ? pct(s.ctr) : '−'}</dd>
                    </dl>
                </div>
            </article>`;
        }).join('');
    }
    (function () {
        const ctrl = document.getElementById('themePeriod'), dateEl = document.getElementById('themeDate');
        dateEl.min = PERIOD_FROM; dateEl.max = TODAY; dateEl.value = TODAY;
        ctrl.querySelector('[data-mode="month"]').textContent = `${+TODAY.slice(5, 7)}월 전체`;
        const run = () => {
            const mode = ctrl.querySelector('[aria-pressed="true"]').dataset.mode;
            dateEl.hidden = mode !== 'day';
            const d = dateEl.value || TODAY;
            if (mode === 'day') renderThemes(d, d); else renderThemes(PERIOD_FROM, TODAY);
        };
        ctrl.addEventListener('click', e => {
            const b = e.target.closest('button[data-mode]'); if (!b) return;
            ctrl.querySelectorAll('button[data-mode]').forEach(x => x.setAttribute('aria-pressed', x === b));
            run();
        });
        dateEl.addEventListener('change', run);
        run();
    })();

    /* ② 어제 vs 그제 — 지표를 행, 프레임을 열로 두는 맞대결 표 */
    (function () {
        const Y = DATES[DATES.length - 1], B = DATES[DATES.length - 2];
        const Ys = Object.fromEntries(THEMES.map(T => [T.id, sum(pick(r => r.t === T.id && r.d === Y))]));
        const Bs = Object.fromEntries(THEMES.map(T => [T.id, sum(pick(r => r.t === T.id && r.d === B))]));
        const best = Object.fromEntries(M3.map(m => [m.k, Math.max(...THEMES.map(T => Ys[T.id][m.k]))]));
        // 프레임 중 순위 (데이터 없는 프레임은 제외) → 금·은·동 메달
        const rank = (S, k, id) => S[id][k] > 0 ? 1 + THEMES.filter(T => S[T.id][k] > S[id][k]).length : null;
        const cell = (S, k, id, v, day) => { const n = rank(S, k, id); return n ? `<span class="crown-wrap" data-tip="${day} ${M3.find(m => m.k === k).label} ${n}위
    ${THEMES.length}개 프레임 중">${MEDAL(n)}${v}</span>` : v; };
        // 머리글 1줄: 프레임 이름 (3칸 묶음), 2줄: 어제 / 그제 / 변화
        const head1 = THEMES.map(T => `<th class="frame sep" colspan="3" style="--c:${T.color}"><span><span class="dot" style="${sw(T)}"></span>${nm(T)}${T.ch === '카카오' ? ' (카카오)' : ''}</span></th>`).join('');
        const head2 = THEMES.map(() => `<th class="sub now sep">어제 ${md(Y)}</th><th class="sub">그제 ${md(B)}</th><th class="sub">변화</th>`).join('');
        const rows = M3.map(m => {
            const cells = THEMES.map(T => {
                const y = Ys[T.id], b = Bs[T.id], yv = y[m.k], bv = b[m.k];
                if (!y.imp && !b.imp) return `<td class="now sep">−</td><td class="prev">−</td><td class="chg"><span class="yd-chg flat">데이터 없음</span></td>`;
                const top = yv > 0 && yv === best[m.k];
                const nowTd = `<td class="now sep${top ? ' yd-best' : ''}">${cell(Ys, m.k, T.id, m.fmt(yv), '어제')}</td>`;
                if (!bv) return `${nowTd}<td class="prev">−</td><td class="chg"><span class="yd-chg flat">그제 데이터 없음</span></td>`;
                const diff = m.k === 'ctr' ? yv - bv : (yv / bv - 1) * 100;
                const cls = Math.abs(diff) < 0.0005 ? 'flat' : diff > 0 ? 'rise' : 'fall';
                const txt = `${cls === 'flat' ? '−' : diff > 0 ? '▲' : '▼'} ${Math.abs(diff).toFixed(m.k === 'ctr' ? 3 : 1)}%`;
                return `${nowTd}<td class="prev">${cell(Bs, m.k, T.id, m.fmt(bv), '그제')}</td><td class="chg"><span class="yd-chg ${cls}">${txt}</span></td>`;
            }).join('');
            return `<tr><td class="metric">${m.label}</td>${cells}</tr>`;
        }).join('');
        document.getElementById('yd').innerHTML = `<table class="yd-table"><thead><tr><th></th>${head1}</tr><tr><th></th>${head2}</tr></thead><tbody>${rows}</tbody></table>`;
    })();

    /* ③ 최근 7일 — 지표별 차트, 날짜마다 프레임별 막대 */
    (function () {
        const D7 = DATES.slice(-7);   // 데이터가 있는 최근 7일
        const data = D7.map(d => Object.fromEntries(THEMES.map(T => [T.id, sum(pick(r => r.t === T.id && r.d === d))])));
        document.getElementById('w7Legend').innerHTML = THEMES.map(T => `<span><i style="${sw(T)}"></i>${nm(T)}${T.ch === '카카오' ? ' (카카오)' : ''}</span>`).join('');
        const wrap = document.getElementById('w7');
        wrap.innerHTML = M3.map(m => `<div class="w7-box"><h3>${m.label}</h3><div class="w7-chart" data-k="${m.k}"><svg></svg><div class="tip" hidden></div></div></div>`).join('');
        const nice = v => { const p = Math.pow(10, Math.floor(Math.log10(v))); for (const k of [1, 2, 2.5, 5, 10]) if (k * p >= v) return k * p; return v; };
        const short = (k, v) => k === 'ctr' ? v.toFixed(3) + '%' : v >= 1e4 ? f(v / 1e4) + '만' : f(v);

        function draw() {
            wrap.querySelectorAll('.w7-chart').forEach(box => {
                const k = box.dataset.k, m = M3.find(x => x.k === k), svg = box.querySelector('svg'), tip = box.querySelector('.tip');
                const W = box.clientWidth, H = box.clientHeight, L = 46, R = 6, T = 8, B = 26, iw = W - L - R, ih = H - T - B;
                const max = nice(Math.max(...data.flatMap(o => THEMES.map(t => o[t.id][k]))) || 1);
                svg.setAttribute('width', W); svg.setAttribute('height', H);
                let out = '';
                for (let g = 0; g <= 4; g++) {
                    const y = T + ih - ih * g / 4;
                    out += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="${g ? '#f2f3f5' : '#e6e8ec'}"/><text x="${L - 6}" y="${y + 4}" font-size="10" fill="#b3b8bf" text-anchor="end">${short(k, max * g / 4)}</text>`;
                }
                const gw = iw / D7.length, bw = Math.min(12, (gw - 10) / THEMES.length - 2);
                const tops = THEMES.map(() => []);   // 테마별 막대 꼭대기 좌표 (호버 선그래프용)
                D7.forEach((d, i) => {
                    const gx = L + gw * i, x0 = gx + (gw - (bw + 2) * THEMES.length + 2) / 2;
                    THEMES.forEach((t, j) => {
                        const v = data[i][t.id][k], h = v / max * ih;
                        if (h > 0) tops[j].push([x0 + j * (bw + 2) + bw / 2, T + ih - h]);
                        if (h > 0) out += `<rect class="bar" data-t="${j}" x="${x0 + j * (bw + 2)}" y="${T + ih - h}" width="${bw}" height="${h}" rx="2" fill="${t.color}"${t.ring ? ` stroke="${t.ring}" stroke-width="1.5"` : ''}/>`;
                    });
                    out += `<rect class="hit" data-i="${i}" x="${gx}" y="${T}" width="${gw}" height="${ih}" fill="transparent"/>`;
                    out += `<text x="${gx + gw / 2}" y="${H - 8}" font-size="10.5" fill="#888" text-anchor="middle">${md(d)}</text>`;
                });
                out += `<g class="hl-line" pointer-events="none"></g>`;
                svg.innerHTML = out;
                svg.querySelectorAll('.hit').forEach(h => {
                    h.addEventListener('mouseenter', () => {
                        const i = +h.dataset.i;
                        tip.innerHTML = `<b>${md(D7[i])} · ${m.label}</b>` + THEMES.map(t => `<span><em style="font-style:normal"><i style="${sw(t)}"></i>${t.name}</em>${data[i][t.id][k] ? m.fmt(data[i][t.id][k]) : '−'}</span>`).join('');
                        tip.hidden = false;
                        const gx = L + gw * i, tw = tip.offsetWidth;
                        tip.style.left = (gx + gw + tw > W ? gx - tw - 4 : gx + gw + 4) + 'px'; tip.style.top = '0px';
                        h.setAttribute('fill', 'rgba(52,70,184,.06)');
                    });
                    h.addEventListener('mouseleave', () => { tip.hidden = true; h.setAttribute('fill', 'transparent'); });
                });
                // 막대에 마우스를 올리면 같은 테마의 7일 추이를 선으로 연결
                const hl = svg.querySelector('.hl-line');
                let cur = -1;
                svg.onmousemove = e => {
                    const x = e.clientX - svg.getBoundingClientRect().left, i = Math.floor((x - L) / gw);
                    if (i < 0 || i >= D7.length) return;
                    const x0 = L + gw * i + (gw - (bw + 2) * THEMES.length + 2) / 2;
                    const j = Math.max(0, Math.min(THEMES.length - 1, Math.floor((x - x0 + 1) / (bw + 2))));
                    if (j === cur) return;
                    cur = j;
                    const c = THEMES[j].color, p = tops[j];
                    hl.innerHTML = `<polyline fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${p.map(q => q.join(',')).join(' ')}"/>` + p.map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="3.5" fill="#fff" stroke="${c}" stroke-width="2"/>`).join('');
                    box.classList.add('hl');
                    svg.querySelectorAll('.bar').forEach(b => b.classList.toggle('on', +b.dataset.t === j));
                };
                svg.onmouseleave = () => { cur = -1; hl.innerHTML = ''; box.classList.remove('hl'); };
            });
        }
        window.addEventListener('resize', draw);
        draw();
    })();

    /* 프레임 이름 호버 → 배너 툴팁 (테마별 배너를 미리 한 번만 만들어 두고 보여줌) */
    (function () {
        const tip = document.createElement('div');
        tip.id = 'frameTip';
        tip.setAttribute('aria-hidden', 'true');
        tip.innerHTML = THEMES.filter(T => T.src || T.img).map(T => `<div class="ft-item" data-frame-tip-for="${T.id}">${frameArt(T.id)}<div class="ft-name"><span class="dot" style="${sw(T)}"></span>${T.name}</div></div>`).join('');
        document.body.appendChild(tip);
        const W = 216, GAP = 14;
        let cur = null;
        const place = (x, y) => {
            const h = tip.offsetHeight || 260;
            let left = x + GAP, top = y + GAP;
            if (left + W > innerWidth - 8) left = x - W - GAP;          // 오른쪽 공간이 없으면 왼쪽에
            if (top + h > innerHeight - 8) top = Math.max(8, y - h - GAP); // 아래 공간이 없으면 위에
            tip.style.left = left + 'px'; tip.style.top = top + 'px';
        };
        const show = (el, e) => {
            const id = el.dataset.frameTip;
            if (!theme(id)?.src && !theme(id)?.img) return;
            cur = el;
            // 모달(dialog) 안에서는 모달 위에 떠야 하므로 모달 안으로 옮김
            const host = el.closest('dialog') || document.body;
            if (tip.parentElement !== host) host.appendChild(tip);
            tip.querySelectorAll('.ft-item').forEach(it => it.classList.toggle('on', it.dataset.frameTipFor === id));
            tip.classList.add('show');
            fitBannerSlots();
            place(e.clientX, e.clientY);
        };
        const hide = () => { cur = null; tip.classList.remove('show'); };
        document.addEventListener('mouseover', e => { const el = e.target.closest('[data-frame-tip]'); if (el && el !== cur) show(el, e); });
        document.addEventListener('mouseout', e => { const el = e.target.closest('[data-frame-tip]'); if (el && el === cur && !el.contains(e.relatedTarget)) hide(); });
        document.addEventListener('mousemove', e => { if (cur) place(e.clientX, e.clientY); });
        document.addEventListener('scroll', hide, true);
    })();

    initTimeline();   // 프레임 변경 Timeline (frame_timeline.js 공용)
}

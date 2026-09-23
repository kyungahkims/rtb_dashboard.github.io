/* =====================================================================
   프레임 변경 Timeline — Google RTB 프레임 AB 테스트 메뉴의 모든 페이지가 공유합니다.
   (상품 고정 프레임 · 상품 오토 프레임 (웹, 모바일) · 상품 오토 프레임 (앱) · 비상품 프레임)
   항목을 고치면 네 페이지에 모두 반영됩니다. 최근 순으로 표시됩니다.
     ch    : 채널 (구글 · 카카오)
     type  : deploy 배포 · ratio 노출 비중 조정 · copy 문구·네이밍 변경
     theme : 대상 프레임 id — 페이지의 THEMES에 있으면 그 색·배너, 없으면 아래 TL_TARGET의 이름·색만
   ===================================================================== */
const TIMELINE = [
    { d: '2026-09-15', ch: '구글', type: 'deploy', theme: 'magazine', title: '매거진 배너 배포', desc: '09-15 퇴근 후 매거진 배너 배포.' },
    { d: '2026-09-11', ch: '구글', type: 'ratio', theme: 'blackgold', title: '레드 / 블랙 반반 노출로 복귀', desc: '09-11부터 레드·블랙 프레임을 다시 반반씩 노출.' },
    { d: '2026-09-09', ch: '구글', type: 'deploy', theme: 'redauto', title: '상품 auto (app/web) 배포', desc: '09-09 상품 auto 프레임 app/web 배포.' },
    { d: '2026-09-09', ch: '구글', type: 'ratio', theme: 'blackgold', title: '블랙 프레임 단독 노출', desc: '09-09부터 블랙 프레임만 노출.' },
    { d: '2026-09-04', ch: '구글', type: 'copy', theme: 'whitered', title: '문구 수정 + 레드 프레임 단독 노출', desc: '09-04 문구 수정. 이날부터 레드 프레임만 노출.' },
    { d: '2026-09-02', ch: '구글', type: 'deploy', theme: 'whitered', title: '레드 프레임 배포 + 고정형(비상품) auto 배포', desc: '09-02 레드 프레임 배포, 고정형(비상품) auto 프레임 배포.' },
    { d: '2026-08-26', ch: '구글', type: 'deploy', theme: 'blackgold', title: '블랙골드 프레임 배포 (정방형)', desc: '08-26 블랙골드 프레임 정방형 배포.' },
];
const TYPE_LABEL = { deploy: '배포', ratio: '노출 비중 조정', copy: '문구·네이밍 변경' };
// 페이지 THEMES에 없는 대상의 이름·색·배너 — 어느 페이지에서 열어도 Timeline이 똑같이 보이도록 4개 프레임 배너를 여기서도 정의
const TL_TARGET = {
    blackgold: { id: 'blackgold', name: '블랙골드 프레임', color: '#2b2d31', src: 'https://kyungahkims.github.io/openRtb_banners.github.io/blackGold/ui/openRtb_blackGold_250x250_ui.html' },
    whitered: { id: 'whitered', name: '화이트레드 프레임', color: '#e0262f', src: 'https://kyungahkims.github.io/openRtb_banners.github.io/whiteRed/ui/openRtb_whiteRed_250x250_ui.html' },
    magazine: { id: 'magazine', name: '매거진 프레임', color: '#8b5cf6', src: 'https://kyungahkims.github.io/openRtb_banners.github.io/simpleMagazine/ui/openRtb_simple_magazine_250x250_ui.html' },
    redauto: { id: 'redauto', name: '레드오토 프레임', color: '#e0262f', src: 'https://kyungahkims.github.io/openRtb_banners.github.io/auto/dev/openRtbAuto_red.html', tpl: true },
    iseries: { id: 'iseries', name: 'i 시리즈', color: '#9aa0a8' },
    coupang: { id: 'coupang', name: '쿠팡 프레임', color: '#9aa0a8' },
    sel: { id: 'sel', name: 'SEL · A/B/C/D 변형', color: '#9aa0a8' },
};

// 배너 썸네일 — 페이지의 frameArt와 같은 마크업 (배너 있는 대상만). 레드오토(tpl)는 data-tpl → 페이지의 fillTemplateBanners가 채움
const tlArt = T => !T.src ? '' : `<div class="ad ad-slot" data-frame="${T.id}"><iframe ${T.tpl ? `data-tpl="${T.src}"` : `src="${T.src}"`} title="${T.name}" loading="lazy" scrolling="no"></iframe></div>`;

// 배너 축소·템플릿 채움 코드가 없는 페이지(비상품 등)용 최소 구현 — 있는 페이지에서는 아무 것도 하지 않음
function tlBannerFallback() {
    if (typeof fitBannerSlots === 'function') return;
    const PX = 250, MOCK = {
        '{{w}}': PX, '{{h}}': PX,
        '{{productList}}': `{ pcode: "test-pcode1", pnm: "오토프레임 카라넥 원피스", price: "49,900", prdt_prmct: "39,900", dc_rate: "32",
            img: "https://www.dabagirl.co.kr/web/product/big/202105/04ff60dbb9fa51e3c47fc8e4bdc27c08.jpg", purl: "javascript:void(0)", advrtsReplcCode: "01", advrtsReplcNm: "" }`,
        '{{HTTP}}': 'https://img.mobon.net', '{{HTTP_DR}}': 'https://img.mobon.net', '{{wp_imgtag}}': '', '{{UUID}}': 'test-uuid', '{{USER}}': 'test-user', '{{ITL_TP_CODE}}': 'test-code',
    };
    const cache = {};
    const fit = () => document.querySelectorAll('.ad.ad-slot iframe').forEach(f => {
        const w = f.parentElement.clientWidth;
        if (w) f.style.transform = `scale(${w / PX})`;
        if (f.dataset.tpl && !f.dataset.filled) {
            f.dataset.filled = '1';
            const url = f.dataset.tpl;
            cache[url] ??= fetch(url).then(r => r.text()).then(t => Object.entries(MOCK).reduce((c, [k, v]) => c.split(k).join(v), t));
            cache[url].then(html => { f.srcdoc = html; }).catch(() => { });
        }
    });
    window.__tlFit = fit;
    window.addEventListener('resize', fit);
    fit();
}

// 모달이 열린 직후 배너 축소 다시 계산 (닫혀 있을 때는 칸 폭이 0이라 계산이 안 됨)
const tlRefit = () => requestAnimationFrame(() => { if (typeof fitBannerSlots === 'function') fitBannerSlots(); if (window.__tlFit) window.__tlFit(); });

/* 렌더 + 모달 — 페이지의 theme · md · cv · sw · nm 을 사용하므로 그 정의 뒤에서 initTimeline() 호출 */
function initTimeline() {
    const ol = document.getElementById('timeline'), modal = document.getElementById('tlModal');
    if (!ol || !modal) return;
    ol.innerHTML = [...TIMELINE].sort((a, b) => b.d.localeCompare(a.d)).map((e, i) => {
        const T = theme(e.theme) || TL_TARGET[e.theme] || { id: e.theme, name: e.theme, color: '#9aa0a8' };
        return `<li>
            <div class="tl-date">${md(e.d)}<small>${e.d.slice(0, 4)}</small></div>
            <div class="tl-dot" style="${cv(T)}"></div>
            <div class="tl-body">
                <div class="tl-top"><span class="chip ch ${e.ch === '카카오' ? 'kakao' : 'google'}">${e.ch}</span><span class="chip ${e.type}">${TYPE_LABEL[e.type]}</span><b>${e.title}</b>${i === 0 ? '<span class="chip live">최신</span>' : ''}</div>
                <div class="tl-target"><span class="dot" style="${sw(T)}"></span>${nm(T)}</div>
                <p>${e.desc}</p>
            </div>
            <div class="tl-art">${tlArt(T)}</div>
        </li>`;
    }).join('');
    tlBannerFallback();
    document.getElementById('tlOpen').addEventListener('click', () => { modal.showModal(); tlRefit(); });
    document.getElementById('tlClose').addEventListener('click', () => modal.close());
    modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });   // 바깥(어두운 영역) 클릭 시 닫기
}

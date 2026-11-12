/* 비석 유령 옷, 프레임 AB 테스트 두 페이지(구글·카카오)가 공유
   유령 svg 좌표계 viewBox 0 0 64 76: 머리 꼭대기 (32,2) · 눈 (23,30)(41,30) · 입 y44 · 몸통 아래 y70
   머리 위로 올라가는 모자는 y가 음수라 유령 svg에 overflow="visible" 이 필요 */
const GHOST_OUTFIT = {
    // 블랙골드 (가격 표시): 검정 실크햇 + 금색 띠 · 금색 나비넥타이 · 옆에 매달린 ₩ 가격표
    blackgold: `<g transform="rotate(-8 32 8)"><rect x="20" y="-13" width="24" height="22" rx="2" fill="#2b2d31"/><rect x="20" y="3" width="24" height="4" fill="#d4a017"/><rect x="13" y="7" width="38" height="4" rx="2" fill="#2b2d31"/></g>
        <path d="M25 52l7 3 7-3v9l-7-3-7 3z" fill="#d4a017"/><circle cx="32" cy="56.5" r="2" fill="#b8860b"/>
        <g transform="rotate(18 52 46)"><path d="M52 36v5" stroke="#b8860b" stroke-width="1.2"/><rect x="45" y="41" width="14" height="10" rx="1.5" fill="#ffd34d" stroke="#b8860b" stroke-width="1.2"/><text x="52" y="49" font-size="8" font-weight="700" text-anchor="middle" fill="#2b2d31">₩</text></g>`,
    // 블랙골드 (가격 숨김): 눈을 가린 검은 선글라스 · 금목걸이 (가격을 숨긴 비밀스러운 동생)
    blackgoldno: `<rect x="14" y="25" width="15" height="10" rx="4" fill="#15171a"/><rect x="35" y="25" width="15" height="10" rx="4" fill="#15171a"/><path d="M29 29h6M14 28l-6-2M50 28l6-2" stroke="#15171a" stroke-width="2" stroke-linecap="round"/><path d="M18 28l4-1M39 28l4-1" stroke="#6b7280" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M19 50q13 11 26 0" stroke="#d4a017" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-dasharray="2.5 2"/><circle cx="32" cy="57" r="3" fill="#d4a017"/>`,
    // 화이트레드: 빨강·흰색 줄무늬 목도리
    whitered: `<path d="M13 50q19 11 38 0" stroke="#e0262f" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M13 50q19 11 38 0" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="butt" stroke-dasharray="3.5 5.5"/>
        <path d="M45 53l6 14" stroke="#e0262f" stroke-width="6" stroke-linecap="round"/><path d="M45 53l6 14" stroke="#fff" stroke-width="6" stroke-dasharray="3 4"/>`,
    // 맥날: 빨간 캡모자 + 노란 챙 (패스트푸드 가게 모자)
    mcnal: `<path d="M14 14a18 14 0 0 1 36 0z" fill="#e0262f"/><path d="M14 14h41q4 0 4 3t-4 3H14z" fill="#ffc72c"/><path d="M32 0v-3" stroke="#e0262f" stroke-width="3" stroke-linecap="round"/><path d="M24 4q8-4 16 0" stroke="#ffc72c" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    // 젤리: 알록달록 물방울 고깔모자 + 반짝이 (화려한 쪽)
    jelly: `<path d="M32 -15L18 13h28z" fill="#d946ef"/><circle cx="29" cy="2" r="2" fill="#ffd34d"/><circle cx="35" cy="-4" r="1.6" fill="#22d3ee"/><circle cx="24" cy="9" r="1.8" fill="#22d3ee"/><circle cx="38" cy="8" r="2" fill="#ffd34d"/><circle cx="32" cy="-15" r="3.2" fill="#ffd34d"/>
        <path d="M8 22l1.4 3 3 1.4-3 1.4L8 31l-1.4-3.2-3-1.4 3-1.4zM56 16l1.1 2.4 2.4 1.1-2.4 1.1L56 23l-1.1-2.4-2.4-1.1 2.4-1.1z" fill="#ffd34d"/>`,
    // 화이트 젤리: 하얀 물방울 분홍 리본 머리띠 + 볼터치 (수수한 쪽)
    wjelly: `<ellipse cx="23" cy="6" rx="8.5" ry="5" fill="#f9a8d4"/><ellipse cx="41" cy="6" rx="8.5" ry="5" fill="#f9a8d4"/><circle cx="20" cy="5" r="1.3" fill="#fff"/><circle cx="26" cy="8" r="1.1" fill="#fff"/><circle cx="44" cy="5" r="1.3" fill="#fff"/><circle cx="38" cy="8" r="1.1" fill="#fff"/><circle cx="32" cy="6" r="3.5" fill="#f472b6"/>
        <circle cx="17" cy="38" r="3" fill="#fbcfe8"/><circle cx="47" cy="38" r="3" fill="#fbcfe8"/>`,
    // 스토리: 동그란 안경 + 품에 안은 파란 책 (이야기꾼)
    story: `<circle cx="23" cy="30" r="6.5" fill="none" stroke="#0ea5e9" stroke-width="2"/><circle cx="41" cy="30" r="6.5" fill="none" stroke="#0ea5e9" stroke-width="2"/><path d="M29.5 30h5" stroke="#0ea5e9" stroke-width="2"/>
        <rect x="19" y="50" width="26" height="17" rx="2" fill="#0ea5e9"/><path d="M32 50v17" stroke="#fff" stroke-width="1.6"/><path d="M22.5 55h6M22.5 59h6M22.5 63h4M35.5 55h6M35.5 59h6M35.5 63h4" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>`,
    // 기존 디자인 A~D: 할머니 (제일 오래 있던 기준선) — 회색 쪽진 머리와 비녀 · 동그란 안경 · 테마색 뜨개 숄 · 볼터치
    design: `<path d="M7 27q3-24 25-26q22 2 25 26q-25-9-50 0z" fill="#cfd4dc" stroke="#9aa0a8" stroke-width="1.5" stroke-linejoin="round"/><circle cx="32" cy="-2" r="6.5" fill="#cfd4dc" stroke="#9aa0a8" stroke-width="1.5"/><path d="M24 -6l16 6" stroke="#b45309" stroke-width="2" stroke-linecap="round"/><circle cx="23" cy="-6.5" r="2" fill="#e0262f"/>
        <circle cx="23" cy="30" r="6" fill="none" stroke="#6b7280" stroke-width="1.8"/><circle cx="41" cy="30" r="6" fill="none" stroke="#6b7280" stroke-width="1.8"/><path d="M29 30h6M17 29l-5 3M47 29l5 3" stroke="#6b7280" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="16" cy="39" r="3" fill="#fbcfe8"/><circle cx="48" cy="39" r="3" fill="#fbcfe8"/>
        <path d="M9 49q23 15 46 0v7q-23 15-46 0z" fill="#1fb5a3"/><path d="M13 54q19 11 38 0" stroke="#fff" stroke-width="1.4" fill="none" stroke-dasharray="2 3"/><path d="M12 57l-2 7M52 57l2 7M22 61l-1 6M42 61l1 6" stroke="#1fb5a3" stroke-width="2" stroke-linecap="round"/>`,
    // 레드오토: 머리에 단 빨간 리본
    redauto: `<g transform="translate(21 5) rotate(-18)"><ellipse cx="-7.5" cy="0" rx="7.5" ry="4.8" fill="#e0262f"/><ellipse cx="7.5" cy="0" rx="7.5" ry="4.8" fill="#e0262f"/><path d="M-3 3l-4 9M3 3l4 9" stroke="#e0262f" stroke-width="3.5" stroke-linecap="round"/><circle r="3.2" fill="#b3101c"/></g>`,
    // 매거진: 보라색 베레모 (아직 살아 있어 비석은 없지만 종료되면 바로 입음)
    magazine: `<path d="M11 12q21-18 42 0q-21 5-42 0z" fill="#8b5cf6"/><path d="M14 12q18 4 36 0" stroke="#6d3fd1" stroke-width="2" fill="none"/><circle cx="36" cy="-2" r="2.2" fill="#6d3fd1"/>`,
};
// i사이즈별 고정 프레임 (비상품, 구글 9/2 · 카카오 데이터 시작 전 종료): 뽀글머리 할머니 — 회색 파마머리 · 동그란 안경 · 볼터치 · 초록(테마색) 뜨개 숄
GHOST_OUTFIT.isize = `<g fill="#d8dbe0" stroke="#9aa0a8" stroke-width="1.4"><circle cx="11" cy="24" r="5.5"/><circle cx="15" cy="15" r="5.5"/><circle cx="22" cy="8" r="5.5"/><circle cx="32" cy="4" r="6"/><circle cx="42" cy="8" r="5.5"/><circle cx="49" cy="15" r="5.5"/><circle cx="53" cy="24" r="5.5"/><circle cx="20" cy="17" r="5"/><circle cx="27" cy="12" r="5"/><circle cx="37" cy="12" r="5"/><circle cx="44" cy="17" r="5"/><circle cx="14" cy="32" r="4.5"/><circle cx="50" cy="32" r="4.5"/></g>
        <circle cx="23" cy="30" r="6" fill="none" stroke="#6b7280" stroke-width="1.8"/><circle cx="41" cy="30" r="6" fill="none" stroke="#6b7280" stroke-width="1.8"/><path d="M29 30h6M17 29l-4 2M47 29l4 2" stroke="#6b7280" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="16" cy="39" r="3" fill="#fbcfe8"/><circle cx="48" cy="39" r="3" fill="#fbcfe8"/>
        <path d="M9 49q23 15 46 0v7q-23 15-46 0z" fill="#22c55e"/><path d="M13 54q19 11 38 0" stroke="#fff" stroke-width="1.4" fill="none" stroke-dasharray="2 3"/><path d="M12 57l-2 7M52 57l2 7M22 61l-1 6M42 61l1 6" stroke="#22c55e" stroke-width="2" stroke-linecap="round"/>`;
// auto_origin 프레임 (상품 오토 기존 디자인, 10/7 종료): 할아버지 — 갈색 중절모 · 흰 눈썹 · 동그란 안경 · 흰 수염 · 초록(테마색) 나비넥타이 · 지팡이
GHOST_OUTFIT.autoetc = `<path d="M11 17q21-9 42 0l-4-11q-17-6-34 0z" fill="#5b4636"/><path d="M7 18q25-9 50 0q-25 6-50 0z" fill="#3f2f24"/><path d="M15 9q17-4 34 0" stroke="#8b6b4a" stroke-width="2" fill="none"/>
        <path d="M16 23q7-4 13 0M35 23q6-4 13 0" stroke="#e5e7eb" stroke-width="3" stroke-linecap="round"/>
        <circle cx="23" cy="30" r="6" fill="none" stroke="#6b7280" stroke-width="1.8"/><circle cx="41" cy="30" r="6" fill="none" stroke="#6b7280" stroke-width="1.8"/><path d="M29 30h6M17 29l-5 3M47 29l5 3" stroke="#6b7280" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M19 44q13 20 26 0q-2 12-13 14q-11-2-13-14z" fill="#e5e7eb" stroke="#cfd4dc" stroke-width="1"/><path d="M26 44q6 5 12 0" stroke="#2b2d31" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M23 60l9 3 9-3v8l-9-3-9 3z" fill="#22c55e"/><circle cx="32" cy="64" r="2" fill="#15803d"/>
        <path d="M56 42v27" stroke="#8b5e3c" stroke-width="3.5" stroke-linecap="round"/><path d="M56 42q0-8-8-6" stroke="#8b5e3c" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
GHOST_OUTFIT.coupangetc = GHOST_OUTFIT.autoetc;
// iauto 플립 (비상품, 11/11 종료): 머리 위에서 뒤집히는 주황 카드 + 회전 화살표 · 주황 나비넥타이
GHOST_OUTFIT.iautoflip = `<g transform="rotate(-14 32 -4)"><rect x="18" y="-14" width="28" height="18" rx="2.5" fill="#f59e0b"/><rect x="18" y="-14" width="13" height="18" rx="2.5" fill="#fbbf24"/><path d="M31 -14v18" stroke="#b45309" stroke-width="1.2"/><path d="M35 -9h7M35 -5h5M35 -1h6" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></g>
        <path d="M50 2a11 11 0 0 1 -4 13" stroke="#f59e0b" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M44 16l5-1-2-4z" fill="#f59e0b"/>
        <path d="M25 52l7 3 7-3v9l-7-3-7 3z" fill="#f59e0b"/><circle cx="32" cy="56.5" r="2" fill="#b45309"/>`;
// iauto 글로우 (비상품, 11/11 종료): 머리 위 네온 고리(후광) + 반짝이 · 은은하게 빛나는 청록 목도리
GHOST_OUTFIT.iautoglow = `<ellipse cx="32" cy="-5" rx="17" ry="5.5" fill="none" stroke="#14b8a6" stroke-width="3.5" opacity=".55"/><ellipse cx="32" cy="-5" rx="17" ry="5.5" fill="none" stroke="#99f6e4" stroke-width="1.4"/>
        <path d="M9 18l1.4 3 3 1.4-3 1.4L9 27l-1.4-3.2-3-1.4 3-1.4zM55 12l1.1 2.4 2.4 1.1-2.4 1.1L55 19l-1.1-2.4-2.4-1.1 2.4-1.1z" fill="#5eead4"/>
        <path d="M13 50q19 11 38 0" stroke="#14b8a6" stroke-width="8" fill="none" stroke-linecap="round" opacity=".35"/><path d="M13 50q19 11 38 0" stroke="#14b8a6" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M13 50q19 11 38 0" stroke="#ccfbf1" stroke-width="1.4" fill="none" stroke-dasharray="3 4"/>`;
const ghostOutfit = id => GHOST_OUTFIT[id] || '';

/* 프레임 변경 Timeline, 프레임 AB 테스트 네 페이지가 공유
   ch: 채널, type: deploy | ratio | copy | fix, theme: 프레임 id, why: 테스트 사유·가설 (있으면 표시) */
const TIMELINE = [
    { d: '2026-10-29', ch: '카카오', type: 'ratio', theme: 'magazine', title: '스토리·기존 디자인 A~D 테스트 종료 · 매거진 단독 노출', desc: '카카오 상품 고정 배너에서 스토리와 기존 디자인 A~D 노출을 중단했습니다. 기존 디자인은 10/28에 절반(약 34만 노출)으로 줄였다가 10/29부터 안 나가고, 스토리는 10/28(약 67만)까지 나가고 10/29부터 안 나갑니다. 이날부터 구글(10/27~)과 같이 매거진 하나만 나갑니다. 10/22부터 시작한 3종 균등 노출은 10/27까지 이어졌고, 10/26~10/27은 카카오 전체 RTB 노출이 일 약 540만에서 820만으로 늘면서 3종 각 약 100만 노출로 커졌습니다. 9/22 집계 시작 이후 비교한 테마 중 매거진만 남았습니다.', why: '3종 균등 기간(10/22~10/27) 클릭률이 매거진 0.190% > 기존 디자인 A~D 0.173% > 스토리 0.146%. 기준선이던 기존 디자인까지 매거진에 밀려 매거진으로 통일.' },
    { d: '2026-10-27', ch: '구글', type: 'ratio', theme: 'magazine', title: '블랙골드 (가격 숨김) 테스트 종료 · 매거진 단독 노출', desc: '구글 상품 고정 배너에서 블랙골드 (가격 숨김) 노출을 중단했습니다. 10/26까지 나가고(마지막 날 약 68만 노출) 10/27부터 안 나갑니다. 이날부터 상품 고정 배너는 매거진 하나만 나갑니다. 같은 시기 구글 전체 RTB 노출이 일 약 280만에서 700만대로 늘어 매거진 노출도 10/25 약 29만에서 10/27 약 305만으로 커졌습니다. 8/26 블랙골드 출시로 시작한 프레임 AB 테스트에서 매거진 외 테마는 모두 종료됐습니다.', why: '둘만 남은 10/20~10/26 동안 매거진 0.031% > 블랙골드 (가격 숨김) 0.023%로 매거진 우세가 유지돼 매거진으로 통일. 단독 노출 첫 이틀(10/27~28) 매거진 클릭률은 0.035%.' },
    { d: '2026-10-22', ch: '카카오', type: 'ratio', theme: 'magazine', title: '블랙골드 (가격 표시·숨김)·화이트 젤리 테스트 종료 · 매거진·스토리·기존 디자인 A~D 3종 균등', desc: '카카오 상품 고정 배너에서 블랙골드 두 버전과 화이트 젤리 노출을 중단했습니다. 이날부터 매거진·스토리·기존 디자인 A~D 3종이 각 약 70만 노출로 균등하게 나갑니다(10/24부터는 각 약 57만). 구글은 변동 없이 블랙골드 (가격 숨김)·매거진 2종이 약 65:35로 나갑니다.', why: '10/20~10/21 클릭률이 매거진 0.221% > 블랙골드 가격 표시 0.208% ≈ 가격 숨김 0.205% > 화이트 젤리 0.179%로 매거진에 못 미쳐, 1위 매거진과 신규 스토리, 기준선인 기존 디자인 A~D만 남겨 비교.' },
    { d: '2026-10-21', ch: '카카오', type: 'deploy', theme: 'story', title: '스토리 디자인 추가 · 매거진·기존 디자인 A~D 비중 2배로', desc: '카카오 상품 고정 배너에 스토리 디자인을 추가했습니다. 첫날 약 32만 노출로 블랙골드 가격 표시·숨김, 화이트 젤리(각 약 24만)보다 많고 매거진(약 56만)보다는 적은 비중으로 시작했습니다. 300×250과 728×90 두 사이즈로 나갑니다. 같은 날 매거진과 기존 디자인 A~D 비중을 다른 테마의 2배(각 약 56만 노출)로 올렸습니다.', why: '매거진을 이길 새 디자인을 찾는 테스트. 1위 매거진과 기존 디자인 A~D 비중을 올려 비교 기준을 두껍게 하고, 스토리는 신규라 첫날은 중간 비중으로 시작.' },
    { d: '2026-10-20', ch: '구글', type: 'ratio', theme: 'blackgold', title: '블랙골드 (가격 표시) 테스트 종료 · 블랙골드 (가격 숨김) 비중 확대', desc: '10/14에 재투입한 블랙골드 (가격 표시) 노출을 중단했습니다. 10/19에 절반(약 10만 노출)으로 줄였다가 10/20부터 안 나갑니다. 이날부터 구글 상품 고정 배너는 블랙골드 (가격 숨김)·매거진 2종만 나가며 비중은 약 65:35(10/20 약 56만 : 31만 노출)입니다.', why: '같은 기간(10/14~10/19) 같은 자리에서 비교한 결과 구글은 가격 숨김(0.036%)이 가격 표시(0.026%)보다 높아 숨김 버전만 남김. 카카오는 반대로 가격 표시가 근소하게 높아, 정답이 매체마다 다르다고 보고 매체별로 따로 운영.' },
    { d: '2026-10-20', ch: '구글', type: 'ratio', theme: 'whitered', title: '화이트레드 프레임 테스트 종료', desc: '9/2부터 7주간 나간 화이트레드(9/23부터는 가격 숨김 버전) 노출을 중단했습니다. 10/19에 절반(약 10만 노출)으로 줄였다가 10/20부터 안 나갑니다.', why: '9월에는 클릭률 1위(0.045%)였지만 10월 들어 0.028%로 매거진(0.032%)·블랙골드 (가격 숨김)(0.029%)에 밀려 3위. 남은 두 테마에 노출을 몰아 주기 위해 종료.' },
    { d: '2026-10-20', ch: '카카오', type: 'ratio', theme: 'whitered', title: '화이트레드 프레임 테스트 종료', desc: '구글과 같은 날 카카오에서도 화이트레드(가격 숨김 버전) 노출을 중단했습니다. 10/19에 절반(약 12만 노출)으로 줄였다가 10/20부터 안 나갑니다. 이날부터 블랙골드 (가격 표시)·블랙골드 (가격 숨김)·매거진·화이트 젤리·기존 디자인 A~D 5종이 각 약 38만 노출로 균등합니다.', why: '9/22부터 4주간 9월·10월 모두 기존 디자인 A~D보다 낮았고, 10월 클릭률 0.150%로 8개 테마 중 6위라 종료.' },
    { d: '2026-10-20', ch: '카카오', type: 'ratio', theme: 'jelly', title: '젤리 프레임 테스트 종료 · 화이트 젤리만 유지', desc: '10/14에 화이트 젤리와 함께 투입한 젤리 노출을 중단했습니다. 10/19에 절반(약 12만 노출)으로 줄였다가 10/20부터 안 나갑니다. 화이트 젤리는 그대로 나갑니다.', why: '같은 구조에서 장식만 화려한 젤리(0.142%)가 화이트 젤리(0.161%)보다 낮아, 맥날 때와 같이 "화려함이 클릭을 만들지 않는다"로 보고 화이트 젤리만 남김.' },
    { d: '2026-10-15', ch: '구글', type: 'ratio', theme: 'mcnal', title: '맥날 프레임 테스트 종료', desc: '맥날 프레임 노출을 중단했습니다. 이날부터 상품 고정 배너는 블랙골드 (가격 표시)·블랙골드 (가격 숨김)·화이트레드·매거진 4종을 똑같이(각 약 24만 노출) 나눠 내보냅니다.', why: '8일 동안 Google·Kakao 모두 클릭률 꼴찌(매거진의 55% 수준)라 "화려해야 클릭된다"는 가설은 기각. 노출을 멈추고 묘비로 표시.' },
    { d: '2026-10-15', ch: '카카오', type: 'ratio', theme: 'blackgold', title: '블랙골드 가격 표시 버전 재투입 · 가격 숨김 버전과 병행', desc: '구글(10/14)에 이어 카카오에서도 9/23부터 가격 숨김 버전만 나가던 블랙골드에 가격 표시 버전을 다시 넣어 두 버전을 같이 내보냅니다. 첫날은 다른 테마의 절반 비중(약 15만 노출, 숨김 버전은 약 32만)으로 시작했고 10/16부터 같은 비중(각 약 28만)입니다. 대시보드에서는 블랙골드를 (가격 표시)·(가격 숨김) 두 테마로 따로 집계합니다.', why: '가격 표시 여부만 다른 두 버전을 같은 기간·같은 자리에서 비교하기 위해.' },
    { d: '2026-10-15', ch: '카카오', type: 'ratio', theme: 'mcnal', title: '맥날 프레임 테스트 종료', desc: '카카오에서도 맥날 프레임 노출을 중단했습니다. 같은 날 젤리·화이트 젤리 비중을 다른 테마와 같게 올려, 블랙골드 (가격 숨김)·화이트레드·매거진·젤리·화이트 젤리·기존 디자인 A~D 6종이 각 약 31만 노출로 균등해졌고 블랙골드 (가격 표시)만 이날 하루 절반 비중이었습니다(10/16부터 7종 균등).', why: '8일 동안 Google·Kakao 모두 클릭률 꼴찌(매거진의 55% 수준)라 "화려해야 클릭된다"는 가설은 기각. 노출을 멈추고 묘비로 표시.' },
    { d: '2026-10-14', ch: '구글', type: 'ratio', theme: 'blackgold', title: '블랙골드 가격 표시 버전 재투입 · 가격 숨김 버전과 병행', desc: '9/23부터 가격 숨김 버전만 나가던 블랙골드에 가격 표시 버전을 다시 넣어 두 버전을 같이 내보냅니다. 첫날은 다른 테마의 절반 비중(약 17만 노출, 같은 날 맥날도 절반으로 축소)으로 시작했고 10/15부터 같은 비중입니다. 대시보드에서는 블랙골드를 (가격 표시)·(가격 숨김) 두 테마로 따로 집계합니다.', why: '가격 표시 여부만 다른 두 버전을 같은 기간·같은 자리에서 비교하기 위해.' },
    { d: '2026-10-14', ch: '카카오', type: 'deploy', theme: 'jelly', title: '젤리 · 화이트 젤리 디자인 추가 · 상품 고정 배너 6종 노출', desc: '카카오 상품 고정 배너에 젤리와 화이트 젤리 디자인을 추가했습니다. 블랙골드·화이트레드·매거진보다 절반 비중(각 약 20만 노출)으로 시작했습니다.' },
    { d: '2026-10-07', ch: '카카오', type: 'deploy', theme: 'mcnal', title: '맥날 디자인 추가 · 상품 고정 배너 4종 균등 노출', desc: '카카오 상품 고정 배너에도 맥날 디자인을 추가해 블랙골드·화이트레드·매거진·맥날 4종을 똑같이 나눠 내보냅니다.', why: '"프레임이 화려해야 클릭률이 잘 나온다"는 의견이 맞는지 확인하는 테스트. 매거진과 구조는 같고 디자인만 화려하게 바꿔 비교.' },
    { d: '2026-09-23', ch: '카카오', type: 'deploy', theme: 'blackgoldno', title: '블랙골드·화이트레드를 가격 숨김 버전으로 교체', desc: '구글과 같은 날 카카오에서도 가격을 표시하지 않는 버전(blackGoldNo·whiteRedNo)으로 바꿨습니다. 9/22에 일부 나갔고 9/23부터 전부 교체됐습니다. 매거진은 그대로입니다.', why: '"가격을 숨기면 클릭률이 높아진다"는 가설 검증. 다만 가격 표시판과 동시에 나눠 내보낸 것이 아니라 전부 교체한 것이라 기간 차이가 섞여 있어, 아직 결론은 내지 못함.' },
    { d: '2026-09-22', ch: '카카오', type: 'deploy', theme: 'common', title: '카카오 프레임 AB 테스트 집계 시작 · 테마 3종 + 디자인 A~D', desc: '카카오 RTB의 상품 고정 배너 테마 3종(블랙골드·화이트레드·매거진)과 디자인 A~D(SEL_ 접두 = 할인 프레임) 비교 집계를 시작했습니다. 사이즈는 300×250·728×90·250×250 세 가지입니다. 카카오는 오토 배너가 없고 지면(tagid)이 DAN-… 형식이라 웹·앱 구분이 없습니다.' },
    { d: '2026-10-07', ch: '구글', type: 'deploy', theme: 'mcnal', title: '맥날 디자인 추가 · 상품 고정 배너 4종 균등 노출', desc: '상품 고정 배너에 네 번째 디자인인 맥날을 추가했습니다. 이날부터 블랙골드·화이트레드·매거진·맥날 4종을 똑같이 나눠 내보냅니다.', why: '"프레임이 화려해야 클릭률이 잘 나온다"는 의견이 맞는지 확인하는 테스트. 매거진과 구조는 같고 디자인만 화려하게 바꿔 비교.' },
    { d: '2026-09-28', ch: '구글', type: 'ratio', theme: 'redauto', title: '상품 오토 배너를 레드오토 디자인으로 복귀', desc: '9/22에 기존 디자인(auto_origin)으로 되돌렸던 오토 배너를 다시 레드오토로 바꿨습니다. 9/28은 두 디자인이 함께 나갔고 9/29부터 레드오토만 나갑니다.' },
    { d: '2026-09-23', ch: '구글', type: 'deploy', theme: 'blackgoldno', title: '블랙골드·화이트레드를 가격 숨김 버전으로 교체', desc: '블랙골드·화이트레드 고정 배너를 가격을 표시하지 않는 버전(blackGoldNo·whiteRedNo)으로 바꿨습니다. 9/22에 3분의 1 비중으로 먼저 내보냈고 9/23부터 전부 교체됐습니다. 매거진은 그대로입니다. 대시보드에서 블랙골드는 가격 표시·숨김 버전을 따로, 화이트레드는 합쳐서 보여 줍니다.', why: '"가격을 숨기면 클릭률이 높아진다"는 가설 검증. 다만 가격 표시판과 동시에 나눠 내보낸 것이 아니라 전부 교체한 것이라 기간 차이가 섞여 있어, 아직 결론은 내지 못함.' },
    { d: '2026-09-22', ch: '구글', type: 'ratio', theme: 'autoorigin', title: '상품 오토 배너를 기존 디자인(auto_origin)으로 되돌림', desc: '레드오토 디자인 대신 기존 오토 배너(auto_origin 프레임)를 다시 내보내기 시작했습니다.' },
    { d: '2026-09-15', ch: '구글', type: 'deploy', theme: 'magazine', title: '매거진 디자인 추가 · 상품 개수 자동 조절', desc: '상품 고정 배너에 세 번째 디자인인 매거진을 추가했습니다. 배너 크기에 따라 보여 주는 상품 개수도 자동으로 맞추도록 바꿨습니다.', why: '심플한 잡지 같은 디자인이 오히려 광고라는 거부감이 덜 들어 클릭률이 높게 나오는지 확인하는 테스트.' },
    { d: '2026-09-09', ch: '구글', type: 'deploy', theme: 'redauto', title: '상품 오토 배너를 레드오토 디자인으로 교체', desc: '웹·모바일과 앱의 오토 배너(광고 자리 크기에 따라 알아서 바뀌는 배너)를 기존 디자인(auto_origin 프레임)에서 새 레드오토 디자인으로 바꿨습니다. 새 디자인과 기존 디자인의 성과 비교(AB 테스트)가 이날부터 시작됐습니다.' },
    { d: '2026-09-02', ch: '구글', type: 'deploy', theme: 'whitered', title: '화이트레드 디자인 추가 · 비상품 배너를 오토 배너 하나로 통합', desc: '상품 고정 배너에 화이트레드 디자인을 추가했습니다. 비상품 배너는 크기별로 따로 만들던 14개를 광고 자리 크기에 따라 알아서 바뀌는 오토 배너(iauto) 하나로 합쳤습니다.' },
    { d: '2026-08-26', ch: '구글', type: 'deploy', theme: 'blackgold', title: '블랙골드 디자인 배너 출시', desc: '새 블랙골드 디자인을 상품 고정 배너 14개 크기 전부에 적용했습니다.' },
    { d: '2026-08-19', ch: '구글', type: 'fix', theme: 'common', title: '배너 노출 조건 정리', desc: '네이티브 광고 자리를 정해진 비율대로 받도록 고쳤고, 너무 작은 자리(50 미만)에는 입찰하지 않게 했습니다. 고정 배너가 먼저 나가도록 우선순위도 조정했습니다.' },
    { d: '2026-08-11', ch: '구글', type: 'fix', theme: 'common', title: '네이티브 광고 로고 오류 수정', desc: '네이티브 광고에서 로고가 잘못 나오던 문제를 고쳤습니다.' },
];
const TYPE_LABEL = { deploy: '배포', ratio: '노출 비중 조정', copy: '문구·네이밍 변경', fix: '수정' };
// 페이지 THEMES에 없는 대상
const TL_TARGET = {
    blackgold: { id: 'blackgold', name: '블랙골드 프레임', color: '#2b2d31', src: 'https://kyungahkims.github.io/openRtb_banners.github.io/blackGold/ui/openRtb_blackGold_250x250_ui.html' },
    blackgoldno: { id: 'blackgoldno', name: '블랙골드 (가격 숨김) 프레임', color: '#8a8d93', src: 'https://kyungahkims.github.io/openRtb_banners.github.io/blackGold/ui/openRtb_blackGold_250x250_ui.html' },   // 가격 표시 배너와 같은 미리보기
    whitered: { id: 'whitered', name: '화이트레드 프레임', color: '#e0262f', src: 'https://kyungahkims.github.io/openRtb_banners.github.io/whiteRed/ui/openRtb_whiteRed_250x250_ui.html' },
    magazine: { id: 'magazine', name: '매거진 프레임', color: '#8b5cf6', src: 'https://kyungahkims.github.io/openRtb_banners.github.io/simpleMagazine/ui/openRtb_simple_magazine_250x250_ui.html' },
    mcnal: { id: 'mcnal', name: '맥날 프레임', color: '#e09b00', src: 'https://kyungahkims.github.io/openRtb_banners.github.io/mcnal/ui/openRtb_mcnal_250_250_ui.html' },
    jelly: { id: 'jelly', name: '젤리 프레임', color: '#d946ef', src: 'https://kyungahkims.github.io/openRtb_banners.github.io/jelly/ui/openRtb_jelly_250x250_ui.html' },
    wjelly: { id: 'wjelly', name: '화이트 젤리 프레임', color: '#f472b6', src: 'https://kyungahkims.github.io/openRtb_banners.github.io/wjelly/ui/openRtb_wjelly_250x250_ui.html' },
    story: { id: 'story', name: '스토리 프레임', color: '#0ea5e9', src: 'https://kyungahkims.github.io/openRtb_banners.github.io/story/ui/openRtb_story_250_250_ui.html' },
    redauto: { id: 'redauto', name: '레드오토 프레임', color: '#e0262f', src: 'https://kyungahkims.github.io/openRtb_banners.github.io/auto/dev/openRtbAuto_red.html', tpl: true },
    autoorigin: { id: 'autoorigin', name: 'auto_origin 프레임 (기존 오토 배너)', color: '#22c55e' },
    common: { id: 'common', name: '공통 (전체 프레임)', color: '#9aa0a8' },
    design: { id: 'design', name: '기존 디자인 A~D (카카오)', color: '#3446b8' },
    iseries: { id: 'iseries', name: 'i 시리즈', color: '#9aa0a8' },
    coupang: { id: 'coupang', name: '쿠팡 프레임', color: '#9aa0a8' },
    sel: { id: 'sel', name: 'SEL · A/B/C/D 변형', color: '#9aa0a8' },
};

// 배너 썸네일, tpl은 페이지가 채움
const tlArt = T => !T.src ? '' : `<div class="ad ad-slot" data-frame="${T.id}"><iframe ${T.tpl ? `data-tpl="${T.src}"` : `src="${T.src}"`} title="${T.name}" loading="lazy" scrolling="no"></iframe></div>`;

// 배너 축소 코드가 없는 페이지용
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

// 모달이 열린 뒤 배너 축소 다시 계산
const tlRefit = () => requestAnimationFrame(() => { if (typeof fitBannerSlots === 'function') fitBannerSlots(); if (window.__tlFit) window.__tlFit(); });

/* 페이지의 theme, md, cv, sw, nm 정의 뒤에 호출. 페이지가 window.TL_CH 를 정하면 그 채널 항목만 (기본 구글) */
function initTimeline() {
    const ol = document.getElementById('timeline'), modal = document.getElementById('tlModal');
    if (!ol || !modal) return;
    const ch = window.TL_CH || '구글';
    ol.innerHTML = TIMELINE.filter(e => e.ch === ch).sort((a, b) => b.d.localeCompare(a.d)).map((e, i) => {
        const T = theme(e.theme) || TL_TARGET[e.theme] || { id: e.theme, name: e.theme, color: '#9aa0a8' };
        return `<li>
            <div class="tl-date">${md(e.d)}<small>${e.d.slice(0, 4)}</small></div>
            <div class="tl-dot" style="${cv(T)}"></div>
            <div class="tl-body">
                <div class="tl-top"><span class="chip ch ${e.ch === '카카오' ? 'kakao' : 'google'}">${e.ch}</span><span class="chip ${e.type}">${TYPE_LABEL[e.type]}</span><b>${e.title}</b>${i === 0 ? '<span class="chip live">최신</span>' : ''}</div>
                <div class="tl-target"><span class="dot" style="${sw(T)}"></span>${nm(T)}</div>
                <p>${e.desc}</p>
                ${e.why ? `<p class="tl-why"><b>사유</b>${e.why}</p>` : ''}
            </div>
            <div class="tl-art">${tlArt(T)}</div>
        </li>`;
    }).join('');
    tlBannerFallback();
    document.getElementById('tlOpen').addEventListener('click', () => { modal.showModal(); tlRefit(); });
    document.getElementById('tlClose').addEventListener('click', () => modal.close());
    modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });   // 바깥 클릭 시 닫기
}

/* 기간 선택 월 버튼, 'N월 전체' 버튼 하나를 데이터가 있는 달마다 하나씩으로 바꿈 (마지막 달 선택) */
function monthButtons(ctrl, dates) {
    const old = ctrl.querySelector('[data-mode="month"]');
    const months = [...new Set(dates.map(d => d.slice(0, 7)))].sort();
    if (!old || !months.length) return;
    const on = old.getAttribute('aria-pressed') === 'true';
    old.insertAdjacentHTML('beforebegin', months.map((m, i) => `<button type="button" data-mode="month" data-m="${m}" aria-pressed="${on && i === months.length - 1}" title="${m.slice(0, 4)}년 ${+m.slice(5)}월">${+m.slice(5)}월 전체</button>`).join(''));
    old.remove();
}
// 선택한 월 버튼의 [첫 날짜, 마지막 날짜]
function monthRange(ctrl, dates) {
    const b = ctrl.querySelector('[data-mode="month"][aria-pressed="true"]');
    const m = b && b.dataset.m ? b.dataset.m : dates[dates.length - 1].slice(0, 7);
    const ds = dates.filter(d => d.startsWith(m));
    return [ds[0], ds[ds.length - 1]];
}
// from ~ to 가 데이터의 첫 달부터 마지막 달까지면 true, 누적 데이터(전체 기간 합)를 써도 되는지 판단
function wholeRange(from, to, dates) {
    return !!dates.length && from.slice(0, 7) <= dates[0].slice(0, 7) && to.slice(0, 7) >= dates[dates.length - 1].slice(0, 7);
}
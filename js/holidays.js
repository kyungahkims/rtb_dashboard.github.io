/* 공휴일이 바뀌면 이 목록만 고치면 됨 */
const HOLIDAYS = new Set([
    // 2025
    '2025-01-01', '2025-01-27', '2025-01-28', '2025-01-29', '2025-01-30', '2025-03-01', '2025-03-03', '2025-05-05', '2025-05-06',
    '2025-06-03', '2025-06-06', '2025-08-15', '2025-10-03', '2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08', '2025-10-09', '2025-12-25',
    // 2026
    '2026-01-01', '2026-02-16', '2026-02-17', '2026-02-18', '2026-03-01', '2026-03-02', '2026-05-05', '2026-05-24', '2026-05-25',
    '2026-06-03', '2026-06-06', '2026-08-15', '2026-08-17', '2026-09-24', '2026-09-25', '2026-09-26', '2026-10-03', '2026-10-05', '2026-10-09', '2026-12-25',
]);

// 'YYYY-MM-DD' 또는 'MM/DD' → 'day-sat' | 'day-sun' | ''
function dayCls(s) {
    let y, m, d;
    const a = String(s).match(/^(\d{4})-(\d\d)-(\d\d)$/), b = String(s).match(/^(\d\d)\/(\d\d)$/);
    if (a) [y, m, d] = [+a[1], +a[2], +a[3]];
    else if (b) { const now = new Date(); m = +b[1]; d = +b[2]; y = now.getFullYear() - (m > now.getMonth() + 1 ? 1 : 0); }
    else return '';
    const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const w = new Date(y, m - 1, d).getDay();
    return HOLIDAYS.has(key) || w === 0 ? 'day-sun' : w === 6 ? 'day-sat' : '';
}

// 표 첫 칸에 요일 색 클래스 붙이기
function markDateCells(root = document) {
    root.querySelectorAll('table tbody td:first-child').forEach(td => {
        const c = dayCls(td.textContent.trim());
        if (c) td.classList.add(c);
    });
}

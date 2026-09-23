"""
RTB 대시보드 데이터 갱신

사용법
  1. 이 폴더에 새로 받은 통계 파일을 넣는다
       - google_openRTB_일자별통계.xls  (이름 뒤에 날짜가 붙어 있어도 됨)
       - kakao_rtb_day_report.xls
       - 상품 고정 프레임.csv              (탭 구분 · date, theme, size, views, clicks)  → 상품 고정 프레임 페이지
       - 상품 오토 프레임(앱).csv           (탭 구분 · date, frame, views, clicks)        → 상품 오토 프레임 (앱) 페이지
       - 상품 오토 프레임 (웹, 모바일).csv  (탭 구분 · date, frame, views, clicks)        → 상품 오토 프레임 (웹, 모바일) 페이지
       - 지면별.csv                         (탭 구분 · date, frame, request_size, views, clicks) → 오토 페이지 5. 지면별(요청 사이즈) 비교
  2. update_data.bat 더블클릭 (또는 python update_data.py)

- 파일이 여러 개면 가장 최근에 받은 파일을 사용합니다.
- 파일을 받은 날(이름의 날짜, 없으면 파일 수정 날짜)은 집계 중이라 제외합니다.
- 프레임 CSV가 없으면 그 페이지는 건너뜁니다. 지면별.csv가 없으면 오토 페이지 5번은 비워 둡니다. 고정 페이지 6번(지면별)은 데이터가 없어 비어 있습니다.
"""
import csv
import glob
import html
import io
import json
import os
import re
import subprocess
import sys
from datetime import datetime

DIR = os.path.dirname(os.path.abspath(__file__))

try:
    import xlrd
except ImportError:  # 구글 파일(.xls) 읽기용 — 처음 한 번만 설치
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--user', '--quiet', 'xlrd'])
    import site
    sys.path.append(site.getusersitepackages())
    import xlrd


def num(v):
    return float(re.sub(r'[^0-9.\-]', '', str(v).split('\n')[0]) or 0)


def latest(pattern):
    files = glob.glob(os.path.join(DIR, pattern))
    if not files:
        sys.exit(f'파일을 찾을 수 없습니다: {pattern}')
    return max(files, key=os.path.getmtime)


def file_day(path):
    """파일을 받은 날 'MM/DD' — 이름에 날짜(YYYYMMDD)가 있으면 그 날짜, 없으면 파일 수정 날짜"""
    m = re.search(r'20\d\d(\d\d)(\d\d)', os.path.basename(path))
    if m:
        return f'{m.group(1)}/{m.group(2)}'
    return datetime.fromtimestamp(os.path.getmtime(path)).strftime('%m/%d')


# ---------------------------------------------------------------- Google · Kakao RTB
def read_google(path):
    s = xlrd.open_workbook(path, ignore_workbook_corruption=True, encoding_override='cp949').sheet_by_index(0)
    h = [str(c.value) for c in s.row(0)]
    col = {k: next(i for i, x in enumerate(h) if x.startswith(k)) for k in ('날짜', '낙찰수', '클릭수', '지출금액', '세션매출')}
    rows = []
    for r in range(1, s.nrows):
        v = [c.value for c in s.row(r)]
        d = str(v[col['날짜']]).strip()
        if re.fullmatch(r'\d\d-\d\d', d):
            rows.append(dict(d=d.replace('-', '/'), imp=num(v[col['낙찰수']]), clk=num(v[col['클릭수']]),
                             spend=num(v[col['지출금액']]), srev=num(v[col['세션매출']])))
    return rows


def read_kakao(path):
    t = open(path, encoding='cp949').read()
    rows = []
    for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', t, re.S):
        c = [html.unescape(re.sub(r'<[^>]+>', ' ', x)).strip() for x in re.findall(r'<t[hd][^>]*>(.*?)</t[hd]>', tr, re.S)]
        if len(c) > 27 and re.fullmatch(r'\d\d-\d\d', c[1]):
            # 13 모비온노출수 · 15 클릭수 · 19 지출금액 · 26 세션매출 (괄호 안 쇼핑 값은 사용 안 함)
            rows.append(dict(d=c[1].replace('-', '/'), imp=num(c[13]), clk=num(c[15]), spend=num(c[19]), srev=num(c[26])))
    return rows


def roas(d):
    return round(d['srev'] / d['spend'] * 100) if d['spend'] else 0


def update_page(page, rows, skip_day):
    days = sorted((d for d in rows if d['d'] != skip_day), key=lambda d: d['d'], reverse=True)   # 최신 → 과거
    if len(days) < 2:
        sys.exit(f'{page}: 데이터가 부족합니다')
    f = lambda x: f'{round(x):,}'
    T = {k: sum(d[k] for d in days) for k in ('imp', 'clk', 'spend', 'srev')}
    path = os.path.join(DIR, page)
    src = open(path, encoding='utf-8').read()

    # ① 당월 핵심 성과
    kpi = iter([f(T['imp']), f(T['clk']), f"{T['clk'] / T['imp'] * 100:.3f}%", f"{roas(T)}%", f(T['spend']) + '원'])
    src = re.sub(r'(<div class="value">)[^<]*(</div>)', lambda m: m.group(1) + next(kpi) + m.group(2), src, count=5)

    # ⑤ 일별 성과 테이블 (④ 그래프는 이 표를 읽어서 그림)
    tr = ''.join(f'''
                            <tr>
                                <td>{d['d']}</td>
                                <td>{f(d['imp'])}</td>
                                <td>{f(d['clk'])}</td>
                                <td>{d['clk'] / d['imp'] * 100:.3f}%</td>
                                <td>{roas(d)}%</td>
                                <td>{f(d['spend'])}원</td>
                            </tr>''' for d in days)
    src, n1 = re.subn(r'(<tbody>)[\s\S]*?(\n\s*</tbody>)', lambda m: m.group(1) + tr + m.group(2), src, count=1)

    # ②③ 최근 7일
    wk = ''.join(f"\n            {{ d: '{d['d']}', imp: {int(d['imp'])}, clk: {int(d['clk'])}, ctr: {d['clk'] / d['imp'] * 100:.4f}, "
                 f"roas: {roas(d)}, spend: {int(d['spend'])} }}," for d in reversed(days[:7]))
    src, n2 = re.subn(r'(const WEEK = \[)[\s\S]*?(\n        \];)', lambda m: m.group(1) + wk + m.group(2), src, count=1)

    if not (n1 and n2):
        sys.exit(f'{page}: 페이지 구조가 달라 갱신하지 못했습니다')
    open(path, 'w', encoding='utf-8', newline='').write(src)
    print(f'  {page}: {days[-1]["d"]} ~ {days[0]["d"]} ({len(days)}일) · 노출 {f(T["imp"])} · 클릭 {f(T["clk"])} · 소진 {f(T["spend"])}원 · ROAS {roas(T)}%')


# ---------------------------------------------------------------- 프레임 AB 테스트 페이지 (CSV)
def read_csv(path):
    """탭(또는 쉼표) 구분 CSV → dict 목록. date는 YYYYMMDD → YYYY-MM-DD"""
    text = io.open(path, encoding='utf-8-sig').read()
    delim = '\t' if '\t' in text.split('\n', 1)[0] else ','
    rows = []
    for r in csv.DictReader(io.StringIO(text), delimiter=delim):
        r = {k.strip(): (v or '').strip() for k, v in r.items() if k}
        d = re.sub(r'\D', '', r.get('date', ''))
        if len(d) != 8:
            continue
        r['date'] = f'{d[:4]}-{d[4:6]}-{d[6:]}'
        rows.append(r)
    return rows


def set_block(src, name, const, body, page):
    """/* NAME:START */ ~ /* NAME:END */ 사이의 const 배열을 body(행 문자열)로 바꿈"""
    inner = f'        const {const} = [\n{body},\n        ];' if body else f'        const {const} = [\n        ];'
    src, n = re.subn(rf'(/\* {name}:START \*/\n)[\s\S]*?(\n\s*/\* {name}:END \*/)', lambda m: m.group(1) + inner + m.group(2), src, count=1)
    if not n:
        sys.exit(f'{page}: 데이터 자리({name})를 찾지 못했습니다')
    return src


def dump_rows(rows):
    return ',\n'.join('            ' + json.dumps(list(r), ensure_ascii=False) for r in rows)


FIXED_THEME = {'blackGold': 'blackgold', 'whiteRed': 'whitered', 'magazine': 'magazine'}   # CSV theme → 페이지 테마 id


def update_fixed(path, skip_day):
    """상품 고정 프레임.csv (date, theme, size, views, clicks) → frame_test_history_page.html 의 DATA
       프레임 이름은 CSV에 없어 '사이즈_테마_ETC' 로 만듭니다 (예: 300_250_blackGold_ETC). 지면별(PDATA)은 비웁니다."""
    agg = {}
    for r in read_csv(path):
        t = FIXED_THEME.get(r.get('theme'))
        if not t or r['date'][5:].replace('-', '/') == skip_day:
            continue
        size = r['size'].replace('_', 'x')
        name = f"{r['size']}_{r['theme']}_ETC"
        a = agg.setdefault((r['date'], t, name, size), [0, 0])
        a[0] += int(num(r['views']))
        a[1] += int(num(r['clicks']))
    rows = sorted([*k, *v] for k, v in agg.items())
    page = 'frame_test_history_page.html'
    p = os.path.join(DIR, page)
    src = open(p, encoding='utf-8').read()
    src = set_block(src, 'DATA', 'DATA', dump_rows(rows), page)
    src = set_block(src, 'PDATA', 'PDATA', '', page)
    open(p, 'w', encoding='utf-8', newline='').write(src)
    dates = sorted({r[0] for r in rows})
    by_t = {}
    for d, t, n, s, imp, clk in rows:
        by_t.setdefault(t, [0, 0])
        by_t[t][0] += imp
        by_t[t][1] += clk
    print(f'  {page}: {dates[0][5:]} ~ {dates[-1][5:]} ({len(dates)}일 · {len(rows)}행) · '
          + ' · '.join(f'{t} 노출 {v[0]:,} 클릭 {v[1]:,}' for t, v in by_t.items()))


# 오토 페이지: (CSV 이름 패턴, 페이지, CSV frame 값 → 페이지 프레임 id). frame 값은 앞부분만 맞으면 됨 (autoRedETC(app_) → autoRedETC)
AUTO_PAGES = [
    ('상품 오토 프레임(앱)*.csv', 'frame_auto_app_page.html', {'autoRedETC': 'redauto', 'coupangETC': 'coupangetc'}),
    ('상품 오*프레임 (웹, 모바일)*.csv', 'frame_auto_web_page.html', {'autoRedETC': 'redauto', 'autoETC': 'autoetc'}),
]


def read_places(frame_map, skip_day):
    """지면별.csv (date, frame, request_size, views, clicks) → 누적 [프레임 id, 요청 사이즈, 노출, 클릭] (없으면 빈 목록)"""
    files = glob.glob(os.path.join(DIR, '지면별*.csv'))
    if not files:
        return []
    agg = {}
    for r in read_csv(max(files, key=os.path.getmtime)):
        if r['date'][5:].replace('-', '/') == skip_day:
            continue
        t = next((v for k, v in sorted(frame_map.items(), key=lambda x: -len(x[0])) if r['frame'].startswith(k)), None)
        if not t:
            continue
        a = agg.setdefault((t, r['request_size']), [0, 0])
        a[0] += int(num(r['views']))
        a[1] += int(num(r['clicks']))
    return sorted(([t, p, v[0], v[1]] for (t, p), v in agg.items()), key=lambda x: (-x[2], x[0]))


def update_auto(path, skip_day, page, frame_map):
    """상품 오토 프레임 CSV (date, frame, views, clicks) → 오토 페이지의 ADATA. 지면별.csv가 있으면 APDATA(요청 사이즈별 누적)도 채웁니다."""
    rows = []
    unknown = set()
    for r in read_csv(path):
        if r['date'][5:].replace('-', '/') == skip_day:
            continue
        t = next((v for k, v in sorted(frame_map.items(), key=lambda x: -len(x[0])) if r['frame'].startswith(k)), None)
        if not t:
            unknown.add(r['frame'])
            continue
        rows.append([r['date'], t, int(num(r['views'])), int(num(r['clicks']))])
    rows.sort()
    p = os.path.join(DIR, page)
    src = open(p, encoding='utf-8').read()
    src = set_block(src, 'ADATA', 'ADATA', dump_rows(rows), page)
    places = read_places(frame_map, skip_day)
    src = set_block(src, 'APDATA', 'APDATA', dump_rows(places), page)
    dates = sorted({r[0] for r in rows})
    period = {'시작': dates[0], '끝': dates[-1], '집행일수': len(dates)} if dates else {}
    src = re.sub(r'const PERIOD = \{[^\n]*\};', 'const PERIOD = ' + json.dumps(period, ensure_ascii=False) + ';', src, count=1)
    open(p, 'w', encoding='utf-8', newline='').write(src)
    by_t = {}
    for d, t, imp, clk in rows:
        by_t.setdefault(t, [0, 0])
        by_t[t][0] += imp
        by_t[t][1] += clk
    print(f'  {page}: {dates[0][5:]} ~ {dates[-1][5:]} ({len(dates)}일 · {len(rows)}행) · '
          + ' · '.join(f'{t} 노출 {v[0]:,} 클릭 {v[1]:,}' for t, v in by_t.items())
          + f' · 지면(요청 사이즈) {len({p[1] for p in places})}개'
          + (f'  ※ 매핑에 없는 frame 무시: {sorted(unknown)}' if unknown else ''))


if __name__ == '__main__':
    for label, pattern, reader, page in [
        ('Google', 'google_openRTB_*.xls', read_google, 'google_rtb_dashboard_page.html'),
        ('Kakao', 'kakao_rtb_day_report*.xls', read_kakao, 'kakao_rtb_dashboard_page.html'),
    ]:
        src = latest(pattern)
        skip = file_day(src)
        print(f'[{label}] {os.path.basename(src)}  (제외: {skip} 집계 중)')
        update_page(page, reader(src), skip)

    fixed = glob.glob(os.path.join(DIR, '상품 고정 프레임*.csv'))
    if fixed:
        src = max(fixed, key=os.path.getmtime)
        skip = file_day(src)
        print(f'[상품 고정 프레임] {os.path.basename(src)}  (제외: {skip} 집계 중)')
        update_fixed(src, skip)
    for pattern, page, frame_map in AUTO_PAGES:
        files = glob.glob(os.path.join(DIR, pattern))
        if files:
            src = max(files, key=os.path.getmtime)
            skip = file_day(src)
            print(f'[{page}] {os.path.basename(src)}  (제외: {skip} 집계 중)')
            update_auto(src, skip, page, frame_map)
    print('완료')

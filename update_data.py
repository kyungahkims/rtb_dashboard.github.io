"""
RTB 대시보드 데이터 갱신

사용법
  1. 이 폴더에 새로 받은 통계 파일을 넣는다
       - google_openRTB_일자별통계.xls  (이름 뒤에 날짜가 붙어 있어도 됨)
       - kakao_rtb_day_report.xls
       - (xlsx가 없을 때만) 상품 고정 프레임.csv · 상품 오토 프레임(앱).csv · 상품 오토 프레임 (웹, 모바일).csv  (탭 구분, 예전 방식)
       - 지면별.csv                         (탭 구분 · date, frame, request_size, views, clicks) → 오토 페이지 5. 지면별(요청 사이즈) 비교
       - rtb_frame_analysis_YYYYMMDD_YYYYMMDD.xlsx  (프레임 분석 xlsx) → 프레임 AB 테스트 4개 페이지 전부
             01_테마별_추이 · 01b_테마별_사이즈별_추이 → 상품 고정 프레임 (테마별 일별 + 사이즈별·이름별 누적)
             02_autoETC_vs_autoRed_webmob            → 상품 오토 프레임 (웹, 모바일)
             03_coupangETC_vs_autoRed_app            → 상품 오토 프레임 (앱)
             04_i사이즈그룹_vs_iauto                  → 비상품 프레임 (iauto vs 옛 i사이즈 프레임 12개 합산)
         xlsx가 있으면 프레임 페이지는 xlsx로 채우고 CSV(상품 고정/오토 프레임)는 쓰지 않습니다. 지면별.csv는 그대로 씁니다.
       - 지면별(고정).csv · 지면별(비상품).csv  (탭 구분 · date, theme, place, views, clicks) → 상품 고정 프레임 7번 · 비상품 프레임 5번 지면별 비교
       - 상품 고정 프레임(일별).csv            (탭 구분 · date, theme, name, size, views, clicks) → 상품 고정 프레임 5·6번 '일별' 선택
             둘 다 원본 일별 파일(tag_stats_MMDD.csv · frame_value_stats_MMDD.csv)이 있는 폴더에서 만듭니다:  python update_data.py --places "폴더 경로"
             (고정: 테마 키워드 blackGold·whiteRed·magazine 프레임 · 비상품: iauto·i{가로}_{세로} 프레임,
              이상치(views<100 · clicks>views · ctr>=1) 제외, 노출 상위 12개 지면 + 나머지는 '기타 지면')
  2. update_data.bat 더블클릭 (또는 python update_data.py · 프레임 페이지만: python update_data.py --frames)

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
    src = set_block(src, 'PDATA', 'PDATA', dump_rows(read_fixed_places()), page)
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
    files = [f for f in glob.glob(os.path.join(DIR, '지면별*.csv')) if '(' not in os.path.basename(f)]   # 지면별(고정)·지면별(비상품).csv는 별도
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
    write_auto(page, rows, read_places(frame_map, skip_day), unknown)


def write_auto(page, rows, places, unknown=()):
    """[날짜, 프레임 id, 노출, 클릭] 행 → 오토·비상품 페이지의 ADATA · APDATA · PERIOD"""
    p = os.path.join(DIR, page)
    src = open(p, encoding='utf-8').read()
    src = set_block(src, 'ADATA', 'ADATA', dump_rows(rows), page)
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


# ---------------------------------------------------------------- 프레임 AB 테스트 페이지 (xlsx: rtb_frame_analysis_YYYYMMDD_YYYYMMDD.xlsx)
def load_xlsx(path):
    """시트 이름 → 행 목록 (값만)"""
    try:
        import openpyxl
    except ImportError:  # xlsx 읽기용 — 처음 한 번만 설치
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--user', '--quiet', 'openpyxl'])
        import site
        sys.path.append(site.getusersitepackages())
        import openpyxl
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    return {ws.title: [list(r) for r in ws.iter_rows(values_only=True)] for ws in wb.worksheets}


def xl_table(rows, first, *needed):
    """시트 안에서 첫 칸이 first 이고 needed 열을 모두 가진 머리글 줄을 찾아 그 표를 dict 목록으로 (빈 줄까지)"""
    for i, r in enumerate(rows):
        keys = [str(c).strip() if c is not None else '' for c in r]
        if keys and keys[0] == first and all(n in keys for n in needed):
            out = []
            for b in rows[i + 1:]:
                if b[0] is None or str(b[0]).strip() == '':
                    break
                out.append({k: v for k, v in zip(keys, b) if k})
            return out
    sys.exit(f'xlsx: 표를 찾지 못했습니다 (머리글 {first} · {needed})')


def xl_int(v):
    return int(round(float(v))) if v not in (None, '') else 0


def xl_date(v):
    d = re.sub(r'\D', '', str(v))
    return f'{d[:4]}-{d[4:6]}-{d[6:]}'


def xl_size(frame_value):
    """frame_value → 사이즈 (04_728_90_blackGold_ETC → 728x90, autoETC_verygoodtour → 비규격)"""
    m = re.match(r'(\d+)_(\d+)', re.sub(r'^04_', '', frame_value))
    return f'{m.group(1)}x{m.group(2)}' if m else '비규격'


XL_FIXED = {'blackGold': 'blackgold', 'whiteRed': 'whitered', 'magazine': 'magazine'}   # xlsx 테마 → 페이지 테마 id (verygoodtour 는 제외)
XL_AUTO = [   # (시트, 페이지, {페이지 프레임 id: xlsx 열 접두어}, 지면별.csv frame 매핑)
    ('02_autoETC_vs_autoRed_webmob', 'frame_auto_web_page.html', {'redauto': 'autoRedETC(web+mob)', 'autoetc': 'autoETC(전체)'}, {'autoRedETC': 'redauto', 'autoETC': 'autoetc'}),
    ('03_coupangETC_vs_autoRed_app', 'frame_auto_app_page.html', {'redauto': 'autoRedETC(app)', 'coupangetc': 'coupangETC(전체)'}, {'autoRedETC': 'redauto', 'coupangETC': 'coupangetc'}),
    ('04_i사이즈그룹_vs_iauto', 'frame_nonproduct_page.html', {'iauto': 'iauto', 'isize': '옛i사이즈그룹'}, None),
]


def update_fixed_xlsx(sheets):
    """01 시트(날짜 × 테마) → DATA [날짜, 테마, '', '', 노출, 클릭] (일별 사이즈·이름 없음)
       01b 시트(사이즈 × 테마) → SDATA [테마, 사이즈, 노출, 클릭] · 01 시트 '테마별 포함 frame_value' → NDATA [테마, 이름, 사이즈, 노출, 클릭] (기간 누적)"""
    rows = []
    for r in xl_table(sheets['01_테마별_추이'], 'date', 'blackGold_views'):
        d = xl_date(r['date'])
        for xt, t in XL_FIXED.items():
            v = xl_int(r.get(f'{xt}_views'))
            if v:
                rows.append([d, t, '', '', v, xl_int(r.get(f'{xt}_clicks'))])
    ndata = [[XL_FIXED[r['theme']], r['frame_value'], xl_size(r['frame_value']), xl_int(r['views']), xl_int(r['clicks'])]
             for r in xl_table(sheets['01_테마별_추이'], 'theme', 'frame_value') if r['theme'] in XL_FIXED]
    sdata = []
    for r in xl_table(sheets['01b_테마별_사이즈별_추이'], 'size', 'blackGold_views'):
        size = str(r['size']).replace('_', 'x')
        for xt, t in XL_FIXED.items():
            v = xl_int(r.get(f'{xt}_views'))
            if v:
                sdata.append([t, size, v, xl_int(r.get(f'{xt}_clicks'))])
    page = 'frame_test_history_page.html'
    p = os.path.join(DIR, page)
    src = open(p, encoding='utf-8').read()
    src = set_block(src, 'DATA', 'DATA', dump_rows(rows), page)
    src = set_block(src, 'SDATA', 'SDATA', dump_rows(sdata), page)
    src = set_block(src, 'NDATA', 'NDATA', dump_rows(ndata), page)
    daily = read_fixed_daily()
    daily += derive_missing_daily(rows, ndata, daily)
    src = set_block(src, 'DDATA', 'DDATA', dump_rows(daily), page)
    places = read_fixed_places()
    src = set_block(src, 'PDATA', 'PDATA', dump_rows(places), page)
    open(p, 'w', encoding='utf-8', newline='').write(src)
    dates = sorted({r[0] for r in rows})
    by_t = {}
    for d, t, n, s_, imp, clk in rows:
        by_t.setdefault(t, [0, 0])
        by_t[t][0] += imp
        by_t[t][1] += clk
    print(f'  {page}: {dates[0][5:]} ~ {dates[-1][5:]} ({len(dates)}일 · 테마 {len(by_t)}개) · '
          + ' · '.join(f'{t} 노출 {v[0]:,} 클릭 {v[1]:,}' for t, v in by_t.items())
          + f' · 사이즈 {len({r[1] for r in sdata})}개 · 프레임 이름 {len(ndata)}개'
          + (f' · 일별 사이즈 {min(r[0] for r in daily)[5:]} ~ {max(r[0] for r in daily)[5:]}' if daily else ' · 일별 사이즈 없음')
          + (f' · 지면 {len({r[2] for r in places if r[2] != ETC_PLACE})}개 ({min(r[0] for r in places)[5:]} ~ {max(r[0] for r in places)[5:]})' if places else ' · 지면 데이터 없음'))


ETC_PLACE = '기타 지면'
PLACE_N = 12
FIXED_KEYWORD = {'blackgold': 'blackgold', 'whitered': 'whitered', 'magazine': 'magazine'}   # frame_value 소문자에 들어 있는 키워드 → 테마 id


def nonproduct_frame(fv):
    """frame_value → 비상품 프레임 id: iauto → iauto · i{가로}_{세로}(변형 포함) → isize · 그 외 None (iinstl 등 제외)"""
    if fv == 'iauto':
        return 'iauto'
    if re.match(r'^i\d+_\d+', fv):
        return 'isize'
    return None


def build_places(folder):
    """tag_stats_MMDD.csv(구글 · 카카오 파일 제외)들 → 지면별(고정).csv · 지면별(비상품).csv  [date, theme, place, views, clicks]
       xlsx와 같은 이상치 기준(views<100 · clicks>views · ctr_percent>=1)으로 거릅니다.
         고정   : frame_value에 테마 키워드(blackGold · whiteRed · magazine)가 든 프레임 → 상품 고정 프레임 6번
         비상품 : iauto · i{가로}_{세로} 프레임 → 비상품 프레임 5번
       지면(tag_descriptor)은 파일별로 기간 전체 노출 상위 12개만 이름을 남기고 나머지는 '기타 지면'으로 묶습니다."""
    files = sorted(f for f in glob.glob(os.path.join(folder, 'tag_stats_*.csv')) if '카카오' not in os.path.basename(f))
    if not files:
        sys.exit(f'tag_stats_*.csv 파일이 없습니다: {folder}')
    year = datetime.now().year
    agg = {'고정': {}, '비상품': {}}
    for f in files:
        m = re.search(r'tag_stats_(\d\d)(\d\d)', os.path.basename(f))
        if not m:
            continue
        d = f'{year}-{m.group(1)}-{m.group(2)}'
        text = io.open(f, encoding='utf-8-sig').read()
        for r in csv.DictReader(io.StringIO(text)):
            fv = (r.get('frame_value') or '').strip()
            low = fv.lower()
            t = next((v for k, v in FIXED_KEYWORD.items() if k in low), None)
            kind = '고정' if t else '비상품'
            if not t:
                t = nonproduct_frame(fv)
            if not t:
                continue
            v, c, ctr = num(r.get('views')), num(r.get('clicks')), num(r.get('ctr_percent'))
            if v < 100 or c > v or ctr >= 1:
                continue
            a = agg[kind].setdefault((d, t, r['tag_descriptor'].strip()), [0, 0])
            a[0] += int(v)
            a[1] += int(c)
    build_fixed_daily(folder)
    for kind, data in agg.items():
        by_place = {}
        for (d, t, pl), (v, c) in data.items():
            by_place[pl] = by_place.get(pl, 0) + v
        top = {pl for pl, _ in sorted(by_place.items(), key=lambda x: -x[1])[:PLACE_N]}
        out = {}
        for (d, t, pl), (v, c) in data.items():
            k = (d, t, pl if pl in top else ETC_PLACE)
            o = out.setdefault(k, [0, 0])
            o[0] += v
            o[1] += c
        rows = sorted([*k, *v] for k, v in out.items())
        path = os.path.join(DIR, f'지면별({kind}).csv')
        with io.open(path, 'w', encoding='utf-8-sig', newline='') as fp:
            w = csv.writer(fp, delimiter='\t')
            w.writerow(['date', 'theme', 'place', 'views', 'clicks'])
            w.writerows(rows)
        dates = sorted({r[0] for r in rows})
        print(f'  지면별({kind}).csv: {len(files)}개 파일 → {dates[0][5:]} ~ {dates[-1][5:]} ({len(dates)}일 · {len(rows)}행) · 상위 지면 {len(top)}개 + {ETC_PLACE}' if rows else f'  지면별({kind}).csv: 데이터 없음')


def build_fixed_daily(folder):
    """frame_value_stats_MMDD.csv(구글 · 카카오 파일 제외)들 → 상품 고정 프레임(일별).csv  [date, theme, name, size, views, clicks]
       테마 키워드 프레임만, xlsx와 같은 이상치 기준으로 걸러 날짜 × 프레임 이름(사이즈)로 모읍니다 → 고정 페이지 ⑤ 사이즈별 · ⑥ 이름별의 '일별' 선택용"""
    files = sorted(f for f in glob.glob(os.path.join(folder, 'frame_value_stats_*.csv')) if '카카오' not in os.path.basename(f))
    if not files:
        print('  frame_value_stats_*.csv 가 없어 상품 고정 프레임(일별).csv 는 만들지 않습니다')
        return
    year = datetime.now().year
    agg = {}
    for f in files:
        m = re.search(r'frame_value_stats_(\d\d)(\d\d)', os.path.basename(f))
        if not m:
            continue
        d = f'{year}-{m.group(1)}-{m.group(2)}'
        for r in csv.DictReader(io.StringIO(io.open(f, encoding='utf-8-sig').read())):
            fv = (r.get('frame_value') or '').strip()
            t = next((v for k, v in FIXED_KEYWORD.items() if k in fv.lower()), None)
            if not t:
                continue
            v, c, ctr = num(r.get('views')), num(r.get('clicks')), num(r.get('ctr_percent'))
            if v < 100 or c > v or ctr >= 1:
                continue
            a = agg.setdefault((d, t, fv, xl_size(fv)), [0, 0])
            a[0] += int(v)
            a[1] += int(c)
    rows = sorted([*k, *v] for k, v in agg.items())
    path = os.path.join(DIR, '상품 고정 프레임(일별).csv')
    with io.open(path, 'w', encoding='utf-8-sig', newline='') as fp:
        w = csv.writer(fp, delimiter='\t')
        w.writerow(['date', 'theme', 'name', 'size', 'views', 'clicks'])
        w.writerows(rows)
    dates = sorted({r[0] for r in rows})
    print(f'  상품 고정 프레임(일별).csv: {len(files)}개 파일 → {dates[0][5:]} ~ {dates[-1][5:]} ({len(dates)}일 · {len(rows)}행)')


def read_fixed_daily():
    """상품 고정 프레임(일별).csv → [date, theme, name, size, views, clicks] (없으면 빈 목록)"""
    files = glob.glob(os.path.join(DIR, '상품 고정 프레임(일별)*.csv'))
    if not files:
        return []
    return sorted([r['date'], r['theme'], r['name'], r['size'], int(num(r['views'])), int(num(r['clicks']))]
                  for r in read_csv(max(files, key=os.path.getmtime)) if r.get('theme') and r.get('name'))


def read_place_csv(kind):
    """지면별(고정).csv / 지면별(비상품).csv → [date, theme, place, views, clicks] (없으면 빈 목록)"""
    files = glob.glob(os.path.join(DIR, f'지면별({kind})*.csv'))
    if not files:
        return []
    rows = []
    for r in read_csv(max(files, key=os.path.getmtime)):
        if r.get('theme') and r.get('place'):
            rows.append([r['date'], r['theme'], r['place'], int(num(r['views'])), int(num(r['clicks']))])
    return sorted(rows)


def read_fixed_places():
    return read_place_csv('고정')


def read_nonproduct_places():
    """지면별(비상품).csv → 기간 누적 [프레임 id, 지면, 노출, 클릭] ('기타 지면' 제외 · 오토 페이지 APDATA와 같은 꼴)"""
    agg = {}
    for d, t, pl, v, c in read_place_csv('비상품'):
        if pl == ETC_PLACE:
            continue
        a = agg.setdefault((t, pl), [0, 0])
        a[0] += v
        a[1] += c
    return sorted(([t, pl, v[0], v[1]] for (t, pl), v in agg.items()), key=lambda x: (-x[2], x[0]))


def derive_missing_daily(theme_rows, ndata, daily):
    """원본 일별 파일이 없는 날이 xlsx 기간 안에 하루뿐이면(보통 마지막 날) 그날의 프레임 이름별 값을 계산으로 채웁니다:
       xlsx 기간 누적(NDATA) − 원본 일별 합 = 빠진 날. 테마별 합이 xlsx 그날 테마 합과 정확히 맞을 때만 씁니다."""
    xl_dates = sorted({r[0] for r in theme_rows})
    have = {r[0] for r in daily}
    missing = [d for d in xl_dates if d not in have]
    if not missing or not daily:
        return []
    if len(missing) > 1:
        print(f'  ※ 원본 일별 파일이 없는 날이 {len(missing)}일({", ".join(d[5:] for d in missing)})이라 일별 사이즈를 계산으로 채우지 못했습니다')
        return []
    d = missing[0]
    used = {}
    for _, t, n, s_, v, c in daily:
        a = used.setdefault((t, n), [0, 0])
        a[0] += v
        a[1] += c
    out, tot = [], {}
    for t, n, s_, v, c in ndata:
        dv, dc = v - used.get((t, n), [0, 0])[0], c - used.get((t, n), [0, 0])[1]
        if dv < 0 or dc < 0:
            print(f'  ※ {d[5:]} 일별 사이즈 계산 실패: {n} 누적보다 원본 합이 큼 → 건너뜀')
            return []
        if dv:
            out.append([d, t, n, s_, dv, dc])
        a = tot.setdefault(t, [0, 0])
        a[0] += dv
        a[1] += dc
    want = {t: [v, c] for dd, t, _, _, v, c in theme_rows if dd == d}
    if any(tot.get(t, [0, 0]) != want[t] for t in want):
        print(f'  ※ {d[5:]} 일별 사이즈 계산 결과가 xlsx 테마 합과 달라 건너뜀 ({tot} ≠ {want})')
        return []
    print(f'  {d[5:]} 일별 사이즈·이름: 원본 파일이 없어 xlsx 누적 − 원본 일별 합으로 계산해 채움 ({len(out)}행 · 테마 합 일치)')
    return out


def update_frames_xlsx(path):
    sheets = load_xlsx(path)
    print(f'[프레임 xlsx] {os.path.basename(path)}')
    update_fixed_xlsx(sheets)
    for sheet, page, cols, frame_map in XL_AUTO:
        rows = []
        for r in xl_table(sheets[sheet], 'date', *[f'{c}_views' for c in cols.values()]):
            d = xl_date(r['date'])
            for t, col in cols.items():
                v = xl_int(r.get(f'{col}_views'))
                if v:
                    rows.append([d, t, v, xl_int(r.get(f'{col}_clicks'))])
        rows.sort()
        write_auto(page, rows, read_places(frame_map, None) if frame_map else read_nonproduct_places())


if __name__ == '__main__':
    if '--places' in sys.argv:   # tag_stats 폴더 → 지면별(고정).csv 만 만들고 끝
        build_places(sys.argv[sys.argv.index('--places') + 1])
        sys.exit()
    if '--frames' not in sys.argv:
        for label, pattern, reader, page in [
            ('Google', 'google_openRTB_*.xls', read_google, 'google_rtb_dashboard_page.html'),
            ('Kakao', 'kakao_rtb_day_report*.xls', read_kakao, 'kakao_rtb_dashboard_page.html'),
        ]:
            src = latest(pattern)
            skip = file_day(src)
            print(f'[{label}] {os.path.basename(src)}  (제외: {skip} 집계 중)')
            update_page(page, reader(src), skip)

    xlsx = glob.glob(os.path.join(DIR, 'rtb_frame_analysis_*.xlsx'))
    if xlsx:
        update_frames_xlsx(max(xlsx, key=os.path.getmtime))
    else:
        fixed = [f for f in glob.glob(os.path.join(DIR, '상품 고정 프레임*.csv')) if '(일별)' not in os.path.basename(f)]
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

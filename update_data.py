"""
RTB 대시보드 데이터 갱신

사용법
  1. 이 폴더에 새로 받은 통계 파일을 넣는다
       google_openRTB_일자별통계.xls        -> Google RTB 페이지
       kakao_rtb_day_report.xls             -> Kakao RTB 페이지
       rtb_google_frame_stats.xlsx          -> 프레임 AB 테스트 페이지 4개 (예전 이름 rtb_theme_ab_result_*.xlsx 도 됨)
  2. update_data.bat 더블클릭 (또는 python update_data.py)
     프레임 페이지만 갱신하려면 python update_data.py --frames
     Google, Kakao 페이지만 갱신하려면 python update_data.py --rtb

- Google, Kakao 는 페이지에 쌓인 날짜에 폴더의 파일들을 합칩니다. 지난달 파일은 지워도 페이지에 남습니다.
  같은 날짜는 최근에 받은 파일 값을 쓰고, 파일을 받은 날은 집계 중이라 제외합니다.
- 프레임 페이지는 파일이 여러 개면 가장 최근에 받은 파일을 사용합니다.
- 지면별, 사이즈별 표는 누적 상위 60개, 날짜별 상위 40개 항목만 넣습니다.
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
HTML_DIR = os.path.join(DIR, 'html')   # 대시보드 페이지 폴더

try:
    import xlrd
except ImportError:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--user', '--quiet', 'xlrd'])
    import site
    sys.path.append(site.getusersitepackages())
    import xlrd


def num(v):
    return float(re.sub(r'[^0-9.\-]', '', str(v).split('\n')[0]) or 0)


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
            # 13 모비온노출수, 15 클릭수, 19 지출금액, 26 세션매출
            rows.append(dict(d=c[1].replace('-', '/'), imp=num(c[13]), clk=num(c[15]), spend=num(c[19]), srev=num(c[26])))
    return rows


def file_date(path):
    """파일을 받은 날 datetime, 파일 이름의 20YYMMDD 우선"""
    m = re.search(r'(20\d\d)(\d\d)(\d\d)', os.path.basename(path))
    if m:
        return datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    return datetime.fromtimestamp(os.path.getmtime(path))


def update_page(page, files, reader):
    """페이지의 DAYS [날짜, 노출, 클릭, 소진, 세션매출] 에 통계 파일들을 합침
    - 페이지에 있던 날은 그대로 두고, 파일에 있는 날은 파일 값으로 바꿈 (최근에 받은 파일이 우선)
    - 각 파일을 받은 날은 집계 중이라 제외"""
    path = os.path.join(HTML_DIR, page)
    src = open(path, encoding='utf-8').read()
    block = re.search(r'/\* DAYS:START \*/([\s\S]*?)/\* DAYS:END \*/', src)
    if not block:
        sys.exit(f'{page}: 데이터 자리(DAYS)를 찾지 못했습니다')
    have = {r[0]: r for r in (json.loads(x) for x in re.findall(r'\["\d{4}-\d\d-\d\d"[^\]]*\]', block.group(1)))}
    for p in sorted(files, key=os.path.getmtime):
        fd = file_date(p)
        skip = fd.strftime('%m/%d')
        rows = [d for d in reader(p) if d['d'] != skip]
        for d in rows:
            mm, dd = map(int, d['d'].split('/'))
            ymd = f'{fd.year - (mm > fd.month):04d}-{mm:02d}-{dd:02d}'   # 1월에 받은 파일의 12월 날짜는 전년도
            have[ymd] = [ymd, int(d['imp']), int(d['clk']), int(d['spend']), int(d['srev'])]
        print(f'  {os.path.basename(p)}: {min(r["d"] for r in rows)} ~ {max(r["d"] for r in rows)} ({len(rows)}일, {skip} 집계 중 제외)' if rows else f'  {os.path.basename(p)}: 데이터 없음')
    days = sorted(have.values())
    if len(days) < 2:
        sys.exit(f'{page}: 데이터가 부족합니다')
    src = set_block(src, 'DAYS', 'DAYS', dump_rows(days), page)
    open(path, 'w', encoding='utf-8', newline='').write(src)
    f = lambda x: f'{round(x):,}'
    by_m = {}
    for ymd, imp, clk, spend, srev in days:
        a = by_m.setdefault(ymd[:7], [0, 0, 0, 0, 0])
        a[0] += 1; a[1] += imp; a[2] += clk; a[3] += spend; a[4] += srev
    for m, (n, imp, clk, spend, srev) in by_m.items():
        print(f'  {page} {m}: {n}일 · 노출 {f(imp)} · 클릭 {f(clk)} · 소진 {f(spend)}원 · ROAS {round(srev / spend * 100) if spend else 0}%')


# ---------------------------------------------------------------- 프레임 AB 테스트 페이지 (CSV)
def read_csv(path):
    """탭 또는 쉼표 구분 CSV → dict 목록, date 는 YYYY-MM-DD"""
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


def read_places(frame_map, skip_day):
    """지면별.csv → 누적 [프레임 id, 요청 사이즈, 노출, 클릭]"""
    files = [f for f in glob.glob(os.path.join(DIR, '지면별*.csv')) if '(' not in os.path.basename(f)]   # 지면별(고정).csv 등은 제외
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


def write_auto(page, rows, places, unknown=(), extra=None):
    """[날짜, 프레임 id, 노출, 클릭] 행 → 오토·비상품 페이지의 ADATA · APDATA"""
    p = os.path.join(HTML_DIR, page)
    src = open(p, encoding='utf-8').read()
    src = set_block(src, 'ADATA', 'ADATA', dump_rows(rows), page)
    src = set_block(src, 'APDATA', 'APDATA', dump_rows(places), page)
    for name, data in (extra or {}).items():
        src = set_block(src, name, name, dump_rows(data), page)
    dates = sorted({r[0] for r in rows})
    open(p, 'w', encoding='utf-8', newline='').write(src)
    by_t = {}
    for d, t, imp, clk in rows:
        by_t.setdefault(t, [0, 0])
        by_t[t][0] += imp
        by_t[t][1] += clk
    print(f'  {page}: {dates[0][5:]} ~ {dates[-1][5:]} ({len(dates)}일 · {len(rows)}행) · '
          + ' · '.join(f'{t} 노출 {v[0]:,} 클릭 {v[1]:,}' for t, v in by_t.items())
          + f' · 지면(요청 사이즈) {len({p[1] for p in places})}개'
          + ''.join(f' · {k} {len(v)}행 ({min(r[0] for r in v)[5:]} ~ {max(r[0] for r in v)[5:]})' for k, v in (extra or {}).items() if k.endswith('DDATA') and v)
          + (f'  ※ 매핑에 없는 frame 무시: {sorted(unknown)}' if unknown else ''))


# ---------------------------------------------------------------- 프레임 AB 테스트 페이지 (xlsx)
def load_xlsx(path):
    """시트 이름 → 행 목록 (값만)"""
    try:
        import openpyxl
    except ImportError:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--user', '--quiet', 'openpyxl'])
        import site
        sys.path.append(site.getusersitepackages())
        import openpyxl
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    return {ws.title: [list(r) for r in ws.iter_rows(values_only=True)] for ws in wb.worksheets}


def xl_table(rows, first, *needed):
    """첫 칸이 first 이고 needed 열이 있는 머리글 아래 표 → dict 목록"""
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
    """frame_value → 사이즈, 04_728_90_blackGold_ETC → 728x90"""
    m = re.match(r'(\d+)_(\d+)', re.sub(r'^04_', '', frame_value))
    return f'{m.group(1)}x{m.group(2)}' if m else '비규격'


XL_FIXED = {'blackGold': 'blackgold', 'blackGoldNo': 'blackgold', 'whiteRed': 'whitered', 'whiteRedNo': 'whitered', 'magazine': 'magazine'}   # xlsx 테마 → 페이지 테마 id
XL_AUTO = [   # (시트, 페이지, {프레임 id: 열 접두어}, 지면별.csv frame 매핑)
    # auto_origin 은 기존 프레임의 새 이름
    ('02_autoETC_vs_autoRed_webmob', 'frame_auto_web_page.html', {'redauto': ['autoRedETC(web+mob)'], 'autoetc': ['autoETC(전체)', 'auto_origin(web+mob)']}, {'autoRedETC': 'redauto', 'autoETC': 'autoetc', 'auto_origin': 'autoetc'}),
    ('03_coupangETC_vs_autoRed_app', 'frame_auto_app_page.html', {'redauto': ['autoRedETC(app)'], 'coupangetc': ['coupangETC(전체)', 'auto_origin(app)']}, {'autoRedETC': 'redauto', 'coupangETC': 'coupangetc', 'auto_origin': 'coupangetc'}),
    ('04_i사이즈그룹_vs_iauto', 'frame_nonproduct_page.html', {'iauto': ['iauto'], 'isize': ['옛i사이즈그룹']}, None),
]


AB_FIXED = {'blackGold': 'blackgold', 'blackGoldNo': 'blackgold', 'whiteRed': 'whitered', 'whiteRedNo': 'whitered', 'magazine': 'magazine'}   # theme_ab 테마 → 페이지 테마 id
AB_DATE = re.compile(r'^\d{4}-\d\d-\d\d')


def ab_table(rows, dates_only=True):
    """theme_ab 시트 → dict 목록, dates_only 면 첫 칸이 날짜인 행만"""
    keys = [str(c).strip() if c is not None else '' for c in rows[0]]
    out = []
    for r in rows[1:]:
        if r[0] is None or str(r[0]) == '':
            continue
        if dates_only and not AB_DATE.match(str(r[0])):
            continue
        out.append({k: v for k, v in zip(keys, r) if k})
    return out


def ab_date(v):
    return str(v)[:10]


def update_fixed_ab(ab):
    """1_테마_일별, 2_사이즈테마_일별 → (DATA, DDATA, NDATA, SDATA) 행 목록"""
    daily = {}
    for r in ab_table(ab['1_테마_일별']):
        d = ab_date(r['날짜'])
        for xt, t in AB_FIXED.items():
            v = xl_int(r.get(f'{xt}_노출'))
            if v:
                a = daily.setdefault((d, t), [0, 0])
                a[0] += v
                a[1] += xl_int(r.get(f'{xt}_클릭'))
    rows = sorted([d, t, '', '', v, c] for (d, t), (v, c) in daily.items())
    ddata = []
    for r in ab_table(ab['2_사이즈테마_일별']):
        t = AB_FIXED.get(str(r['테마']))
        if not t or not xl_int(r['노출']):
            continue
        ddata.append([ab_date(r['날짜']), t, str(r['키']), str(r['사이즈']).replace('_', 'x'), xl_int(r['노출']), xl_int(r['클릭'])])
    ddata.sort()
    by_name, by_size = {}, {}
    for d, t, n, size, v, c in ddata:
        a = by_name.setdefault((t, n, size), [0, 0]); a[0] += v; a[1] += c
        b = by_size.setdefault((t, size), [0, 0]); b[0] += v; b[1] += c
    ndata = sorted([t, n, size, v, c] for (t, n, size), (v, c) in by_name.items())
    sdata = sorted([t, size, v, c] for (t, size), (v, c) in by_size.items())
    return rows, ddata, ndata, sdata


def ab_top_rows(rows):
    """소제목과 머리글이 반복되는 TOP15 시트 → dict 목록"""
    hdr, out = None, []
    for r in rows:
        if not r or r[0] is None or str(r[0]).startswith('('):
            continue
        if r[0] == 'tagid' or r[0] == '날짜':
            hdr = [str(c).strip() if c is not None else '' for c in r]
            continue
        if hdr:
            out.append({k: v for k, v in zip(hdr, r) if k})
    return out


def ab_theme_of(size_theme):
    """'728_90_whiteRed' → 페이지 테마 id"""
    return AB_FIXED.get(str(size_theme).rsplit('_', 1)[-1])


def ab_places(ab):
    """6_tagid_TOP15 → XPDATA [테마, 지면, 노출, 클릭]"""
    agg, seen = {}, set()
    for r in ab_top_rows(ab['6_tagid_TOP15']):
        key = (r['tagid'], r['사이즈_테마'])
        t = ab_theme_of(r['사이즈_테마'])
        if key in seen or not t:
            continue
        seen.add(key)
        a = agg.setdefault((t, r['tagid']), [0, 0]); a[0] += xl_int(r['노출']); a[1] += xl_int(r['클릭'])
    return sorted(([t, pl, v[0], v[1]] for (t, pl), v in agg.items()), key=lambda x: (-x[2], x[0]))


def ab_places_daily(ab):
    """6b_tagid_TOP15_일별 → PDATA [날짜, 테마, 지면, 노출, 클릭]"""
    agg, seen = {}, set()
    for r in ab_top_rows(ab['6b_tagid_TOP15_일별']):
        d = ab_date(r['날짜'])
        key = (d, r['tagid'], r['사이즈_테마'])
        t = AB_FIXED.get(str(r['테마']))
        if key in seen or not t:
            continue
        seen.add(key)
        a = agg.setdefault((d, t, r['tagid']), [0, 0]); a[0] += xl_int(r['노출']); a[1] += xl_int(r['클릭'])
    return sorted([d, t, pl, v[0], v[1]] for (d, t, pl), v in agg.items())


AB_SITE = re.compile(r'^(web|app|mob)_(.+?)_([a-z]+)_(\d+)$')
AB_DAY_N, AB_CUM_N = 40, 60   # 페이지에 넣을 일별, 누적 상위 항목 수


def ab_site(tagid):
    """web_daum.net_banner_3_N_v2 → daum.net"""
    m = AB_SITE.match(str(tagid).replace('_N_v2', ''))
    return m.group(2) if m else str(tagid)


def ab_full_rows(ab, sheet):
    """A, B, C 전체 시트 → dict 목록"""
    rows = ab[sheet]
    keys = [str(c).strip() if c is not None else '' for c in rows[0]]
    return [r for r in ({k: v for k, v in zip(keys, row) if k} for row in rows[1:] if row and row[0] is not None) if r.get('이상치') != 'Y']


def ab_daily_cum(items):
    """(날짜, 프레임 id, 항목, 노출, 클릭) 반복 → 일별 [날짜, 프레임, 항목, 노출, 클릭], 누적 [프레임, 항목, 노출, 클릭]"""
    daily, cum, by_day, by_all = {}, {}, {}, {}
    for d, t, k, v, c in items:
        if not t or not v:
            continue
        a = daily.setdefault((d, t, k), [0, 0]); a[0] += v; a[1] += c
        b = cum.setdefault((t, k), [0, 0]); b[0] += v; b[1] += c
        by_day[(d, k)] = by_day.get((d, k), 0) + v
        by_all[k] = by_all.get(k, 0) + v
    top_day = {}
    for (d, k), v in by_day.items():
        top_day.setdefault(d, []).append((v, k))
    keep_day = {d: {k for _, k in sorted(lst, reverse=True)[:AB_DAY_N]} for d, lst in top_day.items()}
    keep_all = {k for _, k in sorted(((v, k) for k, v in by_all.items()), reverse=True)[:AB_CUM_N]}
    out_d = sorted([d, t, k, v[0], v[1]] for (d, t, k), v in daily.items() if k in keep_day[d])
    out_c = sorted(([t, k, v[0], v[1]] for (t, k), v in cum.items() if k in keep_all), key=lambda x: (-x[2], x[0]))
    return out_d, out_c


def ab_full_places(ab, group, frame_of):
    """A_지면일별 → 사이트 기준 일별, 누적"""
    return ab_daily_cum((ab_date(r['날짜']), frame_of(str(r['테마또는프레임'])), ab_site(r['tagid']), xl_int(r['노출']), xl_int(r['클릭']))
                        for r in ab_full_rows(ab, 'A_지면일별') if r['비교군'] == group)


def ab_full_auto_sizes(ab, media, frame_map):
    """B_오토요청사이즈일별 → 요청 사이즈 기준 일별, 누적"""
    return ab_daily_cum((ab_date(r['날짜']), frame_map.get(str(r['프레임'])), str(r['요청사이즈']), xl_int(r['노출']), xl_int(r['클릭']))
                        for r in ab_full_rows(ab, 'B_오토요청사이즈일별') if r['매체'] == media and re.fullmatch(r'\d+_\d+', str(r['요청사이즈'])))


def ab_full_np_sizes(ab):
    """C_비상품요청사이즈일별 → 요청 사이즈 기준 일별, 누적"""
    kind = {'auto형': 'iauto', '사이즈형': 'isize'}
    return ab_daily_cum((ab_date(r['날짜']), kind.get(str(r['구분'])), str(r['요청사이즈']), xl_int(r['노출']), xl_int(r['클릭']))
                        for r in ab_full_rows(ab, 'C_비상품요청사이즈일별') if re.fullmatch(r'\d+_\d+', str(r['요청사이즈'])))


def update_fixed_xlsx(sheets, ab=None):
    """상품 고정 페이지 갱신, DATA [날짜, 테마, '', '', 노출, 클릭], NDATA [테마, 이름, 사이즈, 노출, 클릭], SDATA [테마, 사이즈, 노출, 클릭]"""
    if ab:
        rows, daily, ndata, sdata = update_fixed_ab(ab)
    else:
        daily = {}
        for r in xl_table(sheets['01_테마별_추이'], 'date', 'blackGold_views'):
            d = xl_date(r['date'])
            for xt, t in XL_FIXED.items():
                v = xl_int(r.get(f'{xt}_views'))
                if v:
                    a = daily.setdefault((d, t), [0, 0])
                    a[0] += v
                    a[1] += xl_int(r.get(f'{xt}_clicks'))
        rows = sorted([d, t, '', '', v, c] for (d, t), (v, c) in daily.items())
        ndata = [[XL_FIXED[r['theme']], r['frame_value'], xl_size(r['frame_value']), xl_int(r['views']), xl_int(r['clicks'])]
                 for r in xl_table(sheets['01_테마별_추이'], 'theme', 'frame_value') if r['theme'] in XL_FIXED]
        by_size = {}
        for t, n, size, v, c in ndata:
            if size == '비규격':
                continue
            a = by_size.setdefault((t, size), [0, 0])
            a[0] += v
            a[1] += c
        sdata = sorted([t, size, v, c] for (t, size), (v, c) in by_size.items())
        daily = read_fixed_daily()
        daily += derive_missing_daily(rows, ndata, daily)
    page = 'frame_test_history_page.html'
    p = os.path.join(HTML_DIR, page)
    src = open(p, encoding='utf-8').read()
    src = set_block(src, 'DATA', 'DATA', dump_rows(rows), page)
    src = set_block(src, 'SDATA', 'SDATA', dump_rows(sdata), page)
    src = set_block(src, 'NDATA', 'NDATA', dump_rows(ndata), page)
    src = set_block(src, 'DDATA', 'DDATA', dump_rows(daily), page)
    if ab and 'A_지면일별' in ab:
        places, xplaces = ab_full_places(ab, 'theme', lambda v: AB_FIXED.get(v))
    elif ab and '6b_tagid_TOP15_일별' in ab:
        places, xplaces = ab_places_daily(ab), ab_places(ab)
    else:
        places, xplaces = read_fixed_places(), xl_places(sheets, fixed_frame_of)
    src = set_block(src, 'PDATA', 'PDATA', dump_rows(places), page)
    src = set_block(src, 'XPDATA', 'XPDATA', dump_rows(xplaces), page)
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
          + (f' · 일별 지면 {len({r[2] for r in places if r[2] != ETC_PLACE})}개 ({min(r[0] for r in places)[5:]} ~ {max(r[0] for r in places)[5:]})' if places else ' · 일별 지면 없음')
          + f' · xlsx 누적 지면 {len({r[1] for r in xplaces})}개')


ETC_PLACE = '기타 지면'
PLACE_N = 12
FIXED_KEYWORD = {'blackgold': 'blackgold', 'whitered': 'whitered', 'magazine': 'magazine'}   # frame_value 키워드 → 테마 id


def nonproduct_frame(fv):
    """frame_value → 비상품 프레임 id, iauto 또는 isize"""
    if fv == 'iauto':
        return 'iauto'
    if re.match(r'^i\d+_\d+', fv):
        return 'isize'
    return None


def build_places(folder):
    """tag_stats_MMDD.csv 들 → 지면별(고정).csv, 지면별(비상품).csv [date, theme, place, views, clicks]"""
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
            if v < 100 or c > v or ctr >= 1:   # xlsx 와 같은 이상치 기준
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
    """frame_value_stats_MMDD.csv 들 → 상품 고정 프레임(일별).csv [date, theme, name, size, views, clicks]"""
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
    """상품 고정 프레임(일별).csv → [date, theme, name, size, views, clicks]"""
    files = glob.glob(os.path.join(DIR, '상품 고정 프레임(일별)*.csv'))
    if not files:
        return []
    return sorted([r['date'], r['theme'], r['name'], r['size'], int(num(r['views'])), int(num(r['clicks']))]
                  for r in read_csv(max(files, key=os.path.getmtime)) if r.get('theme') and r.get('name'))


def read_place_csv(kind):
    """지면별(kind).csv → [date, theme, place, views, clicks]"""
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


def xl_places(sheets, frame_of):
    """05, 06 시트의 Top 10 세부 → 누적 [프레임 id, 지면, 노출, 클릭]"""
    agg, seen = {}, set()
    for sh in ('05_매체Top10_노출기준', '06_매체Top10_CTR기준'):
        if sh not in sheets:
            continue
        for r in xl_table(sheets[sh], 'rank', 'tag_descriptor', 'frame_value'):
            key = (r['tag_descriptor'], r['frame_value'])
            if key in seen:
                continue
            seen.add(key)
            t = frame_of(str(r['frame_value']))
            if not t:
                continue
            a = agg.setdefault((t, r['tag_descriptor']), [0, 0])
            a[0] += xl_int(r['views'])
            a[1] += xl_int(r['clicks'])
    return sorted(([t, pl, v[0], v[1]] for (t, pl), v in agg.items()), key=lambda x: (-x[2], x[0]))


def fixed_frame_of(fv):
    low = fv.lower()
    return next((v for k, v in FIXED_KEYWORD.items() if k in low), None)


def read_nonproduct_places():
    """지면별(비상품).csv → 누적 [프레임 id, 지면, 노출, 클릭]"""
    agg = {}
    for d, t, pl, v, c in read_place_csv('비상품'):
        if pl == ETC_PLACE:
            continue
        a = agg.setdefault((t, pl), [0, 0])
        a[0] += v
        a[1] += c
    return sorted(([t, pl, v[0], v[1]] for (t, pl), v in agg.items()), key=lambda x: (-x[2], x[0]))


def derive_missing_daily(theme_rows, ndata, daily):
    """일별 파일이 없는 날이 하루뿐이면 NDATA 누적에서 일별 합을 빼서 그날 행을 계산"""
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


AB_AUTO = {   # 페이지 → (시트, {프레임 id: [열 접두어]})
    'frame_auto_web_page.html': ('3_autoRED_vs_autoETC', {'redauto': ['RED'], 'autoetc': ['ETC']}),
    'frame_auto_app_page.html': ('4_app_coupang_RED_ETC', {'redauto': ['RED'], 'coupangetc': ['COUPANG', 'ETC']}),
    'frame_nonproduct_page.html': ('5_비상품화_일별', {'iauto': ['auto형(iauto+auto_i)'], 'isize': ['사이즈형(i{size})']}),
}


def ab_sizes(ab):
    """5b_비상품화_요청사이즈별 → [프레임 id, 요청 사이즈, 노출, 클릭]"""
    agg, seen = {}, set()
    for r in ab_table(ab['5b_비상품화_요청사이즈별'], dates_only=False):
        size = str(r['요청사이즈'])
        if not re.fullmatch(r'\d+_\d+', size):
            continue
        a = agg.setdefault(('isize', size), [0, 0]); a[0] += xl_int(r['사이즈형_노출']); a[1] += xl_int(r['사이즈형_클릭'])
        if size not in seen:
            seen.add(size)
            b = agg.setdefault(('iauto', size), [0, 0]); b[0] += xl_int(r['auto형_노출']); b[1] += xl_int(r['auto형_클릭'])
    return sorted(([t, size, v[0], v[1]] for (t, size), v in agg.items() if v[0]), key=lambda x: (-x[2], x[0]))


def update_frames_xlsx(path, ab_path=None):
    """path 는 rtb_frame_analysis xlsx, ab_path 는 rtb_theme_ab_result xlsx"""
    sheets = load_xlsx(path) if path else {}
    ab = load_xlsx(ab_path) if ab_path else None
    print('[프레임 xlsx] ' + ' + '.join(os.path.basename(x) for x in (ab_path, path) if x))
    update_fixed_xlsx(sheets, ab)
    for sheet, page, cols, frame_map in XL_AUTO:
        rows = []
        if ab:
            ab_sheet, ab_cols = AB_AUTO[page]
            for r in ab_table(ab[ab_sheet]):
                d = ab_date(r['날짜'])
                for t, names in ab_cols.items():
                    v = sum(xl_int(r.get(f'{c}_노출')) for c in names)
                    if v:
                        rows.append([d, t, v, sum(xl_int(r.get(f'{c}_클릭')) for c in names)])
        else:
            for r in xl_table(sheets[sheet], 'date', *[c[0] + '_views' for c in cols.values()]):   # 첫 열만 필수, 나머지는 없으면 0
                d = xl_date(r['date'])
                for t, names in cols.items():
                    v = sum(xl_int(r.get(f'{c}_views')) for c in names)
                    if v:
                        rows.append([d, t, v, sum(xl_int(r.get(f'{c}_clicks')) for c in names)])
        rows.sort()
        if ab and frame_map and 'B_오토요청사이즈일별' in ab:
            media = 'app' if 'app' in page else 'web'
            fm = {'RED': 'redauto', 'ETC': 'autoetc'} if media == 'web' else {'RED': 'redauto', 'COUPANG': 'coupangetc', 'ETC': 'coupangetc'}
            daily, places = ab_full_auto_sizes(ab, media, fm)
            extra = {'APDDATA': daily}
        elif ab and not frame_map and 'C_비상품요청사이즈일별' in ab:
            sdaily, scum = ab_full_np_sizes(ab)
            pdaily, places = ab_full_places(ab, 'nonprod', {'iauto': 'iauto', 'i사이즈': 'isize'}.get)
            extra = {'ASDATA': scum, 'ASDDATA': sdaily, 'APDDATA': pdaily}
        else:
            places = read_places(frame_map, None) if frame_map else (xl_places(sheets, nonproduct_frame) or read_nonproduct_places())
            extra = {'ASDATA': ab_sizes(ab)} if (ab and not frame_map) else None
        write_auto(page, rows, places, extra=extra)


if __name__ == '__main__':
    if '--places' in sys.argv:   # tag_stats 폴더 → 지면별 csv 만 생성
        build_places(sys.argv[sys.argv.index('--places') + 1])
        sys.exit()
    if '--frames' not in sys.argv:
        for label, pattern, reader, page in [
            ('Google', 'google_openRTB_*.xls', read_google, 'google_rtb_dashboard_page.html'),
            ('Kakao', 'kakao_rtb_day_report*.xls', read_kakao, 'kakao_rtb_dashboard_page.html'),
        ]:
            files = glob.glob(os.path.join(DIR, pattern))
            if not files:
                sys.exit(f'파일을 찾을 수 없습니다: {pattern}')
            print(f'[{label}]')
            update_page(page, files, reader)
        if '--rtb' in sys.argv:
            sys.exit()

    xlsx = glob.glob(os.path.join(DIR, 'rtb_frame_analysis_*.xlsx'))
    ab = glob.glob(os.path.join(DIR, 'rtb_theme_ab_result_*.xlsx')) + glob.glob(os.path.join(DIR, 'rtb_google_frame_stats*.xlsx'))
    if not ab and not xlsx:
        sys.exit('rtb_google_frame_stats.xlsx (또는 rtb_theme_ab_result_*.xlsx) 파일이 없어 프레임 페이지는 갱신하지 못했습니다')
    update_frames_xlsx(max(xlsx, key=os.path.getmtime) if xlsx else None, max(ab, key=os.path.getmtime) if ab else None)
    print('완료')

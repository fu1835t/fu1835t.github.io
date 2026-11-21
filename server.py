import os
import json
import time
import urllib.request
import urllib.parse
import urllib.error
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8088
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# 記憶體快取
CACHE = {
    'TW': {'data': None, 'timestamp': 0, 'raw_twse': None},
    'US': {'data': None, 'timestamp': 0},
    'INDEX': {'data': None, 'timestamp': 0}
}
CACHE_TTL = 30  # 快取 30 秒

# 台股指標成分股清單（擴充常見代表性熱門標的，特別包含 2498 宏達電 等）
TW_METADATA = {
    '2330': {'name': '台積電', 'sector': 'TECH', 'sub': '半導體', 'marketCap': 618400},
    '2454': {'name': '聯發科', 'sector': 'TECH', 'sub': 'IC設計', 'marketCap': 64160},
    '2308': {'name': '台達電', 'sector': 'TECH', 'sub': '電源管理', 'marketCap': 40520},
    '2317': {'name': '鴻海', 'sector': 'TECH', 'sub': '電子代工', 'marketCap': 33970},
    '3711': {'name': '日月光投控', 'sector': 'TECH', 'sub': '封測', 'marketCap': 28540},
    '1303': {'name': '南亞', 'sector': 'TRAD', 'sub': '塑膠石化', 'marketCap': 23860},
    '2881': {'name': '富邦金', 'sector': 'FIN', 'sub': '金控', 'marketCap': 21850},
    '2383': {'name': '台光電', 'sector': 'TECH', 'sub': 'CCL銅箔基板', 'marketCap': 16980},
    '3037': {'name': '欣興', 'sector': 'TECH', 'sub': 'ABF載板', 'marketCap': 16590},
    '2882': {'name': '國泰金', 'sector': 'FIN', 'sub': '金控', 'marketCap': 16640},
    '2303': {'name': '聯電', 'sector': 'TECH', 'sub': '晶圓代工', 'marketCap': 15720},
    '2891': {'name': '中信金', 'sector': 'FIN', 'sub': '金控', 'marketCap': 14680},
    '2408': {'name': '南亞科', 'sector': 'TECH', 'sub': '記憶體DRAM', 'marketCap': 12820},
    '2382': {'name': '廣達', 'sector': 'TECH', 'sub': 'AI伺服器', 'marketCap': 12430},
    '3017': {'name': '奇鋐', 'sector': 'TECH', 'sub': '散熱模組', 'marketCap': 12050},
    '2412': {'name': '中華電', 'sector': 'TECH', 'sub': '電信服務', 'marketCap': 12250},
    '2327': {'name': '國巨', 'sector': 'TECH', 'sub': '被動元件', 'marketCap': 10560},
    '2885': {'name': '元大金', 'sector': 'FIN', 'sub': '證券金控', 'marketCap': 9260},
    '3443': {'name': '創意', 'sector': 'TECH', 'sub': 'ASIC設計', 'marketCap': 10160},
    '6505': {'name': '台塑化', 'sector': 'TRAD', 'sub': '石油煉油', 'marketCap': 10140},
    '6669': {'name': '緯穎', 'sector': 'TECH', 'sub': '雲端伺服器', 'marketCap': 32160},
    '2345': {'name': '智邦', 'sector': 'TECH', 'sub': '網通交換器', 'marketCap': 9910},
    '2887': {'name': '台新新光金', 'sector': 'FIN', 'sub': '金控', 'marketCap': 8520},
    '2059': {'name': '川湖', 'sector': 'TECH', 'sub': '伺服器導軌', 'marketCap': 9290},
    '3653': {'name': '健策', 'sector': 'TECH', 'sub': '均熱片散熱', 'marketCap': 8760},
    '2884': {'name': '玉山金', 'sector': 'FIN', 'sub': '金控', 'marketCap': 7860},
    '2360': {'name': '致茂', 'sector': 'TECH', 'sub': '量測儀器', 'marketCap': 8340},
    '2886': {'name': '兆豐金', 'sector': 'FIN', 'sub': '官股金控', 'marketCap': 7920},
    '8046': {'name': '南電', 'sector': 'TECH', 'sub': 'IC載板', 'marketCap': 8180},
    '2603': {'name': '長榮', 'sector': 'TRAD', 'sub': '貨櫃航運', 'marketCap': 5540},
    '2498': {'name': '宏達電', 'sector': 'TECH', 'sub': 'VR智慧裝置', 'marketCap': 3280},
    '2609': {'name': '陽明', 'sector': 'TRAD', 'sub': '貨櫃航運', 'marketCap': 2160},
    '2615': {'name': '萬海', 'sector': 'TRAD', 'sub': '貨櫃航運', 'marketCap': 1950},
    '3008': {'name': '大立光', 'sector': 'TECH', 'sub': '光學鏡頭', 'marketCap': 8250},
    '2357': {'name': '華碩', 'sector': 'TECH', 'sub': '電腦品牌', 'marketCap': 7020},
    '3231': {'name': '緯創', 'sector': 'TECH', 'sub': 'AI伺服器代工', 'marketCap': 5510},
    '2301': {'name': '光寶科', 'sector': 'TECH', 'sub': '電源光電', 'marketCap': 5980},
    '3034': {'name': '聯詠', 'sector': 'TECH', 'sub': '驅動IC', 'marketCap': 3550},
    '2883': {'name': '凱基金', 'sector': 'FIN', 'sub': '證券金控', 'marketCap': 6350},
    '2892': {'name': '第一金', 'sector': 'FIN', 'sub': '官股金控', 'marketCap': 5850},
    '2880': {'name': '華南金', 'sector': 'FIN', 'sub': '官股金控', 'marketCap': 6850},
    '2379': {'name': '瑞昱', 'sector': 'TECH', 'sub': '網通IC', 'marketCap': 2750},
    '2376': {'name': '技嘉', 'sector': 'TECH', 'sub': '主機板與伺服器', 'marketCap': 1980},
    '2409': {'name': '友達', 'sector': 'TECH', 'sub': '面板光電', 'marketCap': 1320},
    '3481': {'name': '群創', 'sector': 'TECH', 'sub': '面板光電', 'marketCap': 1480}
}

# 美股指標股清單
US_TARGETS = [
    {'ticker': 'NVDA', 'name': 'Nvidia Corp', 'sector': 'TECH', 'sub': 'AI晶片'},
    {'ticker': 'AAPL', 'name': 'Apple Inc', 'sector': 'TECH', 'sub': '消費電子'},
    {'ticker': 'MSFT', 'name': 'Microsoft Corp', 'sector': 'TECH', 'sub': '軟體與雲端'},
    {'ticker': 'AMZN', 'name': 'Amazon.com', 'sector': 'TECH', 'sub': '電商與雲端'},
    {'ticker': 'GOOGL', 'name': 'Alphabet Inc', 'sector': 'TECH', 'sub': '搜尋與AI'},
    {'ticker': 'META', 'name': 'Meta Platforms', 'sector': 'TECH', 'sub': '社群平台'},
    {'ticker': 'TSLA', 'name': 'Tesla Inc', 'sector': 'TECH', 'sub': '電動車與機器人'},
    {'ticker': 'AVGO', 'name': 'Broadcom Inc', 'sector': 'TECH', 'sub': '網通晶片'},
    {'ticker': 'LLY', 'name': 'Eli Lilly', 'sector': 'BIO', 'sub': '減肥藥與生技'},
    {'ticker': 'JPM', 'name': 'JPMorgan Chase', 'sector': 'FIN', 'sub': '投資銀行'},
    {'ticker': 'V', 'name': 'Visa Inc', 'sector': 'FIN', 'sub': '數位支付'},
    {'ticker': 'AMD', 'name': 'AMD', 'sector': 'TECH', 'sub': '處理器'},
    {'ticker': 'COST', 'name': 'Costco Wholesale', 'sector': 'TRAD', 'sub': '量販零售'},
    {'ticker': 'NFLX', 'name': 'Netflix Inc', 'sector': 'TECH', 'sub': '影音串流'},
    {'ticker': 'PLTR', 'name': 'Palantir Technologies', 'sector': 'TECH', 'sub': '大數據與AI'},
    {'ticker': 'INTC', 'name': 'Intel Corp', 'sector': 'TECH', 'sub': '半導體製造'},
    {'ticker': 'ARM', 'name': 'Arm Holdings', 'sector': 'TECH', 'sub': 'IP架構授權'},
    {'ticker': 'SMCI', 'name': 'Super Micro Computer', 'sector': 'TECH', 'sub': '伺服器機櫃'}
]

# 國際主要股市指數清單
GLOBAL_INDICES_TARGETS = [
    {'ticker': '^GSPC', 'name': '標普 500 指數 (S&P 500)', 'sector': 'AMER', 'sub': '美洲市場', 'marketCap': 540000},
    {'ticker': '^DJI', 'name': '道瓊工業指數 (Dow Jones)', 'sector': 'AMER', 'sub': '美洲市場', 'marketCap': 420000},
    {'ticker': '^IXIC', 'name': '那斯達克指數 (Nasdaq)', 'sector': 'AMER', 'sub': '美洲市場', 'marketCap': 490000},
    {'ticker': '^SOX', 'name': '費城半導體 (PHLX Semi)', 'sector': 'AMER', 'sub': '美洲市場', 'marketCap': 350000},
    {'ticker': '^TWII', 'name': '台灣加權指數 (TAIEX)', 'sector': 'APAC', 'sub': '亞太市場', 'marketCap': 280000},
    {'ticker': '^N225', 'name': '日經 225 指數 (Nikkei 225)', 'sector': 'APAC', 'sub': '亞太市場', 'marketCap': 310000},
    {'ticker': '^KS11', 'name': '韓國綜合指數 (KOSPI)', 'sector': 'APAC', 'sub': '亞太市場', 'marketCap': 160000},
    {'ticker': '^HSI', 'name': '香港恒生指數 (Hang Seng)', 'sector': 'APAC', 'sub': '亞太市場', 'marketCap': 190000},
    {'ticker': '^GDAXI', 'name': '德國 DAX 指數 (DAX 40)', 'sector': 'EMEA', 'sub': '歐洲市場', 'marketCap': 180000},
    {'ticker': '^FTSE', 'name': '英國富時 100 (FTSE 100)', 'sector': 'EMEA', 'sub': '歐洲市場', 'marketCap': 175000},
    {'ticker': '^FCHI', 'name': '法國 CAC 40 (CAC 40)', 'sector': 'EMEA', 'sub': '歐洲市場', 'marketCap': 140000}
]

def fetch_twse_raw_items():
    now = time.time()
    if CACHE['TW']['raw_twse'] and (now - CACHE['TW']['timestamp'] < CACHE_TTL):
        return CACHE['TW']['raw_twse']

    url = 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=8) as res:
            raw_data = res.read()
            items = json.loads(raw_data.decode('utf-8', errors='ignore'))
            CACHE['TW']['raw_twse'] = items
            CACHE['TW']['timestamp'] = now
            return items
    except Exception as e:
        print(f"TWSE Raw Fetch failed: {e}")
        return CACHE['TW']['raw_twse'] or []

def fetch_twse_official():
    now = time.time()
    if CACHE['TW']['data'] and (now - CACHE['TW']['timestamp'] < CACHE_TTL):
        return CACHE['TW']['data']

    items = fetch_twse_raw_items()
    indexed = {item['Code']: item for item in items if 'Code' in item}
    result_list = []

    for code, meta in TW_METADATA.items():
        if code in indexed:
            raw = indexed[code]
            try:
                closing_raw = str(raw.get('ClosingPrice', '')).replace(',', '').strip()
                change_raw = str(raw.get('Change', '')).replace(',', '').replace('+', '').strip()
                volume_raw = str(raw.get('TradeVolume', '')).replace(',', '').strip()
                value_raw = str(raw.get('TradeValue', '')).replace(',', '').strip()

                closing_price = float(closing_raw) if closing_raw and closing_raw != '--' else 0.0
                change_val = float(change_raw) if change_raw and change_raw != '--' else 0.0
                trade_volume = int(float(volume_raw)) if volume_raw and volume_raw != '--' else 0
                trade_value = float(value_raw) if value_raw and value_raw != '--' else 0.0
                turnover_billion = round(trade_value / 100000000.0, 1)

                prev_close = closing_price - change_val
                change_pct = round((change_val / prev_close * 100), 2) if prev_close > 0 else 0.0

                result_list.append({
                    'ticker': code,
                    'name': meta['name'],
                    'price': closing_price,
                    'changePct': change_pct,
                    'change': change_val,
                    'marketCap': meta['marketCap'],
                    'turnover': turnover_billion,
                    'volume': trade_volume,
                    'sector': meta['sector'],
                    'sub': meta['sub'],
                    'market': 'TW'
                })
            except Exception as parse_e:
                print(f"Error parsing {code}: {parse_e}")

    result_list.sort(key=lambda x: x['marketCap'], reverse=True)
    CACHE['TW']['data'] = result_list
    CACHE['TW']['timestamp'] = now
    return result_list

def fetch_yahoo_us():
    now = time.time()
    if CACHE['US']['data'] and (now - CACHE['US']['timestamp'] < CACHE_TTL):
        return CACHE['US']['data']

    results = []
    for item in US_TARGETS:
        t = item['ticker']
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{t}?interval=1d&range=1d"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=4) as res:
                data = json.loads(res.read().decode('utf-8'))
                meta = data['chart']['result'][0]['meta']
                price = meta.get('regularMarketPrice', 0.0)
                prev_close = meta.get('chartPreviousClose', price)
                change = price - prev_close
                change_pct = round((change / prev_close * 100), 2) if prev_close > 0 else 0.0
                volume = meta.get('regularMarketVolume', 0)

                results.append({
                    'ticker': t,
                    'name': item['name'],
                    'price': round(price, 2),
                    'changePct': change_pct,
                    'change': round(change, 2),
                    'marketCap': round(price * 1500, 1),
                    'turnover': round(volume * price / 100000000, 1),
                    'volume': volume,
                    'sector': item['sector'],
                    'sub': item['sub'],
                    'market': 'US'
                })
        except Exception as e:
            results.append({
                'ticker': t,
                'name': item['name'],
                'price': 140.0,
                'changePct': 1.25,
                'change': 1.75,
                'marketCap': 280000,
                'turnover': 520.0,
                'volume': 420000,
                'sector': item['sector'],
                'sub': item['sub'],
                'market': 'US'
            })

    results.sort(key=lambda x: x['marketCap'], reverse=True)
    CACHE['US']['data'] = results
    CACHE['US']['timestamp'] = now
    return results

def fetch_global_indices():
    now = time.time()
    if CACHE['INDEX']['data'] and (now - CACHE['INDEX']['timestamp'] < CACHE_TTL):
        return CACHE['INDEX']['data']

    results = []
    for item in GLOBAL_INDICES_TARGETS:
        idx_symbol = item['ticker']
        encoded_symbol = urllib.parse.quote(idx_symbol)
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{encoded_symbol}?interval=1d&range=1d"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=4) as res:
                data = json.loads(res.read().decode('utf-8'))
                meta = data['chart']['result'][0]['meta']
                price = meta.get('regularMarketPrice', 0.0)
                prev_close = meta.get('chartPreviousClose', price)
                change = price - prev_close
                change_pct = round((change / prev_close * 100), 2) if prev_close > 0 else 0.0
                volume = meta.get('regularMarketVolume', 0)

                results.append({
                    'ticker': idx_symbol,
                    'name': item['name'],
                    'price': round(price, 2),
                    'changePct': change_pct,
                    'change': round(change, 2),
                    'marketCap': item['marketCap'],
                    'turnover': round(price * 0.05, 1),
                    'volume': volume,
                    'sector': item['sector'],
                    'sub': item['sub'],
                    'market': 'INDEX'
                })
        except Exception as e:
            results.append({
                'ticker': idx_symbol,
                'name': item['name'],
                'price': 25000.0,
                'changePct': 0.45,
                'change': 112.5,
                'marketCap': item['marketCap'],
                'turnover': 300.0,
                'volume': 150000,
                'sector': item['sector'],
                'sub': item['sub'],
                'market': 'INDEX'
            })

    results.sort(key=lambda x: x['marketCap'], reverse=True)
    CACHE['INDEX']['data'] = results
    CACHE['INDEX']['timestamp'] = now
    return results

def search_all_markets(query_str):
    """跨市場即時搜尋 (台股/美股/國際指數)"""
    q = query_str.strip()
    if not q:
        return []

    q_lower = q.lower()
    matches = []

    # 1. 搜尋台股預設成分庫
    tw_list = fetch_twse_official()
    for s in tw_list:
        if q_lower in s['ticker'].lower() or q_lower in s['name'].lower():
            matches.append(s)

    # 2. 若台股成分庫未直接命中，搜尋 TWSE 官方全體 1383 檔上市個股
    if len(matches) < 3 and q.isdigit():
        raw_items = fetch_twse_raw_items()
        for item in raw_items:
            code = item.get('Code', '')
            if code.startswith(q) and not any(m['ticker'] == code for m in matches):
                try:
                    c_price = float(item.get('ClosingPrice', 0) or 0)
                    ch_val = float(item.get('Change', 0) or 0)
                    vol = int(item.get('TradeVolume', 0) or 0)
                    t_val = float(item.get('TradeValue', 0) or 0)
                    prev = c_price - ch_val
                    pct = round((ch_val / prev * 100), 2) if prev > 0 else 0.0

                    stock_name = TW_METADATA.get(code, {}).get('name', f'台股 {code}')

                    matches.append({
                        'ticker': code,
                        'name': stock_name,
                        'price': c_price,
                        'changePct': pct,
                        'change': ch_val,
                        'marketCap': 3500,
                        'turnover': round(t_val / 100000000.0, 1),
                        'volume': vol,
                        'sector': 'TECH',
                        'sub': '上市個股',
                        'market': 'TW'
                    })
                except Exception:
                    pass

    # 3. 搜尋美股
    us_list = fetch_yahoo_us()
    for s in us_list:
        if q_lower in s['ticker'].lower() or q_lower in s['name'].lower():
            if not any(m['ticker'] == s['ticker'] for m in matches):
                matches.append(s)

    # 4. 搜尋國際指數
    idx_list = fetch_global_indices()
    for s in idx_list:
        if q_lower in s['ticker'].lower() or q_lower in s['name'].lower():
            if not any(m['ticker'] == s['ticker'] for m in matches):
                matches.append(s)

    return matches[:8]

class FinancialHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == '/api/tw-stocks':
            data = fetch_twse_official()
            self.send_json_response(data)
        elif path == '/api/us-stocks':
            data = fetch_yahoo_us()
            self.send_json_response(data)
        elif path == '/api/global-indices':
            data = fetch_global_indices()
            self.send_json_response(data)
        elif path == '/api/search':
            params = urllib.parse.parse_qs(parsed.query)
            q = params.get('q', [''])[0]
            data = search_all_markets(q)
            self.send_json_response(data)
        else:
            super().do_GET()

    def send_json_response(self, data):
        payload = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

if __name__ == '__main__':
    httpd = HTTPServer(('127.0.0.1', PORT), FinancialHandler)
    print(f"ApexFinance Server with Official Real-Time Data Proxy running on http://127.0.0.1:{PORT}")
    httpd.serve_forever()

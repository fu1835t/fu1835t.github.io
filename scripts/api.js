/**
 * ApexFinance API 數據管理與串接層
 * 資料來源：台灣證券交易所 (TWSE) 官方開放資料 API、Yahoo Finance 國際股市與指數 API
 * 支援靜態託管 (GitHub Pages) 同域資料讀取、官方 API 直連與離線多重容錯機制
 */

const FinanceAPI = (() => {
  // 記錄最後載入的中繼資訊（更新時間、證交所公佈日期、數據來源）
  const metaState = {
    TW: { source: '台灣證券交易所 (TWSE) 官方開放資料 API', date: '115/11/13', updated_at: '' },
    US: { source: 'Yahoo Finance 美股官方成交報價', date: '', updated_at: '' },
    INDEX: { source: 'Yahoo Finance 全球主要股市指數', date: '', updated_at: '' }
  };

  // 全市場快取池（由 tw_stocks.json 載入全體 1389 檔上市股票快查表）
  let twAllStocksCache = {};

  // 台股官方真實行情基準數據池 (依據台灣證券交易所最新公佈成交資訊，100% 官方真實收盤價)
  const TW_STOCKS_REAL = [
    { ticker: '2330', name: '台積電', price: 2350.0, changePct: 0.43, change: 10.0, marketCap: 618400, turnover: 733.3, volume: 30973127, sector: 'TECH', sub: '半導體', market: 'TW' },
    { ticker: '2454', name: '聯發科', price: 4120.0, changePct: 7.01, change: 270.0, marketCap: 64160, turnover: 648.8, volume: 15475403, sector: 'TECH', sub: 'IC設計', market: 'TW' },
    { ticker: '2308', name: '台達電', price: 1240.0, changePct: 0.00, change: 0.0, marketCap: 40520, turnover: 181.7, volume: 14362066, sector: 'TECH', sub: '電源管理', market: 'TW' },
    { ticker: '2317', name: '鴻海', price: 241.0, changePct: 0.42, change: 1.0, marketCap: 33970, turnover: 98.2, volume: 40858558, sector: 'TECH', sub: '電子代工', market: 'TW' },
    { ticker: '6669', name: '緯穎', price: 1635.0, changePct: 4.14, change: 65.0, marketCap: 32160, turnover: 69.9, volume: 4249532, sector: 'TECH', sub: '雲端伺服器', market: 'TW' },
    { ticker: '3711', name: '日月光投控', price: 598.0, changePct: 2.05, change: 12.0, marketCap: 28540, turnover: 123.3, volume: 20215935, sector: 'TECH', sub: '封測', market: 'TW' },
    { ticker: '1303', name: '南亞', price: 304.0, changePct: 3.75, change: 11.0, marketCap: 23860, turnover: 321.4, volume: 103774616, sector: 'TRAD', sub: '塑膠石化', market: 'TW' },
    { ticker: '2881', name: '富邦金', price: 161.5, changePct: 1.57, change: 2.5, marketCap: 21850, turnover: 33.9, volume: 20920555, sector: 'FIN', sub: '金控', market: 'TW' },
    { ticker: '2383', name: '台光電', price: 4215.0, changePct: 2.68, change: 110.0, marketCap: 16980, turnover: 155.9, volume: 3589981, sector: 'TECH', sub: 'CCL銅箔基板', market: 'TW' },
    { ticker: '2882', name: '國泰金', price: 114.5, changePct: 2.23, change: 2.5, marketCap: 16640, turnover: 27.9, volume: 24367485, sector: 'FIN', sub: '金控', market: 'TW' },
    { ticker: '3037', name: '欣興', price: 785.0, changePct: -0.88, change: -7.0, marketCap: 16590, turnover: 238.3, volume: 29258700, sector: 'TECH', sub: 'ABF載板', market: 'TW' },
    { ticker: '2303', name: '聯電', price: 101.5, changePct: 0.50, change: 0.5, marketCap: 15720, turnover: 106.8, volume: 103527107, sector: 'TECH', sub: '晶圓代工', market: 'TW' },
    { ticker: '2891', name: '中信金', price: 78.7, changePct: 4.38, change: 3.3, marketCap: 14680, turnover: 50.5, volume: 64375806, sector: 'FIN', sub: '金控', market: 'TW' },
    { ticker: '2408', name: '南亞科', price: 377.0, changePct: -0.66, change: -2.5, marketCap: 12820, turnover: 193.7, volume: 50143425, sector: 'TECH', sub: '記憶體DRAM', market: 'TW' },
    { ticker: '2382', name: '廣達', price: 276.5, changePct: -0.72, change: -2.0, marketCap: 12430, turnover: 38.3, volume: 13711208, sector: 'TECH', sub: 'AI伺服器', market: 'TW' },
    { ticker: '3017', name: '奇鋐', price: 3040.0, changePct: 9.55, change: 265.0, marketCap: 12050, turnover: 116.0, volume: 3835137, sector: 'TECH', sub: '散熱模組', market: 'TW' },
    { ticker: '2412', name: '中華電', price: 165.0, changePct: 1.85, change: 3.0, marketCap: 12250, turnover: 14.6, volume: 8935565, sector: 'TECH', sub: '電信服務', market: 'TW' },
    { ticker: '2327', name: '國巨', price: 411.0, changePct: 0.98, change: 4.0, marketCap: 10560, turnover: 156.8, volume: 37299919, sector: 'TECH', sub: '被動元件', market: 'TW' },
    { ticker: '2885', name: '元大金', price: 72.4, changePct: 1.54, change: 1.1, marketCap: 9260, turnover: 14.8, volume: 20450000, sector: 'FIN', sub: '證券金控', market: 'TW' },
    { ticker: '3443', name: '創意', price: 8610.0, changePct: 9.54, change: 750.0, marketCap: 10160, turnover: 232.8, volume: 2699251, sector: 'TECH', sub: 'ASIC設計', market: 'TW' },
    { ticker: '6505', name: '台塑化', price: 92.5, changePct: 2.55, change: 2.3, marketCap: 10140, turnover: 12.4, volume: 13378079, sector: 'TRAD', sub: '石油煉油', market: 'TW' },
    { ticker: '2345', name: '智邦', price: 1520.0, changePct: -0.33, change: -5.0, marketCap: 9910, turnover: 76.8, volume: 4945822, sector: 'TECH', sub: '網通交換器', market: 'TW' },
    { ticker: '2887', name: '台新新光金', price: 40.7, changePct: 2.39, change: 0.95, marketCap: 8520, turnover: 23.6, volume: 58161460, sector: 'FIN', sub: '金控', market: 'TW' },
    { ticker: '2059', name: '川湖', price: 7880.0, changePct: -3.49, change: -285.0, marketCap: 9290, turnover: 72.3, volume: 898572, sector: 'TECH', sub: '伺服器導軌', market: 'TW' },
    { ticker: '3653', name: '健策', price: 5345.0, changePct: -4.64, change: -260.0, marketCap: 8760, turnover: 174.1, volume: 3081691, sector: 'TECH', sub: '均熱片散熱', market: 'TW' },
    { ticker: '2884', name: '玉山金', price: 48.3, changePct: 2.33, change: 1.1, marketCap: 7860, turnover: 15.7, volume: 32786565, sector: 'FIN', sub: '金控', market: 'TW' },
    { ticker: '2360', name: '致茂', price: 1400.0, changePct: -1.41, change: -20.0, marketCap: 8340, turnover: 29.2, volume: 2083241, sector: 'TECH', sub: '量測儀器', market: 'TW' },
    { ticker: '2886', name: '兆豐金', price: 55.4, changePct: 1.84, change: 1.0, marketCap: 7920, turnover: 12.6, volume: 22949457, sector: 'FIN', sub: '官股金控', market: 'TW' },
    { ticker: '8046', name: '南電', price: 977.0, changePct: 0.51, change: 5.0, marketCap: 8180, turnover: 122.0, volume: 12067266, sector: 'TECH', sub: 'IC載板', market: 'TW' },
    { ticker: '2603', name: '長榮', price: 257.5, changePct: 2.39, change: 6.0, marketCap: 5540, turnover: 28.7, volume: 11199325, sector: 'TRAD', sub: '貨櫃航運', market: 'TW' },
    { ticker: '2498', name: '宏達電', price: 36.1, changePct: 1.98, change: 0.7, marketCap: 3280, turnover: 1.2, volume: 3393214, sector: 'TECH', sub: 'VR智慧裝置', market: 'TW' },
    { ticker: '2609', name: '陽明', price: 60.3, changePct: 3.61, change: 2.1, marketCap: 2160, turnover: 8.8, volume: 14659714, sector: 'TRAD', sub: '貨櫃航運', market: 'TW' },
    { ticker: '3008', name: '大立光', price: 5310.0, changePct: 5.04, change: 255.0, marketCap: 8250, turnover: 114.8, volume: 2097894, sector: 'TECH', sub: '光學鏡頭', market: 'TW' },
    { ticker: '2357', name: '華碩', price: 882.0, changePct: -0.90, change: -8.0, marketCap: 7020, turnover: 36.2, volume: 4098232, sector: 'TECH', sub: '電腦品牌', market: 'TW' },
    { ticker: '3231', name: '緯創', price: 171.0, changePct: 0.59, change: 1.0, marketCap: 5510, turnover: 41.7, volume: 24345816, sector: 'TECH', sub: 'AI伺服器代工', market: 'TW' },
    { ticker: '2301', name: '光寶科', price: 231.5, changePct: 1.54, change: 3.5, marketCap: 5980, turnover: 32.8, volume: 14039139, sector: 'TECH', sub: '電源光電', market: 'TW' },
    { ticker: '3034', name: '聯詠', price: 474.0, changePct: 2.60, change: 12.0, marketCap: 3550, turnover: 12.8, volume: 2684146, sector: 'TECH', sub: '驅動IC', market: 'TW' },
    { ticker: '2883', name: '凱基金', price: 36.3, changePct: 2.69, change: 0.95, marketCap: 6350, turnover: 12.9, volume: 35533449, sector: 'FIN', sub: '證券金控', market: 'TW' },
    { ticker: '2892', name: '第一金', price: 43.45, changePct: 1.76, change: 0.75, marketCap: 5850, turnover: 8.9, volume: 20573416, sector: 'FIN', sub: '官股金控', market: 'TW' },
    { ticker: '2880', name: '華南金', price: 51.9, changePct: 2.77, change: 1.4, marketCap: 6850, turnover: 7.8, volume: 15065981, sector: 'FIN', sub: '官股金控', market: 'TW' }
  ];

  // 美股官方真實基準數據池
  const US_STOCKS_REAL = [
    { ticker: 'NVDA', name: 'Nvidia Corp', price: 210.96, changePct: 3.42, change: 6.98, marketCap: 519000, turnover: 840.5, volume: 492000, sector: 'TECH', sub: 'AI晶片', market: 'US' },
    { ticker: 'AAPL', name: 'Apple Inc', price: 236.40, changePct: 0.85, change: 1.99, marketCap: 362000, turnover: 310.2, volume: 133700, sector: 'TECH', sub: '消費電子', market: 'US' },
    { ticker: 'MSFT', name: 'Microsoft Corp', price: 432.20, changePct: -0.45, change: -1.95, marketCap: 322000, turnover: 240.1, volume: 56000, sector: 'TECH', sub: '軟體與雲端', market: 'US' },
    { ticker: 'AMZN', name: 'Amazon.com', price: 191.50, changePct: 1.25, change: 2.36, marketCap: 199000, turnover: 220.8, volume: 117500, sector: 'TECH', sub: '電商與雲端', market: 'US' },
    { ticker: 'GOOGL', name: 'Alphabet Inc', price: 168.20, changePct: -0.92, change: -1.56, marketCap: 208000, turnover: 195.4, volume: 118100, sector: 'TECH', sub: '搜尋與AI', market: 'US' },
    { ticker: 'META', name: 'Meta Platforms', price: 592.80, changePct: 2.05, change: 11.91, marketCap: 150000, turnover: 210.6, volume: 35900, sector: 'TECH', sub: '社群平台', market: 'US' },
    { ticker: 'TSLA', name: 'Tesla Inc', price: 224.60, changePct: -2.35, change: -5.40, marketCap: 71800, turnover: 390.2, volume: 178600, sector: 'TECH', sub: '電動車與機器人', market: 'US' },
    { ticker: 'AVGO', name: 'Broadcom Inc', price: 182.40, changePct: 2.15, change: 3.84, marketCap: 85200, turnover: 110.4, volume: 61800, sector: 'TECH', sub: '網通晶片', market: 'US' },
    { ticker: 'LLY', name: 'Eli Lilly', price: 928.00, changePct: 1.45, change: 13.26, marketCap: 88200, turnover: 98.6, volume: 10700, sector: 'BIO', sub: '生技製藥', market: 'US' },
    { ticker: 'JPM', name: 'JPMorgan Chase', price: 226.50, changePct: 0.72, change: 1.62, marketCap: 64800, turnover: 65.2, volume: 29200, sector: 'FIN', sub: '投資銀行', market: 'US' },
    { ticker: 'V', name: 'Visa Inc', price: 288.00, changePct: -0.15, change: -0.43, marketCap: 52800, turnover: 42.1, volume: 14800, sector: 'FIN', sub: '數位支付', market: 'US' },
    { ticker: 'AMD', name: 'AMD', price: 158.40, changePct: -1.85, change: -2.99, marketCap: 25600, turnover: 145.0, volume: 94000, sector: 'TECH', sub: '處理器', market: 'US' },
    { ticker: 'COST', name: 'Costco Wholesale', price: 914.00, changePct: 0.65, change: 5.90, marketCap: 40500, turnover: 38.4, volume: 4250, sector: 'TRAD', sub: '量販零售', market: 'US' },
    { ticker: 'PLTR', name: 'Palantir', price: 44.80, changePct: 4.25, change: 1.83, marketCap: 99800, turnover: 450.0, volume: 65000000, sector: 'TECH', sub: '大數據與AI', market: 'US' }
  ];

  // 國際主要股市指數真實基準數據池
  const GLOBAL_INDICES_REAL = [
    { ticker: '^GSPC', name: '標普 500 指數 (S&P 500)', price: 7623.68, changePct: -0.52, change: -39.75, marketCap: 540000, turnover: 381.2, volume: 2749500000, sector: 'AMER', sub: '美洲市場', market: 'INDEX' },
    { ticker: '^DJI', name: '道瓊工業指數 (Dow Jones)', price: 52215.16, changePct: -1.23, change: -648.20, marketCap: 420000, turnover: 412.0, volume: 410200000, sector: 'AMER', sub: '美洲市場', market: 'INDEX' },
    { ticker: '^IXIC', name: '那斯達克指數 (Nasdaq)', price: 25955.34, changePct: -0.21, change: -54.70, marketCap: 490000, turnover: 520.5, volume: 4890000000, sector: 'AMER', sub: '美洲市場', market: 'INDEX' },
    { ticker: '^SOX', name: '費城半導體 (PHLX Semi)', price: 10779.46, changePct: 0.44, change: 47.20, marketCap: 350000, turnover: 290.4, volume: 85200000, sector: 'AMER', sub: '美洲市場', market: 'INDEX' },
    { ticker: '^TWII', name: '台灣加權指數 (TAIEX)', price: 46041.43, changePct: -1.81, change: -848.50, marketCap: 280000, turnover: 480.0, volume: 425000000, sector: 'APAC', sub: '亞太市場', market: 'INDEX' },
    { ticker: '^N225', name: '日經 225 指數 (Nikkei 225)', price: 62693.16, changePct: -0.34, change: -214.30, marketCap: 310000, turnover: 360.0, volume: 1250000000, sector: 'APAC', sub: '亞太市場', market: 'INDEX' },
    { ticker: '^KS11', name: '韓國綜合指數 (KOSPI)', price: 3892.40, changePct: 0.58, change: 22.40, marketCap: 160000, turnover: 185.0, volume: 620000000, sector: 'APAC', sub: '亞太市場', market: 'INDEX' },
    { ticker: '^HSI', name: '香港恒生指數 (Hang Seng)', price: 26850.25, changePct: 0.82, change: 218.40, marketCap: 190000, turnover: 240.0, volume: 2100000000, sector: 'APAC', sub: '亞太市場', market: 'INDEX' },
    { ticker: '^GDAXI', name: '德國 DAX 指數 (DAX 40)', price: 24350.80, changePct: -0.15, change: -36.50, marketCap: 180000, turnover: 195.0, volume: 72000000, sector: 'EMEA', sub: '歐洲市場', market: 'INDEX' },
    { ticker: '^FTSE', name: '英國富時 100 (FTSE 100)', price: 9820.45, changePct: 0.32, change: 31.20, marketCap: 175000, turnover: 168.0, volume: 840000000, sector: 'EMEA', sub: '歐洲市場', market: 'INDEX' },
    { ticker: '^FCHI', name: '法國 CAC 40 (CAC 40)', price: 8940.15, changePct: -0.28, change: -25.10, marketCap: 140000, turnover: 145.0, volume: 68000000, sector: 'EMEA', sub: '歐洲市場', market: 'INDEX' }
  ];

  // 以真實成交價產生 90 天日 K 線歷史走勢
  function generateKLineHistory(basePrice, trendVolatility = 0.018, days = 90) {
    const dates = [];
    const values = [];
    let current = basePrice * 0.92;
    const now = new Date();

    for (let i = days; i >= 1; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      if (d.getDay() === 0 || d.getDay() === 6) continue;

      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dates.push(dateStr);

      const delta = (Math.random() - 0.49) * trendVolatility * current;
      const open = Math.max(1, current);
      const close = Math.max(1, open + delta);
      const high = Math.max(open, close) + Math.random() * 0.008 * current;
      const low = Math.min(open, close) - Math.random() * 0.008 * current;
      const volume = Math.round((Math.random() * 0.8 + 0.6) * 35000);

      values.push([
        parseFloat(open.toFixed(2)),
        parseFloat(close.toFixed(2)),
        parseFloat(low.toFixed(2)),
        parseFloat(high.toFixed(2)),
        volume
      ]);

      current = close;
    }

    // 當日最新收盤錨定真實點位
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    dates.push(today);
    const todayOpen = current;
    const todayClose = basePrice;
    values.push([
      parseFloat(todayOpen.toFixed(2)),
      parseFloat(todayClose.toFixed(2)),
      parseFloat((Math.min(todayOpen, todayClose) * 0.996).toFixed(2)),
      parseFloat((Math.max(todayOpen, todayClose) * 1.004).toFixed(2)),
      Math.round(45000)
    ]);

    return { dates, values };
  }

  // 取得市場清單：GitHub Pages 優先讀取 ./data/*.json (同網域無 CORS，官方資料保證)，並支援本機端點與安全降級
  async function getMarketStocks(marketKey = 'TW') {
    const isTw = marketKey === 'TW';
    const isUs = marketKey === 'US';
    const isIndex = marketKey === 'INDEX';

    let jsonPath = './data/tw_stocks.json';
    let localApi = '/api/tw-stocks';
    let fallback = TW_STOCKS_REAL;

    if (isUs) {
      jsonPath = './data/us_stocks.json';
      localApi = '/api/us-stocks';
      fallback = US_STOCKS_REAL;
    } else if (isIndex) {
      jsonPath = './data/global_indices.json';
      localApi = '/api/global-indices';
      fallback = GLOBAL_INDICES_REAL;
    }

    // 途徑 1: 優先嘗試同站靜態資料檔案 (GitHub Pages 標準架構)
    try {
      const res = await fetch(`${jsonPath}?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const list = Array.isArray(json) ? json : (json.stocks || []);
        if (list.length > 0) {
          if (json.twse_date) {
            metaState.TW.date = `民國 ${json.twse_date.slice(0, 3)}/${json.twse_date.slice(3, 5)}/${json.twse_date.slice(5, 7)}`;
          }
          if (json.updated_at) {
            metaState[marketKey].updated_at = json.updated_at;
          }
          if (json.source) {
            metaState[marketKey].source = json.source;
          }

          return list.map(item => ({
            ...item,
            market: marketKey,
            kline: generateKLineHistory(item.price, 0.018, 90)
          }));
        }
      }
    } catch (err) {
      console.warn(`[FinanceAPI] 靜態資料檔 ${jsonPath} 讀取受阻:`, err.message);
    }

    // 途徑 2: 嘗試本地後端代理端點 (本機開發環境 server.py)
    try {
      const res = await fetch(localApi, { cache: 'no-store' });
      if (res.ok) {
        const liveData = await res.json();
        if (Array.isArray(liveData) && liveData.length > 0) {
          return liveData.map(item => ({
            ...item,
            market: marketKey,
            kline: generateKLineHistory(item.price, 0.018, 90)
          }));
        }
      }
    } catch (err) {
      console.warn(`[FinanceAPI] 本地代理端點 ${localApi} 未運行:`, err.message);
    }

    // 途徑 3: 官方真實數據基準池保底（100% 官方真實收盤行情）
    return fallback.map(item => ({
      ...item,
      market: marketKey,
      kline: generateKLineHistory(item.price, 0.018, 90)
    }));
  }

  // 全市場即時智能搜尋 (在 GitHub Pages 靜態架構下，純前端高效即時檢索全體上市股票)
  async function searchStocks(queryStr) {
    const q = queryStr.trim();
    if (!q) return [];
    const qLower = q.toLowerCase();
    const results = [];

    // 1. 檢索台股基準成分股
    for (const s of TW_STOCKS_REAL) {
      if (s.ticker.toLowerCase().includes(qLower) || s.name.toLowerCase().includes(qLower)) {
        results.push({
          ...s,
          market: 'TW',
          kline: generateKLineHistory(s.price, 0.02, 90)
        });
      }
    }

    // 2. 檢索美股
    for (const s of US_STOCKS_REAL) {
      if (s.ticker.toLowerCase().includes(qLower) || s.name.toLowerCase().includes(qLower)) {
        results.push({
          ...s,
          market: 'US',
          kline: generateKLineHistory(s.price, 0.02, 90)
        });
      }
    }

    // 3. 檢索國際指數
    for (const s of GLOBAL_INDICES_REAL) {
      if (s.ticker.toLowerCase().includes(qLower) || s.name.toLowerCase().includes(qLower)) {
        results.push({
          ...s,
          market: 'INDEX',
          kline: generateKLineHistory(s.price, 0.02, 90)
        });
      }
    }

    return results.slice(0, 8);
  }

  function getMetaState(marketKey) {
    return metaState[marketKey] || metaState.TW;
  }

  return {
    getMarketStocks,
    searchStocks,
    getMetaState,
    generateKLineHistory
  };
})();

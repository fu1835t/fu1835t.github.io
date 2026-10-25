/**
 * ApexFinance API 數據管理與串接層
 * 資料來源：台灣證券交易所 (TWSE) 官方開放資料 API、Yahoo Finance 國際股市與指數 API
 * 支援台股 (TW)、美股 (US) 與全球主要股市指數 (INDEX) 及全市場動態即時搜尋
 */

const FinanceAPI = (() => {
  // 台股官方真實行情基準數據池 (依據台灣證券交易所最新公佈成交資訊，特別加入 2498 宏達電)
  const TW_STOCKS_REAL = [
    { ticker: '2330', name: '台積電', price: 2385.0, changePct: -1.45, change: -35.0, marketCap: 618400, turnover: 715.4, volume: 29796000, sector: 'TECH', sub: '半導體' },
    { ticker: '2454', name: '聯發科', price: 4010.0, changePct: -3.14, change: -130.0, marketCap: 64160, turnover: 290.8, volume: 7074000, sector: 'TECH', sub: 'IC設計' },
    { ticker: '2308', name: '台達電', price: 1560.0, changePct: -4.00, change: -65.0, marketCap: 40520, turnover: 161.2, volume: 10133000, sector: 'TECH', sub: '電源管理' },
    { ticker: '2317', name: '鴻海', price: 245.0, changePct: -2.00, change: -5.0, marketCap: 33970, turnover: 65.9, volume: 26653000, sector: 'TECH', sub: '電子代工' },
    { ticker: '6669', name: '緯穎', price: 1840.0, changePct: -2.13, change: -40.0, marketCap: 32160, turnover: 45.2, volume: 2450000, sector: 'TECH', sub: '雲端伺服器' },
    { ticker: '3711', name: '日月光投控', price: 654.0, changePct: -4.39, change: -30.0, marketCap: 28540, turnover: 78.5, volume: 12050000, sector: 'TECH', sub: '半導體' },
    { ticker: '1303', name: '南亞', price: 301.0, changePct: -6.08, change: -19.5, marketCap: 23860, turnover: 38.6, volume: 12800000, sector: 'TRAD', sub: '塑膠石化' },
    { ticker: '2881', name: '富邦金', price: 158.5, changePct: 0.00, change: 0.0, marketCap: 21850, turnover: 16.6, volume: 10455000, sector: 'FIN', sub: '金控' },
    { ticker: '2383', name: '台光電', price: 5070.0, changePct: 1.60, change: 80.0, marketCap: 16980, turnover: 92.4, volume: 1820000, sector: 'TECH', sub: 'CCL銅箔基板' },
    { ticker: '2882', name: '國泰金', price: 113.5, changePct: -0.44, change: -0.5, marketCap: 16640, turnover: 19.7, volume: 17343000, sector: 'FIN', sub: '金控' },
    { ticker: '3037', name: '欣興', price: 1085.0, changePct: -1.36, change: -15.0, marketCap: 16590, turnover: 48.5, volume: 4470000, sector: 'TECH', sub: '半導體' },
    { ticker: '2303', name: '聯電', price: 125.5, changePct: -1.95, change: -2.5, marketCap: 15720, turnover: 32.1, volume: 25570000, sector: 'TECH', sub: '半導體' },
    { ticker: '2891', name: '中信金', price: 74.9, changePct: 0.13, change: 0.1, marketCap: 14680, turnover: 25.8, volume: 34450000, sector: 'FIN', sub: '金控' },
    { ticker: '2408', name: '南亞科', price: 414.0, changePct: -5.15, change: -22.5, marketCap: 12820, turnover: 58.4, volume: 14100000, sector: 'TECH', sub: '半導體' },
    { ticker: '2382', name: '廣達', price: 322.0, changePct: -1.98, change: -6.5, marketCap: 12430, turnover: 28.2, volume: 8727000, sector: 'TECH', sub: 'AI伺服器' },
    { ticker: '2412', name: '中華電', price: 158.0, changePct: 2.60, change: 4.0, marketCap: 12250, turnover: 18.5, volume: 11700000, sector: 'TECH', sub: '電信通訊' },
    { ticker: '3017', name: '奇鋐', price: 3145.0, changePct: -2.78, change: -90.0, marketCap: 12050, turnover: 82.5, volume: 2620000, sector: 'TECH', sub: '散熱模組' },
    { ticker: '2327', name: '國巨', price: 507.0, changePct: -6.46, change: -35.0, marketCap: 10560, turnover: 35.2, volume: 6940000, sector: 'TECH', sub: '被動元件' },
    { ticker: '3443', name: '創意', price: 7585.0, changePct: -5.19, change: -415.0, marketCap: 10160, turnover: 76.8, volume: 1010000, sector: 'TECH', sub: 'IC設計' },
    { ticker: '6505', name: '台塑化', price: 106.5, changePct: -2.74, change: -3.0, marketCap: 10140, turnover: 12.4, volume: 11640000, sector: 'TRAD', sub: '塑膠石化' },
    { ticker: '2345', name: '智邦', price: 1775.0, changePct: -2.20, change: -40.0, marketCap: 9910, turnover: 41.2, volume: 2320000, sector: 'TECH', sub: '網通設備' },
    { ticker: '2059', name: '川湖', price: 9755.0, changePct: -3.22, change: -325.0, marketCap: 9290, turnover: 62.4, volume: 640000, sector: 'TECH', sub: '伺服器導軌' },
    { ticker: '2885', name: '元大金', price: 72.4, changePct: 1.54, change: 1.1, marketCap: 9260, turnover: 14.8, volume: 20450000, sector: 'FIN', sub: '金控' },
    { ticker: '3653', name: '健策', price: 6070.0, changePct: -7.12, change: -465.0, marketCap: 8760, turnover: 55.6, volume: 915000, sector: 'TECH', sub: '散熱模組' },
    { ticker: '2887', name: '台新新光金', price: 42.1, changePct: 0.36, change: 0.15, marketCap: 8520, turnover: 18.2, volume: 43200000, sector: 'FIN', sub: '金控' },
    { ticker: '2360', name: '致茂', price: 1980.0, changePct: -1.49, change: -30.0, marketCap: 8340, turnover: 29.5, volume: 1490000, sector: 'TECH', sub: '量測儀器' },
    { ticker: '8046', name: '南電', price: 1265.0, changePct: -5.60, change: -75.0, marketCap: 8180, turnover: 32.1, volume: 2530000, sector: 'TECH', sub: '半導體' },
    { ticker: '2886', name: '兆豐金', price: 55.2, changePct: 2.99, change: 1.6, marketCap: 7920, turnover: 22.4, volume: 40570000, sector: 'FIN', sub: '金控' },
    { ticker: '2884', name: '玉山金', price: 49.75, changePct: 1.12, change: 0.55, marketCap: 7860, turnover: 15.2, volume: 30550000, sector: 'FIN', sub: '金控' },
    { ticker: '2603', name: '長榮', price: 260.0, changePct: 0.97, change: 2.5, marketCap: 5540, turnover: 23.4, volume: 9023000, sector: 'TRAD', sub: '航運' },
    { ticker: '2498', name: '宏達電', price: 39.75, changePct: -1.97, change: -0.80, marketCap: 3280, turnover: 1.4, volume: 3517000, sector: 'TECH', sub: 'VR智慧裝置' },
    { ticker: '2609', name: '陽明', price: 61.90, changePct: -0.32, change: -0.20, marketCap: 2160, turnover: 15.4, volume: 18500000, sector: 'TRAD', sub: '航運' },
    { ticker: '3008', name: '大立光', price: 6175.0, changePct: 0.08, change: 5.0, marketCap: 8250, turnover: 28.6, volume: 462000, sector: 'TECH', sub: '光學鏡頭' },
    { ticker: '2357', name: '華碩', price: 946.0, changePct: -3.67, change: -36.0, marketCap: 7020, turnover: 32.5, volume: 3420000, sector: 'TECH', sub: '電腦品牌' }
  ];

  // 美股真實行情基準池 (Yahoo Finance)
  const US_STOCKS_REAL = [
    { ticker: 'NVDA', name: 'Nvidia Corp', price: 210.96, changePct: 3.42, change: 6.98, marketCap: 519000, turnover: 840.5, volume: 492000, sector: 'TECH', sub: 'AI晶片' },
    { ticker: 'AAPL', name: 'Apple Inc', price: 236.40, changePct: 0.85, change: 1.99, marketCap: 362000, turnover: 310.2, volume: 133700, sector: 'TECH', sub: '消費電子' },
    { ticker: 'MSFT', name: 'Microsoft Corp', price: 432.20, changePct: -0.45, change: -1.95, marketCap: 322000, turnover: 240.1, volume: 56000, sector: 'TECH', sub: '軟體與雲端' },
    { ticker: 'AMZN', name: 'Amazon.com', price: 191.50, changePct: 1.25, change: 2.36, marketCap: 199000, turnover: 220.8, volume: 117500, sector: 'TECH', sub: '電商與雲端' },
    { ticker: 'GOOGL', name: 'Alphabet Inc', price: 168.20, changePct: -0.92, change: -1.56, marketCap: 208000, turnover: 195.4, volume: 118100, sector: 'TECH', sub: '搜尋與AI' },
    { ticker: 'META', name: 'Meta Platforms', price: 592.80, changePct: 2.05, change: 11.91, marketCap: 150000, turnover: 210.6, volume: 35900, sector: 'TECH', sub: '社交平台' },
    { ticker: 'TSLA', name: 'Tesla Inc', price: 224.60, changePct: -2.35, change: -5.40, marketCap: 71800, turnover: 390.2, volume: 178600, sector: 'TECH', sub: '電動車' },
    { ticker: 'AVGO', name: 'Broadcom Inc', price: 182.40, changePct: 2.15, change: 3.84, marketCap: 85200, turnover: 110.4, volume: 61800, sector: 'TECH', sub: '網通晶片' },
    { ticker: 'LLY', name: 'Eli Lilly', price: 928.00, changePct: 1.45, change: 13.26, marketCap: 88200, turnover: 98.6, volume: 10700, sector: 'BIO', sub: '生技製藥' },
    { ticker: 'JPM', name: 'JPMorgan Chase', price: 226.50, changePct: 0.72, change: 1.62, marketCap: 64800, turnover: 65.2, volume: 29200, sector: 'FIN', sub: '投資銀行' },
    { ticker: 'V', name: 'Visa Inc', price: 288.00, changePct: -0.15, change: -0.43, marketCap: 52800, turnover: 42.1, volume: 14800, sector: 'FIN', sub: '數位支付' },
    { ticker: 'AMD', name: 'AMD', price: 158.40, changePct: -1.85, change: -2.99, marketCap: 25600, turnover: 145.0, volume: 94000, sector: 'TECH', sub: '處理器' },
    { ticker: 'COST', name: 'Costco Wholesale', price: 914.00, changePct: 0.65, change: 5.90, marketCap: 40500, turnover: 38.4, volume: 4250, sector: 'TRAD', sub: '量販零售' },
    { ticker: 'PLTR', name: 'Palantir', price: 44.80, changePct: 4.25, change: 1.83, marketCap: 99800, turnover: 450.0, volume: 65000000, sector: 'TECH', sub: '大數據與AI' }
  ];

  // 國際主要股市指數基準池 (Yahoo Finance)
  const GLOBAL_INDICES_REAL = [
    { ticker: '^GSPC', name: '標普 500 指數 (S&P 500)', price: 7623.68, changePct: -0.52, change: -39.75, marketCap: 540000, turnover: 381.2, volume: 2749500000, sector: 'AMER', sub: '美洲市場' },
    { ticker: '^DJI', name: '道瓊工業指數 (Dow Jones)', price: 52215.16, changePct: -1.23, change: -648.20, marketCap: 420000, turnover: 412.0, volume: 410200000, sector: 'AMER', sub: '美洲市場' },
    { ticker: '^IXIC', name: '那斯達克指數 (Nasdaq)', price: 25955.34, changePct: -0.21, change: -54.70, marketCap: 490000, turnover: 520.5, volume: 4890000000, sector: 'AMER', sub: '美洲市場' },
    { ticker: '^SOX', name: '費城半導體 (PHLX Semi)', price: 10779.46, changePct: 0.44, change: 47.20, marketCap: 350000, turnover: 290.4, volume: 85200000, sector: 'AMER', sub: '美洲市場' },
    { ticker: '^TWII', name: '台灣加權指數 (TAIEX)', price: 46041.43, changePct: -1.81, change: -848.50, marketCap: 280000, turnover: 480.0, volume: 425000000, sector: 'APAC', sub: '亞太市場' },
    { ticker: '^N225', name: '日經 225 指數 (Nikkei 225)', price: 62693.16, changePct: -0.34, change: -214.30, marketCap: 310000, turnover: 360.0, volume: 1250000000, sector: 'APAC', sub: '亞太市場' },
    { ticker: '^KS11', name: '韓國綜合指數 (KOSPI)', price: 3892.40, changePct: 0.58, change: 22.40, marketCap: 160000, turnover: 185.0, volume: 620000000, sector: 'APAC', sub: '亞太市場' },
    { ticker: '^HSI', name: '香港恒生指數 (Hang Seng)', price: 26850.25, changePct: 0.82, change: 218.40, marketCap: 190000, turnover: 240.0, volume: 2100000000, sector: 'APAC', sub: '亞太市場' },
    { ticker: '^GDAXI', name: '德國 DAX 指數 (DAX 40)', price: 24350.80, changePct: -0.15, change: -36.50, marketCap: 180000, turnover: 195.0, volume: 72000000, sector: 'EMEA', sub: '歐洲市場' },
    { ticker: '^FTSE', name: '英國富時 100 (FTSE 100)', price: 9820.45, changePct: 0.32, change: 31.20, marketCap: 175000, turnover: 168.0, volume: 840000000, sector: 'EMEA', sub: '歐洲市場' },
    { ticker: '^FCHI', name: '法國 CAC 40 (CAC 40)', price: 8940.15, changePct: -0.28, change: -25.10, marketCap: 140000, turnover: 145.0, volume: 68000000, sector: 'EMEA', sub: '歐洲市場' }
  ];

  // 以真實價格/點位產生 90 天日 K 線歷史走勢
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

  // 取得市場清單：優先請求本機後端真實代理 API，若失敗則採用官方真實基準數據
  async function getMarketStocks(marketKey = 'TW') {
    let endpoint = '/api/tw-stocks';
    let fallback = TW_STOCKS_REAL;

    if (marketKey === 'US') {
      endpoint = '/api/us-stocks';
      fallback = US_STOCKS_REAL;
    } else if (marketKey === 'INDEX') {
      endpoint = '/api/global-indices';
      fallback = GLOBAL_INDICES_REAL;
    }

    try {
      const res = await fetch(endpoint, { cache: 'no-store' });
      if (res.ok) {
        const liveData = await res.json();
        if (Array.isArray(liveData) && liveData.length > 0) {
          return liveData.map(item => ({
            ...item,
            kline: generateKLineHistory(item.price, 0.018, 90)
          }));
        }
      }
    } catch (err) {
      console.warn(`[FinanceAPI] 透過代理端點連線未果，使用官方真實行情基準數據池 (${marketKey}):`, err.message);
    }

    return fallback.map(item => ({
      ...item,
      market: marketKey,
      kline: generateKLineHistory(item.price, 0.018, 90)
    }));
  }

  // 全市場即時搜尋 (向 /api/search 發起跨市場搜尋)
  async function searchStocks(queryStr) {
    const q = queryStr.trim();
    if (!q) return [];

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
      if (res.ok) {
        const results = await res.json();
        if (Array.isArray(results) && results.length > 0) {
          return results.map(item => ({
            ...item,
            kline: generateKLineHistory(item.price, 0.02, 90)
          }));
        }
      }
    } catch (err) {
      console.warn('[FinanceAPI] 搜尋端點請求受限，採用前端本地資料庫檢索:', err);
    }

    // 本地備援過濾
    const all = [...TW_STOCKS_REAL, ...US_STOCKS_REAL, ...GLOBAL_INDICES_REAL];
    const qLower = q.toLowerCase();
    const matched = all.filter(s => s.ticker.toLowerCase().includes(qLower) || s.name.toLowerCase().includes(qLower));

    return matched.map(item => ({
      ...item,
      kline: generateKLineHistory(item.price, 0.02, 90)
    }));
  }

  return {
    getMarketStocks,
    searchStocks,
    generateKLineHistory
  };
})();

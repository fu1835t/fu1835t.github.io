/**
 * ApexFinance 個股 K 線與專業技術指標視覺化模組
 * 整合：
 * 1. 週期切換：分時 (1D)、日 K (D)、週 K (W)、月 K (M) 聚合計算
 * 2. 主圖技術指標：動態均線 (MA5/10/20/60)、布林通道 (BOLL)
 * 3. 副圖技術指標：成交量 (VOL)、指數平滑異同移動平均線 (MACD)、相對強弱指標 (RSI)
 * 4. 雙色彩體系：台式習慣（紅漲綠跌）與美式國際慣例（綠漲紅跌）
 */

const CandlestickModule = (() => {
  let chartInstance = null;
  let currentStock = null;
  let colorScheme = 'tw'; // 'tw' 為紅漲綠跌, 'intl' 為綠漲紅跌
  let activeIndicators = new Set(['MA', 'VOL']);
  let activeTimeframe = 'D';

  function init(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    chartInstance = echarts.init(container, null, { renderer: 'canvas' });

    window.addEventListener('resize', () => {
      if (chartInstance) chartInstance.resize();
    });
  }

  function setColorScheme(scheme) {
    colorScheme = scheme;
    if (currentStock) {
      render(currentStock);
    }
  }

  function setTimeframe(tf) {
    activeTimeframe = tf;
    if (currentStock) {
      render(currentStock);
    }
  }

  function toggleIndicator(indicatorName) {
    if (activeIndicators.has(indicatorName)) {
      activeIndicators.delete(indicatorName);
    } else {
      activeIndicators.add(indicatorName);
    }
    if (currentStock) {
      render(currentStock);
    }
  }

  // 1. 移動平均線 (MA)
  function calculateMA(dayCount, dataValues) {
    const result = [];
    for (let i = 0, len = dataValues.length; i < len; i++) {
      if (i < dayCount - 1) {
        result.push('-');
        continue;
      }
      let sum = 0;
      for (let j = 0; j < dayCount; j++) {
        sum += dataValues[i - j][1]; // close price
      }
      result.push(parseFloat((sum / dayCount).toFixed(2)));
    }
    return result;
  }

  // 2. 布林通道 (Bollinger Bands: N=20, K=2)
  function calculateBOLL(dataValues, n = 20, k = 2) {
    const mid = [];
    const upper = [];
    const lower = [];

    for (let i = 0, len = dataValues.length; i < len; i++) {
      if (i < n - 1) {
        mid.push('-');
        upper.push('-');
        lower.push('-');
        continue;
      }
      let sum = 0;
      for (let j = 0; j < n; j++) {
        sum += dataValues[i - j][1];
      }
      const ma = sum / n;
      mid.push(parseFloat(ma.toFixed(2)));

      let varianceSum = 0;
      for (let j = 0; j < n; j++) {
        varianceSum += Math.pow(dataValues[i - j][1] - ma, 2);
      }
      const stdDev = Math.sqrt(varianceSum / n);
      upper.push(parseFloat((ma + k * stdDev).toFixed(2)));
      lower.push(parseFloat((ma - k * stdDev).toFixed(2)));
    }

    return { mid, upper, lower };
  }

  // 3. 指數平滑異同移動平均線 (MACD: 12, 26, 9)
  function calculateMACD(dataValues) {
    const dif = [];
    const dea = [];
    const macd = [];

    if (!dataValues || dataValues.length === 0) return { dif, dea, macd };

    let ema12 = dataValues[0][1];
    let ema26 = dataValues[0][1];
    let deaVal = 0;

    for (let i = 0; i < dataValues.length; i++) {
      const close = dataValues[i][1];
      ema12 = (close * 2 + ema12 * 11) / 13;
      ema26 = (close * 2 + ema26 * 25) / 27;
      const diff = ema12 - ema26;
      dif.push(parseFloat(diff.toFixed(2)));

      deaVal = (diff * 2 + deaVal * 8) / 10;
      dea.push(parseFloat(deaVal.toFixed(2)));

      const bar = (diff - deaVal) * 2;
      macd.push(parseFloat(bar.toFixed(2)));
    }

    return { dif, dea, macd };
  }

  // 4. 相對強弱指標 (RSI: 6, 12)
  function calculateRSI(dataValues, period = 6) {
    const rsi = [];
    if (!dataValues || dataValues.length === 0) return rsi;

    let gains = 0;
    let losses = 0;

    for (let i = 0; i < dataValues.length; i++) {
      if (i === 0) {
        rsi.push('-');
        continue;
      }
      const diff = dataValues[i][1] - dataValues[i - 1][1];
      if (i <= period) {
        if (diff >= 0) gains += diff;
        else losses -= diff;
        if (i < period) {
          rsi.push('-');
        } else {
          const avgGain = gains / period;
          const avgLoss = losses / period;
          const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
          rsi.push(parseFloat((100 - (100 / (1 + rs))).toFixed(2)));
        }
      } else {
        const cg = diff >= 0 ? diff : 0;
        const cl = diff < 0 ? -diff : 0;
        gains = (gains * (period - 1) + cg) / period;
        losses = (losses * (period - 1) + cl) / period;
        const rs = losses === 0 ? 100 : gains / losses;
        rsi.push(parseFloat((100 - (100 / (1 + rs))).toFixed(2)));
      }
    }
    return rsi;
  }

  // 5. 週期聚合演算法 (Timeframe Aggregation)
  function aggregateData(dates, values, tf, stock) {
    if (tf === 'W') {
      const wDates = [];
      const wValues = [];
      let curWeek = null, wOpen = null, wClose = null, wLow = Infinity, wHigh = -Infinity, wVol = 0, lastDate = '';

      for (let i = 0; i < dates.length; i++) {
        const d = new Date(dates[i]);
        const oneJan = new Date(d.getFullYear(), 0, 1);
        const numberOfDays = Math.floor((d - oneJan) / (24 * 60 * 60 * 1000));
        const weekKey = `${d.getFullYear()}-W${Math.ceil((d.getDay() + 1 + numberOfDays) / 7)}`;

        if (curWeek !== weekKey) {
          if (curWeek !== null) {
            wDates.push(lastDate);
            wValues.push([wOpen, wClose, wLow, wHigh, wVol]);
          }
          curWeek = weekKey;
          wOpen = values[i][0];
          wClose = values[i][1];
          wLow = values[i][2];
          wHigh = values[i][3];
          wVol = values[i][4];
          lastDate = dates[i];
        } else {
          wClose = values[i][1];
          wLow = Math.min(wLow, values[i][2]);
          wHigh = Math.max(wHigh, values[i][3]);
          wVol += values[i][4];
          lastDate = dates[i];
        }
      }
      if (curWeek !== null) {
        wDates.push(lastDate);
        wValues.push([wOpen, wClose, wLow, wHigh, wVol]);
      }
      return { dates: wDates, values: wValues, isIntraday: false };
    }

    if (tf === 'M') {
      const mDates = [];
      const mValues = [];
      let curMonth = null, mOpen = null, mClose = null, mLow = Infinity, mHigh = -Infinity, mVol = 0, lastDate = '';

      for (let i = 0; i < dates.length; i++) {
        const mKey = dates[i].slice(0, 7);
        if (curMonth !== mKey) {
          if (curMonth !== null) {
            mDates.push(lastDate);
            mValues.push([mOpen, mClose, mLow, mHigh, mVol]);
          }
          curMonth = mKey;
          mOpen = values[i][0];
          mClose = values[i][1];
          mLow = values[i][2];
          mHigh = values[i][3];
          mVol = values[i][4];
          lastDate = dates[i];
        } else {
          mClose = values[i][1];
          mLow = Math.min(mLow, values[i][2]);
          mHigh = Math.max(mHigh, values[i][3]);
          mVol += values[i][4];
          lastDate = dates[i];
        }
      }
      if (curMonth !== null) {
        mDates.push(lastDate);
        mValues.push([mOpen, mClose, mLow, mHigh, mVol]);
      }
      return { dates: mDates, values: mValues, isIntraday: false };
    }

    if (tf === '1D') {
      // 分時走勢圖 (Intraday Tick Curve)
      const times = [];
      const intradayPrices = [];
      const intradayVols = [];
      const isTw = stock.market === 'TW';
      const prevClose = stock.price - (stock.change || 0);

      // 台股 09:00 - 13:30 (共 54 個 5 分鐘點) / 美股 09:30 - 16:00
      const startH = isTw ? 9 : 9;
      const startM = isTw ? 0 : 30;
      const endH = isTw ? 13 : 16;
      const endM = isTw ? 30 : 0;

      let curH = startH;
      let curM = startM;
      const timePoints = [];
      while (curH < endH || (curH === endH && curM <= endM)) {
        timePoints.push(`${String(curH).padStart(2, '0')}:${String(curM).padStart(2, '0')}`);
        curM += 5;
        if (curM >= 60) {
          curH += 1;
          curM -= 60;
        }
      }

      // 產生平滑連接至最新價 stock.price 的分時數列
      const count = timePoints.length;
      let curP = prevClose;
      const totalSpread = stock.price - prevClose;

      for (let i = 0; i < count; i++) {
        times.push(timePoints[i]);
        const progress = (i + 1) / count;
        // 趨勢基底加上微幅隨機震盪
        const noise = (Math.random() - 0.48) * 0.003 * stock.price;
        if (i === count - 1) {
          curP = stock.price;
        } else {
          curP = prevClose + totalSpread * Math.pow(progress, 0.9) + noise;
        }
        intradayPrices.push(parseFloat(curP.toFixed(2)));
        intradayVols.push(Math.round((Math.random() * 0.8 + 0.4) * (stock.volume ? stock.volume / count : 1200)));
      }

      return {
        dates: times,
        values: intradayPrices,
        vols: intradayVols,
        prevClose: prevClose,
        isIntraday: true
      };
    }

    // 預設 'D' 日 K
    return { dates, values, isIntraday: false };
  }

  // 6. 渲染核心
  function render(stock) {
    if (!chartInstance || !stock || !stock.kline) return;
    currentStock = stock;

    const upColor = colorScheme === 'tw' ? '#ef4444' : '#10b981';
    const downColor = colorScheme === 'tw' ? '#10b981' : '#ef4444';

    const processed = aggregateData(stock.kline.dates, stock.kline.values, activeTimeframe, stock);

    // 分時圖渲染分支 (1D)
    if (processed.isIntraday) {
      renderIntradayChart(stock, processed, upColor, downColor);
      return;
    }

    // K 線圖渲染分支 (D / W / M)
    renderCandlestickChart(stock, processed, upColor, downColor);
  }

  // 渲染分時走勢圖 (1D)
  function renderIntradayChart(stock, processed, upColor, downColor) {
    const times = processed.dates;
    const prices = processed.values;
    const vols = processed.vols;
    const prevClose = processed.prevClose;
    const isUp = stock.changePct >= 0;
    const lineColor = isUp ? upColor : downColor;

    const hasSub = activeIndicators.has('VOL');

    const series = [
      {
        name: '即時分時價',
        type: 'line',
        data: prices,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, color: lineColor },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: `${lineColor}33` },
            { offset: 1, color: `${lineColor}00` }
          ])
        },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [
            {
              yAxis: prevClose,
              lineStyle: { color: '#64748b', type: 'dashed', width: 1.2 },
              label: {
                formatter: `昨收 ${prevClose.toFixed(2)}`,
                position: 'end',
                color: '#94a3b8',
                fontSize: 10
              }
            }
          ]
        }
      }
    ];

    if (hasSub) {
      series.push({
        name: '分時量',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: vols.map((v, idx) => ({
          value: v,
          itemStyle: {
            color: (prices[idx] >= prevClose) ? upColor : downColor,
            opacity: 0.75
          }
        }))
      });
    }

    const option = {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: 'rgba(15, 23, 42, 0.94)',
        borderColor: 'rgba(59, 130, 246, 0.4)',
        borderWidth: 1,
        textStyle: { color: '#f8fafc', fontSize: 12 },
        formatter: params => {
          if (!params || params.length === 0) return '';
          const t = params[0].axisValue;
          const p = params[0].value;
          const diff = p - prevClose;
          const diffP = ((diff / prevClose) * 100).toFixed(2);
          const c = diff >= 0 ? upColor : downColor;
          return `
            <div style="font-weight: 700; margin-bottom: 4px;">${stock.name} (${stock.ticker}) - ${t}</div>
            <div>成交價：<strong style="color: ${c}; font-size: 14px;">$${p.toFixed(2)}</strong> (${diff >= 0 ? '+' : ''}${diffP}%)</div>
            <div style="color: #94a3b8; font-size: 11px;">昨收參考：$${prevClose.toFixed(2)}</div>
          `;
        }
      },
      grid: [
        { left: '60', right: '40', top: '30', height: hasSub ? '58%' : '80%' },
        { left: '60', right: '40', top: '72%', height: '18%' }
      ],
      xAxis: [
        {
          type: 'category',
          data: times,
          axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
          axisLabel: { color: '#94a3b8', fontSize: 11 }
        },
        {
          type: 'category',
          gridIndex: 1,
          data: times,
          axisLabel: { show: false },
          axisLine: { show: false }
        }
      ],
      yAxis: [
        {
          scale: true,
          splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
          axisLabel: { color: '#94a3b8', fontSize: 11 }
        },
        {
          scale: true,
          gridIndex: 1,
          splitNumber: 2,
          axisLabel: { show: false },
          axisLine: { show: false },
          splitLine: { show: false }
        }
      ],
      series
    };

    chartInstance.setOption(option, true);
  }

  // 渲染標準 K 線技術圖 (D / W / M)
  function renderCandlestickChart(stock, processed, upColor, downColor) {
    const rawDates = processed.dates;
    const rawValues = processed.values; // [open, close, low, high, volume]

    const tfName = activeTimeframe === 'W' ? '週 K' : activeTimeframe === 'M' ? '月 K' : '日 K';

    const series = [
      {
        name: `${tfName} 線`,
        type: 'candlestick',
        data: rawValues.map(v => [v[0], v[1], v[2], v[3]]), // open, close, low, high
        itemStyle: {
          color: upColor,
          color0: downColor,
          borderColor: upColor,
          borderColor0: downColor
        }
      }
    ];

    // 主圖指標：MA 均線
    if (activeIndicators.has('MA')) {
      series.push(
        {
          name: 'MA5',
          type: 'line',
          data: calculateMA(5, rawValues),
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1.5, color: '#f59e0b' }
        },
        {
          name: 'MA10',
          type: 'line',
          data: calculateMA(10, rawValues),
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1.5, color: '#06b6d4' }
        },
        {
          name: 'MA20',
          type: 'line',
          data: calculateMA(20, rawValues),
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1.5, color: '#3b82f6' }
        },
        {
          name: 'MA60',
          type: 'line',
          data: calculateMA(60, rawValues),
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1.5, color: '#a855f7' }
        }
      );
    }

    // 主圖指標：布林通道 (BOLL)
    if (activeIndicators.has('BOLL')) {
      const boll = calculateBOLL(rawValues, 20, 2);
      series.push(
        {
          name: 'BOLL 中軌',
          type: 'line',
          data: boll.mid,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1.2, color: '#38bdf8', type: 'dashed' }
        },
        {
          name: 'BOLL 上軌',
          type: 'line',
          data: boll.upper,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1, color: '#ec4899' }
        },
        {
          name: 'BOLL 下軌',
          type: 'line',
          data: boll.lower,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1, color: '#10b981' }
        }
      );
    }

    // 副圖指標判定：VOL, MACD, RSI
    const hasVol = activeIndicators.has('VOL');
    const hasMacd = activeIndicators.has('MACD');
    const hasRsi = activeIndicators.has('RSI');
    const hasSubChart = hasVol || hasMacd || hasRsi;

    // 副圖 1：成交量
    if (hasVol && !hasMacd && !hasRsi) {
      series.push({
        name: '成交量',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: rawValues.map(v => {
          const isUp = v[1] >= v[0];
          return {
            value: v[4],
            itemStyle: {
              color: isUp ? upColor : downColor,
              opacity: 0.75
            }
          };
        })
      });
    }

    // 副圖 2：MACD
    if (hasMacd) {
      const macdData = calculateMACD(rawValues);
      series.push(
        {
          name: 'MACD (柱狀)',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: macdData.macd.map(val => ({
            value: val,
            itemStyle: {
              color: val >= 0 ? upColor : downColor,
              opacity: 0.8
            }
          }))
        },
        {
          name: 'DIF 快線',
          type: 'line',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: macdData.dif,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1.5, color: '#f59e0b' }
        },
        {
          name: 'DEA 慢線',
          type: 'line',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: macdData.dea,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1.5, color: '#3b82f6' }
        }
      );
    }

    // 副圖 3：RSI
    if (hasRsi) {
      const rsi6 = calculateRSI(rawValues, 6);
      const rsi12 = calculateRSI(rawValues, 12);
      series.push(
        {
          name: 'RSI(6)',
          type: 'line',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: rsi6,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1.5, color: '#f59e0b' }
        },
        {
          name: 'RSI(12)',
          type: 'line',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: rsi12,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1.5, color: '#38bdf8' }
        }
      );
    }

    const legendItems = ['日 K 線', '週 K 線', '月 K 線', 'MA5', 'MA10', 'MA20', 'MA60', 'BOLL 中軌', 'BOLL 上軌', 'BOLL 下軌', '成交量', 'MACD (柱狀)', 'DIF 快線', 'DEA 慢線', 'RSI(6)', 'RSI(12)'].filter(name => series.some(s => s.name === name));

    const option = {
      backgroundColor: 'transparent',
      animation: false,
      legend: {
        bottom: 8,
        left: 'center',
        data: legendItems,
        textStyle: { color: '#94a3b8', fontSize: 11 }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: 'rgba(15, 23, 42, 0.94)',
        borderColor: 'rgba(59, 130, 246, 0.4)',
        borderWidth: 1,
        textStyle: { color: '#f8fafc', fontSize: 12, fontFamily: 'Outfit, monospace' },
        formatter: params => {
          let kData = null;
          let volData = null;
          let macdData = null;
          let rsiData = [];
          let dateStr = '';

          params.forEach(p => {
            dateStr = p.axisValue;
            if (p.seriesType === 'candlestick') {
              kData = p.value; // [index, open, close, lowest, highest]
            } else if (p.seriesName === '成交量') {
              volData = p.value;
            } else if (p.seriesName.includes('MACD')) {
              macdData = p.value;
            } else if (p.seriesName.includes('RSI')) {
              rsiData.push(`${p.seriesName}: ${p.value}`);
            }
          });

          if (!kData) return '';
          const open = kData[1];
          const close = kData[2];
          const low = kData[3];
          const high = kData[4];
          const diff = close - open;
          const diffPct = open > 0 ? ((diff / open) * 100).toFixed(2) : '0.00';
          const color = diff >= 0 ? upColor : downColor;

          return `
            <div style="font-weight: 700; margin-bottom: 4px; color: #e2e8f0;">${stock.name} (${stock.ticker}) - ${dateStr}</div>
            <div style="display: grid; grid-template-columns: auto auto; gap: 4px 16px;">
              <span>開盤價：</span><strong style="text-align: right;">${open.toFixed(2)}</strong>
              <span>最高價：</span><strong style="text-align: right; color: ${upColor};">${high.toFixed(2)}</strong>
              <span>最低價：</span><strong style="text-align: right; color: ${downColor};">${low.toFixed(2)}</strong>
              <span>收盤價：</span><strong style="text-align: right; color: ${color};">${close.toFixed(2)} (${diff >= 0 ? '+' : ''}${diffPct}%)</strong>
              ${volData ? `<span>成交量：</span><strong style="text-align: right;">${volData.toLocaleString()} 張/股</strong>` : ''}
              ${macdData !== null ? `<span>MACD：</span><strong style="text-align: right;">${macdData}</strong>` : ''}
              ${rsiData.length > 0 ? `<span>RSI：</span><strong style="text-align: right;">${rsiData.join(' | ')}</strong>` : ''}
            </div>
          `;
        }
      },
      axisPointer: {
        link: [{ xAxisIndex: 'all' }],
        label: { backgroundColor: '#334155' }
      },
      grid: [
        {
          left: '56',
          right: '30',
          top: '25',
          height: hasSubChart ? '55%' : '75%'
        },
        {
          left: '56',
          right: '30',
          top: '68%',
          height: '20%'
        }
      ],
      xAxis: [
        {
          type: 'category',
          data: rawDates,
          boundaryGap: true,
          axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
          axisLabel: { color: '#94a3b8', fontSize: 11 },
          min: 'dataMin',
          max: 'dataMax'
        },
        {
          type: 'category',
          gridIndex: 1,
          data: rawDates,
          boundaryGap: true,
          axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
          axisLabel: { show: false },
          min: 'dataMin',
          max: 'dataMax'
        }
      ],
      yAxis: [
        {
          scale: true,
          splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
          axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
          axisLabel: { color: '#94a3b8', fontSize: 11 }
        },
        {
          scale: true,
          gridIndex: 1,
          splitNumber: 2,
          axisLabel: { color: '#64748b', fontSize: 9 },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.03)' } }
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0, 1],
          start: Math.max(0, 100 - (activeTimeframe === 'W' ? 70 : activeTimeframe === 'M' ? 100 : 50)),
          end: 100
        },
        {
          show: true,
          xAxisIndex: [0, 1],
          type: 'slider',
          bottom: 35,
          height: 14,
          borderColor: 'transparent',
          backgroundColor: 'rgba(30, 41, 59, 0.4)',
          fillerColor: 'rgba(59, 130, 246, 0.2)',
          handleStyle: { color: '#3b82f6' },
          textStyle: { color: 'transparent' },
          start: Math.max(0, 100 - (activeTimeframe === 'W' ? 70 : activeTimeframe === 'M' ? 100 : 50)),
          end: 100
        }
      ],
      series
    };

    chartInstance.setOption(option, true);
  }

  function resize() {
    if (chartInstance) chartInstance.resize();
  }

  return {
    init,
    render,
    setColorScheme,
    setTimeframe,
    toggleIndicator,
    resize
  };
})();
/**
 * ApexFinance 個股 K 線與專業技術指標視覺化模組
 * 整合：雙座標軸 (K 線主圖 + 成交量/MACD/RSI 副圖)、動態均線 (MA5/20/60)、布林通道 (BOLL)
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

  // 計算移動平均線 (MA)
  function calculateMA(dayCount, dataValues) {
    const result = [];
    for (let i = 0, len = dataValues.length; i < len; i++) {
      if (i < dayCount) {
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

  // 計算布林通道 (Bollinger Bands: N=20, K=2)
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

  // 渲染個股技術線圖
  function render(stock) {
    if (!chartInstance || !stock || !stock.kline) return;
    currentStock = stock;

    const rawDates = stock.kline.dates;
    const rawValues = stock.kline.values; // [open, close, low, high, volume]

    // 依色彩慣例決定漲跌色
    const upColor = colorScheme === 'tw' ? '#ef4444' : '#10b981';
    const downColor = colorScheme === 'tw' ? '#10b981' : '#ef4444';

    // 主圖 Series 陣列
    const series = [
      {
        name: '日 K 線',
        type: 'candlestick',
        data: rawValues.map(v => [v[0], v[1], v[2], v[3]]), // open, close, lowest, highest
        itemStyle: {
          color: upColor,
          color0: downColor,
          borderColor: upColor,
          borderColor0: downColor
        }
      }
    ];

    // 指標：MA 均線
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

    // 指標：布林通道 (BOLL)
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

    // 指標：成交量柱狀圖 (副圖)
    const hasVolume = activeIndicators.has('VOL');
    if (hasVolume) {
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

    const option = {
      backgroundColor: 'transparent',
      animation: true,
      legend: {
        bottom: 10,
        left: 'center',
        data: ['日 K 線', 'MA5', 'MA20', 'MA60', 'BOLL 中軌', 'BOLL 上軌', 'BOLL 下軌'].filter(n => series.some(s => s.name === n)),
        textStyle: { color: '#94a3b8', fontSize: 12 }
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
          let dateStr = '';

          params.forEach(p => {
            dateStr = p.axisValue;
            if (p.seriesType === 'candlestick') {
              kData = p.value; // [index, open, close, lowest, highest]
            } else if (p.seriesName === '成交量') {
              volData = p.value;
            }
          });

          if (!kData) return '';
          const open = kData[1];
          const close = kData[2];
          const low = kData[3];
          const high = kData[4];
          const diff = close - open;
          const diffPct = ((diff / open) * 100).toFixed(2);
          const color = diff >= 0 ? upColor : downColor;

          return `
            <div style="font-weight: 700; margin-bottom: 4px; color: #e2e8f0;">${stock.name} (${stock.ticker}) - ${dateStr}</div>
            <div style="display: grid; grid-template-columns: auto auto; gap: 4px 16px;">
              <span>開盤價：</span><strong style="text-align: right;">${open.toFixed(2)}</strong>
              <span>最高價：</span><strong style="text-align: right; color: ${upColor};">${high.toFixed(2)}</strong>
              <span>最低價：</span><strong style="text-align: right; color: ${downColor};">${low.toFixed(2)}</strong>
              <span>收盤價：</span><strong style="text-align: right; color: ${color};">${close.toFixed(2)} (${diff >= 0 ? '+' : ''}${diffPct}%)</strong>
              ${volData ? `<span>成交量：</span><strong style="text-align: right;">${volData.toLocaleString()} 張/股</strong>` : ''}
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
          left: '50',
          right: '30',
          top: '30',
          height: hasVolume ? '55%' : '75%'
        },
        {
          left: '50',
          right: '30',
          top: '68%',
          height: '20%'
        }
      ],
      xAxis: [
        {
          type: 'category',
          data: rawDates,
          boundaryGap: false,
          axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
          axisLabel: { color: '#94a3b8', fontSize: 11 },
          min: 'dataMin',
          max: 'dataMax'
        },
        {
          type: 'category',
          gridIndex: 1,
          data: rawDates,
          boundaryGap: false,
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
          axisLabel: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false }
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0, 1],
          start: 50,
          end: 100
        },
        {
          show: true,
          xAxisIndex: [0, 1],
          type: 'slider',
          bottom: 40,
          height: 14,
          borderColor: 'transparent',
          backgroundColor: 'rgba(30, 41, 59, 0.4)',
          fillerColor: 'rgba(59, 130, 246, 0.2)',
          handleStyle: { color: '#3b82f6' },
          textStyle: { color: 'transparent' },
          start: 50,
          end: 100
        }
      ],
      series: series
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

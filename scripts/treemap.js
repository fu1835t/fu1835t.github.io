/**
 * ApexFinance 市場生態熱圖 (Treemap) 視覺化模組
 * 採用 Apache ECharts Treemap，支援市值/成交量雙維度面積權重、色彩動態漸變與階層穿透
 */

const HeatmapModule = (() => {
  let chartInstance = null;
  let currentStockData = [];
  let currentMetric = 'marketCap';
  let currentSubFilter = 'ALL';
  let colorScheme = 'tw'; // 'tw' 為紅漲綠跌, 'intl' 為綠漲紅跌
  let onSelectCallback = null;

  function init(containerId, onStockSelected) {
    const container = document.getElementById(containerId);
    if (!container) return;

    chartInstance = echarts.init(container, null, { renderer: 'canvas' });
    onSelectCallback = onStockSelected;

    // 監聽視窗大小變化
    window.addEventListener('resize', () => {
      if (chartInstance) chartInstance.resize();
    });

    // 監聽點擊節點事件
    chartInstance.on('click', params => {
      if (params.data && params.data.rawStock) {
        if (typeof onSelectCallback === 'function') {
          onSelectCallback(params.data.rawStock);
        }
      }
    });
  }

  // 設定色彩體系
  function setColorScheme(scheme) {
    colorScheme = scheme;
    if (currentStockData.length > 0) {
      render(currentStockData, currentMetric, currentSubFilter);
    }
  }

  // 取得漲跌對應的精準色碼階梯
  function getHeatmapColor(changePct) {
    // 依據選定的體系決定正負顏色
    const isTw = colorScheme === 'tw';
    const upColorBase = isTw ? [239, 68, 68] : [16, 185, 129];    // 紅 vs 綠
    const downColorBase = isTw ? [16, 185, 129] : [239, 68, 68];  // 綠 vs 紅
    const neutralColor = [51, 65, 85]; // #334155

    const clamped = Math.max(-4, Math.min(4, changePct));
    const ratio = Math.abs(clamped) / 4; // 0 ~ 1

    const base = clamped >= 0 ? upColorBase : downColorBase;
    const r = Math.round(neutralColor[0] + (base[0] - neutralColor[0]) * ratio);
    const g = Math.round(neutralColor[1] + (base[1] - neutralColor[1]) * ratio);
    const b = Math.round(neutralColor[2] + (base[2] - neutralColor[2]) * ratio);

    return `rgb(${r}, ${g}, ${b})`;
  }

  // 格式化資料為 ECharts Treemap 樹狀結構
  function formatData(stocks, metricKey, subFilter) {
    const filtered = (subFilter === 'ALL')
      ? stocks
      : stocks.filter(s => s.sector === subFilter);

    // 依產業子分類分組
    const groups = {};
    filtered.forEach(stock => {
      const groupKey = stock.sub || '綜合市場';
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(stock);
    });

    const treeData = Object.keys(groups).map(groupName => {
      const children = groups[groupName].map(s => {
        const val = metricKey === 'turnover'
          ? Math.max(10, s.turnover)
          : Math.max(100, s.marketCap);

        const changeSign = s.changePct > 0 ? `+${s.changePct.toFixed(2)}%` : `${s.changePct.toFixed(2)}%`;

        return {
          name: `${s.name}\n${s.price.toFixed(2)}\n${changeSign}`,
          value: val,
          rawStock: s,
          itemStyle: {
            color: getHeatmapColor(s.changePct),
            borderColor: 'rgba(15, 23, 42, 0.8)',
            borderWidth: 1.5,
            gapWidth: 2
          }
        };
      });

      return {
        name: groupName,
        children: children,
        itemStyle: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 2,
          gapWidth: 3
        }
      };
    });

    return treeData;
  }

  // 渲染 Treemap
  function render(stocks, metric = 'marketCap', subFilter = 'ALL') {
    if (!chartInstance) return;

    currentStockData = stocks;
    currentMetric = metric;
    currentSubFilter = subFilter;

    const seriesData = formatData(stocks, metric, subFilter);

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.92)',
        borderColor: 'rgba(59, 130, 246, 0.4)',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: '#f8fafc', fontSize: 13, fontFamily: 'Outfit, sans-serif' },
        formatter: params => {
          const s = params.data && params.data.rawStock;
          if (!s) return params.name;
          const sign = s.changePct > 0 ? '+' : '';
          const color = s.changePct > 0 
            ? (colorScheme === 'tw' ? '#ef4444' : '#10b981')
            : (colorScheme === 'tw' ? '#10b981' : '#ef4444');
          return `
            <div style="font-weight: 700; margin-bottom: 4px; font-size: 14px;">${s.name} (${s.ticker})</div>
            <div style="color: #94a3b8; font-size: 12px; margin-bottom: 6px;">產業：${s.sub}</div>
            <div style="display: flex; justify-content: space-between; gap: 16px;">
              <span>當前股價：</span>
              <strong style="font-family: monospace;">$${s.price.toFixed(2)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 16px;">
              <span>當日漲跌：</span>
              <strong style="color: ${color}; font-family: monospace;">${sign}${s.changePct.toFixed(2)}%</strong>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 16px;">
              <span>估計市值：</span>
              <span style="font-family: monospace;">$${s.marketCap.toLocaleString()} 億</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 16px;">
              <span>今日成交額：</span>
              <span style="font-family: monospace;">$${s.turnover.toLocaleString()} 億</span>
            </div>
          `;
        }
      },
      series: [
        {
          type: 'treemap',
          width: '100%',
          height: '100%',
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          label: {
            show: true,
            formatter: '{b}',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: 13,
            lineHeight: 18,
            textShadowColor: 'rgba(0, 0, 0, 0.65)',
            textShadowBlur: 4
          },
          upperLabel: {
            show: true,
            height: 24,
            color: '#cbd5e1',
            fontSize: 11,
            fontWeight: 600,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            padding: [0, 8]
          },
          itemStyle: {
            borderColor: 'rgba(15, 23, 42, 0.9)',
            borderWidth: 2,
            gapWidth: 2
          },
          levels: [
            {
              itemStyle: {
                borderColor: '#0f172a',
                borderWidth: 2,
                gapWidth: 3
              }
            },
            {
              colorSaturation: [0.35, 0.7],
              itemStyle: {
                borderColorSaturation: 0.6,
                gapWidth: 2
              }
            }
          ],
          data: seriesData
        }
      ]
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
    resize
  };
})();

/**
 * ApexFinance 強弱漲跌排行與產業動能模組
 * 包含：動態榜單（漲幅榜、跌幅榜、成交額榜）與產業強弱輪動條形圖
 */

const RankingModule = (() => {
  let sectorChartInstance = null;
  let currentStockList = [];
  let currentRankType = 'gainers'; // 'gainers', 'losers', 'volume'
  let colorScheme = 'tw';
  let onSelectStockCallback = null;

  function init(sectorContainerId, onStockSelected) {
    onSelectStockCallback = onStockSelected;
    const container = document.getElementById(sectorContainerId);
    if (container) {
      sectorChartInstance = echarts.init(container, null, { renderer: 'canvas' });
      window.addEventListener('resize', () => {
        if (sectorChartInstance) sectorChartInstance.resize();
      });
    }
  }

  function setColorScheme(scheme) {
    colorScheme = scheme;
    renderRankingList(currentRankType);
    renderSectorChart();
  }

  function setStocks(stocks) {
    currentStockList = stocks;
    renderRankingList(currentRankType);
    renderSectorChart();
  }

  function renderRankingList(type = 'gainers') {
    currentRankType = type;
    const listEl = document.getElementById('ranking-list-container');
    if (!listEl || currentStockList.length === 0) return;

    let sorted = [...currentStockList];
    if (type === 'gainers') {
      sorted.sort((a, b) => b.changePct - a.changePct);
    } else if (type === 'losers') {
      sorted.sort((a, b) => a.changePct - b.changePct);
    } else if (type === 'volume') {
      sorted.sort((a, b) => b.turnover - a.turnover);
    }

    const topList = sorted.slice(0, 10);
    const upColorClass = colorScheme === 'tw' ? 'up' : 'down'; // tw: red=up
    const downColorClass = colorScheme === 'tw' ? 'down' : 'up';

    listEl.innerHTML = topList.map((s, index) => {
      const isPositive = s.changePct >= 0;
      const badgeClass = isPositive ? upColorClass : downColorClass;
      const sign = isPositive ? '+' : '';
      const topNumClass = index === 0 ? 'top1' : (index === 1 ? 'top2' : (index === 2 ? 'top3' : ''));

      return `
        <div class="rank-item" data-ticker="${s.ticker}">
          <div class="rank-left">
            <span class="rank-number ${topNumClass}">0${index + 1}</span>
            <div class="rank-info">
              <span class="rank-ticker">${s.ticker}</span>
              <span class="rank-name">${s.name}</span>
            </div>
          </div>
          <div class="rank-right">
            <span class="rank-price">$${s.price.toFixed(2)}</span>
            <span class="rank-badge ${badgeClass}">${sign}${s.changePct.toFixed(2)}%</span>
          </div>
        </div>
      `;
    }).join('');

    // 綁定點擊事件
    listEl.querySelectorAll('.rank-item').forEach(itemEl => {
      itemEl.addEventListener('click', () => {
        const ticker = itemEl.getAttribute('data-ticker');
        const target = currentStockList.find(s => s.ticker === ticker);
        if (target && typeof onSelectStockCallback === 'function') {
          onSelectStockCallback(target);
        }
      });
    });
  }

  // 繪製產業強弱與資金動能對比條形圖
  function renderSectorChart() {
    if (!sectorChartInstance || currentStockList.length === 0) return;

    // 計算各產業子分類的平均漲跌幅與累積成交額
    const sectorMap = {};
    currentStockList.forEach(s => {
      const key = s.sub || '其他';
      if (!sectorMap[key]) {
        sectorMap[key] = { count: 0, totalPct: 0, totalTurnover: 0 };
      }
      sectorMap[key].count += 1;
      sectorMap[key].totalPct += s.changePct;
      sectorMap[key].totalTurnover += s.turnover;
    });

    const categories = Object.keys(sectorMap);
    const avgPcts = categories.map(k => {
      return parseFloat((sectorMap[k].totalPct / sectorMap[k].count).toFixed(2));
    });

    const upColor = colorScheme === 'tw' ? '#ef4444' : '#10b981';
    const downColor = colorScheme === 'tw' ? '#10b981' : '#ef4444';

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(15, 23, 42, 0.94)',
        borderColor: 'rgba(59, 130, 246, 0.4)',
        borderWidth: 1,
        textStyle: { color: '#f8fafc', fontSize: 12 },
        formatter: params => {
          const p = params[0];
          const sign = p.value >= 0 ? '+' : '';
          return `
            <div style="font-weight: 700; color: #60a5fa;">${p.name} 板塊</div>
            <div style="margin-top: 4px;">平均漲跌幅：<strong>${sign}${p.value}%</strong></div>
          `;
        }
      },
      grid: {
        left: '20%',
        right: '15%',
        top: '10%',
        bottom: '10%'
      },
      xAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 11,
          formatter: '{value}%'
        }
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
        axisTick: { show: false },
        axisLabel: { color: '#cbd5e1', fontSize: 12, fontWeight: 500 }
      },
      series: [
        {
          name: '板塊平均漲跌',
          type: 'bar',
          data: avgPcts.map(val => ({
            value: val,
            itemStyle: {
              color: val >= 0 ? upColor : downColor,
              borderRadius: val >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4]
            }
          })),
          label: {
            show: true,
            position: 'right',
            formatter: params => `${params.value >= 0 ? '+' : ''}${params.value}%`,
            color: '#94a3b8',
            fontSize: 11
          }
        }
      ]
    };

    sectorChartInstance.setOption(option, true);
  }

  function resize() {
    if (sectorChartInstance) sectorChartInstance.resize();
  }

  return {
    init,
    setStocks,
    renderRankingList,
    setColorScheme,
    resize
  };
})();

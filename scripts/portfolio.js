/**
 * ApexFinance 資產配置與投資組合分析模組
 * 包含：環形資產權重圖 (Doughnut Chart)、當日損益結算與市場曝險分析
 */

const PortfolioModule = (() => {
  let pieChartInstance = null;

  const defaultPortfolio = [
    { name: '台股半導體龍頭 (TSMC/聯發科)', value: 5500000, pct: '42.8%' },
    { name: '美股科技巨擘 (NVDA/MSFT/AAPL)', value: 4200000, pct: '32.7%' },
    { name: '台美金融高股息金控 (富邦/JPM)', value: 1650000, pct: '12.8%' },
    { name: '國際主要指數 ETF (標普500/日經225)', value: 850000, pct: '6.6%' },
    { name: '航運與傳產核心 (長榮/台塑)', value: 650000, pct: '5.1%' }
  ];

  function init(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    pieChartInstance = echarts.init(container, null, { renderer: 'canvas' });
    render();

    window.addEventListener('resize', () => {
      if (pieChartInstance) pieChartInstance.resize();
    });
  }

  function render() {
    if (!pieChartInstance) return;

    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4'];

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.94)',
        borderColor: 'rgba(59, 130, 246, 0.4)',
        borderWidth: 1,
        textStyle: { color: '#f8fafc', fontSize: 12 },
        formatter: params => {
          return `
            <div style="font-weight: 700; color: #60a5fa;">${params.name}</div>
            <div style="margin-top: 4px;">投資金額：$${params.value.toLocaleString()} NTD</div>
            <div>佔比份額：<strong>${params.percent}%</strong></div>
          `;
        }
      },
      legend: {
        orient: 'vertical',
        bottom: '0%',
        left: 'center',
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { color: '#94a3b8', fontSize: 11 }
      },
      series: [
        {
          name: '資產權重配置',
          type: 'pie',
          radius: ['42%', '70%'],
          center: ['50%', '42%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#0f172a',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
              color: '#f8fafc',
              formatter: '{b}\n{d}%'
            }
          },
          labelLine: { show: false },
          data: defaultPortfolio.map((item, idx) => ({
            name: item.name,
            value: item.value,
            itemStyle: { color: colors[idx % colors.length] }
          }))
        }
      ]
    };

    pieChartInstance.setOption(option, true);
  }

  function resize() {
    if (pieChartInstance) pieChartInstance.resize();
  }

  return {
    init,
    render,
    resize
  };
})();

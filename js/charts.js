// Chart.js rendering
let radarChart = null, trendChart = null;

function renderRadarChart(data) {
  const ctx = document.getElementById('radar-chart');
  if (!ctx) return;
  if (radarChart) radarChart.destroy();
  radarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Logic', 'Clarity', 'Persuasion', 'Evidence', 'Structure'],
      datasets: [{
        data: [data.logic, data.clarity, data.persuasion, data.evidence, data.structure],
        backgroundColor: 'rgba(6,182,212,0.15)',
        borderColor: '#06b6d4',
        borderWidth: 2,
        pointBackgroundColor: '#06b6d4',
        pointRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true, max: 100,
          grid: { color: 'rgba(255,255,255,0.06)' },
          angleLines: { color: 'rgba(255,255,255,0.06)' },
          pointLabels: { color: '#a0a0b8', font: { size: 12, weight: 500 } },
          ticks: { display: false }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function renderTrendChart(data) {
  const ctx = document.getElementById('trend-chart');
  if (!ctx) return;
  if (trendChart) trendChart.destroy();
  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => '#' + d.debate),
      datasets: [
        { label: 'Score', data: data.map(d => d.score), borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.1)', tension: 0.4, borderWidth: 2, pointRadius: 4, fill: true },
        { label: 'Logic', data: data.map(d => d.logic), borderColor: '#8b5cf6', borderDash: [5,5], tension: 0.4, borderWidth: 1.5, pointRadius: 0 },
        { label: 'Clarity', data: data.map(d => d.clarity), borderColor: '#30d158', borderDash: [5,5], tension: 0.4, borderWidth: 1.5, pointRadius: 0 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b6b85', font: { size: 11 } } },
        y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b6b85', font: { size: 11 } } }
      },
      plugins: {
        legend: { labels: { color: '#a0a0b8', usePointStyle: true, pointStyle: 'line', font: { size: 11 } } },
        tooltip: { backgroundColor: 'rgba(18,18,26,0.9)', titleColor: '#f0f0f5', bodyColor: '#a0a0b8', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }
      }
    }
  });
}

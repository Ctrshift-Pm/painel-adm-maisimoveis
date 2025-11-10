<script lang="ts">
  import { onMount, onDestroy, afterUpdate } from 'svelte';
  import { Chart, registerables, type ChartConfiguration } from 'chart.js';

  Chart.register(...registerables);

  export let data: { date: string; count: number }[] = [];

  let canvasElement: HTMLCanvasElement | null = null;
  let chart: Chart | null = null;

  function getChartData() {
    return {
      labels: data.map((item) =>
        new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      ),
      datasets: [
        {
          label: 'Novos Imóveis Cadastrados',
          data: data.map((item) => item.count),
          fill: false,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.2,
        },
      ],
    };
  }

  const options: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Novos Imóveis (Últimos 30 dias)' },
      tooltip: {
        callbacks: {
          label: (context) => `${context.formattedValue} imóveis`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  function initializeChart() {
    if (!canvasElement) return;
    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;

    chart = new Chart(ctx, {
      type: 'line',
      data: getChartData(),
      options,
    });
  }

  onMount(() => {
    initializeChart();
  });

  afterUpdate(() => {
    if (chart) {
      chart.data = getChartData();
      chart.update();
    }
  });

  onDestroy(() => {
    chart?.destroy();
    chart = null;
  });
</script>

<div class="h-80 w-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
  <canvas bind:this={canvasElement} aria-label="Gráfico de linha: novos imóveis cadastrados"></canvas>
</div>

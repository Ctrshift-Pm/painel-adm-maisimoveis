<script lang="ts">
  import { onMount, onDestroy, afterUpdate } from 'svelte';
  import { Chart, registerables, type ChartData } from 'chart.js';

  Chart.register(...registerables);

  export let data: { status: string; count: number }[] = [];

  let canvasElement: HTMLCanvasElement | null = null;
  let chart: Chart | null = null;

  const STATUS_LABELS: Record<string, string> = {
    pending_approval: 'Pendentes',
    approved: 'Aprovados',
    rejected: 'Rejeitados',
    sold: 'Vendidos',
    rented: 'Alugados',
  };

  const STATUS_COLORS: Record<string, string> = {
    pending_approval: 'rgba(255, 206, 86, 0.7)',
    approved: 'rgba(75, 192, 192, 0.7)',
    rejected: 'rgba(255, 99, 132, 0.7)',
    sold: 'rgba(54, 162, 235, 0.7)',
    rented: 'rgba(153, 102, 255, 0.7)',
  };

  function getChartData(): ChartData<'pie', number[], string> {
    const labels = data.map((item) => STATUS_LABELS[item.status] ?? item.status);
    const datasetValues = data.map((item) => item.count);
    const colors = data.map(
      (item, index) => STATUS_COLORS[item.status] ?? `rgba(0, 0, 0, ${0.3 + (index % 5) * 0.1})`
    );

    return {
      labels,
      datasets: [
        {
          label: 'Imóveis',
          data: datasetValues,
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 1,
        },
      ],
    };
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Imóveis por Status' },
    },
  };

  function initializeChart() {
    if (!canvasElement) return;
    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;

    chart = new Chart(ctx, {
      type: 'pie',
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
  <canvas bind:this={canvasElement} aria-label="Gráfico de pizza: imóveis por status"></canvas>
</div>

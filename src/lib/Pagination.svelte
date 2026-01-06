<script lang="ts">
    export let currentPage: number;
    export let totalPages: number;
    export let totalItems: number;
    export let itemsPerPage: number;

    $: safeTotalPages = Math.max(1, totalPages || 1);
    $: safeCurrentPage = Math.min(Math.max(currentPage, 1), safeTotalPages);
    $: startItem = totalItems > 0 ? (safeCurrentPage - 1) * itemsPerPage + 1 : 0;
    $: endItem = Math.min(safeCurrentPage * itemsPerPage, totalItems);
    $: rangeStart = Math.max(1, safeCurrentPage - 2);
    $: rangeEnd = Math.min(safeTotalPages, safeCurrentPage + 2);
    $: pageRange = Array.from({ length: rangeEnd - rangeStart + 1 }, (_, i) => rangeStart + i);
    $: showLeftEllipsis = rangeStart > 1;
    $: showRightEllipsis = rangeEnd < safeTotalPages;

    function goToFirst() {
        currentPage = 1;
    }

    function goToLast() {
        currentPage = safeTotalPages;
    }

    function goToPrev() {
        if (safeCurrentPage > 1) {
            currentPage = safeCurrentPage - 1;
        }
    }

    function goToNext() {
        if (safeCurrentPage < safeTotalPages) {
            currentPage = safeCurrentPage + 1;
        }
    }
</script>

<div class="mt-4 flex flex-col md:flex-row items-center justify-between text-sm text-gray-700 dark:text-gray-300">
    <p class="mb-2 md:mb-0">
        A mostrar <strong>{startItem}</strong> a <strong>{endItem}</strong> de <strong>{totalItems}</strong> entradas
    </p>
    {#if safeTotalPages > 1}
        <div class="flex items-center gap-1">
            <button
                class="px-2 py-1 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 disabled:opacity-50 transition-colors"
                aria-label="Primeira pagina"
                disabled={safeCurrentPage === 1}
                on:click={goToFirst}
            >
                &lt;&lt;
            </button>
            <button
                class="px-2 py-1 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 disabled:opacity-50 transition-colors"
                aria-label="Pagina anterior"
                disabled={safeCurrentPage === 1}
                on:click={goToPrev}
            >
                &lt;
            </button>

            {#if showLeftEllipsis}
                <span class="px-2 text-gray-500 dark:text-gray-400">...</span>
            {/if}

            {#each pageRange as page}
                <button
                    class="px-2 py-1 rounded-md border text-sm transition-colors {page === safeCurrentPage ? 'bg-green-600 text-white border-green-600' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'}"
                    aria-current={page === safeCurrentPage ? 'page' : undefined}
                    on:click={() => (currentPage = page)}
                >
                    {page}
                </button>
            {/each}

            {#if showRightEllipsis}
                <span class="px-2 text-gray-500 dark:text-gray-400">...</span>
            {/if}

            <button
                class="px-2 py-1 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 disabled:opacity-50 transition-colors"
                aria-label="Proxima pagina"
                disabled={safeCurrentPage === safeTotalPages}
                on:click={goToNext}
            >
                &gt;
            </button>
            <button
                class="px-2 py-1 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 disabled:opacity-50 transition-colors"
                aria-label="Ultima pagina"
                disabled={safeCurrentPage === safeTotalPages}
                on:click={goToLast}
            >
                &gt;&gt;
            </button>
        </div>
    {/if}
</div>

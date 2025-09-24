<script lang="ts">
    import type { Broker } from './types';
    import { createEventDispatcher } from 'svelte';

    export let pendingBrokers: Broker[] = [];
    const dispatch = createEventDispatcher();

    function handleVerification(brokerId: number, status: 'approved' | 'rejected') {
        dispatch('verify', { brokerId, status });
    }

    function getStatusText(status: string) {
        const statusMap: Record<string, string> = {
            'pending_verification': 'Pendente',
            'approved': 'Aprovado', 
            'rejected': 'Rejeitado'
        };
        return statusMap[status] || status;
    }

    function getStatusClasses(status: string) {
        const statusMap: Record<string, string> = {
            'approved': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
            'rejected': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
            'pending_verification': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
        };
        return statusMap[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
</script>

<div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ID</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Nome</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">CRECI</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Documentos</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ações</th>
            </tr>
        </thead>
        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {#if pendingBrokers.length === 0}
                <tr>
                    <td colspan="6" class="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                        Nenhuma solicitação de verificação pendente.
                    </td>
                </tr>
            {:else}
                {#each pendingBrokers as broker}
                    <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td class="px-6 py-4 whitespace-nowrap text-sm">{broker.id}</td>
                        <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                            {broker.name}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">{broker.creci}</td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold {getStatusClasses(broker.status)}">
                                {getStatusText(broker.status)}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex flex-col space-y-1">
                                {#if broker.creci_front_url}
                                    <a href={broker.creci_front_url} target="_blank" 
                                       class="text-green-600 hover:text-green-800 dark:text-green-400 text-sm">
                                        📄 Frente do CRECI
                                    </a>
                                {/if}
                                {#if broker.creci_back_url}
                                    <a href={broker.creci_back_url} target="_blank"
                                       class="text-green-600 hover:text-green-800 dark:text-green-400 text-sm">
                                        📄 Verso do CRECI
                                    </a>
                                {/if}
                                {#if broker.selfie_url}
                                    <a href={broker.selfie_url} target="_blank"
                                       class="text-green-600 hover:text-green-800 dark:text-green-400 text-sm">
                                        📸 Selfie
                                    </a>
                                {/if}
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap space-x-2">
                            <button on:click={() => handleVerification(broker.id, 'approved')}
                                    class="bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600 text-sm font-medium">
                                ✅ Aprovar
                            </button>
                            <button on:click={() => handleVerification(broker.id, 'rejected')}
                                    class="bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600 text-sm font-medium">
                                ❌ Rejeitar
                            </button>
                        </td>
                    </tr>
                {/each}
            {/if}
        </tbody>
    </table>
</div>
ï»¿<script lang="ts">
    import Sidebar from './Sidebar.svelte';
    import Header from './Header.svelte';
    import Table from './Table.svelte';
    import Modal from './Modal.svelte';
    import Pagination from './Pagination.svelte';
    import FilterControls from './FilterControls.svelte';
    import KpiCard from './KpiCard.svelte';
    import VerificationTable from './VerificationTable.svelte';
    import PropertyManagement from './PropertyManagement.svelte';
    import BrokerManagement from './BrokerManagement.svelte';
    import BrokerRequests from './components/BrokerRequests.svelte';
    import SendNotification from './components/SendNotification.svelte';
    import StatusPieChart from './components/charts/StatusPieChart.svelte';
    import NewPropertiesLineChart from './components/charts/NewPropertiesLineChart.svelte';
    import { navigate } from 'svelte-routing';
    import { baseURL } from './api';
    import { authToken } from './store';
    import { onMount } from 'svelte';
    import type { Property, Broker, User, View, DataItem, ViewConfig } from './types';
    
    export let initialView: View = 'dashboard';

    let activeView: View = 'dashboard';
    let hasAppliedInitialView = false;
    let allData: DataItem[] = [];
    let headers: string[] = [];
    let isLoading: boolean = true;
    let showModal = false;
    let itemToDelete: { id: number; type: string } | null = null;
    let isSidebarOpen = false;

    let searchTerm = '';
    let searchColumn = 'all';
    let itemsPerPage = 10;
    let currentPage = 1;
    let totalItems = 0;
    let statusFilter = '';
    
    // Estado para ediÃƒÂ§ÃƒÂ£o
    let editingId: number | null = null;
    let editableItemData: Partial<DataItem> = {};

    // Estados para feedback visual
    let isSaving = false;
    let saveMessage = '';
    let saveMessageType: 'success' | 'error' = 'success';

    // Estados para ordenaÃƒÂ§ÃƒÂ£o
    let sortBy = 'id';
    let sortOrder = 'desc';
    
    interface Stats {
        totalProperties: number;
        totalBrokers: number;
        totalUsers: number;
    }
    let stats: Stats | null = null;

    interface DashboardChartData {
        propertiesByStatus: { status: string; count: number }[];
        newPropertiesOverTime: { date: string; count: number }[];
    }
    let chartData: DashboardChartData | null = null;
    let isChartLoading = false;
    let chartError: string | null = null;

    // Estado para dados de verificaÃƒÂ§ÃƒÂ£o
    let pendingBrokers: Broker[] = [];

    const API_URL = baseURL;

    const viewConfig: Record<View, ViewConfig> = {
        dashboard: { 
            title: 'Dashboard'
        },
        properties: { 
            endpoint: '/admin/properties-with-brokers', 
            title: 'Gerenciamento de ImÃƒÂ³veis', 
            headers: ['ID', 'CÃƒÂ³digo', 'TÃƒÂ­tulo', 'Tipo', 'Status', 'PreÃƒÂ§o', 'Cidade', 'Corretor'],
            filterOptions: [ { value: 'p.id', label: 'ID' }, { value: 'p.code', label: 'CÃƒÂ³digo' }, { value: 'p.title', label: 'TÃƒÂ­tulo' } ],
            sortColumn: 'p.title'
        },
        brokers: { 
            endpoint: '/admin/brokers', 
            title: 'Gerenciamento de Corretores', 
            headers: ['ID', 'Nome', 'Email', 'CRECI', 'Status', 'Criado em', 'Total de ImÃƒÂ³veis'],
            filterOptions: [ { value: 'name', label: 'Nome' }, { value: 'email', label: 'Email' } ],
            sortColumn: 'name'
        },
        broker_requests: { 
            title: 'Solicitações de Corretores'
        },
        clients: { 
            endpoint: '/admin/clients', 
            title: 'Gerenciamento de Clientes', 
            headers: ['ID', 'Nome', 'Email', 'Telefone', 'Criado em'],
            filterOptions: [ { value: 'name', label: 'Nome' }, { value: 'email', label: 'Email' } ],
            sortColumn: 'name'
        },
        notifications: {
            title: 'NotificaÃ§Ãµes'
        },
        verification: { 
            endpoint: '/admin/brokers/pending', 
            title: 'SolicitaÃƒÂ§ÃƒÂµes de VerificaÃƒÂ§ÃƒÂ£o', 
            headers: ['ID', 'Nome', 'CRECI', 'Documentos', 'AÃƒÂ§ÃƒÂµes'],
            filterOptions: [] 
        }
    };

    // FunÃƒÂ§ÃƒÂ£o helper para obter configuraÃƒÂ§ÃƒÂ£o da view com fallback seguro
    function getViewConfig(view: View): ViewConfig {
        return viewConfig[view] || { title: 'Dashboard' };
    }

    // FunÃƒÂ§ÃƒÂ£o para verificar se a view ÃƒÂ© vÃƒÂ¡lida
    function isValidView(view: string): view is View {
        return view in viewConfig;
    }

    $: if (!hasAppliedInitialView) {
        activeView = isValidView(initialView) ? initialView : 'dashboard';
        hasAppliedInitialView = true;
    }

    let debounceTimer: NodeJS.Timeout;
    async function fetchData() {
        isLoading = true;

        if (activeView === 'properties' || activeView === 'brokers' || activeView === 'broker_requests') {
            headers = [];
            allData = [];
            totalItems = 0;
            isLoading = false;
            return;
        }

        const token = localStorage.getItem('authToken');
        if (!token) {
            authToken.set(null);
            return;
        }
        
        if (activeView === 'dashboard') {
            try {
                const response = await fetch(`${API_URL}/admin/dashboard/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Falha ao buscar estatÃƒÂ­sticas');
                stats = await response.json();
            } catch (error) {
                console.error("Erro ao buscar estatÃƒÂ­sticas do dashboard:", error);
                stats = null;
            } finally {
                isLoading = false;
            }
            return;
        }

        if (activeView === 'verification') {
            try {
                const config = getViewConfig(activeView);
                const response = await fetch(`${API_URL}${config.endpoint}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!response.ok) throw new Error('Falha ao buscar solicitaÃƒÂ§ÃƒÂµes pendentes');
                
                const result = await response.json();
                pendingBrokers = result.data || result;
                
            } catch (error) {
                console.error("Erro ao buscar solicitaÃƒÂ§ÃƒÂµes de verificaÃƒÂ§ÃƒÂ£o:", error);
                pendingBrokers = [];
            } finally {
                isLoading = false;
            }
            return;
        }

        const config = getViewConfig(activeView);
        if (!config.endpoint) {
            isLoading = false;
            return;
        }

        const params = new URLSearchParams({
            page: String(currentPage),
            limit: String(itemsPerPage),
            search: searchTerm,
            searchColumn: searchColumn,
            sortBy: sortBy,
            sortOrder: sortOrder,
        });

        if (activeView === 'clients' && statusFilter) {
            params.append('status', statusFilter);
        }

        try {
            const response = await fetch(`${API_URL}${config.endpoint}?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Falha na autenticaÃƒÂ§ÃƒÂ£o');
            
            const result = await response.json();
            allData = result.data || result;
            totalItems = result.total || result.length;
            headers = config.headers || [];
        } catch (error) {
            console.error(`Erro ao buscar dados de ${activeView}:`, error);
            authToken.set(null);
        } finally {
            isLoading = false;
        }
    }

    async function fetchChartData() {
        isChartLoading = true;
        chartError = null;

        const token = localStorage.getItem('authToken');
        if (!token) {
            authToken.set(null);
            isChartLoading = false;
            return;
        }

        try {
            const response = await fetch(`${API_URL}/admin/stats/dashboard`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || 'Falha ao buscar estatisticas.');
            }

            const payload = await response.json();
            const propertiesByStatus = Array.isArray(payload?.propertiesByStatus)
                ? payload.propertiesByStatus.map((item: any) => ({
                    status: String(item?.status ?? 'desconhecido'),
                    count: Number(item?.count ?? 0),
                }))
                : [];

            const newPropertiesOverTime = Array.isArray(payload?.newPropertiesOverTime)
                ? payload.newPropertiesOverTime.map((item: any) => ({
                    date: String(item?.date ?? ''),
                    count: Number(item?.count ?? 0),
                }))
                : [];

            chartData = {
                propertiesByStatus,
                newPropertiesOverTime,
            };
        } catch (error) {
            console.error('Erro ao buscar estatisticas do dashboard:', error);
            chartError = 'Nao foi possivel carregar os graficos.';
            chartData = null;
        } finally {
            isChartLoading = false;
        }
    }

    function changeView(newView: View) {
        if (!isValidView(newView)) {
            console.error('Invalid view: ' + newView);
            newView = 'dashboard';
        }

        activeView = newView;

        if (typeof window !== 'undefined') {
            if (newView === 'properties') {
                navigate('/admin/properties', { replace: true });
            } else if (window.location.pathname === '/admin/properties') {
                navigate('/', { replace: true });
            }
        }

        isSidebarOpen = false;
        searchTerm = '';
        searchColumn = 'all';
        currentPage = 1;
        statusFilter = '';
        sortBy = 'id';
        sortOrder = 'desc';
        fetchData();
        if (newView === 'dashboard') {
            fetchChartData();
        }
    }

    function handleSortToggle() {
        if (activeView === 'dashboard' || activeView === 'verification' || activeView === 'properties' || activeView === 'brokers') return;
        const config = getViewConfig(activeView);
        if (!config.sortColumn) return;

        const alphaSortColumn = config.sortColumn;

        if (sortBy === alphaSortColumn) {
            sortBy = 'id';
            sortOrder = 'desc';
        } else {
            sortBy = alphaSortColumn;
            sortOrder = 'asc';
        }
        // Aplica imediatamente
        currentPage = 1;
        fetchData();
    }

    function openDeleteModal(detail: { id: number; type: string }) {
        itemToDelete = detail;
        showModal = true;
    }

    async function handleDeleteConfirm() {
        if (!itemToDelete) return;
        const token = localStorage.getItem('authToken');
        const { id, type } = itemToDelete;
        
        const endpoint = type === 'property' 
            ? `/admin/properties/${id}` 
            : `/admin/${type}s/${id}`;

        try {
            await fetch(`${API_URL}${endpoint}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchData();
        } catch (error) {
            console.error(`Erro ao deletar item:`, error);
        } finally {
            showModal = false;
            itemToDelete = null;
        }
    }

    async function handleSave(event: CustomEvent<{ id: number; data: Partial<DataItem>, type: string }>) {
        const { id, data, type } = event.detail;
        const token = localStorage.getItem('authToken');

        isSaving = true;

        const endpoint = type === 'property' 
            ? `/admin/properties/${id}` 
            : type === 'broker'
            ? `/admin/brokers/${id}`
            : `/admin/clients/${id}`;

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Erro do servidor:", errorText);
                throw new Error('Falha ao salvar. Verifique o console para mais detalhes.');
            }
            
            showSaveMessage('Dados salvos com sucesso!', 'success');
            await fetchData();

        } catch (error: any) {
            console.error(`Erro ao salvar o ${type}:`, error);
            showSaveMessage(`Erro: ${error.message}`, 'error');
        } finally {
            isSaving = false;
            handleEditCancel();
        }
    }

    function showSaveMessage(message: string, type: 'success' | 'error') {
        saveMessage = message;
        saveMessageType = type;
        setTimeout(() => {
            saveMessage = '';
        }, 3000);
    }

    function handleEditStart(event: CustomEvent<DataItem>) {
        editingId = event.detail.id;
        editableItemData = { ...event.detail };
    }

    function handleEditCancel() {
        editingId = null;
        editableItemData = {};
    }

    // FunÃƒÂ§ÃƒÂ£o para aprovar/rejeitar corretor
    async function handleVerification(event: CustomEvent<{ brokerId: number; status: 'approved' | 'rejected' }>) {
        const { brokerId, status } = event.detail;
        const token = localStorage.getItem('authToken');
        const endpoint = status === 'approved' 
            ? `/admin/brokers/${brokerId}/approve`
            : `/admin/brokers/${brokerId}/reject`;

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Falha na verificaÃƒÂ§ÃƒÂ£o');
            
            showSaveMessage(`Corretor ${status === 'approved' ? 'aprovado' : 'rejeitado'} com sucesso!`, 'success');
            fetchData();
            
        } catch (error) {
            console.error(`Erro ao ${status} corretor:`, error);
            showSaveMessage(`Erro ao ${status === 'approved' ? 'aprovar' : 'rejeitar'} corretor.`, 'error');
        }
    }

    onMount(() => {
        fetchData();
        fetchChartData();
    });

    function applyFilters() {
        currentPage = 1;
        fetchData();
    }

    // Ã¢Å“â€¦ Reatividade correta - separar os efeitos
    $: {
        // Efeito para busca e ordenaÃƒÂ§ÃƒÂ£o (com debounce)
        if (
            activeView !== 'properties' &&
            activeView !== 'brokers' &&
            (searchTerm !== '' || sortBy !== 'id' || sortOrder !== 'desc')
        ) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentPage = 1;
                fetchData();
            }, 500);
        }
    }

    // Ã¢Å“â€¦ Efeito separado para status filter (sem debounce)
    $: if (statusFilter !== '' && activeView !== 'properties' && activeView !== 'brokers') {
        currentPage = 1;
        fetchData();
    }

    // Ã¢Å“â€¦ Efeito separado para items per page
    $: if (itemsPerPage !== 10 && activeView !== 'properties' && activeView !== 'brokers') {
        currentPage = 1;
        fetchData();
    }

    // Ã¢Å“â€¦ FunÃƒÂ§ÃƒÂ£o especÃƒÂ­fica para status
    function setStatusFilter(status: string) {
        statusFilter = status;
        // Aplica imediatamente
        currentPage = 1;
        fetchData();
    }
    
    $: paginatedData = allData;
    $: totalPages = Math.ceil(totalItems / itemsPerPage);

</script>

<div class="relative flex min-h-screen bg-gray-50 dark:bg-gray-900">
    <Sidebar bind:isOpen={isSidebarOpen} {activeView} onNavigate={changeView} />

    <div class="flex-1 flex flex-col overflow-hidden lg:pl-64">
        <Header pageTitle={getViewConfig(activeView).title} onToggleSidebar={() => isSidebarOpen = !isSidebarOpen} />
        
        <main class="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
            {#if isLoading}
                <div class="flex justify-center items-center h-64">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                </div>
            {:else if activeView === 'dashboard'}

                <div class="space-y-6">

                    <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">

                        <KpiCard title="Total de Imoveis" value={stats?.totalProperties ?? 0} color="green" />

                        <KpiCard title="Total de Corretores" value={stats?.totalBrokers ?? 0} color="blue" />

                        <KpiCard title="Total de Clientes" value={stats?.totalUsers ?? 0} color="yellow" />

                    </div>



                    <section class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">

                        <div class="border-b border-gray-200 px-6 py-4 dark:border-gray-800">

                            <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Painel de desempenho</h2>

                            <p class="text-sm text-gray-500 dark:text-gray-400">

                                Acompanhe a distribuicao por status e o volume de novos imoveis cadastrados.

                            </p>

                        </div>

                        <div class="p-6">

                            {#if isChartLoading}

                                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-300">

                                    <span class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent dark:border-gray-600"></span>

                                    Carregando graficos...

                                </div>

                            {:else if chartError}

                                <p class="text-sm text-red-500">{chartError}</p>

                            {:else if chartData}

                                <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">

                                    <StatusPieChart data={chartData.propertiesByStatus} />

                                    <NewPropertiesLineChart data={chartData.newPropertiesOverTime} />

                                </div>

                            {:else}

                                <p class="text-sm text-gray-500 dark:text-gray-400">Nenhum dado de estatistica encontrado.</p>

                            {/if}

                        </div>

                    </section>

                </div>

            

{:else if activeView === 'verification'}
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                    <div class="p-4 border-b dark:border-gray-700">
                        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">SolicitaÃƒÂ§ÃƒÂµes de VerificaÃƒÂ§ÃƒÂ£o de Corretores</h2>
                        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {pendingBrokers.length} solicitaÃƒÂ§ÃƒÂ£o(ÃƒÂµes) pendente(s)
                        </p>
                    </div>
                    
                    {#if saveMessage}
                        <div class="p-4 border-b dark:border-gray-700">
                            <div class="p-3 rounded-md text-white {saveMessageType === 'success' ? 'bg-green-500' : 'bg-red-500'}">
                                {saveMessage}
                            </div>
                        </div>
                    {/if}
                    
                    <VerificationTable 
                        {pendingBrokers}
                        on:verify={handleVerification}
                    />
                </div>
            {:else if activeView === 'properties'}
                <PropertyManagement />
            {:else if activeView === 'brokers'}
                <BrokerManagement />
            {:else if activeView === 'broker_requests'}
                <BrokerRequests />
            {:else if activeView === 'notifications'}
                <div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
                    <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                        <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Centro de NotificaÃ§Ãµes</h1>
                        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Envie mensagens manuais para usuÃ¡rios especÃ­ficos ou para todos os clientes da plataforma.</p>
                    </div>
                    <div class="p-6">
                        <SendNotification />
                    </div>
                </div>
            {:else}
                {@const config = getViewConfig(activeView)}
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                    <div class="p-4 border-b dark:border-gray-700 space-y-4">
                        <div class="flex flex-col sm:flex-row justify-between items-start gap-4">
                            {#if config.filterOptions && config.filterOptions.length > 0}
                                <FilterControls 
                                    bind:itemsPerPage
                                    bind:searchTerm
                                    bind:searchColumn
                                    filterOptions={config.filterOptions}
                                />
                            {/if}
                            <button on:click={handleSortToggle} class="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">
                                {#if sortBy === 'id'}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 13a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4Zm-2-1a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10ZM11.5 7h-1a.5.5 0 0 1 0-1h1a.5.5 0 0 1 0 1Zm-2-3h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1Zm-2 6h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1 0-1Z"/></svg>
                                    <span>Ordenar A-Z</span>
                                {:else}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"/><path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z"/></svg>
                                    <span>Ordem PadrÃƒÂ£o</span>
                                {/if}
                            </button>
                        </div>
                    </div>

                    {#if saveMessage}
                        <div class="p-4 border-b dark:border-gray-700">
                            <div class="p-3 rounded-md text-white {saveMessageType === 'success' ? 'bg-green-500' : 'bg-red-500'}">
                                {saveMessage}
                            </div>
                        </div>
                    {/if}
                    
                    <Table 
                        headers={config.headers || []} 
                        data={paginatedData} 
                        view={activeView}
                        bind:editingId
                        bind:editableItemData
                        {isSaving}
                        on:delete={(e) => openDeleteModal(e.detail)}
                        on:editStart={handleEditStart}
                        on:save={handleSave}
                        on:editCancel={handleEditCancel}
                    />
                    <div class="p-4 border-t dark:border-gray-700">
                        <Pagination 
                            bind:currentPage
                            {totalPages} 
                            {totalItems}
                            {itemsPerPage}
                        />
                    </div>
                </div>
            {/if}
        </main>
    </div>
</div>

{#if showModal}
    <Modal onConfirm={handleDeleteConfirm} onCancel={() => showModal = false}>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mt-5">Confirmar ExclusÃƒÂ£o</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-2 px-4 py-3">
            VocÃƒÂª tem certeza que deseja excluir o {itemToDelete?.type} de ID {itemToDelete?.id}?
        </p>
    </Modal>
{/if}


<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { api } from '$lib/apiClient';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Loader2 } from 'lucide-svelte';

  export let open = false;
  export let broker: any | null = null;

  let isProcessing = false;
  const dispatch = createEventDispatcher();
  let wasOpen = open;

  $: if (wasOpen && !open) {
    dispatch('close');
  }
  $: wasOpen = open;

  async function handleStatusUpdate(newStatus: 'rejected') {
    if (!broker) return;

    isProcessing = true;
    try {
      await api.patch(`/admin/brokers/${broker.id}/status`, { status: newStatus });
      toast.success('Corretor rejeitado.');

      dispatch('update');
      close();
    } catch (error) {
      console.error('Erro ao atualizar status do corretor:', error);
      toast.error('Falha ao atualizar status.');
    } finally {
      isProcessing = false;
    }
  }

  function close() {
    if (isProcessing) return;
    open = false;
  }

  async function handleDelete() {
    if (!broker) return;
    const confirmed = window.confirm('Deseja remover este corretor permanentemente?');
    if (!confirmed) return;

    isProcessing = true;
    try {
      await api.delete(`/admin/brokers/${broker.id}`);
      toast.success('Corretor excluido.');
      dispatch('update');
      close();
    } catch (error) {
      console.error('Erro ao excluir corretor:', error);
      toast.error('Falha ao excluir corretor.');
    } finally {
      isProcessing = false;
    }
  }
</script>

<Dialog.Root bind:open={open}>
  <Dialog.Content className="max-w-md">
    {#if broker}
      <Dialog.Header>
        <Dialog.Title className="text-2xl">Revisar Corretor</Dialog.Title>
        <Dialog.Description>
          Rejeite ou exclua o corretor <span class="font-semibold">{broker.name}</span>
        </Dialog.Description>
      </Dialog.Header>

      <div class="space-y-2 py-4 text-sm text-gray-700 dark:text-gray-300">
        <p><strong>Email:</strong> {broker.email}</p>
        <p><strong>Telefone:</strong> {broker.phone ?? 'N/A'}</p>
        <p><strong>CRECI:</strong> {broker.creci ?? 'N/A'}</p>
        <p><strong>Solicitado em:</strong> {broker.created_at ? new Date(broker.created_at).toLocaleDateString('pt-BR') : '-'}</p>
      </div>

      <Dialog.Footer className="flex gap-2">
        <Button variant="outline" on:click={close} disabled={isProcessing}>
          Cancelar
        </Button>
        <Button variant="destructive" className="bg-red-500 hover:bg-red-600 text-white" on:click={() => handleStatusUpdate('rejected')} disabled={isProcessing}>
          {#if isProcessing}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Rejeitar
        </Button>
        <Button className="bg-red-700 text-white hover:bg-red-800" on:click={handleDelete} disabled={isProcessing}>
          {#if isProcessing}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Excluir
        </Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>

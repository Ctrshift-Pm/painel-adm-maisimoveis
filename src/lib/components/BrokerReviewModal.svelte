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

  async function handleStatusUpdate(newStatus: 'approved' | 'rejected') {
    if (!broker) return;

    isProcessing = true;
    try {
      await api.patch(`/admin/brokers/${broker.id}/status`, { status: newStatus });
      toast.success(`Corretor ${newStatus === 'approved' ? 'aprovado' : 'rejeitado'}.`);

      dispatch('update');
      open = false;
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
</script>

<Dialog.Root bind:open={open}>
  <Dialog.Content className="max-w-md">
    {#if broker}
      <Dialog.Header>
        <Dialog.Title className="text-2xl">Revisar Solicitação</Dialog.Title>
        <Dialog.Description>
          Aprovar ou rejeitar o corretor <span class="font-semibold">{broker.name}</span>
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
        <Button variant="destructive" on:click={() => handleStatusUpdate('rejected')} disabled={isProcessing}>
          {#if isProcessing}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Rejeitar
        </Button>
        <Button className="bg-green-600 text-white hover:bg-green-700" on:click={() => handleStatusUpdate('approved')} disabled={isProcessing}>
          {#if isProcessing}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Aprovar
        </Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>

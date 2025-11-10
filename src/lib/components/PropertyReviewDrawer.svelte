<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { api } from '$lib/apiClient';
  import { Button } from '$lib/components/ui/button';
  import * as Drawer from '$lib/components/ui/drawer';
  import { Loader2 } from 'lucide-svelte';
  import type { Property, PropertyImage } from '$lib/types';

  export let open = false;
  export let property: Property | null = null;

  const dispatch = createEventDispatcher<{ update: void; close: void }>();
  let isProcessing = false;

  const formatCurrency = (value?: number | null) => {
    if (value == null || Number.isNaN(Number(value))) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
  };

  const normalizedImages = () => {
    if (!property?.images) return [];
    return property.images.map((image: PropertyImage | string, index) => {
      if (typeof image === 'string') {
        return { id: index, url: image };
      }
      return image;
    });
  };

  async function handleStatusUpdate(status: 'approved' | 'rejected') {
    if (!property) return;
    isProcessing = true;
    try {
      await api.patch(`/admin/properties/${property.id}/status`, { status });
      toast.success(`Imovel ${status === 'approved' ? 'aprovado' : 'rejeitado'} com sucesso.`);
      dispatch('update');
      closeDrawer();
    } catch (error) {
      console.error('Erro ao atualizar status do imovel:', error);
      toast.error('Nao foi possivel atualizar o status. Tente novamente.');
    } finally {
      isProcessing = false;
    }
  }

  function closeDrawer() {
    if (isProcessing) return;
    open = false;
    dispatch('close');
  }

  const statusLabelMap: Record<string, string> = {
    pending_approval: 'Pendente',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    rented: 'Alugado',
    sold: 'Vendido',
  };
</script>

<Drawer.Root bind:open direction="right" on:close={closeDrawer}>
  <Drawer.Content className="flex h-full w-full max-w-2xl flex-col bg-white dark:bg-gray-900">
    {#if property}
      <Drawer.Header className="p-4 border-b border-gray-200 dark:border-gray-800">
        <Drawer.Title className="text-2xl">{property.title}</Drawer.Title>
        <Drawer.Description>
          Status:
          <span class="font-semibold text-gray-900 dark:text-gray-100">
            {statusLabelMap[property.status] ?? property.status}
          </span>
        </Drawer.Description>
      </Drawer.Header>

      <div class="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Valor anunciado</p>
          <p class="text-3xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(property.price)}
          </p>
        </div>

        <section>
          <h3 class="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Galeria</h3>
          {#if normalizedImages().length > 0}
            <div class="flex gap-3 overflow-x-auto rounded-md bg-gray-50 p-3 dark:bg-gray-800/60">
              {#each normalizedImages() as image (image.id ?? image.url)}
                <img
                  src={image.url}
                  alt="Foto do imovel"
                  class="h-32 w-auto rounded-md object-cover shadow"
                  loading="lazy"
                />
              {/each}
            </div>
          {:else}
            <p class="text-sm text-gray-500 dark:text-gray-400">Nenhuma imagem cadastrada.</p>
          {/if}
        </section>

        <section>
          <h3 class="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Descricao</h3>
          <p class="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            {property.description ?? 'Sem descricao fornecida.'}
          </p>
        </section>

        <section>
          <h3 class="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Detalhes</h3>
          <ul class="grid grid-cols-1 gap-2 text-sm text-gray-700 dark:text-gray-300 md:grid-cols-2">
            <li><strong>Tipo:</strong> {property.type ?? 'N/A'}</li>
            <li><strong>Finalidade:</strong> {property.purpose ?? 'N/A'}</li>
            <li><strong>Quartos:</strong> {property.bedrooms ?? 'N/A'}</li>
            <li><strong>Banheiros:</strong> {property.bathrooms ?? 'N/A'}</li>
            <li><strong>Area construida:</strong> {property.area_construida ?? 'N/A'} m²</li>
            <li><strong>Quadra:</strong> {property.quadra ?? 'N/A'}</li>
            <li><strong>Lote:</strong> {property.lote ?? 'N/A'}</li>
            <li><strong>Cidade:</strong> {property.city ?? '-'} / {property.state ?? '-'}</li>
          </ul>
        </section>
      </div>

      <Drawer.Footer className="border-t border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" on:click={closeDrawer} disabled={isProcessing}>
            Cancelar
          </Button>

          {#if property.status !== 'rejected'}
            <Button variant="destructive" on:click={() => handleStatusUpdate('rejected')} disabled={isProcessing}>
              {#if isProcessing}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              Rejeitar
            </Button>
          {/if}

          {#if property.status !== 'approved'}
            <Button className="bg-green-600 text-white hover:bg-green-700" on:click={() => handleStatusUpdate('approved')} disabled={isProcessing}>
              {#if isProcessing}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              Aprovar
            </Button>
          {/if}
        </div>
      </Drawer.Footer>
    {/if}
  </Drawer.Content>
</Drawer.Root>

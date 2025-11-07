import * as XLSX from 'xlsx';

/**
 * Exporta um array de dados para um arquivo CSV.
 * @param data O array de objetos a ser exportado.
 * @param fileName O nome do arquivo (ex: 'imoveis.csv').
 */
export function exportToCsv(data: any[], fileName: string) {
  if (!data || data.length === 0) {
    console.warn('Nenhum dado para exportar.');
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');

  XLSX.writeFile(workbook, fileName, { bookType: 'csv' });
}

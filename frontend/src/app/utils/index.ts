/**
 * Extrai uma mensagem de erro padronizada a partir de um objeto de erro.
 */
export function extractErrorMessage(err: any): string {
  if (Array.isArray(err?.error?.errors)) {
    return err.error.errors.join(', ');
  }
  return err?.error?.error || err?.error?.message || 'Erro desconhecido';
}

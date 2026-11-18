// Ordenação alfabética de textos em pt-BR, ignorando acentos e maiúsculas.
const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })

/** Compara dois textos ignorando acentos e maiúsculas (A → Z). */
export function compararTexto(a: string | null | undefined, b: string | null | undefined): number {
  return collator.compare((a || '').trim(), (b || '').trim())
}

/** Converte uma data/hora em milissegundos (0 quando vazia ou inválida). */
export function tempoData(valor: string | null | undefined): number {
  if (!valor) return 0
  const t = new Date(valor).getTime()
  return Number.isNaN(t) ? 0 : t
}

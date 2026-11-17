// Valor da oportunidade do negócio: quando o contrato tem plano/valores
// preenchidos, vale o total calculado (implantação + mensal × prazo), gravado
// pelo hook server-side em deals.valor_total; sem esses dados, mantém o valor
// antigo (deals.value) para não quebrar negócios existentes.
export const valorOportunidade = (deal: { valor_total?: number; value: number }): number => {
  if (deal.valor_total && deal.valor_total > 0) return deal.valor_total
  return deal.value || 0
}

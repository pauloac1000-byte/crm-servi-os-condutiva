// Valor da oportunidade do negócio: total do contrato gravado pelo hook
// server-side em deals.valor_total (valor_mensal × prazo do CONTRATO
// vinculado, coleção contratos); 0 quando o contrato não tem valores.
export const valorOportunidade = (deal: { valor_total?: number }): number => deal.valor_total || 0

import type { KpiUnidade } from '@/services/kpis'

// GLOSSÁRIO DE INDICADORES — conteúdo centralizado em um único lugar, usado
// pelo ícone de informação dos cartões de KPI (KpisFaixa.tsx) e pela página
// Glossário (src/pages/Glossario.tsx). Os textos descrevem as fórmulas REAIS
// dos motores de cálculo (kpis.ts, custo-aquisicao.ts, mrr-nrr.ts e
// metas-acompanhamento.ts) — nada de regra duplicada aqui: quando a fórmula
// muda no motor, muda o texto deste glossário.

export interface IndicadorDoc {
  chave: string
  nome: string
  grupo: 'kpis' | 'custo' | 'receita' | 'metas'
  fórmula: string
  fonte: string
  meta: string
  leitura: string
}

export const INDICADORES: IndicadorDoc[] = [
  {
    chave: 'RCS',
    nome: 'RCS (Receita de Serviços Contratada)',
    grupo: 'kpis',
    fórmula:
      'Σ (valor_mensal × prazo em meses) dos contratos assinados no período. Prazo = data_fim − data_inicio ÷ 30,44 dias/mês, arredondado; sem data_fim, 12 meses.',
    fonte:
      'Coleções contratos (valor_mensal, data_inicio, data_fim, responsavel) — motor src/services/kpis.ts.',
    meta: 'Coleção "metas" (kpi = RCS): meta do mês quando o período é um único mês; meta anual quando o período é o ano inteiro ou maior.',
    leitura:
      'Situação contra a meta pelo atingimento (realizado ÷ meta × 100): ≥ 100% verde (meta atingida); de 80% a < 100% âmbar (próximo da meta); abaixo de 80% vermelho (abaixo da meta).',
  },
  {
    chave: 'taxa_conversao_leads',
    nome: 'Taxa de conversão de leads',
    grupo: 'kpis',
    fórmula:
      'Negócios que atingiram a etapa 5 (Proposta) no período ÷ negócios que atingiram a etapa 3 (Qualificado) no período × 100, por entradas de etapa em historico_negocios.',
    fonte:
      'Coleções historico_negocios (tipo entrada_etapa/avanco/avanco_forcado, com owner para o filtro de responsável) e etapas_funil (ordem das etapas) — motor src/services/kpis.ts.',
    meta: 'Coleção "metas" (kpi = taxa_conversao_leads): meta mensal ou anual do período.',
    leitura:
      'Situação contra a meta pelo atingimento: ≥ 100% verde; de 80% a < 100% âmbar; abaixo de 80% vermelho. Sem negócios qualificados no período, exibe "—".',
  },
  {
    chave: 'ticket_medio',
    nome: 'Ticket médio',
    grupo: 'kpis',
    fórmula:
      'Receita de serviços do período (Σ valor_mensal × prazo dos contratos assinados) ÷ clientes distintos com contrato assinado no período.',
    fonte:
      'Coleções contratos (valor_mensal, data_inicio, data_fim, cliente, responsavel) — motor src/services/kpis.ts.',
    meta: 'Coleção "metas" (kpi = ticket_medio): meta mensal ou anual do período.',
    leitura:
      'Situação contra a meta pelo atingimento: ≥ 100% verde; de 80% a < 100% âmbar; abaixo de 80% vermelho. Sem contratos assinados ou sem clientes no período, exibe "—".',
  },
  {
    chave: 'os_no_prazo',
    nome: 'OS no prazo',
    grupo: 'kpis',
    fórmula:
      'Ordens de serviço concluídas com no_prazo = true ÷ ordens de serviço concluídas no período × 100. Recorte: data_encerramento (fallback data_abertura).',
    fonte:
      'Coleção ordens_servico (status concluída, no_prazo, responsavel_tecnico) — motor src/services/kpis.ts.',
    meta: 'Coleção "metas" (kpi = os_no_prazo): meta mensal ou anual do período.',
    leitura:
      'Situação contra a meta pelo atingimento: ≥ 100% verde; de 80% a < 100% âmbar; abaixo de 80% vermelho. Sem OS concluídas no período, exibe "—".',
  },
  {
    chave: 'NRR',
    nome: 'NRR (Net Revenue Retention)',
    grupo: 'kpis',
    fórmula:
      'Receita recorrente no FIM do período ÷ receita recorrente no INÍCIO × 100, por movimentos de receita (competência AAAA-MM). Início = última competência anterior ao primeiro mês do período (fallback: primeira registrada); fim = última competência ≤ mês de fim.',
    fonte:
      'Coleções movimentos_receita (valor_mensal, competencia, responsavel) — motores src/services/kpis.ts e src/services/mrr-nrr.ts (mesma definição).',
    meta: 'Coleção "metas" (kpi = NRR): meta mensal ou anual do período.',
    leitura:
      'Faixas próprias do NRR: > 100% verde (receita cresceu além de se manter); exatamente 100% âmbar (manteve); abaixo de 100% vermelho (perdeu receita). Sem receita apurável, exibe "—".',
  },
  {
    chave: 'custo_total_prospeccao',
    nome: 'Custo total de prospecção',
    grupo: 'custo',
    fórmula:
      'Σ custo_total das visitas comerciais com data dentro do período (campo calculado no servidor por hook: combustível, pedágio, alimentação, hospedagem e outros custos).',
    fonte:
      'Coleção visitas_comerciais (custo_total, data, responsavel) — motor src/services/custo-aquisicao.ts.',
    meta: 'Não tem meta — é uma medida de investimento, não um indicador contra meta.',
    leitura:
      'Quanto a unidade investiu para gerar as oportunidades do período. Sem visitas no período, exibe "—".',
  },
  {
    chave: 'custo_por_lead_qualificado',
    nome: 'Custo por lead qualificado',
    grupo: 'custo',
    fórmula:
      'Custo total de prospecção do período ÷ negócios distintos que atingiram a etapa 3 (Qualificado) no período.',
    fonte:
      'Coleções visitas_comerciais, historico_negocios e etapas_funil — motor src/services/custo-aquisicao.ts.',
    meta: 'Não tem meta — medida de eficiência de prospecção.',
    leitura:
      'Quanto custa, em média, levar um negócio à etapa Qualificado. Sem custo ou sem qualificados no período, exibe "—".',
  },
  {
    chave: 'custo_por_proposta',
    nome: 'Custo por proposta',
    grupo: 'custo',
    fórmula:
      'Custo total de prospecção do período ÷ negócios distintos que atingiram a etapa 5 (Proposta) no período.',
    fonte:
      'Coleções visitas_comerciais, historico_negocios e etapas_funil — motor src/services/custo-aquisicao.ts.',
    meta: 'Não tem meta — medida de eficiência de prospecção.',
    leitura:
      'Quanto custa, em média, levar um negócio à etapa Proposta. Sem custo ou sem propostas no período, exibe "—".',
  },
  {
    chave: 'custo_por_contrato',
    nome: 'Custo por contrato assinado',
    grupo: 'custo',
    fórmula:
      'Custo total de prospecção do período ÷ contratos assinados no período (data_inicio dentro dele; fallback created — mesma regra do motor de KPIs).',
    fonte: 'Coleções visitas_comerciais e contratos — motor src/services/custo-aquisicao.ts.',
    meta: 'Não tem meta — medida de eficiência de prospecção.',
    leitura:
      'Quanto custa, em média, fechar um contrato. Sem custo ou sem contratos assinados no período, exibe "—".',
  },
  {
    chave: 'retorno_por_real',
    nome: 'Retorno por real investido',
    grupo: 'custo',
    fórmula: 'Ticket médio do período (motor kpis.ts) ÷ custo por contrato assinado do período.',
    fonte: 'Motores src/services/custo-aquisicao.ts e src/services/kpis.ts.',
    meta: 'Não tem meta — quanto maior, melhor (acima de 1, o retorno supera o custo).',
    leitura:
      'Quantos reais de ticket médio cada real investido em prospecção retornou. Sem ticket médio ou sem custo por contrato, exibe "—".',
  },
  {
    chave: 'mrr',
    nome: 'MRR (receita recorrente mensal)',
    grupo: 'receita',
    fórmula:
      'Receita recorrente vigente em cada competência (AAAA-MM): soma dos movimentos daquele mês; competências sem movimento usam a soma do valor_mensal dos contratos vigentes na competência (data_inicio/data_fim/status).',
    fonte:
      'Coleções movimentos_receita e contratos — motor src/services/mrr-nrr.ts (mesma semântica da tela Contratos).',
    meta: 'Não tem meta própria no bloco — a meta de receita recorrente acompanhada é a do KPI NRR.',
    leitura:
      'Série dos últimos 12 meses: quanto a carteira de contratos gera de receita mensal recorrente em cada competência.',
  },
  {
    chave: 'composicao_mrr',
    nome: 'Composição do MRR (novos, expansão, contração, churn)',
    grupo: 'receita',
    fórmula:
      'Soma dos movimentos de receita do período por tipo: novos (novo), expansão (expansão), contração (contração) e churn (encerramento). Renovação mantém o saldo e aparece como "outros" apenas quando existir.',
    fonte:
      'Coleção movimentos_receita (tipo, valor_mensal, competencia) — gravação automática pelo hook contratos_movimentos.pb.js; motor src/services/mrr-nrr.ts.',
    meta: 'Não tem meta — leitura de composição da variação da receita.',
    leitura:
      'Explica de onde veio a variação do MRR no período: novos contratos e expansões empurram para cima; contração e churn para baixo.',
  },
  {
    chave: 'metas_acompanhamento',
    nome: 'Acompanhamento de metas de RCS (bloco Metas)',
    grupo: 'metas',
    fórmula:
      'Realizado mensal = Σ valor contratado (valor_mensal × prazo) dos contratos assinados no mês; acumulado = soma corrida jan → dez; meta acumulada = soma corrida das metas mensais (sem meta mensal cadastrada, meta anual ÷ 12). Percentual do ano = acumulado ÷ meta anual × 100. Quanto falta por mês = (meta anual − acumulado) ÷ meses restantes até dezembro.',
    fonte:
      'Coleções contratos e metas (kpi = RCS, ano do acompanhamento) — motor src/services/metas-acompanhamento.ts.',
    meta: 'Coleção "metas": meta anual de RCS (mes = 0) e metas mensais (mes = 1..12).',
    leitura:
      'Gráfico realizado × meta mês a mês: mostra se o acumulado do ano está à frente ou atrás da meta e quanto falta por mês para fechar o ano na meta.',
  },
]

// Glosário dos 5 KPIs oficiais, na ordem da faixa do Dashboard (consumo
// posicional do ícone de informação nos cartões)
export const INDICADORES_KPI_FAIXA: IndicadorDoc[] = [
  INDICADORES.find((i) => i.chave === 'RCS'),
  INDICADORES.find((i) => i.chave === 'taxa_conversao_leads'),
  INDICADORES.find((i) => i.chave === 'ticket_medio'),
  INDICADORES.find((i) => i.chave === 'os_no_prazo'),
  INDICADORES.find((i) => i.chave === 'NRR'),
].filter((i): i is IndicadorDoc => !!i)

export const ROTULO_GRUPO: Record<IndicadorDoc['grupo'], string> = {
  kpis: 'Indicadores da unidade de serviços',
  custo: 'Custo de aquisição',
  receita: 'Receita recorrente (MRR/NRR)',
  metas: 'Acompanhamento de metas',
}

// Rótulo curto de um KPI (mesmos nomes da faixa do Dashboard)
export const rotuloKpi = (kpi: KpiUnidade, rotulo: string) => rotulo

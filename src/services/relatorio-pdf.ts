import {
  calcularCustoAquisicao,
  formatarMoeda,
  formatarIndicadorMoeda,
  formatarNumero,
} from '@/services/custo-aquisicao'
import { calcularKpis, ROTULOS_KPIS, type KpisPeriodo, type KpiSituacao } from '@/services/kpis'
import { calcularFunil, type FunilPeriodo } from '@/services/funil'
import {
  calcularMetasAcompanhamento,
  formatarMoedaMetasOuTraco,
  formatarDiferenca,
  formatarPercentualMetas,
  type MetasAcompanhamento,
} from '@/services/metas-acompanhamento'
import {
  calcularMrrNrr,
  formatarMoedaMrrOuTraco,
  formatarPercentualNrr,
  type MrrNrrPeriodo,
} from '@/services/mrr-nrr'
import type { PrecisaAcaoResultado } from '@/services/precisa-acao'
import type { Activity } from '@/types/crm'

// Gerador do RELATÓRIO EM PDF do Dashboard (botão "Exportar PDF").
//
// Geração client-side com jsPDF + jspdf-autotable: em vez de fotografar a tela
// (html2canvas quebra com SVG dos gráficos Recharts), o PDF é DESENHADO com os
// mesmos números dos blocos — recorre aos MESMOS MOTORES de cálculo do
// Dashboard (kpis.ts, funil.ts, custo-aquisicao.ts, metas-acompanhamento.ts,
// mrr-nrr.ts) com o mesmo filtro global (período + responsável), garantindo
// que o relatório reflete exatamente o que está na tela. Tabelas/valores
// legíveis > imagem quebrada (decisão do pedido).
//
// Somente leitura: nenhum dado é gravado no banco. Qualquer usuário autenticado
// pode exportar (não há regra de admin para exportação).

export interface ResumoCartoes {
  receitaFechada: number
  negociosAbertos: number
  valorPipeline: number
  taxaConversao: number
}

export interface RelatorioPdfEntrada {
  dataDe: string // 'YYYY-MM-DD'
  dataAte: string // 'YYYY-MM-DD'
  ano: number
  mes?: number
  // id do responsável (filtro global); '' = todos
  responsavel?: string
  nomeResponsavel?: string
  rotuloPeriodo: string
  resumoCartoes?: ResumoCartoes
  precisaAcao?: PrecisaAcaoResultado
  atividadesPendentes?: Activity[]
}

// ---------- identidade visual (0.0.50/0.0.51) ----------

const COR_TEXTO = [26, 29, 31] as const // #1A1D1F
const COR_CINZA = [100, 116, 139] as const // slate-500
const COR_LIME = [168, 217, 58] as const // #A8D93A (destaque)
const COR_LIME_TEXTO = [98, 143, 20] as const // #628F14 (lime p/ texto)
const COR_HEAD = [26, 29, 31] as const // cabeçalho de tabela
const COR_ZEBRA = [248, 250, 252] as const // slate-50

// jsPDF não traz IBM Plex Mono: números em Courier (mono nativo), títulos e
// rótulos em Helvetica — mantém a convenção "números monoespaçados".
const FONTE = 'helvetica'
const FONTE_NUM = 'courier'

// ---------- helpers de formatação ----------

const fmtPercentual = (v: number | null) =>
  v === null ? '—' : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(v)}%`

const fmtValorKpi = (k: { formato: 'percentual' | 'moeda' }, v: number | null | undefined) => {
  if (v === null || v === undefined) return '—'
  return k.formato === 'moeda' ? formatarMoeda(v) : `${formatarNumero(v, 1)}%`
}

const fmtDiferencaKpi = (k: { formato: 'percentual' | 'moeda'; diferenca: number | null }) => {
  if (k.diferenca === null) return '—'
  const sinal = k.diferenca > 0 ? '+' : k.diferenca < 0 ? '−' : ''
  const abs = Math.abs(k.diferenca)
  return k.formato === 'moeda'
    ? `${sinal}${formatarMoeda(abs)}`
    : `${sinal}${formatarNumero(abs, 1)} pp`
}

const SITUACAO_ROTULO: Record<Exclude<KpiSituacao, null>, string> = {
  verde: 'meta atingida',
  ambar: 'próximo da meta',
  vermelho: 'abaixo da meta',
}

const fmtSituacao = (s: KpiSituacao) => (s ? SITUACAO_ROTULO[s] : 'sem meta')

const fmtDataBR = (iso: string) => {
  const [a, m, d] = iso.split('-')
  return d && m && a ? `${d}/${m}/${a}` : iso
}

const fmtComp = (comp: string) => {
  const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const m = Number(comp.slice(5, 7))
  return `${MESES[m - 1] || comp}/${comp.slice(0, 4)}`
}

// ---------- helpers de desenho ----------

type Doc = import('jspdf').jsPDF

const MARGEM = 14
const LARGURA_UTIL = 210 - MARGEM * 2

// Título de seção com marca lime à esquerda; quebra página quando não cabe
function secao(doc: Doc, y: number, titulo: string): number {
  if (y > 262) {
    doc.addPage()
    y = 20
  }
  doc.setFillColor(...COR_LIME)
  doc.rect(MARGEM, y - 3.4, 2.4, 4.8, 'F')
  doc.setFont(FONTE, 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...COR_TEXTO)
  doc.text(titulo, MARGEM + 5, y)
  return y + 6
}

// Linha de resumo (rótulo: valor) sob uma seção
function linha(doc: Doc, y: number, rotulo: string, valor: string): number {
  if (y > 278) {
    doc.addPage()
    y = 20
  }
  doc.setFont(FONTE, 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...COR_CINZA)
  doc.text(rotulo, MARGEM + 5, y)
  doc.setFont(FONTE_NUM, 'bold')
  doc.setTextColor(...COR_TEXTO)
  doc.text(valor, 210 - MARGEM, y, { align: 'right' })
  return y + 5.5
}

// finalY da última tabela (augment do autotable, lido com type narrowing)
const finalYDe = (doc: Doc, fallback: number) =>
  (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? fallback

// Estilo comum das tabelas
const estiloTabela = (colunasValor: Record<number, string>) => ({
  theme: 'striped' as const,
  styles: {
    font: FONTE,
    fontSize: 8.5,
    cellPadding: 2,
    textColor: [...COR_TEXTO] as [number, number, number],
  },
  headStyles: {
    font: FONTE,
    fontStyle: 'bold' as const,
    fontSize: 8,
    fillColor: [...COR_HEAD] as [number, number, number],
    textColor: [255, 255, 255] as [number, number, number],
  },
  alternateRowStyles: { fillColor: [...COR_ZEBRA] as [number, number, number] },
  columnStyles: Object.fromEntries(
    Object.entries(colunasValor).map(([col, align]) => [
      col,
      { halign: align as 'left' | 'right' | 'center', font: FONTE_NUM },
    ]),
  ),
})

// ---------- seções do relatório ----------

function secaoKpis(doc: Doc, y0: number, kpis: KpisPeriodo): number {
  let y = secao(doc, y0, 'Indicadores da unidade de serviços')
  autoTableTabela(doc, {
    startY: y,
    head: [['KPI', 'Realizado', 'Meta', 'Diferença', 'Atingimento', 'Situação']],
    body: kpis.lista.map((k) => [
      ROTULOS_KPIS[k.kpi],
      fmtValorKpi(k, k.realizado),
      k.meta !== undefined ? fmtValorKpi(k, k.meta) : '—',
      fmtDiferencaKpi(k),
      fmtPercentual(k.atingimento),
      fmtSituacao(k.situacao),
    ]),
    ...estiloTabela({ 1: 'right', 2: 'right', 3: 'right', 4: 'right' }),
    margin: { left: MARGEM, right: MARGEM },
  })
  return finalYDe(doc, y) + 8
}

function secaoFunil(doc: Doc, y0: number, funil: FunilPeriodo): number {
  let y = secao(doc, y0, 'Funil de vendas (7 etapas)')
  autoTableTabela(doc, {
    startY: y,
    head: [['Etapa', 'Leads', 'Conv. p/ próxima', 'Tempo médio', 'Perdidos', 'Gargalo']],
    body: funil.etapas.map((e) => [
      e.nome,
      String(e.negocios),
      e.conversaoProxima === null ? '—' : fmtPercentual(e.conversaoProxima),
      e.tempoMedioDias === null ? '—' : `${formatarNumero(e.tempoMedioDias, 1)} dias`,
      e.perdidos > 0 ? String(e.perdidos) : '—',
      e.gargalo ? 'Sim' : '',
    ]),
    ...estiloTabela({ 1: 'right', 2: 'right', 3: 'right', 4: 'right', 5: 'center' }),
    margin: { left: MARGEM, right: MARGEM },
  })
  y = finalYDe(doc, y)
  y = linha(doc, y, 'Conversão total do funil (1ª → 7ª etapa)', fmtPercentual(funil.conversaoTotal))
  if (funil.gargalo) {
    y = linha(
      doc,
      y,
      'Gargalo do período',
      `${funil.gargalo.etapaDe} → ${funil.gargalo.etapaPara} (${fmtPercentual(funil.gargalo.conversao)})`,
    )
  }
  if (funil.etapaMaisPerdas) {
    y = linha(
      doc,
      y,
      'Etapa com mais perdas',
      `${funil.etapaMaisPerdas.nome} (${funil.etapaMaisPerdas.quantidade})`,
    )
  }
  if (funil.tempoMedioCicloDias !== null) {
    y = linha(
      doc,
      y,
      'Tempo médio de ciclo (Lead → Cliente)',
      `${formatarNumero(funil.tempoMedioCicloDias, 1)} dias`,
    )
  }
  return y + 3
}

function secaoCustoAquisicao(
  doc: Doc,
  y0: number,
  custo: Awaited<ReturnType<typeof calcularCustoAquisicao>>,
): number {
  let y = secao(doc, y0, 'Custo de aquisição')
  const linhas: [string, string][] = [
    ['Custo total de prospecção', formatarIndicadorMoeda(custo.custoTotalProspeccao)],
    [
      'Leads qualificados no período',
      custo.leadsQualificados === null ? '—' : String(custo.leadsQualificados),
    ],
    ['Propostas no período', custo.propostas === null ? '—' : String(custo.propostas)],
    [
      'Contratos assinados no período',
      custo.contratosAssinados === null ? '—' : String(custo.contratosAssinados),
    ],
    ['Custo por lead qualificado', formatarIndicadorMoeda(custo.custoPorLeadQualificado)],
    ['Custo por proposta', formatarIndicadorMoeda(custo.custoPorProposta)],
    ['Custo por contrato assinado', formatarIndicadorMoeda(custo.custoPorContrato)],
    ['Ticket médio do período', formatarIndicadorMoeda(custo.ticketMedio)],
    [
      'Retorno por real investido',
      custo.retornoPorReal === null ? '—' : `${formatarNumero(custo.retornoPorReal, 2)}x`,
    ],
  ]
  autoTableTabela(doc, {
    startY: y,
    head: [['Medida', 'Valor']],
    body: linhas,
    ...estiloTabela({ 1: 'right' }),
    columnStyles: {
      0: { cellWidth: 95 },
      1: { halign: 'right', font: FONTE_NUM },
    },
    margin: { left: MARGEM, right: MARGEM },
  })
  return finalYDe(doc, y) + 8
}

function secaoMetas(doc: Doc, y0: number, metas: MetasAcompanhamento): number {
  let y = secao(doc, y0, `Metas ${metas.ano} (RCS — acumulado vs. meta anual)`)
  autoTableTabela(doc, {
    startY: y,
    head: [['Referência', 'Valor']],
    body: [
      ['Meta anual', formatarMoedaMetasOuTraco(metas.metaAnual)],
      ['Acumulado realizado', formatarMoedaMetasOuTraco(metas.acumuladoRealizado)],
      [
        'Meta acumulada até o mês de referência',
        formatarMoedaMetasOuTraco(metas.metaAcumuladaAtual),
      ],
      ['Diferença (acumulado − meta)', formatarDiferenca(metas.diferenca)],
      ['Percentual do ano realizado', formatarPercentualMetas(metas.percentualAno)],
      ['Falta até a meta anual', formatarMoedaMetasOuTraco(metas.faltaTotal)],
      [
        metas.mesesRestantes > 0
          ? `Falta por mês (restam ${metas.mesesRestantes} meses)`
          : 'Ano encerrado',
        formatarMoedaMetasOuTraco(metas.faltaPorMes),
      ],
    ],
    ...estiloTabela({ 1: 'right' }),
    columnStyles: {
      0: { cellWidth: 95 },
      1: { halign: 'right', font: FONTE_NUM },
    },
    margin: { left: MARGEM, right: MARGEM },
  })
  return finalYDe(doc, y) + 8
}

function secaoMrrNrr(doc: Doc, y0: number, mrr: MrrNrrPeriodo): number {
  let y = secao(doc, y0, 'Receita recorrente (MRR / NRR)')
  const composicao: [string, string][] = [
    ['Receita recorrente no início do período', formatarMoedaMrrOuTraco(mrr.receitaInicial)],
    ['Receita recorrente no fim do período', formatarMoedaMrrOuTraco(mrr.receitaFinal)],
    ['NRR do período', formatarPercentualNrr(mrr.nrr)],
    ['Novos contratos', formatarMoedaMrrOuTraco(mrr.movimentosPorTipo.novos || null)],
    ['Expansão', formatarMoedaMrrOuTraco(mrr.movimentosPorTipo.expansao || null)],
    ['Contração', formatarMoedaMrrOuTraco(mrr.movimentosPorTipo.contracao || null)],
    ['Churn', formatarMoedaMrrOuTraco(mrr.movimentosPorTipo.churn || null)],
    ['Renovações (fora da composição)', formatarMoedaMrrOuTraco(mrr.renovacoes || null)],
  ]
  autoTableTabela(doc, {
    startY: y,
    head: [['Composição do período', 'Valor']],
    body: composicao,
    ...estiloTabela({ 1: 'right' }),
    columnStyles: { 0: { cellWidth: 95 }, 1: { halign: 'right', font: FONTE_NUM } },
    margin: { left: MARGEM, right: MARGEM },
  })
  y = finalYDe(doc, y)
  // série dos últimos 12 meses
  autoTableTabela(doc, {
    startY: y + 3,
    head: [['MRR por competência (últimos 12 meses)', 'MRR']],
    body: mrr.mrrMensal.map((m) => [fmtComp(m.comp), formatarMoedaMrrOuTraco(m.mrr || null)]),
    ...estiloTabela({ 1: 'right' }),
    columnStyles: { 0: { cellWidth: 95 }, 1: { halign: 'right', font: FONTE_NUM } },
    margin: { left: MARGEM, right: MARGEM },
  })
  return finalYDe(doc, y) + 8
}

function secaoAcao(doc: Doc, y0: number, p: PrecisaAcaoResultado): number {
  let y = secao(doc, y0, 'Precisa de ação')
  const grupos: { nome: string; itens: { titulo: string; detalhe: string }[] }[] = [
    { nome: 'OS com prazo vencendo/vencidas', itens: p.osAtrasadas },
    { nome: 'Leads parados além do prazo da etapa', itens: p.negociosParados },
    { nome: 'Propostas sem retorno', itens: p.propostasSemRetorno },
  ]
  const corpo = grupos.flatMap((g) =>
    g.itens.length === 0
      ? [[g.nome, '— nenhum item —']]
      : g.itens.map((i) => [`${g.nome} — ${i.titulo}`, i.detalhe]),
  )
  if (corpo.length === 0) {
    y = linha(doc, y, 'Situação', 'Nenhum item pedindo ação')
    return y + 3
  }
  autoTableTabela(doc, {
    startY: y,
    head: [['Item', 'Detalhe']],
    body: corpo,
    ...estiloTabela({}),
    columnStyles: { 1: { cellWidth: 62 } },
    margin: { left: MARGEM, right: MARGEM },
  })
  return finalYDe(doc, y) + 8
}

function secaoAtividades(doc: Doc, y0: number, atividades: Activity[]): number {
  if (atividades.length === 0) return y0
  let y = secao(doc, y0, 'Atividades pendentes')
  autoTableTabela(doc, {
    startY: y,
    head: [['Atividade', 'Tipo', 'Prazo']],
    body: atividades.map((a) => [
      a.title,
      a.type,
      a.due_date ? fmtDataBR(a.due_date.split(' ')[0].split('T')[0]) : 'Sem data',
    ]),
    ...estiloTabela({ 2: 'right' }),
    columnStyles: { 1: { cellWidth: 30 } },
    margin: { left: MARGEM, right: MARGEM },
  })
  return finalYDe(doc, y) + 8
}

// Importa o autotable dinamicamente (mesma forma do jsPDF) e desenha a tabela
let autoTableFn: ((doc: Doc, opcoes: Record<string, unknown>) => void) | null = null
async function autoTableTabela(doc: Doc, opcoes: Record<string, unknown>) {
  if (!autoTableFn) {
    const mod = (await import(/* @vite-ignore */ 'jspdf-autotable')) as unknown as {
      autoTable?: (doc: Doc, opcoes: Record<string, unknown>) => void
    }
    autoTableFn = mod.autoTable ?? (mod as unknown as (d: Doc, o: Record<string, unknown>) => void)
  }
  autoTableFn(doc, opcoes)
}

// ---------- função central ----------

export async function gerarRelatorioDashboardPdf(
  entrada: RelatorioPdfEntrada,
): Promise<{ nomeArquivo: string }> {
  const de = entrada.dataDe
  const ate = entrada.dataAte
  const resp = entrada.responsavel || ''

  // Mesmos motores e mesmos filtros dos blocos do Dashboard — o PDF reflete
  // exatamente o que a tela mostra para o período/responsável escolhidos.
  const [kpis, funil, custo, metas, mrr] = await Promise.all([
    calcularKpis({
      dataDe: de,
      dataAte: ate,
      ano: entrada.ano,
      mes: entrada.mes,
      responsavel: resp,
    }),
    calcularFunil({ dataDe: de, dataAte: ate, responsavel: resp }),
    calcularCustoAquisicao({ dataDe: de, dataAte: ate, responsavel: resp }),
    calcularMetasAcompanhamento({
      ano: entrada.ano,
      dataDe: de,
      dataAte: ate,
      responsavel: resp,
    }),
    calcularMrrNrr({ dataDe: de, dataAte: ate, responsavel: resp }),
  ])

  const { jsPDF } = (await import(/* @vite-ignore */ 'jspdf')) as unknown as {
    jsPDF: new (o?: Record<string, unknown>) => Doc
  }
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // --- cabeçalho ---
  doc.setFillColor(...COR_LIME)
  doc.rect(0, 0, 210, 4, 'F')
  doc.setFont(FONTE, 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...COR_TEXTO)
  doc.text('Relatório do Dashboard', MARGEM, 16)
  doc.setFontSize(10)
  doc.setTextColor(...COR_LIME_TEXTO)
  doc.text('Condutiva Tecnologia — Unidade de Serviços', MARGEM, 22)

  doc.setFont(FONTE, 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...COR_CINZA)
  const agora = new Date()
  const geradoEm = agora.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  const responsavelRotulo = entrada.nomeResponsavel || 'Todos os responsáveis'
  doc.text(`Período: ${entrada.rotuloPeriodo} (${fmtDataBR(de)} a ${fmtDataBR(ate)})`, MARGEM, 29)
  doc.text(`Responsável comercial: ${responsavelRotulo}`, MARGEM, 34)
  doc.text(`Gerado em ${geradoEm}`, MARGEM, 39)

  let y = 47

  // --- resumo (quatro cartões antigos) ---
  if (entrada.resumoCartoes) {
    y = secao(doc, y, 'Resumo geral')
    y = linha(
      doc,
      y,
      'Receita fechada (leads ganhos)',
      formatarMoeda(entrada.resumoCartoes.receitaFechada),
    )
    y = linha(doc, y, 'Leads abertos', String(entrada.resumoCartoes.negociosAbertos))
    y = linha(doc, y, 'Valor do pipeline', formatarMoeda(entrada.resumoCartoes.valorPipeline))
    y = linha(
      doc,
      y,
      'Taxa de conversão (ganho/fechados)',
      `${entrada.resumoCartoes.taxaConversao}%`,
    )
    y += 3
  }

  // --- seções principais (mínimo pedido) ---
  y = secaoKpis(doc, y, kpis)
  y = secaoFunil(doc, y, funil)
  y = secaoCustoAquisicao(doc, y, custo)
  y = secaoMetas(doc, y, metas)
  y = secaoMrrNrr(doc, y, mrr)

  // --- blocos de ação e atendimentos (quando fornecidos) ---
  if (entrada.precisaAcao) y = secaoAcao(doc, y, entrada.precisaAcao)
  if (entrada.atividadesPendentes && entrada.atividadesPendentes.length > 0) {
    y = secaoAtividades(doc, y, entrada.atividadesPendentes)
  }

  // --- rodapé em todas as páginas ---
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFont(FONTE, 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...COR_CINZA)
    doc.text(`CRM Condutiva Serviços — relatório gerado do Dashboard`, MARGEM, 291)
    doc.text(`${i}/${total}`, 210 - MARGEM, 291, { align: 'right' })
  }

  // nome do arquivo pelo período: relatorio-dashboard-AAAA-MM.pdf
  const nomeArquivo = `relatorio-dashboard-${ate.slice(0, 7)}.pdf`
  doc.save(nomeArquivo)
  return { nomeArquivo }
}

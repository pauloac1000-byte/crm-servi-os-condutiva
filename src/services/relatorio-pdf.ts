import { calcularKpis, ROTULOS_KPIS, type KpisPeriodo, type KpiSituacao } from '@/services/kpis'
import { calcularFunil, type FunilPeriodo } from '@/services/funil'
import {
  calcularMetasAcompanhamento,
  formatarMoedaMetasOuTraco,
  formatarDiferenca,
  formatarPercentualMetas,
  type MetasAcompanhamento,
} from '@/services/metas-acompanhamento'

// Gerador do RELATÓRIO EM PDF do Dashboard (botão "Exportar").
//
// Geração client-side com jsPDF + jspdf-autotable (import dinâmico — as libs
// não estão no package.json; os tipos vêm do stub src/types/jspdf.d.ts).
//
// Formato pedido: UMA PÁGINA com os cinco KPIs, o funil e o bloco de metas do
// período/responsável filtrado, identificando o período, a data de emissão e o
// nome de quem exportou. Recorre aos MESMOS MOTORES de cálculo dos blocos do
// Dashboard (kpis.ts, funil.ts, metas-acompanhamento.ts), garantindo que o
// relatório reflete exatamente o que está na tela.
//
// Somente leitura: nenhum dado é gravado no banco. Qualquer usuário autenticado
// pode exportar (não há regra de admin para exportação).

export interface RelatorioPdfEntrada {
  dataDe: string // 'YYYY-MM-DD'
  dataAte: string // 'YYYY-MM-DD'
  ano: number
  mes?: number
  // id do responsável (filtro global); '' = todos
  responsavel?: string
  nomeResponsavel?: string
  rotuloPeriodo: string
  // nome de quem exportou (usuário autenticado no momento da emissão)
  exportadoPor?: string
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
  return k.formato === 'moeda' ? formatarMoedaKpi(v) : `${formatarNumeroKpi(v, 1)}%`
}

// formatação local (evita depender dos serviços de custo/mrr, fora do escopo
// do relatório de uma página)
const formatarMoedaKpi = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v)

const formatarNumeroKpi = (v: number, casas = 0) =>
  new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: casas,
    minimumFractionDigits: casas,
  }).format(v)

const fmtDiferencaKpi = (k: { formato: 'percentual' | 'moeda'; diferenca: number | null }) => {
  if (k.diferenca === null) return '—'
  const sinal = k.diferenca > 0 ? '+' : k.diferenca < 0 ? '−' : ''
  const abs = Math.abs(k.diferenca)
  return k.formato === 'moeda'
    ? `${sinal}${formatarMoedaKpi(abs)}`
    : `${sinal}${formatarNumeroKpi(abs, 1)} pp`
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

// ---------- helpers de desenho ----------

type Doc = import('jspdf').jsPDF

const MARGEM = 14
const LARGURA_UTIL = 210 - MARGEM * 2

// Título de seção com marca lime à esquerda
function secao(doc: Doc, y: number, titulo: string): number {
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

// ---------- seções do relatório (uma página) ----------

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
      e.tempoMedioDias === null ? '—' : `${formatarNumeroKpi(e.tempoMedioDias, 1)} dias`,
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
      `${formatarNumeroKpi(funil.tempoMedioCicloDias, 1)} dias`,
    )
  }
  return y + 3
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
  const [kpis, funil, metas] = await Promise.all([
    calcularKpis({
      dataDe: de,
      dataAte: ate,
      ano: entrada.ano,
      mes: entrada.mes,
      responsavel: resp,
    }),
    calcularFunil({ dataDe: de, dataAte: ate, responsavel: resp }),
    calcularMetasAcompanhamento({
      ano: entrada.ano,
      dataDe: de,
      dataAte: ate,
      responsavel: resp,
    }),
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
  doc.text(`Emitido por ${entrada.exportadoPor || '—'} em ${geradoEm}`, MARGEM, 39)

  let y = 47

  // --- seções principais (uma página: KPIs, funil e metas) ---
  y = secaoKpis(doc, y, kpis)
  y = secaoFunil(doc, y, funil)
  secaoMetas(doc, y, metas)

  // --- rodapé ---
  doc.setFont(FONTE, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COR_CINZA)
  doc.text(`CRM Condutiva Serviços — relatório gerado do Dashboard`, MARGEM, 291)
  doc.text(`1/1`, 210 - MARGEM, 291, { align: 'right' })

  // nome do arquivo pelo período: relatorio-dashboard-AAAA-MM.pdf
  const nomeArquivo = `relatorio-dashboard-${ate.slice(0, 7)}.pdf`
  doc.save(nomeArquivo)
  return { nomeArquivo }
}

// LARGURA_UTIL mantida para futuras seções (não usada no formato de 1 página)
void LARGURA_UTIL

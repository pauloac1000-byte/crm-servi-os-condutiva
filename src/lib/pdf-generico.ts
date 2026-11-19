// Motor de PDF do relatório padrão ("Exportar PDF") — mesma identidade visual
// do gerador do Dashboard (src/services/relatorio-pdf.ts): jspdf/jspdf-autotable
// via import dinâmico, tipos pelo stub src/types/jspdf.d.ts. Nada de
// dependências novas no package.json.
//
// Formato: cabeçalho (página, data/hora, usuário, filtros ativos), bloco de
// resumo com os números principais da tela, tabela com os registros exibidos
// (mesmas colunas visíveis) e rodapé com identificação do sistema e numeração
// de páginas quando passar de uma folha.
import pb from '@/lib/pocketbase/client'

export interface PdfLinha {
  header: string
  valor: string
}

export interface PdfSessao {
  titulo: string
  linhas: PdfLinha[]
}

export interface PdfOpcoes {
  titulo: string
  // rótulos dos filtros ativos na tela; vazio = "sem filtros aplicados"
  filtros: string[]
  resumo: PdfSessao[]
  colunas: string[]
  linhas: string[][]
  // nome do arquivo sem extensão (o sufixo de data é acrescentado)
  prefixoArquivo: string
  // paisagem para tabelas largas (ex.: Visitas); padrão retrato
  orientacao?: 'portrait' | 'landscape'
}

export function nomePdf(prefixo: string): string {
  const hoje = new Date()
  const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(
    hoje.getDate(),
  ).padStart(2, '0')}`
  return `${prefixo}-${iso}.pdf`
}

// ---------- identidade visual (mesma do relatório do Dashboard) ----------

const COR_TEXTO = [26, 29, 31] as const // #1A1D1F
const COR_CINZA = [100, 116, 139] as const // slate-500
const COR_LIME = [168, 217, 58] as const // #A8D93A (destaque)
const COR_LIME_TEXTO = [98, 143, 20] as const // #628F14 (lime p/ texto)
const COR_HEAD = [26, 29, 31] as const // cabeçalho de tabela
const COR_ZEBRA = [248, 250, 252] as const // slate-50

const FONTE = 'helvetica'
const FONTE_NUM = 'courier'

const MARGEM = 14
const LARGURA_UTIL = 210 - MARGEM * 2

type Doc = import('jspdf').jsPDF

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

// Linha de resumo (rótulo à esquerda, valor à direita)
function linhaResumo(
  doc: Doc,
  y: number,
  rotulo: string,
  valor: string,
  direita = 210 - MARGEM,
): number {
  doc.setFont(FONTE, 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...COR_CINZA)
  doc.text(rotulo, MARGEM + 5, y)
  doc.setFont(FONTE_NUM, 'bold')
  doc.setTextColor(...COR_TEXTO)
  doc.text(valor, direita, y, { align: 'right' })
  return y + 5.5
}

// Estilo comum das tabelas
const estiloTabela = () => ({
  theme: 'striped' as const,
  styles: {
    font: FONTE,
    fontSize: 8,
    cellPadding: 1.8,
    textColor: [...COR_TEXTO] as [number, number, number],
    lineColor: [226, 232, 240] as [number, number, number],
    lineWidth: 0.1,
  },
  headStyles: {
    font: FONTE,
    fontStyle: 'bold' as const,
    fontSize: 8,
    fillColor: [...COR_HEAD] as [number, number, number],
    textColor: [255, 255, 255] as [number, number, number],
  },
  alternateRowStyles: { fillColor: [...COR_ZEBRA] as [number, number, number] },
  margin: { left: MARGEM, right: MARGEM },
})

// finalY da última tabela (augment do autotable, lido com type narrowing)
const finalYDe = (doc: Doc, fallback: number) =>
  (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? fallback

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

export async function gerarPdfPadrao(opcoes: PdfOpcoes): Promise<void> {
  const { jsPDF } = (await import(/* @vite-ignore */ 'jspdf')) as unknown as {
    jsPDF: new (o?: Record<string, unknown>) => Doc
  }
  const orientacao = opcoes.orientacao ?? 'portrait'
  const doc = new jsPDF({ orientation: orientacao, unit: 'mm', format: 'a4' })
  // largura útil e posição do rodapé conforme a orientação
  const larguraPagina = orientacao === 'landscape' ? 297 : 210
  const rodapeY = orientacao === 'landscape' ? 204 : 291

  const { titulo, filtros, resumo, colunas, linhas } = opcoes

  const agora = new Date()
  const dataHora = agora.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  const usuario = pb.authStore.record?.name || pb.authStore.record?.email || '—'

  // ── Cabeçalho ──────────────────────────────────────────────────────────────
  doc.setFillColor(...COR_LIME)
  doc.rect(0, 0, larguraPagina, 4, 'F')
  doc.setFont(FONTE, 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...COR_TEXTO)
  doc.text(titulo, MARGEM, 16)
  doc.setFontSize(10)
  doc.setTextColor(...COR_LIME_TEXTO)
  doc.text('Condutiva Tecnologia — Unidade de Serviços', MARGEM, 22)

  doc.setFont(FONTE, 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...COR_CINZA)
  doc.text(`Gerado em ${dataHora} por ${usuario}`, MARGEM, 29)

  const textoFiltros =
    filtros.length > 0
      ? `Filtros ativos: ${filtros.join(' | ')}`
      : 'Filtros ativos: sem filtros aplicados'
  const linhasFiltro = doc.splitTextToSize(textoFiltros, LARGURA_UTIL)
  let y = 34
  for (const linha of linhasFiltro) {
    doc.text(linha, MARGEM, y)
    y += 4.5
  }
  y += 3

  // ── Resumo ─────────────────────────────────────────────────────────────────
  for (const bloco of resumo) {
    if (bloco.linhas.length === 0) continue
    y = secao(doc, y, bloco.titulo)
    for (const linha of bloco.linhas) {
      y = linhaResumo(doc, y, linha.header, linha.valor, larguraPagina - MARGEM)
    }
    y += 3
  }

  // ── Tabela dos registros exibidos na tela ─────────────────────────────────
  const temLinhas = linhas.length > 0
  const body = temLinhas
    ? linhas
    : [
        [
          {
            content: 'Não há registros para os filtros selecionados.',
            colSpan: Math.max(colunas.length, 1),
            styles: {
              halign: 'center' as const,
              fontStyle: 'italic' as const,
              textColor: [...COR_CINZA] as [number, number, number],
            },
          },
        ],
      ]

  await autoTableTabela(doc, {
    head: [colunas],
    body,
    startY: y,
    ...estiloTabela(),
  })
  y = finalYDe(doc, y) + 8

  // ── Rodapé: identificação do sistema + numeração quando > 1 folha ──────────
  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    doc.setFont(FONTE, 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...COR_CINZA)
    doc.text('CRM Condutiva Serviços', MARGEM, rodapeY)
    if (total > 1) doc.text(`${p}/${total}`, larguraPagina - MARGEM, rodapeY, { align: 'right' })
  }

  doc.save(nomePdf(opcoes.prefixoArquivo))
}

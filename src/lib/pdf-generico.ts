// Motor de PDF do relatório padrão ("Exportar PDF") — mesmo padrão do
// gerador do Dashboard (src/services/relatorio-pdf.ts): jspdf/jspdf-autotable
// via import dinâmico, tipos pelo stub src/types/jspdf.d.ts. Nada de
// dependências novas no package.json.
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { COR_LINHA, COR_LIME_ESCURO } from '@/lib/graficos'

export interface PdfLinha {
  header: string
  valor: string
}

export interface PdfSessao {
  titulo: string
  linhas: PdfLinha[]
}

export interface PdfOpcoes {
  nomeArquivo: string
  titulo: string
  filtros: string[]
  resumo: PdfSessao[]
  colunas: string[]
  linhas: string[][]
  rodapeTabela?: string
}

export function nomePdf(sufixo: string): string {
  const hoje = new Date()
  const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(
    hoje.getDate(),
  ).padStart(2, '0')}`
  return `${sufixo}-${iso}.pdf`
}

const MARGEM = 14
const LARGURA_UTIL = 210 - MARGEM * 2
const COR_VERDE = [63, 98, 18] // lime escuro usado no sistema
const COR_TEXTO = [51, 65, 85]
const COR_SUAVE = [100, 116, 139]
const COR_BORDA = [203, 213, 225]

export async function gerarPdfPadrao(opcoes: PdfOpcoes): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const { autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const { titulo, filtros, resumo, colunas, linhas } = opcoes

  const agora = new Date()
  const dataHora = agora.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const usuario = pb.authStore.record?.name || pb.authStore.record?.email || '—'

  // ── Cabeçalho ──────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(COR_VERDE[0], COR_VERDE[1], COR_VERDE[2])
  doc.text(titulo, MARGEM, 18)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(COR_SUAVE[0], COR_SUAVE[1], COR_SUAVE[2])
  doc.text(`Gerado em ${dataHora} por ${usuario}`, MARGEM, 24)

  const textoFiltros =
    filtros.length > 0 ? `Filtros: ${filtros.join(' | ')}` : 'sem filtros aplicados'
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8.5)
  const linhasFiltro = doc.splitTextToSize(textoFiltros, LARGURA_UTIL) as string[]
  doc.text(linhasFiltro, MARGEM, 29)

  // ── Resumo ─────────────────────────────────────────────────────────────────
  let y = 29 + linhasFiltro.length * 4.2 + 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(COR_TEXTO[0], COR_TEXTO[1], COR_TEXTO[2])
  doc.text('Resumo', MARGEM, y)
  y += 4

  for (const bloco of resumo) {
    if (bloco.linhas.length === 0) continue
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(COR_VERDE[0], COR_VERDE[1], COR_VERDE[2])
    doc.text(bloco.titulo, MARGEM, y)
    y += 4.5

    for (const linha of bloco.linhas) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(COR_SUAVE[0], COR_SUAVE[1], COR_SUAVE[2])
      doc.text(linha.header, MARGEM, y)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(COR_TEXTO[0], COR_TEXTO[1], COR_TEXTO[2])
      doc.text(linha.valor, MARGEM + 70, y)
      y += 5
    }
    y += 2
  }

  // ── Tabela ─────────────────────────────────────────────────────────────────
  const textoVazio = opcoes.rodapeTabela || 'Não há registros para os filtros selecionados.'
  const temLinhas = linhas.length > 0

  autoTable(doc, {
    head: [colunas],
    body: temLinhas ? linhas : [],
    startY: y + 2,
    margin: { left: MARGEM, right: MARGEM },
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 1.6,
      overflow: 'linebreak',
      textColor: COR_TEXTO,
      lineColor: COR_BORDA,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: COR_VERDE,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: [245, 248, 242] },
    ...(temLinhas
      ? {}
      : {
          body: [
            [
              {
                content: textoVazio,
                colSpan: Math.max(colunas.length, 1),
                styles: {
                  halign: 'center' as const,
                  fontStyle: 'italic' as const,
                  textColor: COR_SUAVE,
                },
              },
            ],
          ],
        }),
  })

  // ── Rodapé: identificação do sistema + numeração de páginas ────────────────
  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(COR_SUAVE[0], COR_SUAVE[1], COR_SUAVE[2])
    doc.text('CRM Condutiva Serviços', MARGEM, 290)
    if (total > 1) doc.text(`Página ${p} de ${total}`, 210 - MARGEM, 290, { align: 'right' })
  }

  doc.save(opcoes.nomeArquivo)
}

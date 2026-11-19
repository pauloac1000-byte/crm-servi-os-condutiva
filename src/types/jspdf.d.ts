// Declarações mínimas de tipos para jsPDF e jspdf-autotable, usados apenas
// pelo gerador de PDF do Dashboard (src/services/relatorio-pdf.ts), que os
// importa dinamicamente (await import). O pacote não está em package.json
// (instalado fora do fluxo do agente) — este arquivo dá ao tsc os tipos que
// o código usa: API de desenho (text/rect/font) e lastAutoTable.
declare module 'jspdf' {
  export interface TextOptionsLight {
    align?: 'left' | 'center' | 'right'
  }
  export class jsPDF {
    addPage(): jsPDF
    setPage(page: number): jsPDF
    getNumberOfPages(): number
    setFillColor(...args: number[]): jsPDF
    setTextColor(...args: number[]): jsPDF
    setFont(font: string, style?: string): jsPDF
    setFontSize(size: number): jsPDF
    rect(x: number, y: number, w: number, h: number, style?: string): jsPDF
    text(text: string | string[], x: number, y: number, options?: TextOptionsLight): jsPDF
    getTextWidth(text: string): number
    splitTextToSize(text: string, maxWidth: number): string[]
    save(filename?: string): jsPDF
    lastAutoTable?: { finalY: number }
  }
  export const jsPDF: typeof import('jspdf').jsPDF
}

declare module 'jspdf-autotable' {
  type Doc = import('jspdf').jsPDF
  export function autoTable(doc: Doc, options: Record<string, unknown>): void
  export type UserOptions = Record<string, unknown>
}

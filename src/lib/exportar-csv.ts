// Exportação em CSV das listas do CRM (Negócios, Visitas, Contratos, OS).
//
// Recebe já as linhas FILTRADAS da tela (o chamador passa o que está na
// tabela) e gera um arquivo com BOM UTF-8 (Excel/pt-BR), separador ";" e
// números em vírgula decimal. Somente leitura: nada é gravado no banco.

export type LinhaCsv = (string | number | null | undefined)[]

// escapa um valor para o formato CSV (sempre entre aspas, duplica aspas
// internas — formato aceito pelo Excel e LibreOffice)
const escapar = (v: string | number | null | undefined) => {
  const texto = v === null || v === undefined ? '' : String(v)
  return `"${texto.replace(/"/g, '""')}"`
}

export function montarCsv(colunas: string[], linhas: LinhaCsv[]): string {
  const corpo = linhas.map((l) => l.map(escapar).join(';')).join('\r\n')
  return `\uFEFF${colunas.map(escapar).join(';')}\r\n${corpo}${corpo ? '\r\n' : ''}`
}

// Dispara o download no navegador
export function baixarCsv(nomeArquivo: string, conteudo: string) {
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Convenção de nomes de arquivo: <lista>-<AAAA-MM-DD>.csv
export function nomeArquivoCsv(prefixo: string) {
  const hoje = new Date()
  const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(
    hoje.getDate(),
  ).padStart(2, '0')}`
  return `${prefixo}-${iso}.csv`
}

const fmtData = (v?: string | number | null) => {
  if (v === null || v === undefined || v === '') return ''
  const texto = String(v)
  const parte = texto.split(' ')[0].split('T')[0]
  const [a, m, d] = parte.split('-')
  return d && m && a ? `${d}/${m}/${a}` : texto
}

const fmtDataHora = (v?: string | number | null) => {
  if (v === null || v === undefined || v === '') return ''
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('pt-BR')
}

const fmtMoeda = (v: number | null | undefined) =>
  v === null || v === undefined ? '' : v.toFixed(2).replace('.', ',')

export interface ColunaOpcoes {
  data?: boolean
  dataHora?: boolean
  moeda?: boolean
}

// Monta uma linha a partir de uma lista de colunas com tipo opcional
export function linhaCsv(
  colunas: { valor: string | number | null | undefined; tipo?: ColunaOpcoes }[],
): LinhaCsv {
  return colunas.map((c) => {
    if (c.tipo?.data) return fmtData(c.valor)
    if (c.tipo?.dataHora) return fmtDataHora(c.valor)
    if (c.tipo?.moeda) return fmtMoeda(c.valor as number | null | undefined)
    return c.valor
  })
}

import { Fragment, createElement, type ReactNode } from 'react'

// Conversor mínimo e próprio de formatação do assistente para React — SEM
// biblioteca e SEM dangerouslySetInnerHTML: o texto é lido caractere a caractere
// e cada nó sai como elemento React (qualquer HTML digitado pelo modelo aparece
// literal, como texto, nunca interpretado pelo navegador).
//
// Suporta (sintaxe Markdown simples, uma linha por vez):
// - **negrito** e *itálico* no meio do texto
// - listas com "- item", "* item" ou "1. item" (com linhas em branco entre blocos)
// - tabelas com linhas de células separadas por "|" e separador |---|---|
// - parágrafos simples

// --- inline: **negrito** e *itálico* sobre texto JÁ ESCAPADO (texto puro) ---
function inline(texto: string): ReactNode[] {
  const nos: ReactNode[] = []
  // procura ** ** primeiro (negrito vence sobre itálico)
  const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*/g
  let ultimo = 0
  let m: RegExpExecArray | null
  let chave = 0
  while ((m = regex.exec(texto)) !== null) {
    if (m.index > ultimo) nos.push(texto.slice(ultimo, m.index))
    if (m[1] !== undefined) nos.push(createElement('strong', { key: 'b' + chave++ }, m[1]))
    else nos.push(createElement('em', { key: 'i' + chave++ }, m[2]))
    ultimo = m.index + m[0].length
  }
  if (ultimo < texto.length) nos.push(texto.slice(ultimo))
  return nos
}

// --- tabela: bloco de linhas com "| a | b |" e separador "| --- | --- |" ---
function eLinhaTabela(linha: string): boolean {
  const t = linha.trim()
  return t.startsWith('|') && t.endsWith('|') && t.length > 1
}
function eSeparadorTabela(linha: string): boolean {
  const t = linha.trim()
  if (!eLinhaTabela(linha)) return false
  const celulas = t
    .slice(1, -1)
    .split('|')
    .map((c) => c.trim())
  return celulas.length > 0 && celulas.every((c) => /^:?-{2,}:?$/.test(c) || c === '')
}
function celulas(linha: string): string[] {
  const t = linha.trim()
  return t
    .slice(1, -1)
    .split('|')
    .map((c) => c.trim())
}

function tabela(linhas: string[], chave: string): ReactNode {
  const corpo = linhas.filter((l) => !eSeparadorTabela(l))
  const thead = corpo.length > 1 ? celulas(corpo[0]) : []
  const linhasCorpo = corpo.length > 1 ? corpo.slice(1) : []
  return createElement(
    'div',
    { key: chave, className: 'my-2 overflow-x-auto' },
    createElement(
      'table',
      { className: 'w-full border-collapse text-xs' },
      thead.length
        ? createElement(
            'thead',
            null,
            createElement(
              'tr',
              null,
              thead.map((c, i) =>
                createElement(
                  'th',
                  {
                    key: i,
                    className:
                      'border border-slate-300 bg-slate-100 px-2 py-1 text-left font-semibold',
                  },
                  inline(c),
                ),
              ),
            ),
          )
        : null,
      createElement(
        'tbody',
        null,
        linhasCorpo.map((l, i) =>
          createElement(
            'tr',
            { key: i },
            celulas(l).map((c, j) =>
              createElement(
                'td',
                { key: j, className: 'border border-slate-200 px-2 py-1 align-top' },
                inline(c),
              ),
            ),
          ),
        ),
      ),
    ),
  )
}

// --- lista: sequência de linhas "- item", "* item" ou "1. item" ---
function eItemLista(linha: string): boolean {
  return /^[-*]\s+\S/.test(linha.trim()) || /^\d+[.)]\s+\S/.test(linha.trim())
}
function conteudoItem(linha: string): { texto: string; ordenada: boolean } {
  const t = linha.trim()
  const ordenada = /^\d+[.)]\s+/.test(t)
  return { texto: t.replace(/^([-*]|\d+[.)])\s+/, ''), ordenada }
}

function lista(linhas: string[], chave: string): ReactNode {
  const { ordenada } = conteudoItem(linhas[0])
  const itens = linhas.map((l) => conteudoItem(l).texto)
  return createElement(
    ordenada ? 'ol' : 'ul',
    {
      key: chave,
      className: 'my-1.5 ml-4 space-y-0.5 ' + (ordenada ? 'list-decimal' : 'list-disc'),
    },
    itens.map((t, i) => createElement('li', { key: i, className: 'pl-1' }, inline(t))),
  )
}

// --- principal: divide em blocos (parágrafo / lista / tabela) e monta ---
export function formatarRespostaAssistente(texto: string): ReactNode {
  if (!texto) return null
  const linhas = texto.replace(/\r\n/g, '\n').split('\n')

  const blocos: ReactNode[] = []
  let paragrafo: string[] = []
  let chave = 0

  const descarregarParagrafo = () => {
    if (paragrafo.length) {
      const t = paragrafo.join(' ')
      blocos.push(
        createElement('p', { key: 'p' + chave++, className: 'whitespace-pre-wrap' }, inline(t)),
      )
      paragrafo = []
    }
  }

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i]

    // tabela: junta todas as linhas de células consecutivas
    if (eLinhaTabela(linha)) {
      descarregarParagrafo()
      const inicio = i
      while (i < linhas.length && eLinhaTabela(linhas[i])) i++
      const linhasTabela = linhas.slice(inicio, i)
      blocos.push(tabela(linhasTabela, 't' + chave++))
      i--
      continue
    }

    // lista: junta itens consecutivos
    if (eItemLista(linha)) {
      descarregarParagrafo()
      const inicio = i
      while (i < linhas.length && eItemLista(linhas[i])) i++
      blocos.push(lista(linhas.slice(inicio, i), 'l' + chave++))
      i--
      continue
    }

    // linha em branco fecha o parágrafo
    if (!linha.trim()) {
      descarregarParagrafo()
      continue
    }

    paragrafo.push(linha.trim())
  }
  descarregarParagrafo()

  return createElement(Fragment, null, blocos)
}

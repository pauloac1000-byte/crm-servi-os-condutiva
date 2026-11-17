// Período GLOBAL do Dashboard (filtros do topo): tipo de período, intervalo
// personalizado e responsável comercial. Estado elevado em src/pages/Index.tsx
// e consumido por TODOS os blocos (KPIs, funil, custo de aquisição, metas e
// receita recorrente).
//
// Opções de período (especificação do usuário):
// - 'mes'        → mês corrente (padrão inicial — coerente com os quatro cartões
//                  e o funil, que hoje abrem na visão mensal)
// - 'trimestre'  → trimestre corrente do ano
// - 'ano2026'    → ano de 2026 LITERAL (operação da Condutiva está em 2026;
//                  a opção é fixa, não vira "ano corrente")
// - 'personalizado' → intervalo livre com duas datas (inicio/fim)
//
// A última seleção (período + responsável) persiste em localStorage — é
// preferência local de quem usa o Dashboard, não dado da aplicação: nada novo
// no banco. A chave inclui o id do usuário (cada um mantém a sua seleção).

export type PeriodoTipo = 'mes' | 'trimestre' | 'ano2026' | 'personalizado'

export interface SelecaoFiltros {
  tipo: PeriodoTipo
  // só usado quando tipo = 'personalizado' ('YYYY-MM-DD')
  dataInicio?: string
  dataFim?: string
  // id do responsável comercial ('' = todos)
  responsavel: string
}

export const ANO_FIXO = 2026

const CHAVE_STORAGE = 'dashboard-filtros'

const pad = (n: number) => String(n).padStart(2, '0')

const isoDia = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// ---------- resolução do período (tipo → dataDe/dataAte) ----------

export interface PeriodoResolvido {
  dataDe: string // 'YYYY-MM-DD'
  dataAte: string // 'YYYY-MM-DD'
  tipo: PeriodoTipo
  // mês (1-12) e ano do início do período — usado na escolha da meta mensal
  // vs. anual dos KPIs (mesma semântica do motor kpis.ts)
  ano: number
  mes: number | undefined
}

export function resolverPeriodo(sel: SelecaoFiltros): PeriodoResolvido {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mesAtual = hoje.getMonth() + 1

  if (sel.tipo === 'mes') {
    return {
      dataDe: `${ano}-${pad(mesAtual)}-01`,
      dataAte: isoDia(new Date(ano, mesAtual, 0)),
      tipo: sel.tipo,
      ano,
      mes: mesAtual,
    }
  }
  if (sel.tipo === 'trimestre') {
    const mesInicioTrim = Math.floor((mesAtual - 1) / 3) * 3 + 1
    return {
      dataDe: `${ano}-${pad(mesInicioTrim)}-01`,
      dataAte: isoDia(new Date(ano, mesInicioTrim + 3, 0)),
      tipo: sel.tipo,
      ano,
      mes: undefined, // período de 3 meses → meta anual (mesma regra do kpis.ts)
    }
  }
  if (sel.tipo === 'ano2026') {
    return {
      dataDe: `${ANO_FIXO}-01-01`,
      dataAte: `${ANO_FIXO}-12-31`,
      tipo: sel.tipo,
      ano: ANO_FIXO,
      mes: undefined,
    }
  }
  // personalizado: datas escolhidas; incompleto → mês corrente como fallback
  const ini = sel.dataInicio
  const fim = sel.dataFim
  if (ini && fim && ini <= fim) {
    return {
      dataDe: ini,
      dataAte: fim,
      tipo: sel.tipo,
      ano: Number(ini.slice(0, 4)) || ano,
      // mês único = mesmo mês em início e fim (meta mensal, como no kpis.ts)
      mes: ini.slice(0, 7) === fim.slice(0, 7) ? Number(ini.slice(5, 7)) : undefined,
    }
  }
  return { ...resolverPeriodo({ ...sel, tipo: 'mes' }), tipo: 'personalizado' }
}

// ---------- rótulo do período (ao lado do título "Dashboard") ----------

const MESES_LONGOS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]

export function rotuloPeriodo(sel: SelecaoFiltros): string {
  const p = resolverPeriodo(sel)
  if (sel.tipo === 'mes') {
    const m = Number(p.dataDe.slice(5, 7))
    return `${MESES_LONGOS[m - 1]}/${p.dataDe.slice(0, 4)}`
  }
  if (sel.tipo === 'trimestre') {
    const trim = Math.floor((Number(p.dataDe.slice(5, 7)) - 1) / 3) + 1
    return `${trim}º trimestre de ${p.dataDe.slice(0, 4)}`
  }
  if (sel.tipo === 'ano2026') return 'Ano de 2026'
  const fmt = (iso: string) => {
    const [a, m, d] = iso.split('-')
    return `${d}/${m}/${a}`
  }
  return `${fmt(p.dataDe)} – ${fmt(p.dataAte)}`
}

// ---------- persistência (localStorage, por usuário) ----------

const padrao = (): SelecaoFiltros => ({ tipo: 'mes', responsavel: '' })

export function carregarSelecao(userId: string): SelecaoFiltros {
  try {
    const bruto = localStorage.getItem(`${CHAVE_STORAGE}:${userId}`)
    if (!bruto) return padrao()
    const parse = JSON.parse(bruto) as Partial<SelecaoFiltros>
    const tipo: PeriodoTipo = ['mes', 'trimestre', 'ano2026', 'personalizado'].includes(
      parse.tipo ?? '',
    )
      ? (parse.tipo as PeriodoTipo)
      : 'mes'
    return {
      tipo,
      dataInicio: typeof parse.dataInicio === 'string' ? parse.dataInicio : undefined,
      dataFim: typeof parse.dataFim === 'string' ? parse.dataFim : undefined,
      responsavel: typeof parse.responsavel === 'string' ? parse.responsavel : '',
    }
  } catch {
    return padrao()
  }
}

export function salvarSelecao(userId: string, sel: SelecaoFiltros): void {
  try {
    localStorage.setItem(`${CHAVE_STORAGE}:${userId}`, JSON.stringify(sel))
  } catch {
    /* storage indisponível — segue sem persistir */
  }
}

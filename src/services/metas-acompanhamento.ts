import pb from '@/lib/pocketbase/client'
import { Contrato, Meta } from '@/types/crm'

// MOTOR do bloco "Metas" do Dashboard: realizado de RCS mês a mês de um ano
// contra a meta da coleção "metas" (Skip Cloud, sem dados de exemplo).
//
// Definições exatas (mesmas do motor de KPIs, src/services/kpis.ts):
// - RCS realizado de um mês = soma do valor contratado (valor_implantacao +
//   valor_mensal × prazo em meses) dos contratos ASSINADOS no mês; "assinado
//   no mês" = data_inicio dentro dele (fallback: created).
// - Acumulado = soma corrida jan → dez do realizado mensal.
// - Meta mensal = registro da coleção metas (kpi = RCS, mes = 1..12 do ano);
//   sem meta mensal cadastrada para um mês, usa meta anual ÷ 12 (mesma lógica
//   da divisão proporcional do ano).
// - Meta acumulada = soma corrida das metas mensais jan → mês.
// - Percentual do ano realizado = acumulado realizado ÷ meta anual × 100.
// - Quanto falta por mês = (meta anual − acumulado realizado) ÷ meses
//   restantes até dezembro (a partir do mês atual, quando o ano é o corrente);
//   se o ano já encerrou, mostra apenas quanto falta no total.
//
// Sem contratos assinados no ano: acumulado realizado = null — quem consome
// exibe "—" e o gráfico fica vazio.

export interface MetasMes {
  comp: string // 'AAAA-MM'
  mes: number // 1-12
  // valor contratado assinado no mês; null sem contratos no mês
  realizado: number | null
  // meta mensal (coleção metas; fallback meta anual ÷ 12)
  meta: number | null
  // soma corrida do realizado até o mês; null enquanto o realizado do ano é null
  acumuladoRealizado: number | null
  // soma corrida da meta até o mês
  metaAcumulada: number | null
}

export interface MetasAcompanhamento {
  ano: number
  // meta anual de RCS (coleção metas, mes = 0); null sem registro
  metaAnual: number | null
  // acumulado realizado de jan → dez; null sem contratos no ano
  acumuladoRealizado: number | null
  // meta acumulada até o mês de referência (último mês com realizado; sem
  // realizado nenhum, a meta acumulada de dezembro)
  metaAcumuladaAtual: number | null
  // acumulado − meta acumulada atual; null sem base
  diferenca: number | null
  // acumulado realizado ÷ meta anual × 100; null sem realizado ou sem meta
  percentualAno: number | null
  // quanto falta no total até a meta anual; null sem meta anual ou meta batida
  faltaTotal: number | null
  // quanto falta por mês até dezembro; null quando não há meses restantes,
  // sem meta anual, sem realizado ou meta já batida
  faltaPorMes: number | null
  // nº de meses restantes até dezembro a partir do mês atual
  mesesRestantes: number
  // 12 meses do ano (jan → dez)
  mensal: MetasMes[]
  // true quando nenhum contrato assinado no ano (gráfico vazio + "—")
  semDados: boolean
}

export interface MetasEntrada {
  // ano do acompanhamento (coleção metas)
  ano: number
  // janela de recorte do realizado dentro do ano (filtro global do Dashboard):
  // AAAA-MM-DD; ausentes = o ano inteiro
  dataDe?: string
  dataAte?: string
  // id do responsável comercial (filtro global do Dashboard): contratos →
  // contratos.responsavel. undefined/'' = todos
  responsavel?: string
}

// ---------- helpers ----------

// Parte AAAA-MM-DD de uma data PocketBase (sem deslocamento de fuso)
const parteData = (d?: string) => d?.split(' ')[0].split('T')[0] || ''

// Prazo em meses do contrato: data_fim − data_inicio (arredondado); sem
// data_fim usa o padrão de 12 meses do funil (mesma regra do motor kpis.ts)
const prazoMeses = (c: Contrato) => {
  const ini = parteData(c.data_inicio)
  const fim = parteData(c.data_fim)
  if (ini && fim) {
    const meses = Math.round(
      (new Date(fim).getTime() - new Date(ini).getTime()) / (1000 * 60 * 60 * 24 * 30.44),
    )
    if (meses > 0) return meses
    return 0
  }
  return 12
}

const valorContratado = (c: Contrato) =>
  (c.valor_implantacao || 0) + (c.valor_mensal || 0) * prazoMeses(c)

// ---------- função central ----------

export async function calcularMetasAcompanhamento(
  entrada: MetasEntrada,
): Promise<MetasAcompanhamento> {
  const ano = entrada.ano
  const resp = entrada.responsavel || ''
  // janela do realizado dentro do ano (filtro global do Dashboard): padrão =
  // ano inteiro; com dataDe/dataAte, recorta o realizado a essas datas
  const de = entrada.dataDe || `${ano}-01-01`
  const ate = entrada.dataAte || `${ano}-12-31`

  const [contratos, metas] = await Promise.all([
    pb.collection('contratos').getFullList<Contrato>({}),
    pb
      .collection('metas')
      .getFullList<Meta>({ filter: `kpi = 'RCS' && ano = ${ano}` })
      .catch(() => [] as Meta[]),
  ])

  // --- metas anual e mensais da coleção ---
  const metaAnualRec = metas.find((m) => (m.mes || 0) === 0)
  const metaAnual = metaAnualRec?.valor_meta ?? null
  const fallbackMensal = metaAnual !== null ? metaAnual / 12 : null

  // --- realizado mensal (contratos assinados no mês) ---
  const realizadoPorMes = new Map<number, number>()
  let algumContrato = false
  for (const c of contratos) {
    if (resp && c.responsavel !== resp) continue
    const base = parteData(c.data_inicio) || parteData(c.created)
    // dentro do ano E dentro da janela do período escolhido
    if (!base || !base.startsWith(`${ano}-`)) continue
    if (base < de || base > ate) continue
    algumContrato = true
    const mes = Number(base.slice(5, 7))
    realizadoPorMes.set(mes, (realizadoPorMes.get(mes) || 0) + valorContratado(c))
  }

  // --- série mensal com acumulados ---
  const mensal: MetasMes[] = []
  let acumRealizado = 0
  let acumMeta = 0
  let acumuladoRealizado: number | null = null
  for (let mes = 1; mes <= 12; mes++) {
    const realizadoMes = realizadoPorMes.get(mes)
    if (realizadoMes !== undefined) {
      acumRealizado += realizadoMes
      acumuladoRealizado = acumRealizado
    }
    const metaMensal = metas.find((m) => m.mes === mes)?.valor_meta ?? fallbackMensal
    if (metaMensal !== null) acumMeta += metaMensal
    mensal.push({
      comp: `${ano}-${String(mes).padStart(2, '0')}`,
      mes,
      realizado: realizadoMes !== undefined ? realizadoMes : null,
      meta: metaMensal,
      acumuladoRealizado,
      metaAcumulada: metaMensal !== null || acumMeta > 0 ? acumMeta : null,
    })
  }

  // --- mês de referência dos acumulados: último mês com realizado; sem
  // realizado nenhum, dezembro (linha da meta acumulada completa) ---
  const ultimoMesRealizado = mensal.reduce((acc, m) => (m.realizado !== null ? m.mes : acc), 0)
  const mesRef = ultimoMesRealizado || 12
  const pontoRef = mensal[mesRef - 1]
  const metaAcumuladaAtual = pontoRef?.metaAcumulada ?? null
  const diferenca =
    acumuladoRealizado !== null && metaAcumuladaAtual !== null
      ? acumuladoRealizado - metaAcumuladaAtual
      : null

  // --- percentual do ano realizado ---
  const percentualAno =
    acumuladoRealizado !== null && metaAnual !== null && metaAnual > 0
      ? (acumuladoRealizado / metaAnual) * 100
      : null

  // --- quanto falta até dezembro ---
  const faltaTotal =
    metaAnual !== null && acumuladoRealizado !== null
      ? Math.max(0, metaAnual - acumuladoRealizado)
      : null

  const anoAtual = new Date().getFullYear()
  const mesAtual = new Date().getMonth() + 1
  let mesesRestantes = 12
  if (ano === anoAtual) mesesRestantes = 12 - mesAtual + 1
  else if (ano < anoAtual) mesesRestantes = 0

  const faltaPorMes =
    faltaTotal !== null && faltaTotal > 0 && mesesRestantes > 0 ? faltaTotal / mesesRestantes : null

  return {
    ano,
    metaAnual,
    acumuladoRealizado,
    metaAcumuladaAtual,
    diferenca,
    percentualAno,
    faltaTotal,
    faltaPorMes,
    mesesRestantes,
    mensal,
    semDados: !algumContrato,
  }
}

// ---------- formatação compartilhada (usada pelo componente do bloco) ----------

export const formatarMoedaMetas = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v)

export const formatarMoedaMetasOuTraco = (v: number | null) =>
  v === null ? '—' : formatarMoedaMetas(v)

export const formatarDiferenca = (v: number | null) => {
  if (v === null) return '—'
  const sinal = v > 0 ? '+' : v < 0 ? '−' : ''
  return `${sinal}${formatarMoedaMetas(Math.abs(v))}`
}

export const formatarPercentualMetas = (v: number | null) =>
  v === null ? '—' : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(v) + '%'

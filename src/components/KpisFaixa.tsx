import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useKpis } from '@/hooks/use-kpis'
import type { KpiResultado, KpiSituacao } from '@/services/kpis'

// Faixa com os cinco KPIs da unidade de serviços no topo do Dashboard.
// Toda a conta vem do motor src/services/kpis.ts (via useKpis); aqui só há
// formatação e o seletor de período que alimenta a própria faixa.
//
// O período também pode ser CONTROLADO por quem renderiza a faixa (props
// opcionais periodo/onChangePeriodo — estado elevado). Sem as props, o
// comportamento é o de sempre: seletor próprio da faixa. O funil do Dashboard
// (FunilVendas) usa o estado elevado para compartilhar o período da faixa.

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

// Barra de atingimento limitada visualmente em 120%
const LIMITE_BARRA = 120

const SEMAFORO: Record<Exclude<KpiSituacao, null>, { barra: string; texto: string }> = {
  verde: { barra: 'bg-emerald-500', texto: 'text-emerald-600' },
  ambar: { barra: 'bg-amber-500', texto: 'text-amber-600' },
  vermelho: { barra: 'bg-rose-500', texto: 'text-rose-600' },
}

// Período compartilhado da faixa: 0 = ano inteiro; 1-12 = mês único, mais o ano
export interface PeriodoFaixa {
  mes: number
  ano: number
}

const fmtNumero = (v: number, casas: number) =>
  new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: casas,
  }).format(v)

const fmtMoeda = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v)

const fmtValor = (k: KpiResultado, v: number | null) => {
  if (v === null) return '—'
  return k.formato === 'moeda' ? fmtMoeda(v) : `${fmtNumero(v, 1)}%`
}

const fmtDiferenca = (k: KpiResultado) => {
  if (k.diferenca === null) return '—'
  const sinal = k.diferenca > 0 ? '+' : k.diferenca < 0 ? '−' : ''
  const abs = Math.abs(k.diferenca)
  if (k.formato === 'moeda') return `${sinal}${fmtMoeda(abs)}`
  return `${sinal}${fmtNumero(abs, 1)} pp`
}

export function KpisFaixa({
  periodo,
  onChangePeriodo,
}: {
  periodo?: PeriodoFaixa
  onChangePeriodo?: (p: PeriodoFaixa) => void
}) {
  const anoAtual = new Date().getFullYear()
  const [anoInterno, setAnoInterno] = useState(anoAtual)
  // 0 = ano inteiro; 1-12 = mês único
  const [mesInterno, setMesInterno] = useState(0)
  const anos = [anoAtual - 2, anoAtual - 1, anoAtual, anoAtual + 1]

  const mes = periodo ? periodo.mes : mesInterno
  const ano = periodo ? periodo.ano : anoInterno
  const setMes = (v: number) => {
    setMesInterno(v)
    onChangePeriodo?.({ mes: v, ano })
  }
  const setAno = (v: number) => {
    setAnoInterno(v)
    onChangePeriodo?.({ mes, ano: v })
  }

  const { dados, erro } = useKpis(mes ? { ano, mes } : { ano })

  const cartoes: KpiResultado[] = dados ? dados.lista : []

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Indicadores da unidade de serviços
        </h3>
        <div className="flex items-center gap-2">
          <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
            <SelectTrigger className="h-9 w-[150px] text-xs bg-white" aria-label="Mês">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Ano inteiro</SelectItem>
              {MESES.map((nome, i) => (
                <SelectItem key={nome} value={String(i + 1)}>
                  {nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
            <SelectTrigger className="h-9 w-[100px] text-xs bg-white" aria-label="Ano">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {anos.map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {erro && <p className="text-xs text-rose-600">Não foi possível calcular os indicadores.</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {(cartoes.length > 0 ? cartoes : Array.from({ length: 5 }, () => null)).map((k, i) => (
          <KpiCartao key={k?.kpi ?? i} kpi={k} />
        ))}
      </div>
    </div>
  )
}

function KpiCartao({ kpi }: { kpi: KpiResultado | null }) {
  const situacao = kpi?.situacao ?? null
  const cor = situacao ? SEMAFORO[situacao] : null
  const atingimento = kpi?.atingimento ?? null
  const larguraBarra =
    atingimento === null ? 0 : Math.min(Math.max(atingimento, 0), LIMITE_BARRA) / LIMITE_BARRA

  return (
    <Card className="border-slate-200/80 bg-white shadow-sm rounded-2xl">
      <CardContent className="p-5 space-y-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {kpi ? rotuloCurto(kpi) : '—'}
        </p>
        <h3 className="text-2xl font-black text-slate-900">
          {kpi ? fmtValor(kpi, kpi.realizado) : '—'}
        </h3>
        <p className="text-[11px] text-slate-500 font-medium">
          Meta: {kpi && kpi.meta !== undefined ? fmtValor(kpi, kpi.meta) : '—'}
        </p>
        <p className="text-[11px] text-slate-500 font-medium">
          Diferença: {kpi ? fmtDiferenca(kpi) : '—'}
        </p>
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${cor ? cor.barra : 'bg-slate-300'}`}
              style={{ width: `${larguraBarra * 100}%` }}
            />
          </div>
          <span className={`text-xs font-bold tabular-nums ${cor ? cor.texto : 'text-slate-500'}`}>
            {atingimento === null ? '—' : `${Math.round(atingimento)}%`}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

const rotuloCurto = (k: KpiResultado) => {
  switch (k.kpi) {
    case 'RCS':
      return 'RCS'
    case 'taxa_conversao_leads':
      return 'Taxa de Conversão de Leads'
    case 'ticket_medio':
      return 'Ticket Médio'
    case 'os_no_prazo':
      return 'OS no Prazo'
    case 'NRR':
      return 'NRR'
  }
}

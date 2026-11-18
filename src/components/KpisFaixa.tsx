import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useKpis } from '@/hooks/use-kpis'
import type { KpisEntrada, KpiResultado, KpiSituacao } from '@/services/kpis'
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { INDICADORES_KPI_FAIXA, type IndicadorDoc } from '@/lib/glossario-indicadores'
import { cn } from '@/lib/utils'

// Faixa com os cinco KPIs da unidade de serviços no topo do Dashboard.
// Toda a conta vem do motor src/services/kpis.ts (via useKpis); aqui só há
// formatação.
//
// O período e o responsável vêm do FILTRO GLOBAL do Dashboard (estado elevado
// em src/pages/Index.tsx, barra DashboardFiltrosBar) — a faixa não tem mais
// seletor próprio: todos os blocos da página respondem ao mesmo filtro.

// Barra de atingimento limitada visualmente em 120%
const LIMITE_BARRA = 120

const SEMAFORO: Record<
  Exclude<KpiSituacao, null>,
  { barra: string; texto: string; Icone: typeof CheckCircle2; rotulo: string }
> = {
  verde: {
    barra: 'bg-emerald-500',
    texto: 'text-emerald-600',
    Icone: CheckCircle2,
    rotulo: 'meta atingida',
  },
  ambar: {
    barra: 'bg-amber-500',
    texto: 'text-amber-600',
    Icone: AlertTriangle,
    rotulo: 'próximo da meta',
  },
  vermelho: {
    barra: 'bg-rose-500',
    texto: 'text-rose-600',
    Icone: XCircle,
    rotulo: 'abaixo da meta',
  },
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

export function KpisFaixa({ entrada }: { entrada: KpisEntrada }) {
  const { dados, erro } = useKpis(entrada)

  const cartoes: KpiResultado[] = dados ? dados.lista : []

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Indicadores da unidade de serviços
        </h3>
      </div>

      {erro && <p className="text-xs text-rose-600">Não foi possível calcular os indicadores.</p>}

      {/* Celular: duas colunas (o quinto cartão ocupa a linha inteira);
          desktop (lg+) mantém a faixa de cinco, como sempre foi. */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
        {(cartoes.length > 0 ? cartoes : Array.from({ length: 5 }, () => null)).map((k, i) => (
          <KpiCartao
            key={k?.kpi ?? i}
            kpi={k}
            ultimo={cartoes.length > 0 && i === cartoes.length - 1}
            doc={INDICADORES_KPI_FAIXA[i]}
          />
        ))}
      </div>
    </div>
  )
}

function KpiCartao({
  kpi,
  ultimo,
  doc,
}: {
  kpi: KpiResultado | null
  ultimo?: boolean
  doc?: IndicadorDoc
}) {
  const [detalhes, setDetalhes] = useState(false)
  const situacao = kpi?.situacao ?? null
  const cor = situacao ? SEMAFORO[situacao] : null
  const IconeSituacao = cor?.Icone
  const atingimento = kpi?.atingimento ?? null
  const larguraBarra =
    atingimento === null ? 0 : Math.min(Math.max(atingimento, 0), LIMITE_BARRA) / LIMITE_BARRA

  return (
    <Card
      className={`border-slate-200/80 bg-white shadow-sm rounded-2xl ${
        ultimo ? 'col-span-2 lg:col-span-1' : ''
      }`}
    >
      <CardContent className="p-5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] lg:text-xs font-bold text-slate-500 uppercase tracking-wider leading-tight">
            {kpi ? rotuloCurto(kpi) : '—'}
          </p>
          {doc && (
            <button
              type="button"
              aria-label={`Como é calculado: ${doc.nome}`}
              title="Como é calculado"
              onClick={() => setDetalhes(true)}
              className="shrink-0 rounded-full p-1 text-slate-300 hover:text-teal-700 hover:bg-teal-50 transition-colors"
            >
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
        <h3 className="text-2xl font-black text-slate-900">
          {kpi ? fmtValor(kpi, kpi.realizado) : '—'}
        </h3>
        <p className="text-[11px] text-slate-500 font-medium">
          Meta: {kpi && kpi.meta !== undefined ? fmtValor(kpi, kpi.meta) : '—'}
        </p>
        <p className="text-[11px] text-slate-500 font-medium">
          Diferença: {kpi ? fmtDiferenca(kpi) : '—'}
        </p>
        {/* percentual escrito ao lado da barra (a cor não é a única
            informação) + situação com rótulo textual e ícone, além do
            semáforo; a barra é role="progressbar" para leitores de tela */}
        <div className="flex items-center gap-2">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={LIMITE_BARRA}
            aria-valuenow={
              atingimento !== null ? Math.round(Math.min(atingimento, LIMITE_BARRA)) : undefined
            }
            aria-label={`Atingimento da meta de ${kpi ? rotuloCurto(kpi) : 'KPI'}`}
            className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden"
          >
            <div
              className={`h-full rounded-full barra-progresso ${cor ? cor.barra : 'bg-slate-300'}`}
              style={{ width: `${larguraBarra * 100}%` }}
            />
          </div>
          <span className={`text-xs font-bold tabular-nums ${cor ? cor.texto : 'text-slate-500'}`}>
            {atingimento === null ? '—' : `${Math.round(atingimento)}%`}
          </span>
        </div>
        {/* situação sempre com rótulo de texto + ícone (não só pela cor) */}
        <p
          className={`text-[10px] font-semibold flex items-center gap-1 ${
            cor ? cor.texto : 'text-slate-400'
          }`}
        >
          {IconeSituacao && <IconeSituacao className="h-3 w-3 shrink-0" aria-hidden="true" />}
          {cor ? cor.rotulo : 'sem meta para comparar'}
        </p>

        {/* detalhe "como é calculado": fórmula, fonte, meta e leitura —
            mesmo conteúdo do Glossário de indicadores */}
        {doc && (
          <Dialog open={detalhes} onOpenChange={setDetalhes}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-slate-900">{doc.nome}</DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Como este indicador é calculado (ver também o Glossário de indicadores no menu
                  lateral)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Fórmula
                  </p>
                  <p className="text-slate-700 text-[13px] leading-relaxed">{doc.fórmula}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Fonte dos dados
                  </p>
                  <p className="text-slate-700 text-[13px] leading-relaxed">{doc.fonte}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Meta
                  </p>
                  <p className="text-slate-700 text-[13px] leading-relaxed">{doc.meta}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Leitura do indicador
                  </p>
                  <p className={cn('text-slate-700 text-[13px] leading-relaxed')}>{doc.leitura}</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
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

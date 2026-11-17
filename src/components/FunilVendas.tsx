import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useFunil } from '@/hooks/use-funil'
import type { FunilEtapaResultado, FunilPeriodo } from '@/services/funil'
import type { PeriodoFaixa } from '@/components/KpisFaixa'
import { AlertTriangle } from 'lucide-react'

// Bloco do Dashboard: funil de 7 etapas com taxa de conversão.
// Toda a conta vem do motor src/services/funil.ts (via useFunil) — nada é
// recalculado aqui; o componente só formata e desenha. O período é o mesmo
// seletor da faixa de KPIs (estado elevado em Index.tsx).

const MESES_PT = [
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

const fmtMoeda = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v)

const fmtPercentual = (v: number | null) => (v === null ? '—' : `${Math.round(v)}%`)

const fmtDias = (v: number | null) => (v === null ? '—' : `${Math.round(v)} dias`)

// Largura da barra proporcional à etapa com mais negócios no período
const larguraBarra = (etapa: FunilEtapaResultado, maximo: number) =>
  maximo > 0 ? Math.max((etapa.negocios / maximo) * 100, 2) : 0

// Sem movimentação no período: nenhuma etapa com negócios nem conversão total
const semMovimentacao = (dados: FunilPeriodo) =>
  dados.etapas.every((e) => e.negocios === 0) && dados.conversaoTotal === null

export function FunilVendas({ periodo }: { periodo: PeriodoFaixa }) {
  const ano = periodo.ano
  const mes = periodo.mes
  const prefixoMes = `${ano}-${String(mes).padStart(2, '0')}`
  const dataDe = mes ? `${prefixoMes}-01` : `${ano}-01-01`
  const dataAte = mes
    ? `${prefixoMes}-${String(new Date(ano, mes, 0).getDate()).padStart(2, '0')}`
    : `${ano}-12-31`

  const { dados, loading, erro } = useFunil({ dataDe, dataAte })

  const maximo = dados ? Math.max(...dados.etapas.map((e) => e.negocios), 1) : 1
  const vazio = !loading && !erro && (!dados || semMovimentacao(dados))

  return (
    <Card className="border-slate-200/80 bg-white shadow-sm rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
          <span>Funil de Vendas por Etapa</span>
          <span className="text-xs font-normal text-slate-400">
            {mes ? `${MESES_PT[mes - 1]}/${ano}` : `Ano ${ano}`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {erro && <p className="text-xs text-rose-600">Não foi possível calcular o funil.</p>}

        {vazio ? (
          <div className="py-8 text-center space-y-1">
            <p className="text-2xl font-black text-slate-300">—</p>
            <p className="text-xs text-slate-400">Sem movimentação no período</p>
          </div>
        ) : (
          dados && (
            <>
              {/* topo: conversão total e tempo médio de ciclo */}
              <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Conversão total (Lead → Cliente ativo)
                  </p>
                  <p className="text-xl font-black text-slate-900">
                    {fmtPercentual(dados.conversaoTotal)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Tempo médio de ciclo
                  </p>
                  <p className="text-xl font-black text-slate-900">
                    {fmtDias(dados.tempoMedioCicloDias)}
                  </p>
                </div>
              </div>

              {/* barras horizontais proporcionais, com conversão entre etapas */}
              <div className="space-y-3">
                {dados.etapas.map((etapa, i) => (
                  <FunilLinha
                    key={etapa.ordem}
                    etapa={etapa}
                    maximo={maximo}
                    conversaoAnterior={i > 0 ? dados.etapas[i - 1].conversaoProxima : null}
                  />
                ))}
              </div>
            </>
          )
        )}
      </CardContent>
    </Card>
  )
}

function FunilLinha({
  etapa,
  maximo,
  conversaoAnterior,
}: {
  etapa: FunilEtapaResultado
  maximo: number
  conversaoAnterior: number | null
}) {
  const gargalo = etapa.gargalo
  // gargalo: cor de alerta (âmbar); demais etapas: cor oficial da etapa
  const corBarra = gargalo ? '#F59E0B' : etapa.cor || '#0F766E'

  return (
    <div className="space-y-1">
      {conversaoAnterior !== null && (
        <p className="text-[10px] text-slate-400 font-semibold pl-1">
          conversão da etapa anterior: {fmtPercentual(conversaoAnterior)}
        </p>
      )}
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="flex items-center gap-2 font-semibold text-slate-800">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: corBarra }} />
          {etapa.nome} ({etapa.negocios})
          {gargalo && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <AlertTriangle className="h-3 w-3" />
              menor conversão do período
            </span>
          )}
        </span>
        <span className="font-bold text-slate-900">{fmtMoeda(etapa.valor)}</span>
      </div>
      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${larguraBarra(etapa, maximo)}%`, backgroundColor: corBarra }}
        />
      </div>
    </div>
  )
}

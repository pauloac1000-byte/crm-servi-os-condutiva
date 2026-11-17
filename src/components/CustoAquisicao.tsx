import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCustoAquisicao } from '@/hooks/use-custo-aquisicao'
import type { CustoAquisicaoEntrada } from '@/services/custo-aquisicao'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { formatarMoeda, formatarNumero, formatarIndicadorMoeda } from '@/services/custo-aquisicao'

// Bloco do Dashboard: custo de aquisição da unidade de serviços.
// Quatro números do período + gráfico de 12 meses (gasto mensal em visitas em
// barras, contratos assinados em linha) + retorno por real investido.
// Toda a conta vem do motor src/services/custo-aquisicao.ts (via
// useCustoAquisicao); aqui só há formatação e desenho. O período e o
// responsável vêm do FILTRO GLOBAL do Dashboard (estado elevado em Index.tsx).

// rótulo curto "Mmm/AA" para o eixo do gráfico
const MESES_PT = [
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
const rotuloMes = (comp: string) => {
  const m = Number(comp.slice(5, 7))
  const a = Number(comp.slice(0, 4))
  if (!m || !a) return comp
  return `${MESES_PT[m - 1]}/${String(a).slice(2)}`
}

interface Props {
  entrada: CustoAquisicaoEntrada
}

export function CustoAquisicao({ entrada }: Props) {
  const { dados, loading, erro } = useCustoAquisicao(entrada)

  if (loading) {
    return (
      <Card className="border-slate-200/80 bg-white shadow-sm rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold text-slate-900">Custo de Aquisição</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-sm text-slate-400">Calculando…</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200/80 bg-white shadow-sm rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold text-slate-900">Custo de Aquisição</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        {erro && (
          <p className="text-xs text-rose-600">Não foi possível calcular o custo de aquisição.</p>
        )}

        {/* --- quatro números do período --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <NumeroIndicador
            rotulo="Custo total de prospecção"
            valor={formatarIndicadorMoeda(dados?.custoTotalProspeccao ?? null)}
            destaque
          />
          <NumeroIndicador
            rotulo="Custo por lead qualificado"
            valor={formatarIndicadorMoeda(dados?.custoPorLeadQualificado ?? null)}
          />
          <NumeroIndicador
            rotulo="Custo por proposta"
            valor={formatarIndicadorMoeda(dados?.custoPorProposta ?? null)}
          />
          <NumeroIndicador
            rotulo="Custo por contrato assinado"
            valor={formatarIndicadorMoeda(dados?.custoPorContrato ?? null)}
          />
        </div>

        {/* --- retorno por real investido --- */}
        <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Retorno por real investido em prospecção
            </p>
            <p className="text-sm text-slate-500 mt-0.5">
              Ticket médio ÷ custo por contrato assinado
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-slate-900">
              {dados?.retornoPorReal === null || dados?.retornoPorReal === undefined
                ? '—'
                : formatarNumero(dados.retornoPorReal, 2)}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              Ticket médio: {formatarIndicadorMoeda(dados?.ticketMedio ?? null)} · Custo por
              contrato: {formatarIndicadorMoeda(dados?.custoPorContrato ?? null)}
            </p>
          </div>
        </div>

        {/* --- gráfico: gasto mensal em visitas × contratos assinados (12 meses) --- */}
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Últimos 12 meses
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={dados?.mensal ?? []}
                margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="comp"
                  tickFormatter={rotuloMes}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  yAxisId="gasto"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(v) => formatarMoeda(Number(v))}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                />
                <YAxis
                  yAxisId="contratos"
                  orientation="right"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <Tooltip
                  formatter={(valor, nome) =>
                    nome === 'Gasto em visitas' ? formatarMoeda(Number(valor)) : String(valor)
                  }
                  labelFormatter={(l) => rotuloMes(String(l))}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  yAxisId="gasto"
                  dataKey="gasto"
                  name="Gasto em visitas"
                  fill="#0f766e"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="contratos"
                  type="monotone"
                  dataKey="contratos"
                  name="Contratos assinados"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function NumeroIndicador({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string
  valor: string
  destaque?: boolean
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        destaque ? 'bg-teal-50 border-teal-100' : 'bg-slate-50 border-slate-100'
      }`}
    >
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{rotulo}</p>
      <p className={`text-xl font-black mt-1 ${destaque ? 'text-teal-800' : 'text-slate-900'}`}>
        {valor}
      </p>
    </div>
  )
}

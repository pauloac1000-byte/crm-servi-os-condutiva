import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMetasAcompanhamento } from '@/hooks/use-metas-acompanhamento'
import type { MetasEntrada } from '@/services/metas-acompanhamento'
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
import {
  formatarMoedaMetas,
  formatarMoedaMetasOuTraco,
  formatarDiferenca,
  formatarPercentualMetas,
} from '@/services/metas-acompanhamento'
import { Target } from 'lucide-react'

// Bloco "Metas" do Dashboard: realizado de RCS de 2026 contra a meta
// (coleção "metas" no Skip Cloud, sem dados de exemplo).
// - Gráfico combinado: barras mensais do realizado com marcador (●) da meta de
//   cada mês + linha do acumulado realizado contra a linha da meta acumulada.
// - Números do ano: acumulado realizado, meta acumulada do mês, diferença,
//   percentual do ano realizado e quanto falta por mês até dezembro.
// Toda a conta vem do motor src/services/metas-acompanhamento.ts (via
// useMetasAcompanhamento); aqui só há formatação e desenho. O período e o
// responsável vêm do FILTRO GLOBAL do Dashboard (estado elevado em Index.tsx):
// a janela recorta o realizado dentro do ano; a meta e o acumulado continuam
// do ano inteiro (metas não têm responsável).

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
  if (!m) return comp
  return MESES_PT[m - 1]
}

export function MetasBloco({ entrada }: { entrada: MetasEntrada }) {
  const { dados, loading, erro } = useMetasAcompanhamento(entrada)

  // linha do realizado no gráfico: null quebra a linha (sem dado = sem ponto)
  const serieGrafico = (dados?.mensal ?? []).map((m) => ({
    ...m,
    realizadoGrafico: m.realizado,
  }))

  return (
    <Card className="border-slate-200/80 bg-white shadow-sm rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Target className="h-4 w-4 text-teal-700" />
          Metas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        {erro && (
          <p className="text-xs text-rose-600">
            Não foi possível carregar o acompanhamento de metas.
          </p>
        )}

        {/* --- números do ano --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <NumeroIndicador
            rotulo="Acumulado realizado (RCS)"
            valor={formatarMoedaMetasOuTraco(dados?.acumuladoRealizado ?? null)}
            destaque
          />
          <NumeroIndicador
            rotulo="Diferença vs. meta acumulada"
            valor={formatarDiferenca(dados?.diferenca ?? null)}
          />
          <NumeroIndicador
            rotulo="Ano realizado"
            valor={formatarPercentualMetas(dados?.percentualAno ?? null)}
          />
          <NumeroIndicador
            rotulo={
              dados?.mesesRestantes && dados.mesesRestantes > 1
                ? `Falta por mês (até dez, ${dados.mesesRestantes} meses)`
                : 'Falta por mês (dez)'
            }
            valor={formatarMoedaMetasOuTraco(dados?.faltaPorMes ?? null)}
          />
        </div>

        {/* --- gráfico combinado --- */}
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            RCS {ano}: realizado mensal (barras) e acumulado vs. meta (linhas)
          </p>
          {loading ? (
            <div className="h-72 w-full flex items-center justify-center text-sm text-slate-400">
              Calculando…
            </div>
          ) : dados?.semDados ? (
            <div className="h-72 w-full flex flex-col items-center justify-center gap-2 text-sm text-slate-400">
              <span>Sem contratos em {ano} ainda</span>
              {dados.metaAnual === null && (
                <span className="text-xs">Sem meta de RCS cadastrada para {ano}</span>
              )}
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={serieGrafico}
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
                    yAxisId="mensal"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickFormatter={(v) => formatarMoedaMetas(Number(v))}
                    tickLine={false}
                    axisLine={false}
                    width={72}
                  />
                  <YAxis
                    yAxisId="acumulado"
                    orientation="right"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickFormatter={(v) => formatarMoedaMetas(Number(v))}
                    tickLine={false}
                    axisLine={false}
                    width={72}
                  />
                  <Tooltip
                    formatter={(valor, nome) => {
                      if (valor === null || valor === undefined) return ['—', String(nome)]
                      return [formatarMoedaMetas(Number(valor)), String(nome)]
                    }}
                    labelFormatter={(l) => rotuloMes(String(l))}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    yAxisId="mensal"
                    dataKey="realizado"
                    name="Realizado do mês"
                    fill="#0f766e"
                    radius={[4, 4, 0, 0]}
                  />
                  {/* marcador da meta do mês: linha discreta sobre as barras */}
                  <Line
                    yAxisId="mensal"
                    type="monotone"
                    dataKey="meta"
                    name="Meta do mês"
                    stroke="#f59e0b"
                    strokeWidth={0}
                    dot={{ r: 3.5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 1 }}
                    legendType="circle"
                    connectNulls
                  />
                  <Line
                    yAxisId="acumulado"
                    type="monotone"
                    dataKey="acumuladoRealizado"
                    name="Acumulado realizado"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                  <Line
                    yAxisId="acumulado"
                    type="monotone"
                    dataKey="metaAcumulada"
                    name="Meta acumulada (R$ 1,5 mi)"
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* --- rótulo do valor atual e da diferença --- */}
        <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Acumulado vs. meta acumulada
            </p>
            <p className="text-sm text-slate-500 mt-0.5">
              Meta anual de RCS de {ano}:{' '}
              <span className="font-semibold text-slate-700">
                {formatarMoedaMetasOuTraco(dados?.metaAnual ?? null)}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-slate-900">
              {formatarMoedaMetasOuTraco(dados?.acumuladoRealizado ?? null)}
              <span className="text-sm font-semibold text-slate-400">
                {' '}
                / {formatarMoedaMetasOuTraco(dados?.metaAcumuladaAtual ?? null)}
              </span>
            </p>
            <p
              className={`text-[11px] font-bold mt-0.5 ${
                (dados?.diferenca ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {formatarDiferenca(dados?.diferenca ?? null)} vs. meta acumulada
            </p>
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

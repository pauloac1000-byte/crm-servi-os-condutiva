import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMrrNrr } from '@/hooks/use-mrr-nrr'
import type { MrrNrrEntrada } from '@/services/mrr-nrr'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
  Cell,
} from 'recharts'
import {
  formatarMoedaMrr,
  formatarMoedaMrrOuTraco,
  formatarPercentualNrr,
} from '@/services/mrr-nrr'
import { Repeat } from 'lucide-react'
import type { KpiSituacao } from '@/services/kpis'
import {
  GradeGrafico,
  eixoX,
  eixoY,
  tooltipPadrao,
  rotuloFimDeLinha,
  COR_LIME_ESCURO,
  COR_LIME_CLARO,
  COR_ALERTA,
  COR_RISCO,
  COR_NEUTRO,
} from '@/lib/graficos'

// Bloco "Receita recorrente" do Dashboard: linha do MRR dos últimos 12 meses,
// NRR do período em destaque e composição do período em barras na sequência
// receita inicial → novos → expansão → contração → churn → receita final.
// Toda a conta vem do motor src/services/mrr-nrr.ts (via useMrrNrr); a regra de
// situação do NRR é a mesma exportada pelo motor kpis.ts. Aqui só há
// formatação e desenho. O período e o responsável vêm do FILTRO GLOBAL do
// Dashboard (estado elevado em Index.tsx).

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

// rótulo curto "Mmm/AA" para o eixo do gráfico
const rotuloMes = (comp: string) => {
  const m = Number(comp.slice(5, 7))
  const a = Number(comp.slice(0, 4))
  if (!m || !a) return comp
  return `${MESES_PT[m - 1]}/${String(a).slice(2)}`
}

// cor do destaque do NRR, pela regra de situação do motor kpis.ts
const COR_SITUACAO: Record<Exclude<KpiSituacao, null>, string> = {
  verde: 'text-emerald-600',
  ambar: 'text-amber-600',
  vermelho: 'text-rose-600',
}

// leitura automática conforme a faixa do NRR apurado
const leituraNrr = (nrr: number | null, situacao: KpiSituacao): string | null => {
  if (nrr === null || situacao === null) return null
  if (situacao === 'verde') {
    return 'A receita recorrente cresceu no período: a base expandiu além da reposição.'
  }
  if (situacao === 'ambar') {
    return 'A receita recorrente se manteve estável: as perdas foram totalmente repostas.'
  }
  return 'A receita recorrente encolheu no período: as perdas superaram as adições.'
}

interface Props {
  entrada: MrrNrrEntrada
}

export function MrrNrrBloco({ entrada }: Props) {
  const { dados, loading, erro } = useMrrNrr(entrada)

  const leitura = leituraNrr(dados?.nrr ?? null, dados?.situacaoNrr ?? null)

  // composição na sequência exata pedida (cores: tokens da identidade)
  const composicao = dados
    ? [
        { nome: 'Receita inicial', valor: dados.receitaInicial, cor: COR_NEUTRO },
        { nome: 'Novos', valor: dados.movimentosPorTipo.novos, cor: COR_LIME_CLARO },
        { nome: 'Expansão', valor: dados.movimentosPorTipo.expansao, cor: COR_LIME_ESCURO },
        { nome: 'Contração', valor: dados.movimentosPorTipo.contracao, cor: COR_ALERTA },
        { nome: 'Churn', valor: dados.movimentosPorTipo.churn, cor: COR_RISCO },
        { nome: 'Receita final', valor: dados.receitaFinal, cor: '#3a3e42' },
      ]
    : []

  const temComposicao = composicao.some((c) => c.valor !== null && c.valor !== 0)

  return (
    <Card className="border-slate-200/80 bg-white shadow-sm rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Repeat className="h-4 w-4 text-teal-700" />
          Receita recorrente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        {erro && (
          <p className="text-xs text-rose-600">Não foi possível calcular a receita recorrente.</p>
        )}

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">Calculando…</div>
        ) : dados?.semDados ? (
          <div className="py-8 text-center text-sm text-slate-400">
            <p>Sem receita recorrente registrada no período</p>
            <p className="text-xs mt-1">
              Cadastre contratos em Contratos para acompanhar o MRR e o NRR aqui.
            </p>
          </div>
        ) : (
          <>
            {/* --- NRR do período em destaque --- */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border px-4 py-3 bg-teal-50 border-teal-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  NRR do período
                </p>
                <p
                  className={`text-3xl font-black mt-1 ${
                    dados?.situacaoNrr ? COR_SITUACAO[dados.situacaoNrr] : 'text-slate-900'
                  }`}
                >
                  {formatarPercentualNrr(dados?.nrr ?? null)}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Receita no fim ÷ receita no início do período
                </p>
              </div>
              <NumeroIndicador
                rotulo="Receita recorrente no início"
                valor={formatarMoedaMrrOuTraco(dados?.receitaInicial ?? null)}
              />
              <NumeroIndicador
                rotulo="Receita recorrente no fim"
                valor={formatarMoedaMrrOuTraco(dados?.receitaFinal ?? null)}
              />
            </div>

            {/* --- linha do MRR dos últimos 12 meses --- */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                MRR — últimos 12 meses
              </p>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={dados?.mrrMensal ?? []}
                    margin={{ top: 20, right: 8, bottom: 0, left: 8 }}
                  >
                    <GradeGrafico />
                    <XAxis dataKey="comp" {...eixoX(rotuloMes)} />
                    <YAxis
                      {...eixoY({ width: 72, formatter: (v) => formatarMoedaMrr(Number(v)) })}
                    />
                    <Tooltip
                      {...tooltipPadrao()}
                      formatter={(valor) => formatarMoedaMrr(Number(valor))}
                      labelFormatter={(l) => rotuloMes(String(l))}
                    />
                    <Line
                      type="monotone"
                      dataKey="mrr"
                      name="MRR"
                      stroke={COR_LIME_CLARO}
                      strokeWidth={2}
                      dot={{ r: 3, fill: COR_LIME_CLARO, strokeWidth: 0 }}
                      activeDot={{ r: 4 }}
                      connectNulls
                      label={rotuloFimDeLinha(
                        (dados?.mrrMensal ?? []).length - 1,
                        (v) => (v !== null ? formatarMoedaMrr(v) : null),
                        '#4c7313',
                      )}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* --- composição do período em barras, na sequência pedida --- */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Composição do período
              </p>
              {!temComposicao ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  Sem movimentos de receita registrados no período.
                </p>
              ) : (
                <>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={composicao.map((c) => ({
                          nome: c.nome,
                          valor: c.valor ?? 0,
                        }))}
                        margin={{ top: 20, right: 8, bottom: 0, left: 8 }}
                      >
                        <GradeGrafico />
                        <XAxis dataKey="nome" {...eixoX()} interval={0} />
                        <YAxis
                          {...eixoY({
                            width: 72,
                            formatter: (v) => formatarMoedaMrr(Number(v)),
                            barras: true,
                          })}
                        />
                        <Tooltip
                          {...tooltipPadrao()}
                          formatter={(valor) => formatarMoedaMrr(Number(valor))}
                        />
                        {/* rótulo direto do valor no topo de cada barra (sem legenda) */}
                        <Bar dataKey="valor" name="Valor" radius={[3, 3, 0, 0]}>
                          {composicao.map((c) => (
                            <Cell key={c.nome} fill={c.cor} />
                          ))}
                          <LabelList
                            dataKey="valor"
                            position="top"
                            fontSize={10}
                            fontFamily="'IBM Plex Mono', ui-monospace, monospace"
                            fill="#6b7280"
                            formatter={(v: number) => (v > 0 ? formatarMoedaMrr(v) : '')}
                          />
                        </Bar>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  {/* amostras de cor na ordem pedida — apoio à leitura rápida,
                      redundante com o rótulo direto de cada barra */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                    {composicao.map((c) => (
                      <span
                        key={c.nome}
                        className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 font-medium"
                      >
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-sm"
                          style={{ backgroundColor: c.cor }}
                        />
                        {c.nome}
                      </span>
                    ))}
                  </div>
                  {(dados?.renovacoes ?? 0) > 0 && (
                    <p className="text-[11px] text-slate-400 mt-2">
                      Renovações do período (fora da composição):{' '}
                      {formatarMoedaMrr(dados?.renovacoes ?? 0)}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* --- leitura automática conforme a faixa do NRR --- */}
            {leitura && (
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Leitura do período
                </p>
                <p className="text-sm text-slate-700 mt-1">{leitura}</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function NumeroIndicador({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl border px-4 py-3 bg-slate-50 border-slate-100">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{rotulo}</p>
      <p className="text-xl font-black mt-1 text-slate-900">{valor}</p>
    </div>
  )
}

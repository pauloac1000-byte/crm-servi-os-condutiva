import { useState } from 'react'
import { Target, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { KPIS, MESES_CURTOS, useMetas, divergenciaAnual } from '@/hooks/use-metas'
import { useMarcoValidacao } from '@/hooks/use-marco-validacao'
import { MetaKpi } from '@/types/crm'
import { toast } from 'sonner'
import { Flag } from 'lucide-react'

export default function Metas() {
  const { isAdmin } = useAuth()
  const { ano, setAno, getValor, salvarValor, loading } = useMetas()
  const marco = useMarcoValidacao()

  const [editando, setEditando] = useState<string | null>(null) // "kpi|mes"
  const [rascunho, setRascunho] = useState('')

  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i)

  const formatarValor = (kpi: MetaKpi, valor: number | undefined) => {
    if (valor === undefined) return '—'
    const formato = KPIS.find((k) => k.kpi === kpi)?.formato
    if (formato === 'moeda') {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
    }
    if (formato === 'percentual') {
      return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
    }
    return valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
  }

  const iniciarEdicao = (kpi: MetaKpi, mes: number) => {
    if (!isAdmin) return
    const valor = getValor(kpi, mes)
    setEditando(`${kpi}|${mes}`)
    setRascunho(valor === undefined ? '' : String(valor).replace('.', ','))
  }

  const confirmarEdicao = async (kpi: MetaKpi, mes: number) => {
    const texto = rascunho.trim().replace(/\./g, '').replace(',', '.')
    // campos vazios limpam a meta; entrada inválida avisa e mantém a edição
    if (texto === '') {
      setEditando(null)
      try {
        await salvarValor(kpi, mes, undefined)
      } catch {
        /* toast já exibido */
      }
      return
    }
    const valor = Number(texto)
    if (!isFinite(valor) || valor < 0) {
      toast.error('Informe um número válido (sem sinal negativo).')
      return
    }
    try {
      await salvarValor(kpi, mes, valor)
      setEditando(null)
    } catch {
      /* toast já exibido; célula continua em edição */
    }
  }

  // divide a meta anual igualmente entre os 12 meses (somente admin)
  const distribuirIgualmente = async (kpi: MetaKpi) => {
    const anual = getValor(kpi, 0)
    if (anual === undefined) {
      toast.error('Informe a meta anual do KPI antes de distribuir.')
      return
    }
    const valorMes = Math.round((anual / 12) * 100) / 100
    try {
      await Promise.all(Array.from({ length: 12 }, (_, i) => salvarValor(kpi, i + 1, valorMes)))
      toast.success('Meta anual distribuída igualmente pelos 12 meses.')
    } catch {
      toast.error('Erro ao distribuir a meta anual.')
    }
  }

  // KPI tem divergência entre soma dos meses e meta anual?
  const temDivergencia = (kpi: MetaKpi) => {
    const anual = getValor(kpi, 0)
    const meses = Array.from({ length: 12 }, (_, i) => getValor(kpi, i + 1))
    return divergenciaAnual(meses, [anual])
  }

  const algumEditando = editando !== null
  const editarCelula = (kpi: MetaKpi, mes: number) => `${kpi}|${mes}`

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Metas</h2>
          <p className="text-sm text-slate-500">
            Metas {ano} dos indicadores da unidade de serviços
            {!isAdmin && ' — somente leitura (edição restrita ao administrador)'}
          </p>
        </div>
        <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
          <SelectTrigger className="w-full sm:w-32 bg-white">
            <SelectValue placeholder="Ano" />
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

      {/* Grade: meses nas colunas, KPIs nas linhas */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-slate-400 uppercase min-w-[220px]">
                Indicador
              </th>
              {MESES_CURTOS.map((m) => (
                <th
                  key={m}
                  className="px-1.5 py-2.5 text-[10px] font-semibold text-slate-400 uppercase text-center"
                >
                  {m}
                </th>
              ))}
              <th className="px-2 py-2.5 text-[10px] font-semibold text-slate-400 uppercase text-center bg-teal-50/60">
                Ano
              </th>
              <th className="px-2 py-2.5 min-w-[140px]"></th>
            </tr>
          </thead>
          <tbody>
            {KPIS.map(({ kpi, rotulo, formato }) => {
              const divergente = temDivergencia(kpi)
              return (
                <tr key={kpi} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-xs">{rotulo}</span>
                      {divergente && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5"
                          title="A soma dos 12 meses difere da meta anual informada"
                        >
                          <AlertTriangle className="h-3 w-3" /> divergente
                        </span>
                      )}
                    </div>
                    <span className="block text-[10px] text-slate-400">
                      {formato === 'percentual' ? '%' : formato === 'moeda' ? 'R$' : 'contagem'}
                    </span>
                  </td>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => {
                    const chave = editarCelula(kpi, mes)
                    const emEdicao = editando === chave
                    return (
                      <td key={mes} className="px-1 py-1.5 text-center">
                        {emEdicao ? (
                          <Input
                            autoFocus
                            className="h-8 w-20 text-xs text-center px-1"
                            value={rascunho}
                            inputMode="decimal"
                            onChange={(e) => setRascunho(e.target.value)}
                            onBlur={() => confirmarEdicao(kpi, mes)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') confirmarEdicao(kpi, mes)
                              if (e.key === 'Escape') setEditando(null)
                              e.stopPropagation()
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            disabled={!isAdmin || algumEditando}
                            onClick={() => iniciarEdicao(kpi, mes)}
                            className={`w-20 h-8 rounded-lg text-xs font-semibold transition-colors ${
                              getValor(kpi, mes) !== undefined
                                ? 'text-slate-800 hover:bg-slate-100'
                                : 'text-slate-300 hover:bg-slate-50'
                            } ${!isAdmin ? 'cursor-default' : 'cursor-pointer'}`}
                            title={isAdmin ? 'Clique para editar' : 'Somente leitura'}
                          >
                            {formatarValor(kpi, getValor(kpi, mes))}
                          </button>
                        )}
                      </td>
                    )
                  })}
                  {/* coluna Ano = meta anual (mês 0) */}
                  <td className="px-1 py-1.5 text-center bg-teal-50/60">
                    {editando === editarCelula(kpi, 0) ? (
                      <Input
                        autoFocus
                        className="h-8 w-20 text-xs text-center px-1"
                        value={rascunho}
                        inputMode="decimal"
                        onChange={(e) => setRascunho(e.target.value)}
                        onBlur={() => confirmarEdicao(kpi, 0)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmarEdicao(kpi, 0)
                          if (e.key === 'Escape') setEditando(null)
                          e.stopPropagation()
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        disabled={!isAdmin || algumEditando}
                        onClick={() => iniciarEdicao(kpi, 0)}
                        className={`w-20 h-8 rounded-lg text-xs font-bold transition-colors ${
                          getValor(kpi, 0) !== undefined
                            ? 'text-teal-800 hover:bg-teal-100'
                            : 'text-slate-300 hover:bg-teal-50'
                        } ${!isAdmin ? 'cursor-default' : 'cursor-pointer'}`}
                        title={isAdmin ? 'Clique para editar a meta anual' : 'Somente leitura'}
                      >
                        {formatarValor(kpi, getValor(kpi, 0))}
                      </button>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[11px] font-bold text-teal-700 border-teal-200 hover:bg-teal-50"
                      disabled={!isAdmin || algumEditando}
                      onClick={() => distribuirIgualmente(kpi)}
                    >
                      Distribuir igualmente
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {loading && <p className="text-xs text-slate-400">Carregando metas...</p>}
      {!loading && isAdmin && (
        <p className="text-xs text-slate-400">
          Clique em uma célula para editar. Deixe a célula vazia para remover a meta. A coluna
          <span className="font-semibold text-teal-700"> Ano</span> é a meta anual do KPI; use
          “Distribuir igualmente” para dividi-la pelos 12 meses, ou edite cada mês manualmente.
        </p>
      )}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Target className="h-3.5 w-3.5" />
        <span>
          Um aviso “divergente” aparece quando a soma dos 12 meses difere da meta anual do KPI.
        </span>
      </div>

      {/* Marco de validação do modelo */}
      <div
        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
          marco.concluido
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-slate-200 bg-slate-50 text-slate-500'
        }`}
      >
        <Flag
          className={`h-3.5 w-3.5 ${marco.concluido ? 'text-emerald-600' : 'text-slate-400'}`}
        />
        <span>
          Marco de validação do modelo — Primeiro contrato piloto assinado com RCS maior que zero:
        </span>
        {marco.concluido ? (
          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100 rounded px-1.5 py-0.5">
            ✓ Concluído{marco.contrato?.cliente ? ` — ${marco.contrato.cliente}` : ''}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 rounded px-1.5 py-0.5">
            Pendente
          </span>
        )}
      </div>
    </div>
  )
}

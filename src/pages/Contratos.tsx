import { useState, useEffect } from 'react'
import { getContratos, deleteContrato } from '@/services/contratos'
import { getContacts } from '@/services/contacts'
import { getDeals } from '@/services/deals'
import { getMovimentosReceita, consolidarPorCompetencia } from '@/services/movimentos_receita'
import pb from '@/lib/pocketbase/client'
import { Contrato, Contact, Deal, MovimentoReceita } from '@/types/crm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Plus, Trash2, Edit2, FileText, TrendingUp } from 'lucide-react'
import { ContratoModal } from '@/components/ContratoModal'
import { MovimentoReceitaModal } from '@/components/MovimentoReceitaModal'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'

export default function Contratos() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [responsavelId, setResponsavelId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [contratoToEdit, setContratoToEdit] = useState<Contrato | null>(null)
  // Movimentos de receita: automáticos (hook) + manuais, consolidados por competência
  const [movimentos, setMovimentos] = useState<MovimentoReceita[]>([])
  const [movModalOpen, setMovModalOpen] = useState(false)
  const [competenciaModal, setCompetenciaModal] = useState<string | undefined>(undefined)

  const loadData = async () => {
    try {
      const [cs, cts, ds, movs] = await Promise.all([
        getContratos(),
        getContacts(),
        getDeals(),
        getMovimentosReceita().catch(() => []),
      ])
      setContratos(cs)
      setContacts(cts)
      setDeals(ds)
      setMovimentos(movs)
      setResponsavelId(pb.authStore.record?.id || '')
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('contratos', () => loadData())
  useRealtime('movimentos_receita', () => loadData())

  const receitaPorCompetencia = consolidarPorCompetencia(movimentos)

  // "2026-11" → "nov 2026" (cabeçalho da tabela de consolidação)
  const formatarCompetencia = (comp: string) => {
    if (!/^\d{4}-\d{2}$/.test(comp)) return comp
    const [ano, mes] = comp.split('-').map(Number)
    const nomeMes = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(
      new Date(ano, mes - 1, 1),
    )
    return `${nomeMes.replace('.', '')} ${ano}`
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Tem certeza que deseja excluir este contrato?')) {
      try {
        await deleteContrato(id)
        toast.success('Contrato excluído com sucesso!')
        loadData()
      } catch (_) {
        toast.error('Erro ao excluir contrato.')
      }
    }
  }

  // Filtro por período: sobre a data de início do contrato
  const filtered = contratos.filter((c) => {
    const matchesSearch =
      (c.expand?.cliente?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.expand?.negocio?.title || '').toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    const inicio = c.data_inicio ? new Date(c.data_inicio).getTime() : null
    const dentroInicio =
      !dataInicio || (inicio !== null && inicio >= new Date(dataInicio + 'T00:00:00').getTime())
    const dentroFim =
      !dataFim || (inicio !== null && inicio <= new Date(dataFim + 'T23:59:59').getTime())
    return matchesSearch && matchesStatus && dentroInicio && dentroFim
  })

  const receitaMensal = filtered
    .filter((c) => c.status === 'ativo')
    .reduce((s, c) => s + (c.valor_mensal || 0), 0)
  const totalImplantacao = filtered.reduce((s, c) => s + (c.valor_implantacao || 0), 0)

  const badgeStatus = (status?: string) => {
    switch (status) {
      case 'ativo':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'suspenso':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'encerrado':
        return 'bg-slate-100 text-slate-600 border-slate-200'
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200'
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Contratos</h2>
          <p className="text-sm text-slate-500">Receita contratada da unidade de serviços</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setCompetenciaModal(undefined)
              setMovModalOpen(true)
            }}
            variant="outline"
            className="border-teal-700 text-teal-700 hover:bg-teal-50 font-bold text-xs h-10"
          >
            <TrendingUp className="mr-1.5 h-4 w-4" /> Lançar Movimento
          </Button>
          <Button
            onClick={() => {
              setContratoToEdit(null)
              setModalOpen(true)
            }}
            className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs h-10 shadow-md shadow-teal-700/20"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Novo Contrato
          </Button>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <FileText className="h-4 w-4 text-teal-600" /> Contratos no filtro
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{filtered.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <FileText className="h-4 w-4 text-emerald-600" /> Receita mensal (ativos)
          </div>
          <p className="text-2xl font-black text-teal-700 mt-2">{formatCurrency(receitaMensal)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <FileText className="h-4 w-4 text-amber-600" /> Total em implantação
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">
            {formatCurrency(totalImplantacao)}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por cliente ou negócio..."
            className="pl-9 bg-slate-50 border-slate-200"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-slate-50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="suspenso">Suspenso</SelectItem>
              <SelectItem value="encerrado">Encerrado</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            className="bg-slate-50 border-slate-200 w-full sm:w-40"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            aria-label="Início do período"
          />
          <Input
            type="date"
            className="bg-slate-50 border-slate-200 w-full sm:w-40"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            aria-label="Fim do período"
          />
        </div>
      </div>

      {/* Lista de contratos */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-slate-900">
                  {c.expand?.cliente?.name || 'Sem cliente'}
                </p>
                <p className="text-xs text-slate-500 truncate max-w-[220px]">
                  {c.expand?.negocio?.title || 'Sem negócio de origem'}
                </p>
              </div>
              <Badge variant="outline" className={`capitalize ${badgeStatus(c.status)}`}>
                {c.status || '—'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Mensal</p>
                <p className="text-xs font-bold text-slate-800">
                  {formatCurrency(c.valor_mensal || 0)}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Implantação</p>
                <p className="text-xs font-bold text-slate-800">
                  {formatCurrency(c.valor_implantacao || 0)}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                {c.expand?.plano ? c.expand.plano.nome : 'Sem plano'} • {c.tipo || '—'}
              </span>
              <span>
                {c.data_inicio ? new Date(c.data_inicio).toLocaleDateString('pt-BR') : '—'}
                {' → '}
                {c.data_fim ? new Date(c.data_fim).toLocaleDateString('pt-BR') : '—'}
              </span>
            </div>
            <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-100">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-500 hover:text-teal-700 hover:bg-teal-50"
                onClick={(e) => {
                  setContratoToEdit(c)
                  setModalOpen(true)
                }}
                aria-label={`Editar contrato de ${c.expand?.cliente?.name || 'cliente'}`}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                onClick={(e) => handleDelete(c.id, e)}
                aria-label={`Excluir contrato de ${c.expand?.cliente?.name || 'cliente'}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
          <FileText className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">Nenhum contrato encontrado</p>
          <p className="text-xs text-slate-400">Ajuste os filtros ou cadastre um novo contrato.</p>
        </div>
      )}

      {/* Receita recorrente consolidada por competência (AAAA-MM) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
          <TrendingUp className="h-4 w-4 text-teal-600" />
          <h3 className="text-sm font-bold text-slate-800">Receita recorrente por competência</h3>
          <span className="text-xs text-slate-400 ml-1">
            (soma dos movimentos de cada mês — base para o NRR)
          </span>
        </div>
        {receitaPorCompetencia.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-slate-500">Nenhum movimento de receita registrado</p>
            <p className="text-xs text-slate-400">
              Os movimentos são gerados automaticamente na criação, mudança de valor ou encerramento
              de um contrato — ou lançados manualmente no botão "Lançar Movimento".
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-2">Competência</th>
                  <th className="px-4 py-2 text-right">Receita do mês</th>
                  <th className="px-4 py-2 text-right">Movimentos</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {receitaPorCompetencia.map((r) => (
                  <tr
                    key={r.competencia}
                    className="border-t border-slate-100 hover:bg-slate-50/60"
                  >
                    <td className="px-4 py-2.5 font-bold text-slate-800">
                      {formatarCompetencia(r.competencia)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-black text-teal-700">
                      {formatCurrency(r.total)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-slate-500">
                      {r.movimentos.length} {r.movimentos.length === 1 ? 'movimento' : 'movimentos'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-xs text-teal-700 hover:bg-teal-50 font-semibold"
                        onClick={() => {
                          if (r.competencia !== '—') {
                            setCompetenciaModal(r.competencia)
                            setMovModalOpen(true)
                          }
                        }}
                        disabled={r.competencia === '—'}
                      >
                        + Lançar nesta competência
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ContratoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        contacts={contacts}
        deals={deals}
        defaultResponsavelId={responsavelId}
        contratoToEdit={contratoToEdit}
        onSuccess={() => loadData()}
      />

      <MovimentoReceitaModal
        open={movModalOpen}
        onOpenChange={setMovModalOpen}
        defaultCompetencia={competenciaModal}
        onSuccess={() => loadData()}
      />
    </div>
  )
}

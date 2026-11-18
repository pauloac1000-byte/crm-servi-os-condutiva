import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getDeals, deleteDeal } from '@/services/deals'
import { getPipelineStages } from '@/services/pipeline_stages'
import { getContacts } from '@/services/contacts'
import { Deal, EtapaFunil, Contact, DealStatus } from '@/types/crm'
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
import { Badge } from '@/components/ui/badge'
import {
  ColumnFilter,
  COLUNAS_FILTRAVEIS,
  getValoresColuna,
  type ColunaFiltravelId,
  type FiltroColuna,
} from '@/components/ColumnFilter'
import { Search, Plus, Trash2, Edit2, Download, X } from 'lucide-react'
import { baixarCsv, linhaCsv, montarCsv, nomeArquivoCsv } from '@/lib/exportar-csv'
import { DealModal } from '@/components/DealModal'
import { DealDetailDrawer } from '@/components/DealDetailDrawer'
import { useRealtime } from '@/hooks/use-realtime'
import { compararTexto } from '@/lib/ordenacao-alfabetica'
import { toast } from 'sonner'

export default function Deals() {
  const { isAdmin } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [deals, setDeals] = useState<Deal[]>([])
  const [stages, setStages] = useState<EtapaFunil[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [dealModalOpen, setDealModalOpen] = useState(false)
  const [dealToEdit, setDealToEdit] = useState<Deal | null>(null)
  const [selectedDealDetail, setSelectedDealDetail] = useState<Deal | null>(null)
  const [filtrosColuna, setFiltrosColuna] = useState<FiltroColuna[]>(
    COLUNAS_FILTRAVEIS.map((c) => ({ id: c.id, valores: [] })),
  )

  const loadData = async () => {
    try {
      const [d, s, c] = await Promise.all([getDeals(), getPipelineStages(), getContacts()])
      setDeals(d)
      setStages(s)
      setContacts(c)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('deals', () => loadData())

  // Deep-link do Dashboard ("Precisa de ação"): ?deal=<id> abre o drawer de
  // detalhes do negócio (mesmo drawer usado na própria lista).
  useEffect(() => {
    const dealId = searchParams.get('deal')
    if (!dealId || deals.length === 0) return
    const deal = deals.find((d) => d.id === dealId)
    if (deal) {
      setSelectedDealDetail(deal)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, deals])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Tem certeza que deseja excluir este lead?')) {
      try {
        await deleteDeal(id)
        toast.success('Lead excluído com sucesso!')
        loadData()
      } catch (_) {
        toast.error('Erro ao excluir lead.')
      }
    }
  }

  // Filtro por coluna (seleção múltipla): coluna sem seleção = sem filtro
  const valorColuna = (deal: Deal, id: ColunaFiltravelId): string => {
    switch (id) {
      case 'titulo':
        return deal.title
      case 'contato':
        return deal.expand?.contact?.name || 'N/A'
      case 'etapa':
        return deal.expand?.etapa?.nome || deal.expand?.stage?.name || ''
      case 'prioridade':
        return deal.priority
      case 'previsao':
        return deal.expected_close_date
          ? new Date(deal.expected_close_date).toLocaleDateString('pt-BR')
          : 'N/A'
      default:
        return ''
    }
  }

  const filteredDeals = deals.filter((deal) => {
    const matchesSearch =
      deal.title.toLowerCase().includes(search.toLowerCase()) ||
      (deal.expand?.contact?.name || '').toLowerCase().includes(search.toLowerCase())
    const matchesStage = stageFilter === 'all' || deal.etapa === stageFilter
    const matchesPriority = priorityFilter === 'all' || deal.priority === priorityFilter

    const matchesColunas = filtrosColuna.every((f) => {
      if (f.valores.length === 0) return true
      return f.valores.includes(valorColuna(deal, f.id))
    })

    return matchesSearch && matchesStage && matchesPriority && matchesColunas
  })
  // Ordem inicial: título de A a Z (sem acentos e maiúsculas)
  filteredDeals.sort((a, b) => compararTexto(a.title, b.title))

  const limparFiltros = () => {
    setSearch('')
    setStageFilter('all')
    setPriorityFilter('all')
    setFiltrosColuna((atual) => atual.map((f) => ({ ...f, valores: [] })))
  }
  const temFiltroAtivo =
    search !== '' ||
    stageFilter !== 'all' ||
    priorityFilter !== 'all' ||
    filtrosColuna.some((f) => f.valores.length > 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Lista de Leads</h2>
          <p className="text-sm text-slate-500">Gestão detalhada de todas as oportunidades</p>
        </div>
        <Button
          onClick={() => {
            setDealToEdit(null)
            setDealModalOpen(true)
          }}
          className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs h-10 shadow-md shadow-teal-700/20"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Novo Lead
        </Button>
        <Button
          onClick={() =>
            baixarCsv(
              nomeArquivoCsv('negocios'),
              montarCsv(
                [
                  'Título',
                  'Empresa',
                  'Cidade',
                  'Estado',
                  'Contato',
                  'Etapa',
                  'Prioridade',
                  'Previsão de fechamento',
                  'Responsável',
                  'Criado em',
                ],
                filteredDeals.map((deal) =>
                  linhaCsv([
                    { valor: deal.title },
                    { valor: deal.empresa },
                    { valor: deal.cidade },
                    { valor: deal.estado },
                    { valor: deal.expand?.contact?.name },
                    { valor: deal.expand?.etapa?.nome || deal.expand?.stage?.name },
                    { valor: deal.priority },
                    { valor: deal.expected_close_date, tipo: { data: true } },
                    { valor: deal.expand?.owner?.name || deal.expand?.owner?.email },
                    { valor: deal.created, tipo: { dataHora: true } },
                  ]),
                ),
              ),
            )
          }
          variant="outline"
          className="font-semibold text-xs h-10"
        >
          <Download className="mr-1.5 h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por título ou contato..."
            className="pl-9 bg-slate-50 border-slate-200"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-slate-50">
              <SelectValue placeholder="Etapa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as etapas</SelectItem>
              {stages.map((st) => (
                <SelectItem key={st.id} value={st.id}>
                  {st.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full sm:w-36 bg-slate-50">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas prioridades</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="média">Média</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-slate-500">
          Exibindo <span className="font-bold text-slate-900">{filteredDeals.length}</span> de{' '}
          {deals.length} {deals.length === 1 ? 'lead' : 'leads'}
        </p>
        {temFiltroAtivo && (
          <Button
            variant="outline"
            onClick={limparFiltros}
            className="font-semibold text-xs h-9 text-slate-600 hover:text-teal-700"
          >
            <X className="mr-1.5 h-4 w-4" /> Limpar filtros
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                {COLUNAS_FILTRAVEIS.map((col) => (
                  <th key={col.id} className="p-4">
                    <div className="flex items-center gap-1.5">
                      <span>{col.rotulo}</span>
                      <ColumnFilter
                        coluna={col.rotulo}
                        valores={getValoresColuna(deals, valorColuna, col.id)}
                        selecionados={filtrosColuna.find((f) => f.id === col.id)?.valores ?? []}
                        onChange={(valores) =>
                          setFiltrosColuna((atual) =>
                            atual.map((f) => (f.id === col.id ? { ...f, valores } : f)),
                          )
                        }
                      />
                    </div>
                  </th>
                ))}
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDeals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 text-sm">
                    Nenhum lead encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredDeals.map((deal) => (
                  <tr
                    key={deal.id}
                    onClick={() => setSelectedDealDetail(deal)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="p-4 font-bold text-slate-900">
                      {deal.title}
                      {(deal.empresa || deal.cidade || deal.estado) && (
                        <span className="block text-[11px] font-normal text-slate-500 mt-0.5">
                          {[deal.empresa, [deal.cidade, deal.estado].filter(Boolean).join(' - ')]
                            .filter(Boolean)
                            .join(' • ')}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-xs font-medium text-slate-600">
                      {deal.expand?.contact?.name || 'N/A'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        {deal.expand?.etapa && (
                          <span
                            className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold"
                            style={{
                              backgroundColor: `${deal.expand.etapa.cor || '#0F766E'}15`,
                              color: deal.expand.etapa.cor || '#0F766E',
                            }}
                          >
                            {deal.expand.etapa.nome}
                          </span>
                        )}
                        {deal.expand?.etapa_anterior && (
                          <span
                            className="inline-block px-2 py-1 rounded-full text-[10px] font-medium bg-rose-50 text-rose-700"
                            title="Etapa em que o lead parou"
                          >
                            parou em: {deal.expand.etapa_anterior.nome}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant="outline"
                        className={
                          deal.priority === 'alta'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : deal.priority === 'média'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-600'
                        }
                      >
                        {deal.priority}
                      </Badge>
                    </td>
                    <td className="p-4 text-xs text-slate-400">
                      {deal.expected_close_date
                        ? new Date(deal.expected_close_date).toLocaleDateString('pt-BR')
                        : 'N/A'}
                    </td>
                    <td className="p-4 text-right space-x-1">
                      {isAdmin && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-teal-700"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDealToEdit(deal)
                              setDealModalOpen(true)
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
                            onClick={(e) => handleDelete(deal.id, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DealModal
        open={dealModalOpen}
        onOpenChange={setDealModalOpen}
        stages={stages}
        contacts={contacts}
        dealToEdit={dealToEdit}
        onSuccess={loadData}
      />

      <DealDetailDrawer
        deal={selectedDealDetail}
        open={!!selectedDealDetail}
        onClose={() => setSelectedDealDetail(null)}
        onUpdated={loadData}
      />
    </div>
  )
}

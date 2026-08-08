import { useState, useEffect } from 'react'
import { getDeals, deleteDeal } from '@/services/deals'
import { getPipelineStages } from '@/services/pipeline_stages'
import { getContacts } from '@/services/contacts'
import { Deal, PipelineStage, Contact } from '@/types/crm'
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
import { Search, Plus, Trash2, Edit2, Eye, Filter } from 'lucide-react'
import { DealModal } from '@/components/DealModal'
import { DealDetailDrawer } from '@/components/DealDetailDrawer'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'

export default function Deals() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [dealModalOpen, setDealModalOpen] = useState(false)
  const [dealToEdit, setDealToEdit] = useState<Deal | null>(null)
  const [selectedDealDetail, setSelectedDealDetail] = useState<Deal | null>(null)

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

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Tem certeza que deseja excluir este negócio?')) {
      try {
        await deleteDeal(id)
        toast.success('Negócio excluído com sucesso!')
        loadData()
      } catch (_) {
        toast.error('Erro ao excluir negócio.')
      }
    }
  }

  const filteredDeals = deals.filter((deal) => {
    const matchesSearch =
      deal.title.toLowerCase().includes(search.toLowerCase()) ||
      (deal.expand?.contact?.name || '').toLowerCase().includes(search.toLowerCase())
    const matchesStage = stageFilter === 'all' || deal.stage === stageFilter
    const matchesPriority = priorityFilter === 'all' || deal.priority === priorityFilter

    return matchesSearch && matchesStage && matchesPriority
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Lista de Negócios</h2>
          <p className="text-sm text-slate-500">Gestão detalhada de todas as oportunidades</p>
        </div>
        <Button
          onClick={() => {
            setDealToEdit(null)
            setDealModalOpen(true)
          }}
          className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs h-10 shadow-md shadow-teal-700/20"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Novo Negócio
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
                  {st.name}
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

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="p-4">Título</th>
                <th className="p-4">Contato</th>
                <th className="p-4">Etapa</th>
                <th className="p-4">Prioridade</th>
                <th className="p-4">Valor</th>
                <th className="p-4">Previsão</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDeals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-sm">
                    Nenhum negócio encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredDeals.map((deal) => (
                  <tr
                    key={deal.id}
                    onClick={() => setSelectedDealDetail(deal)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="p-4 font-bold text-slate-900">{deal.title}</td>
                    <td className="p-4 text-xs font-medium text-slate-600">
                      {deal.expand?.contact?.name || 'N/A'}
                    </td>
                    <td className="p-4">
                      {deal.expand?.stage && (
                        <span
                          className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold"
                          style={{
                            backgroundColor: `${deal.expand.stage.color}15`,
                            color: deal.expand.stage.color,
                          }}
                        >
                          {deal.expand.stage.name}
                        </span>
                      )}
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
                    <td className="p-4 font-extrabold text-teal-700">
                      {formatCurrency(deal.value)}
                    </td>
                    <td className="p-4 text-xs text-slate-400">
                      {deal.expected_close_date
                        ? new Date(deal.expected_close_date).toLocaleDateString('pt-BR')
                        : 'N/A'}
                    </td>
                    <td className="p-4 text-right space-x-1">
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

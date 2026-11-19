import { useState, useEffect, useMemo } from 'react'
import { getDeals, deleteDeal } from '@/services/deals'
import { getContacts } from '@/services/contacts'
import { getPipelineStages } from '@/services/pipeline_stages'
import { Contact, Deal, EtapaFunil } from '@/types/crm'
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
import { Search, Plus, Trash2, Edit2, Download, User as UserIcon, X } from 'lucide-react'
import { DealModal } from '@/components/DealModal'
import { DealDetailDrawer } from '@/components/DealDetailDrawer'
import { BotaoExportarPdf } from '@/components/BotaoExportarPdf'
import { gerarPdfPadrao, type PdfSessao } from '@/lib/pdf-generico'
import { baixarCsv, linhaCsv, montarCsv, nomeArquivoCsv } from '@/lib/exportar-csv'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { compararTexto } from '@/lib/ordenacao-alfabetica'
import { toast } from 'sonner'

export default function Deals() {
  const { isAdmin } = useAuth()
  const [deals, setDeals] = useState<Deal[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [stages, setStages] = useState<EtapaFunil[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dealModalOpen, setDealModalOpen] = useState(false)
  const [dealToEdit, setDealToEdit] = useState<Deal | null>(null)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [filtrosColuna, setFiltrosColuna] = useState<FiltroColuna[]>(
    COLUNAS_FILTRAVEIS.map((c) => ({ id: c.id, valores: [] })),
  )

  const loadData = async () => {
    try {
      const [d, c, s] = await Promise.all([getDeals(), getContacts(), getPipelineStages()])
      setDeals(d)
      setContacts(c)
      setStages(s)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('deals', () => loadData())

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

  const valorColuna = (deal: Deal, id: ColunaFiltravelId): string => {
    switch (id) {
      case 'titulo':
        return deal.title
      case 'contato':
        return deal.expand?.contact?.name || 'N/A'
      case 'etapa':
        return stages.find((s) => s.id === deal.etapa)?.nome || 'N/A'
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

  const filteredDeals = useMemo(() => {
    const arr = deals.filter((d) => {
      const matchesSearch =
        d.title.toLowerCase().includes(search.toLowerCase()) ||
        (d.expand?.contact?.name || '').toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || d.status === statusFilter
      const matchesColunas = filtrosColuna.every((f) => {
        if (f.valores.length === 0) return true
        return f.valores.includes(valorColuna(d, f.id))
      })
      return matchesSearch && matchesStatus && matchesColunas
    })
    // Ordem inicial: título de A a Z (sem acentos e maiúsculas)
    arr.sort((a, b) => compararTexto(a.title, b.title))
    return arr
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deals, search, statusFilter, filtrosColuna, stages])

  const limparFiltros = () => {
    setSearch('')
    setStatusFilter('all')
    setFiltrosColuna((atual) => atual.map((f) => ({ ...f, valores: [] })))
  }
  const temFiltroAtivo =
    search !== '' || statusFilter !== 'all' || filtrosColuna.some((f) => f.valores.length > 0)

  // ── Exportação PDF: descrição dos filtros ativos na tela ──────────────────
  const rotulosEtapa: Record<string, string> = useMemo(
    () => Object.fromEntries(stages.map((s) => [s.id, s.nome])),
    [stages],
  )
  const filtrosAtivos = useMemo(() => {
    const parts: string[] = []
    if (search) parts.push(`Busca: "${search}"`)
    if (statusFilter !== 'all') parts.push(`Status: ${statusFilter}`)
    for (const f of filtrosColuna) {
      if (f.valores.length > 0) {
        const rotulo = COLUNAS_FILTRAVEIS.find((c) => c.id === f.id)?.rotulo ?? f.id
        parts.push(`${rotulo}: ${f.valores.join(', ')}`)
      }
    }
    return parts
  }, [search, statusFilter, filtrosColuna])

  const handleExportarPdf = async () => {
    // Resumo: total + distribuição por status
    const porStatus: Record<string, number> = {}
    for (const d of filteredDeals) porStatus[d.status] = (porStatus[d.status] || 0) + 1
    const totalEtapas = filteredDeals.length
    const resumo: PdfSessao[] = [
      {
        titulo: 'Resumo',
        linhas: [
          { header: 'Total de leads', valor: String(totalEtapas) },
          { header: 'Em andamento', valor: String(porStatus['em andamento'] ?? 0) },
          { header: 'Ganhos', valor: String(porStatus['ganho'] ?? 0) },
          { header: 'Perdidos', valor: String(porStatus['perdido'] ?? 0) },
        ],
      },
    ]

    const colunas = ['Título', 'Contato', 'Etapa', 'Prioridade', 'Previsão', 'Status']
    const linhas = filteredDeals.map((d) => [
      d.title,
      d.expand?.contact?.name || '—',
      rotulosEtapa[d.etapa] || '—',
      d.priority || '—',
      d.expected_close_date ? new Date(d.expected_close_date).toLocaleDateString('pt-BR') : '—',
      d.status || '—',
    ])

    await gerarPdfPadrao({
      titulo: 'Lista de Leads',
      filtros: filtrosAtivos,
      resumo,
      colunas,
      linhas,
      prefixoArquivo: 'lista-leads',
    })
  }

  const statusColors: Record<string, string> = {
    'em andamento': 'bg-teal-50 text-teal-700 border-teal-200',
    ganho: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    perdido: 'bg-rose-50 text-rose-700 border-rose-200',
  }
  const statusLabels: Record<string, string> = {
    'em andamento': 'EM ANDAMENTO',
    ganho: 'GANHO',
    perdido: 'PERDIDO',
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Lista de Leads</h2>
          <p className="text-sm text-slate-500">Todos os leads cadastrados no funil</p>
        </div>
        <div className="flex items-center gap-2">
          <BotaoExportarPdf aoGerar={handleExportarPdf} />
          <Button
            onClick={() =>
              baixarCsv(
                nomeArquivoCsv('leads'),
                montarCsv(
                  ['Título', 'Contato', 'Etapa', 'Prioridade', 'Previsão', 'Status'],
                  filteredDeals.map((d) =>
                    linhaCsv([
                      { valor: d.title },
                      { valor: d.expand?.contact?.name },
                      { valor: rotulosEtapa[d.etapa] },
                      { valor: d.priority },
                      { valor: d.expected_close_date, tipo: { data: true } },
                      { valor: d.status },
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
          <Button
            onClick={() => {
              setDealToEdit(null)
              setDealModalOpen(true)
            }}
            className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs h-10 shadow-md shadow-teal-700/20"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Novo Lead
          </Button>
        </div>
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

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-slate-50">
            <SelectValue placeholder="Status do CRM" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="em andamento">Em andamento</SelectItem>
            <SelectItem value="ganho">Ganho</SelectItem>
            <SelectItem value="perdido">Perdido</SelectItem>
          </SelectContent>
        </Select>
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
                <th className="p-4">
                  <div className="flex items-center gap-1.5">
                    <span>Título</span>
                    <ColumnFilter
                      coluna="Título"
                      valores={getValoresColuna(deals, valorColuna, 'titulo')}
                      selecionados={filtrosColuna.find((f) => f.id === 'titulo')?.valores ?? []}
                      onChange={(valores) =>
                        setFiltrosColuna((atual) =>
                          atual.map((f) => (f.id === 'titulo' ? { ...f, valores } : f)),
                        )
                      }
                    />
                  </div>
                </th>
                <th className="p-4">
                  <div className="flex items-center gap-1.5">
                    <span>Contato</span>
                    <ColumnFilter
                      coluna="Contato"
                      valores={getValoresColuna(deals, valorColuna, 'contato')}
                      selecionados={filtrosColuna.find((f) => f.id === 'contato')?.valores ?? []}
                      onChange={(valores) =>
                        setFiltrosColuna((atual) =>
                          atual.map((f) => (f.id === 'contato' ? { ...f, valores } : f)),
                        )
                      }
                    />
                  </div>
                </th>
                <th className="p-4">
                  <div className="flex items-center gap-1.5">
                    <span>Etapa</span>
                    <ColumnFilter
                      coluna="Etapa"
                      valores={getValoresColuna(deals, valorColuna, 'etapa')}
                      selecionados={filtrosColuna.find((f) => f.id === 'etapa')?.valores ?? []}
                      onChange={(valores) =>
                        setFiltrosColuna((atual) =>
                          atual.map((f) => (f.id === 'etapa' ? { ...f, valores } : f)),
                        )
                      }
                    />
                  </div>
                </th>
                <th className="p-4">
                  <div className="flex items-center gap-1.5">
                    <span>Prioridade</span>
                    <ColumnFilter
                      coluna="Prioridade"
                      valores={getValoresColuna(deals, valorColuna, 'prioridade')}
                      selecionados={filtrosColuna.find((f) => f.id === 'prioridade')?.valores ?? []}
                      onChange={(valores) =>
                        setFiltrosColuna((atual) =>
                          atual.map((f) => (f.id === 'prioridade' ? { ...f, valores } : f)),
                        )
                      }
                    />
                  </div>
                </th>
                <th className="p-4">
                  <div className="flex items-center gap-1.5">
                    <span>Previsão</span>
                    <ColumnFilter
                      coluna="Previsão"
                      valores={getValoresColuna(deals, valorColuna, 'previsao')}
                      selecionados={filtrosColuna.find((f) => f.id === 'previsao')?.valores ?? []}
                      onChange={(valores) =>
                        setFiltrosColuna((atual) =>
                          atual.map((f) => (f.id === 'previsao' ? { ...f, valores } : f)),
                        )
                      }
                    />
                  </div>
                </th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDeals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-sm">
                    Nenhum lead encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredDeals.map((deal) => (
                  <tr
                    key={deal.id}
                    onClick={() => setSelectedDeal(deal)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="p-4 font-bold text-slate-900">{deal.title}</td>
                    <td className="p-4 text-xs text-slate-600">
                      {deal.expand?.contact ? (
                        <div className="flex items-center gap-1.5">
                          <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                          <span>{deal.expand.contact.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-slate-600">
                      <Badge
                        variant="outline"
                        className="font-semibold"
                        style={{ borderColor: stages.find((s) => s.id === deal.etapa)?.cor }}
                      >
                        {rotulosEtapa[deal.etapa] || '—'}
                      </Badge>
                    </td>
                    <td className="p-4 text-xs capitalize">{deal.priority}</td>
                    <td className="p-4 text-xs">
                      {deal.expected_close_date
                        ? new Date(deal.expected_close_date).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className={statusColors[deal.status] || ''}>
                        {statusLabels[deal.status] || deal.status.toUpperCase()}
                      </Badge>
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
        deal={selectedDeal}
        open={!!selectedDeal}
        onClose={() => setSelectedDeal(null)}
        onUpdated={loadData}
      />
    </div>
  )
}

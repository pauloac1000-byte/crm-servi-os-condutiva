import { useState, useEffect } from 'react'
import { getOrdensServico, deleteOrdemServico } from '@/services/ordens_servico'
import { getContacts } from '@/services/contacts'
import { getContratos } from '@/services/contratos'
import { getUsers } from '@/services/users'
import { OrdemServico, Contact, Contrato, User } from '@/types/crm'
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
import { Search, Plus, Trash2, Edit2, Wrench } from 'lucide-react'
import { OrdemServicoModal } from '@/components/OrdemServicoModal'
import { useRealtime } from '@/hooks/use-realtime'
import {
  ORDEM_SERVICO_STATUS,
  formatarDataOS,
  isAtrasada,
  statusOsClasses,
} from '@/lib/ordem-servico'
import { toast } from 'sonner'

export default function OrdensServico() {
  const [ordens, setOrdens] = useState<OrdemServico[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [usuarios, setUsuarios] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [clienteFilter, setClienteFilter] = useState<string>('all')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [osToEdit, setOsToEdit] = useState<OrdemServico | null>(null)

  const loadData = async () => {
    try {
      const [os, cts, cs, us] = await Promise.all([
        getOrdensServico(),
        getContacts(),
        getContratos(),
        getUsers().catch(() => []),
      ])
      setOrdens(os)
      setContacts(cts)
      setContratos(cs)
      setUsuarios(us)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('ordens_servico', () => loadData())

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta ordem de serviço?')) {
      try {
        await deleteOrdemServico(id)
        toast.success('Ordem de serviço excluída com sucesso!')
        loadData()
      } catch {
        toast.error('Erro ao excluir ordem de serviço.')
      }
    }
  }

  // Filtro de período sobre a data de abertura (AAAA-MM-DD)
  const filtered = ordens.filter((os) => {
    const termo = search.toLowerCase()
    const matchesSearch =
      (os.expand?.cliente?.name || '').toLowerCase().includes(termo) ||
      (os.descricao || '').toLowerCase().includes(termo) ||
      (os.equipamento || '').toLowerCase().includes(termo)
    const matchesStatus = statusFilter === 'all' || os.status === statusFilter
    const matchesCliente = clienteFilter === 'all' || os.cliente === clienteFilter
    const abertura = os.data_abertura ? os.data_abertura.split(' ')[0].split('T')[0] : ''
    const dentroInicio = !dataInicio || (abertura !== '' && abertura >= dataInicio)
    const dentroFim = !dataFim || (abertura !== '' && abertura <= dataFim)
    return matchesSearch && matchesStatus && matchesCliente && dentroInicio && dentroFim
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Ordens de Serviço</h2>
          <p className="text-sm text-slate-500">Serviços executados para os clientes</p>
        </div>
        <Button
          onClick={() => {
            setOsToEdit(null)
            setModalOpen(true)
          }}
          className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs h-10 shadow-md shadow-teal-700/20"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Nova OS
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por cliente, descrição ou equipamento..."
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
              {ORDEM_SERVICO_STATUS.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={clienteFilter} onValueChange={setClienteFilter}>
            <SelectTrigger className="w-full sm:w-44 bg-slate-50">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {contacts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            className="bg-slate-50 border-slate-200 w-full sm:w-40"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            aria-label="Abertura a partir de"
          />
          <Input
            type="date"
            className="bg-slate-50 border-slate-200 w-full sm:w-40"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            aria-label="Abertura até"
          />
        </div>
      </div>

      {/* Lista de OS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((os) => (
          <div
            key={os.id}
            className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-slate-900 truncate">
                  {os.expand?.cliente?.name || 'Sem cliente'}
                </p>
                <p className="text-xs text-slate-500 line-clamp-2">{os.descricao}</p>
              </div>
              <Badge
                variant="outline"
                className={`capitalize shrink-0 ${statusOsClasses(os.status)}`}
              >
                {os.status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Abertura</p>
                <p className="text-xs font-bold text-slate-800">
                  {formatarDataOS(os.data_abertura)}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Prazo</p>
                <p
                  className={`text-xs font-bold ${isAtrasada(os) ? 'text-rose-600' : 'text-slate-800'}`}
                >
                  {formatarDataOS(os.prazo_acordado)}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="truncate">{os.equipamento || 'Sem equipamento'}</span>
              <span className="shrink-0">
                {os.expand?.responsavel_tecnico?.name || 'Sem responsável'}
              </span>
            </div>
            <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-100">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-500 hover:text-teal-700 hover:bg-teal-50"
                onClick={() => {
                  setOsToEdit(os)
                  setModalOpen(true)
                }}
                aria-label={`Editar OS de ${os.expand?.cliente?.name || 'cliente'}`}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                onClick={() => handleDelete(os.id)}
                aria-label={`Excluir OS de ${os.expand?.cliente?.name || 'cliente'}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
          <Wrench className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">Nenhuma ordem de serviço encontrada</p>
          <p className="text-xs text-slate-400">Ajuste os filtros ou cadastre uma nova OS.</p>
        </div>
      )}

      <OrdemServicoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        contacts={contacts}
        contratos={contratos}
        usuarios={usuarios}
        osToEdit={osToEdit}
        onSuccess={() => loadData()}
      />
    </div>
  )
}

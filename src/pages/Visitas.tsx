import { useState, useEffect, useMemo } from 'react'
import { getVisitas, deleteVisita } from '@/services/visitas'
import { getContacts } from '@/services/contacts'
import { getDeals } from '@/services/deals'
import { getUsers } from '@/services/users'
import { useAuth } from '@/hooks/use-auth'
import { VisitaComercial, Contact, Deal, User } from '@/types/crm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Car, Trash2, Edit2, MapPin, Clock, Briefcase } from 'lucide-react'
import { VisitasModal } from '@/components/VisitasModal'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'

export default function Visitas() {
  const { user } = useAuth()
  const [visitas, setVisitas] = useState<VisitaComercial[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [visitaToEdit, setVisitaToEdit] = useState<VisitaComercial | null>(null)

  // Filtros: período (intervalo de datas) e responsável
  const [dataDe, setDataDe] = useState('')
  const [dataAte, setDataAte] = useState('')
  const [responsavelFiltro, setResponsavelFiltro] = useState('todos')

  const loadData = async () => {
    try {
      const [v, c, d, u] = await Promise.all([getVisitas(), getContacts(), getDeals(), getUsers()])
      setVisitas(v)
      setContacts(c)
      setDeals(d)
      setUsers(u)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('visitas_comerciais', () => loadData())

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta visita?')) {
      try {
        await deleteVisita(id)
        toast.success('Visita excluída!')
        loadData()
      } catch (_) {
        toast.error('Erro ao excluir visita.')
      }
    }
  }

  const visitasFiltradas = useMemo(() => {
    return visitas.filter((v) => {
      if (dataDe && v.data && v.data < `${dataDe} 00:00:00.000Z`) return false
      if (dataAte && v.data && v.data > `${dataAte} 23:59:59.000Z`) return false
      if (responsavelFiltro !== 'todos' && v.responsavel !== responsavelFiltro) return false
      return true
    })
  }, [visitas, dataDe, dataAte, responsavelFiltro])

  const custoTotalPeriodo = useMemo(
    () => visitasFiltradas.reduce((soma, v) => soma + (v.custo_total || 0), 0),
    [visitasFiltradas],
  )

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const nomeResponsavel = (v: VisitaComercial) =>
    v.expand?.responsavel?.name || v.expand?.responsavel?.email || ''

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Visitas Comerciais</h2>
          <p className="text-sm text-slate-500">
            Custo das visitas feitas para gerar e avançar leads
          </p>
        </div>
        <Button
          onClick={() => {
            setVisitaToEdit(null)
            setModalOpen(true)
          }}
          className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs h-10 shadow-md shadow-teal-700/20"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Nova Visita
        </Button>
      </div>

      {/* Filtros: período e responsável */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div className="space-y-1.5">
          <Label htmlFor="f_de" className="text-slate-700 font-semibold text-xs">
            Período — de
          </Label>
          <Input id="f_de" type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f_ate" className="text-slate-700 font-semibold text-xs">
            até
          </Label>
          <Input
            id="f_ate"
            type="date"
            value={dataAte}
            onChange={(e) => setDataAte(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f_resp" className="text-slate-700 font-semibold text-xs">
            Responsável
          </Label>
          <Select value={responsavelFiltro} onValueChange={setResponsavelFiltro}>
            <SelectTrigger id="f_resp">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-teal-50 border border-teal-200">
          <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
            Custo no período
          </span>
          <span className="text-sm font-black text-teal-700">
            {formatCurrency(custoTotalPeriodo)}
          </span>
        </div>
      </div>

      {visitasFiltradas.length === 0 ? (
        <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
          Nenhuma visita registrada para os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-3">
          {visitasFiltradas.map((v) => (
            <div
              key={v.id}
              className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:border-slate-300"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-8 w-8 rounded-full shrink-0 flex items-center justify-center bg-teal-50 text-teal-700">
                  <Car className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-bold text-slate-900 capitalize">{v.tipo}</h4>
                    {v.data && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(v.data).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                    {nomeResponsavel(v) && (
                      <span className="text-[11px] font-medium text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
                        {nomeResponsavel(v)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1.5">
                    {v.expand?.contato && (
                      <span className="flex items-center gap-1 font-medium text-slate-600">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {v.expand.contato.name}
                      </span>
                    )}
                    {v.expand?.negocio && (
                      <span className="flex items-center gap-1 font-medium text-slate-600">
                        <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                        {v.expand.negocio.title}
                      </span>
                    )}
                    {!!v.km_rodados && <span>{v.km_rodados} km</span>}
                    {!!v.horas_dedicadas && <span>{v.horas_dedicadas} h</span>}
                  </div>

                  {v.resultado && (
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{v.resultado}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <span className="text-base font-black text-teal-700">
                  {formatCurrency(v.custo_total || 0)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-teal-700"
                  onClick={() => {
                    setVisitaToEdit(v)
                    setModalOpen(true)
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
                  onClick={() => handleDelete(v.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <VisitasModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        contacts={contacts}
        deals={deals}
        users={users}
        visitaToEdit={visitaToEdit}
        defaultResponsavelId={user?.id}
        onSuccess={loadData}
      />
    </div>
  )
}

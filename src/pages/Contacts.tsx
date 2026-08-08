import { useState, useEffect } from 'react'
import { getContacts, deleteContact } from '@/services/contacts'
import { Contact } from '@/types/crm'
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
import { Search, Plus, Trash2, Edit2, Mail, Phone, Building } from 'lucide-react'
import { ContactModal } from '@/components/ContactModal'
import { ContactDetailDrawer } from '@/components/ContactDetailDrawer'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [contactToEdit, setContactToEdit] = useState<Contact | null>(null)
  const [selectedContactDetail, setSelectedContactDetail] = useState<Contact | null>(null)

  const loadData = async () => {
    try {
      const data = await getContacts()
      setContacts(data)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('contacts', () => loadData())

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Tem certeza que deseja excluir este contato?')) {
      try {
        await deleteContact(id)
        toast.success('Contato excluído com sucesso!')
        loadData()
      } catch (_) {
        toast.error('Erro ao excluir contato.')
      }
    }
  }

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.company || '').toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const statusColors: Record<string, string> = {
    cliente: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    prospect: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    lead: 'bg-amber-50 text-amber-700 border-amber-200',
    inativo: 'bg-slate-100 text-slate-600 border-slate-200',
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Gestão de Contatos</h2>
          <p className="text-sm text-slate-500">Base centralizada de clientes e prospectos</p>
        </div>
        <Button
          onClick={() => {
            setContactToEdit(null)
            setContactModalOpen(true)
          }}
          className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs h-10 shadow-md shadow-teal-700/20"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Novo Contato
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por nome, e-mail ou empresa..."
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
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="cliente">Cliente</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="p-4">Nome</th>
                <th className="p-4">Empresa / Cargo</th>
                <th className="p-4">Contato</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 text-sm">
                    Nenhum contato encontrado.
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr
                    key={contact.id}
                    onClick={() => setSelectedContactDetail(contact)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="p-4 font-bold text-slate-900">{contact.name}</td>
                    <td className="p-4 text-xs text-slate-600">
                      <div className="font-semibold text-slate-800">{contact.company || '—'}</div>
                      <div className="text-slate-400">{contact.role}</div>
                    </td>
                    <td className="p-4 text-xs space-y-1">
                      {contact.email && (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          <span>{contact.email}</span>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className={statusColors[contact.status] || ''}>
                        {contact.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-4 text-right space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-teal-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          setContactToEdit(contact)
                          setContactModalOpen(true)
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
                        onClick={(e) => handleDelete(contact.id, e)}
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

      <ContactModal
        open={contactModalOpen}
        onOpenChange={setContactModalOpen}
        contactToEdit={contactToEdit}
        onSuccess={loadData}
      />

      <ContactDetailDrawer
        contact={selectedContactDetail}
        open={!!selectedContactDetail}
        onClose={() => setSelectedContactDetail(null)}
        onUpdated={loadData}
      />
    </div>
  )
}

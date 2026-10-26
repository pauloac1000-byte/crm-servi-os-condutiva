import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, Menu, LogOut, User as UserIcon, Briefcase, Phone } from 'lucide-react'
import { Deal, Contact } from '@/types/crm'

interface HeaderProps {
  onOpenMobileSidebar: () => void
  deals: Deal[]
  contacts: Contact[]
  onSelectDeal?: (deal: Deal) => void
  onSelectContact?: (contact: Contact) => void
}

const titlesMap: Record<string, string> = {
  '/': 'Dashboard',
  '/pipeline': 'Pipeline de Vendas',
  '/deals': 'Gestão de Negócios',
  '/contacts': 'Contatos & CRM',
  '/activities': 'Atividades & Tarefas',
}

export function Header({
  onOpenMobileSidebar,
  deals = [],
  contacts = [],
  onSelectDeal,
  onSelectContact,
}: HeaderProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)

  const pageTitle = titlesMap[location.pathname] || 'Condutiva Vendas'

  const filteredDeals = searchQuery.trim()
    ? deals.filter((d) => d.title.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 4)
    : []

  const filteredContacts = searchQuery.trim()
    ? contacts
        .filter(
          (c) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.company && c.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (c.cidade && c.cidade.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (c.estado && c.estado.toLowerCase().includes(searchQuery.toLowerCase())),
        )
        .slice(0, 4)
    : []

  const handleLogout = () => {
    signOut()
    navigate('/login')
  }

  const getInitials = (name?: string) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur transition-all sm:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-slate-600 hover:text-slate-900"
          onClick={onOpenMobileSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar negócios ou contatos..."
            className="pl-9 pr-4 h-9 bg-slate-50 border-slate-200 focus-visible:ring-[#84bd22] text-sm"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setShowSearchResults(true)
            }}
            onFocus={() => setShowSearchResults(true)}
            onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
          />

          {showSearchResults && searchQuery.trim() && (
            <div className="absolute right-0 top-11 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-in fade-in-50 slide-in-from-top-1">
              {filteredDeals.length === 0 && filteredContacts.length === 0 ? (
                <p className="p-3 text-center text-xs text-slate-500">
                  Nenhum resultado encontrado.
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredDeals.length > 0 && (
                    <div>
                      <p className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Negócios
                      </p>
                      {filteredDeals.map((deal) => (
                        <button
                          key={deal.id}
                          className="w-full text-left flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 transition-colors text-sm"
                          onClick={() => {
                            if (onSelectDeal) onSelectDeal(deal)
                            else navigate('/deals')
                            setShowSearchResults(false)
                          }}
                        >
                          <Briefcase className="h-4 w-4 text-[#84bd22] shrink-0" />
                          <div className="truncate">
                            <p className="font-medium text-slate-800 truncate">{deal.title}</p>
                            <p className="text-xs text-slate-500">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              }).format(deal.value)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {filteredContacts.length > 0 && (
                    <div>
                      <p className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Contatos
                      </p>
                      {filteredContacts.map((contact) => (
                        <button
                          key={contact.id}
                          className="w-full text-left flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 transition-colors text-sm"
                          onClick={() => {
                            if (onSelectContact) onSelectContact(contact)
                            else navigate('/contacts')
                            setShowSearchResults(false)
                          }}
                        >
                          <Phone className="h-4 w-4 text-slate-700 shrink-0" />
                          <div className="truncate">
                            <p className="font-medium text-slate-800 truncate">{contact.name}</p>
                            <p className="text-xs text-slate-500">
                              {[
                                contact.company,
                                [contact.cidade, contact.estado].filter(Boolean).join(' - '),
                              ]
                                .filter(Boolean)
                                .join(' • ') || contact.email}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full p-1 hover:bg-slate-100 transition-colors focus:outline-none">
              <Avatar className="h-9 w-9 border border-[#84bd22]/40 bg-[#84bd22] text-slate-950 font-bold">
                <AvatarFallback className="bg-[#84bd22] text-slate-950 font-bold text-xs">
                  {getInitials(user?.name || user?.email)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline-block text-sm font-semibold text-slate-700 max-w-[120px] truncate">
                {user?.name || 'Usuário'}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 p-1 shadow-lg">
            <DropdownMenuLabel className="font-normal text-xs text-slate-500">
              Conectado como{' '}
              <strong className="font-semibold text-slate-800 block truncate">{user?.email}</strong>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-slate-700"
              onClick={() => navigate('/contacts')}
            >
              <UserIcon className="mr-2 h-4 w-4 text-slate-400" />
              Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { User } from '@/types/crm'
import { getUsers, deleteUser } from '@/services/users'
import { UserModal } from '@/components/UserModal'
import { DeleteUserDialog } from '@/components/DeleteUserDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ShieldCheck,
  User as UserIcon,
  Search,
  UserPlus,
  MoreVertical,
  Edit2,
  Trash2,
  RefreshCw,
  Users as UsersIcon,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all')

  // Modals state
  const [modalOpen, setModalOpen] = useState(false)
  const [userToEdit, setUserToEdit] = useState<User | null>(null)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const data = await getUsers()
      setUsers(data)
    } catch (err: any) {
      toast.error('Erro ao carregar lista de usuários.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleOpenCreate = () => {
    setUserToEdit(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (user: User) => {
    setUserToEdit(user)
    setModalOpen(true)
  }

  const handleOpenDelete = (user: User) => {
    if (user.id === currentUser?.id) {
      toast.error('Você não pode excluir sua própria conta.')
      return
    }
    setUserToDelete(user)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!userToDelete) return
    setDeleteLoading(true)
    try {
      await deleteUser(userToDelete.id)
      toast.success(`Usuário ${userToDelete.name} excluído com sucesso.`)
      setDeleteDialogOpen(false)
      setUserToDelete(null)
      fetchUsers()
    } catch (err: any) {
      const msg = err?.message || 'Erro ao excluir o usuário.'
      toast.error(`Falha ao excluir: ${msg}`)
    } finally {
      setDeleteLoading(false)
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())

      const matchesRole =
        roleFilter === 'all'
          ? true
          : roleFilter === 'admin'
            ? u.role === 'admin'
            : u.role !== 'admin'

      return matchesSearch && matchesRole
    })
  }, [users, search, roleFilter])

  const stats = useMemo(() => {
    const total = users.length
    const admins = users.filter((u) => u.role === 'admin').length
    const standard = total - admins
    return { total, admins, standard }
  }, [users])

  const getInitials = (name?: string) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    try {
      const date = new Date(dateStr)
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(date)
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <UsersIcon className="h-6 w-6 text-[#84bd22]" />
            Gestão de Usuários
          </h2>
          <p className="text-sm text-slate-500">
            Gerencie o acesso, permissões e cadastro de operadores e administradores da Condutiva.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            disabled={loading}
            className="border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            onClick={handleOpenCreate}
            className="bg-[#84bd22] hover:bg-[#74a91e] text-slate-950 font-bold shadow-md shadow-[#84bd22]/20"
          >
            <UserPlus className="h-4 w-4 mr-1.5 text-slate-950" />
            Novo Usuário
          </Button>
        </div>
      </div>

      {/* Stats summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total de Contas
            </CardDescription>
            <CardTitle className="text-2xl font-extrabold text-slate-900">{stats.total}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-slate-500">Usuários cadastrados no sistema</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-[#84bd22] uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Administradores
            </CardDescription>
            <CardTitle className="text-2xl font-extrabold text-slate-900">{stats.admins}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-slate-500">Acesso irrestrito a configurações e CRM</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <UserIcon className="h-3.5 w-3.5" /> Usuários Comuns
            </CardDescription>
            <CardTitle className="text-2xl font-extrabold text-slate-900">
              {stats.standard}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-slate-500">Vendedores e operadores de vendas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 border-slate-200 bg-slate-50 focus-visible:ring-[#84bd22] text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <Button
            variant={roleFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRoleFilter('all')}
            className={
              roleFilter === 'all'
                ? 'bg-slate-900 text-white font-semibold'
                : 'border-slate-200 text-slate-600'
            }
          >
            Todos ({users.length})
          </Button>
          <Button
            variant={roleFilter === 'admin' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRoleFilter('admin')}
            className={
              roleFilter === 'admin'
                ? 'bg-[#84bd22] text-slate-950 font-bold'
                : 'border-slate-200 text-slate-600'
            }
          >
            Admins ({stats.admins})
          </Button>
          <Button
            variant={roleFilter === 'user' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRoleFilter('user')}
            className={
              roleFilter === 'user'
                ? 'bg-slate-900 text-white font-semibold'
                : 'border-slate-200 text-slate-600'
            }
          >
            Usuários ({stats.standard})
          </Button>
        </div>
      </div>

      {/* Users table card */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Usuário</th>
                <th className="py-3.5 px-4">Papel</th>
                <th className="py-3.5 px-4 hidden md:table-cell">Status</th>
                <th className="py-3.5 px-4 hidden sm:table-cell">Cadastrado em</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-[#84bd22]" />
                      <p className="text-xs">Carregando usuários...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <UsersIcon className="h-8 w-8 text-slate-300" />
                      <p className="font-medium text-slate-600">Nenhum usuário encontrado.</p>
                      {search && (
                        <p className="text-xs text-slate-400">
                          Tente ajustar os termos da sua busca.
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = u.id === currentUser?.id
                  const isAdmin = u.role === 'admin'

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-slate-200 bg-[#84bd22] text-slate-950 font-bold shrink-0">
                            <AvatarFallback className="bg-[#84bd22] text-slate-950 font-bold text-xs">
                              {getInitials(u.name || u.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-900 truncate">
                                {u.name || 'Sem nome'}
                              </p>
                              {isCurrent && (
                                <Badge
                                  variant="outline"
                                  className="border-[#84bd22] text-[#628f14] bg-[#84bd22]/10 text-[10px] font-bold px-1.5 py-0"
                                >
                                  Você
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-[#84bd22] px-2.5 py-1 text-xs font-bold shadow-sm">
                            <ShieldCheck className="h-3.5 w-3.5 text-[#84bd22]" />
                            Administrador
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 px-2.5 py-1 text-xs font-semibold">
                            <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                            Usuário
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 hidden md:table-cell">
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                          Ativo
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-500 hidden sm:table-cell">
                        {formatDate(u.created)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-slate-900"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 bg-white shadow-lg">
                            <DropdownMenuLabel className="text-xs font-normal text-slate-400">
                              Ações para {u.name.split(' ')[0]}
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleOpenEdit(u)}
                              className="cursor-pointer text-slate-700"
                            >
                              <Edit2 className="mr-2 h-4 w-4 text-slate-400" />
                              Editar dados / Senha
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {isCurrent ? (
                              <DropdownMenuItem
                                disabled
                                className="text-slate-400 cursor-not-allowed text-xs"
                              >
                                Não é possível autoexcluir
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleOpenDelete(u)}
                                className="cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir usuário
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* User Create / Edit modal */}
      <UserModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        userToEdit={userToEdit}
        currentUserId={currentUser?.id}
        onSaved={fetchUsers}
      />

      {/* User Delete confirmation modal */}
      <DeleteUserDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        userToDelete={userToDelete}
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

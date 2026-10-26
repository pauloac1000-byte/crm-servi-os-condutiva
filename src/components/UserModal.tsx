import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { User, UserRole } from '@/types/crm'
import { createUser, updateUser } from '@/services/users'
import { toast } from 'sonner'
import { ShieldCheck, User as UserIcon, Lock, Mail, KeyRound } from 'lucide-react'

interface UserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userToEdit: User | null
  currentUserId?: string
  onSaved: () => void
}

export function UserModal({
  open,
  onOpenChange,
  userToEdit,
  currentUserId,
  onSaved,
}: UserModalProps) {
  const isEditing = Boolean(userToEdit)
  const isSelf = Boolean(userToEdit && currentUserId && userToEdit.id === currentUserId)

  const [name, setName] = useState(userToEdit?.name || '')
  const [email, setEmail] = useState(userToEdit?.email || '')
  const [role, setRole] = useState<UserRole>(userToEdit?.role || 'user')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Reset when modal opens with new userToEdit
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setName(userToEdit?.name || '')
      setEmail(userToEdit?.email || '')
      setRole(userToEdit?.role || 'user')
      setPassword('')
      setConfirmPassword('')
    }
    onOpenChange(newOpen)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Informe o nome do usuário.')
      return
    }

    if (!email.trim()) {
      toast.error('Informe o e-mail do usuário.')
      return
    }

    if (!isEditing) {
      if (!password) {
        toast.error('A senha é obrigatória para criar um novo usuário.')
        return
      }
      if (password.length < 8) {
        toast.error('A senha deve ter no mínimo 8 caracteres.')
        return
      }
      if (password !== confirmPassword) {
        toast.error('As senhas não coincidem.')
        return
      }
    } else {
      // Editing
      if (password) {
        if (password.length < 8) {
          toast.error('A nova senha deve ter no mínimo 8 caracteres.')
          return
        }
        if (password !== confirmPassword) {
          toast.error('A confirmação de senha não confere.')
          return
        }
      }

      if (isSelf && role !== 'admin') {
        toast.error('Você não pode remover seu próprio papel de administrador.')
        return
      }
    }

    setLoading(true)
    try {
      if (isEditing && userToEdit) {
        await updateUser(userToEdit.id, {
          name: name.trim(),
          email: email.trim(),
          role: isSelf ? 'admin' : role,
          password: password ? password : undefined,
        })
        toast.success('Usuário atualizado com sucesso!')
      } else {
        await createUser({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
        })
        toast.success('Usuário cadastrado com sucesso!')
      }
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      const msg =
        err?.response?.data?.email?.message ||
        err?.response?.data?.password?.message ||
        err?.message ||
        'Não foi possível salvar o usuário. Verifique se o e-mail já está em uso.'
      toast.error(`Erro: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-white text-slate-900 border-slate-200">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-9 w-9 rounded-xl bg-[#84bd22]/20 flex items-center justify-center text-slate-900">
              {role === 'admin' ? (
                <ShieldCheck className="h-5 w-5 text-slate-900" />
              ) : (
                <UserIcon className="h-5 w-5 text-slate-900" />
              )}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {isEditing
                  ? 'Atualize os dados de acesso e permissões do usuário.'
                  : 'Cadastre um novo usuário para acesso ao CRM Condutiva.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="user-name" className="text-xs font-semibold text-slate-700">
              Nome Completo *
            </Label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="user-name"
                placeholder="Ex.: Paulo Christini"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-9 h-10 border-slate-200 focus-visible:ring-[#84bd22]"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-email" className="text-xs font-semibold text-slate-700">
              E-mail corporativo *
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="user-email"
                type="email"
                placeholder="usuario@condutiva.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 h-10 border-slate-200 focus-visible:ring-[#84bd22]"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="user-role" className="text-xs font-semibold text-slate-700">
                Papel de Acesso
              </Label>
              {isSelf && (
                <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                  Seu próprio papel (bloqueado como Admin)
                </span>
              )}
            </div>
            <Select value={role} onValueChange={(val: UserRole) => setRole(val)} disabled={isSelf}>
              <SelectTrigger id="user-role" className="h-10 border-slate-200 focus:ring-[#84bd22]">
                <SelectValue placeholder="Selecione o papel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-slate-500" />
                    <span>Usuário Comum (Vendedor / Operador)</span>
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#84bd22]" />
                    <span className="font-semibold text-slate-900">
                      Administrador (Acesso Total)
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-slate-500" />
              <p className="text-xs font-semibold text-slate-700">
                {isEditing ? 'Redefinir Senha (opcional)' : 'Definir Senha de Acesso *'}
              </p>
            </div>
            {isEditing && (
              <p className="text-[11px] text-slate-500">
                Deixe os campos abaixo em branco para manter a senha atual inalterada.
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="user-password" className="text-[11px] font-medium text-slate-600">
                  {isEditing ? 'Nova Senha' : 'Senha'}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="user-password"
                    type="password"
                    placeholder="Mín. 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-8 h-9 text-xs bg-white border-slate-200 focus-visible:ring-[#84bd22]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor="user-confirm-password"
                  className="text-[11px] font-medium text-slate-600"
                >
                  Confirmar
                </Label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="user-confirm-password"
                    type="password"
                    placeholder="Repita a senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-8 h-9 text-xs bg-white border-slate-200 focus-visible:ring-[#84bd22]"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="border-slate-200 text-slate-700"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#84bd22] hover:bg-[#74a91e] text-slate-950 font-bold shadow-md shadow-[#84bd22]/20"
            >
              {loading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

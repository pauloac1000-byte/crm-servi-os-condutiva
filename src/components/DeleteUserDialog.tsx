import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { User } from '@/types/crm'
import { AlertTriangle } from 'lucide-react'

interface DeleteUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userToDelete: User | null
  loading: boolean
  onConfirm: () => void
}

export function DeleteUserDialog({
  open,
  onOpenChange,
  userToDelete,
  loading,
  onConfirm,
}: DeleteUserDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-white border-slate-200">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <AlertDialogTitle className="text-slate-900 font-bold">
                Excluir Usuário
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-500 text-xs">
                Esta ação é irreversível e revogará imediatamente o acesso deste usuário ao sistema.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {userToDelete && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 my-2 text-sm">
            <p className="font-semibold text-slate-800">{userToDelete.name}</p>
            <p className="text-xs text-slate-500">{userToDelete.email}</p>
            <p className="text-[11px] text-slate-400 mt-1 uppercase font-bold tracking-wider">
              Papel atual: {userToDelete.role === 'admin' ? 'Administrador' : 'Usuário Comum'}
            </p>
          </div>
        )}

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={loading} className="border-slate-200 text-slate-700">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            disabled={loading}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
          >
            {loading ? 'Excluindo...' : 'Sim, excluir usuário'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

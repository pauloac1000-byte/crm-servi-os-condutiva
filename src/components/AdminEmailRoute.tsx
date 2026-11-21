import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

// Portão do painel de usuários/aprovações: liberado somente para
// paulo@condutiva.com.br (critério pelo e-mail, não por role).
// Qualquer outro usuário logado volta ao painel.
export function AdminEmailRoute() {
  const { user, isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#84bd22] border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Verificando permissões...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.email?.toLowerCase() !== 'paulo@condutiva.com.br') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

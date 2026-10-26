import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import {
  LayoutDashboard,
  Kanban,
  Briefcase,
  Users,
  CheckCircle2,
  ShieldCheck,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import logoImg from '@/assets/logo-removebg-previewedited-6e100.jpg'

interface SidebarProps {
  onCloseMobile?: () => void
}

export function Sidebar({ onCloseMobile }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut, isAdmin } = useAuth()

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Pipeline', path: '/pipeline', icon: Kanban },
    { label: 'Negócios', path: '/deals', icon: Briefcase },
    { label: 'Contatos', path: '/contacts', icon: Users },
    { label: 'Atividades', path: '/activities', icon: CheckCircle2 },
    ...(isAdmin ? [{ label: 'Usuários', path: '/users', icon: ShieldCheck }] : []),
  ]

  const handleLogout = () => {
    signOut()
    if (onCloseMobile) onCloseMobile()
    navigate('/login')
  }

  return (
    <aside className="flex h-full w-64 flex-col justify-between border-r border-slate-200 bg-white p-4 text-slate-800 shadow-sm">
      <div className="space-y-6">
        <div className="flex flex-col gap-1.5 px-2 py-1 border-b border-slate-100 pb-4">
          <div className="flex items-center justify-start">
            <img
              src={logoImg}
              alt="Condutiva Tecnologia"
              className="h-10 w-auto object-contain max-w-[200px]"
            />
          </div>
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-0.5">
            Sistema de Vendas
          </span>
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150',
                  isActive
                    ? 'bg-[#84bd22] text-slate-950 font-bold shadow-md shadow-[#84bd22]/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-semibold',
                )}
              >
                <Icon
                  className={cn('h-5 w-5 shrink-0', isActive ? 'text-slate-950' : 'text-slate-400')}
                />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 rounded-xl text-slate-600 hover:bg-rose-50 hover:text-rose-600 font-medium"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 text-slate-400 group-hover:text-rose-600" />
          Sair
        </Button>
      </div>
    </aside>
  )
}

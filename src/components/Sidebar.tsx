import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { LayoutDashboard, Kanban, Briefcase, Users, CheckCircle2, LogOut, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface SidebarProps {
  onCloseMobile?: () => void
}

export function Sidebar({ onCloseMobile }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Pipeline', path: '/pipeline', icon: Kanban },
    { label: 'Negócios', path: '/deals', icon: Briefcase },
    { label: 'Contatos', path: '/contacts', icon: Users },
    { label: 'Atividades', path: '/activities', icon: CheckCircle2 },
  ]

  const handleLogout = () => {
    signOut()
    if (onCloseMobile) onCloseMobile()
    navigate('/login')
  }

  return (
    <aside className="flex h-full w-64 flex-col justify-between border-r border-slate-200 bg-white p-4 text-slate-800 shadow-sm">
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white shadow-md shadow-teal-700/20">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-slate-900 block leading-tight">
              CONDUTIVA
            </span>
            <span className="text-[10px] font-bold text-teal-700 uppercase tracking-widest block">
              Tecnologia Vendas
            </span>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150',
                  isActive
                    ? 'bg-teal-700 text-white shadow-md shadow-teal-700/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )}
              >
                <Icon
                  className={cn('h-5 w-5 shrink-0', isActive ? 'text-white' : 'text-slate-400')}
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

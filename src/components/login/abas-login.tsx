import { cn } from '@/lib/utils'

export type AbaLogin = 'entrar' | 'primeiro-acesso' | 'redefinir'

const ABAS: { id: AbaLogin; label: string }[] = [
  { id: 'entrar', label: 'Entrar' },
  { id: 'primeiro-acesso', label: 'Primeiro Acesso' },
  { id: 'redefinir', label: 'Redefinir' },
]

type AbasLoginProps = {
  abaAtiva: AbaLogin
  onTrocarAba: (aba: AbaLogin) => void
}

export function AbasLogin({ abaAtiva, onTrocarAba }: AbasLoginProps) {
  return (
    <div
      role="tablist"
      aria-label="Seções do acesso"
      className="grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1"
    >
      {ABAS.map((aba) => (
        <button
          key={aba.id}
          type="button"
          role="tab"
          aria-selected={abaAtiva === aba.id}
          onClick={() => onTrocarAba(aba.id)}
          className={cn(
            'rounded-md px-2 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#84bd22]',
            abaAtiva === aba.id
              ? 'bg-[#84bd22] text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700',
          )}
        >
          {aba.label}
        </button>
      ))}
    </div>
  )
}

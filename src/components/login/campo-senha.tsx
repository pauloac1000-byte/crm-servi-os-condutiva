import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type CampoSenhaProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  autoComplete?: string
  className?: string
  htmlFor?: string
}

const containerClasse = 'space-y-1.5'
const inputClasse =
  'bg-white border-slate-200 pl-9 pr-10 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#84bd22]'

export function ContainerCampo({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn(containerClasse, className)}>{children}</div>
}

export function RotuloObrigatorio({
  htmlFor,
  children,
}: {
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <Label htmlFor={htmlFor} className="text-slate-700 text-xs font-semibold">
      {children} <span className="text-[#84bd22]">*</span>
    </Label>
  )
}

/** Campo de senha com botão de olho à direita (mostrar/ocultar, nunca apaga o texto). */
export function CampoSenha({
  id,
  label,
  value,
  onChange,
  placeholder = '••••••••',
  required = true,
  autoComplete,
  className,
}: CampoSenhaProps) {
  const [visivel, setVisivel] = useState(false)

  return (
    <ContainerCampo className={className}>
      <RotuloObrigatorio htmlFor={id}>{label}</RotuloObrigatorio>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          id={id}
          type={visivel ? 'text' : 'password'}
          placeholder={placeholder}
          className={inputClasse}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          title={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 transition-colors hover:text-slate-700 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#84bd22]"
        >
          {visivel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </ContainerCampo>
  )
}

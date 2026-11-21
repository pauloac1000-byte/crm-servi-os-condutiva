import { AlertTriangle } from 'lucide-react'

// Aviso padrão do fluxo de aprovação: a liberação passa pela avaliação do
// administrador da Condutiva e ocorre em até 24 horas. Sempre visível antes
// do envio, nos painéis de solicitação de acesso e na aba Primeiro Acesso.
export function AvisoAvaliacao({ emBranco = false }: { emBranco?: boolean }) {
  return (
    <div
      className={
        'flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 ' +
        (emBranco ? 'bg-white border-slate-200' : '')
      }
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
      <p className="leading-relaxed">
        A liberação do seu acesso passa pela avaliação do administrador da Condutiva e ocorre em até
        24 horas. Você receberá a confirmação no e-mail informado.
      </p>
    </div>
  )
}

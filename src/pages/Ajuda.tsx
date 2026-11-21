import { Card, CardContent } from '@/components/ui/card'
import { LifeBuoy } from 'lucide-react'
import { FormularioSuporte } from '@/components/FormularioSuporte'

// Página do canal de suporte dentro do CRM — acessível pelo menu "Ajuda".
// Página protegida: o Layout é aplicado pela rota em App.tsx (não importar).
export default function Ajuda() {
  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <LifeBuoy className="h-6 w-6 text-[#84bd22]" />
          Ajuda e Suporte
        </h2>
        <p className="text-sm text-slate-500">
          Descreva o problema encontrado — o administrador da Condutiva recebe sua mensagem por
          e-mail.
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm bg-white max-w-2xl">
        <CardContent className="p-6">
          {/* Após o envio o formulário mostra a confirmação e já fica limpo para novo uso. */}
          <FormularioSuporte />
        </CardContent>
      </Card>
    </div>
  )
}

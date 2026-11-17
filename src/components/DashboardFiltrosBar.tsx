import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Calendar, User } from 'lucide-react'
import { PeriodoTipo, SelecaoFiltros, rotuloPeriodo } from '@/lib/dashboard-filtros'
import { User as UsuarioCrm } from '@/types/crm'

// Barra de FILTROS GLOBAIS do topo do Dashboard: período (mês atual,
// trimestre, ano de 2026, intervalo personalizado) + responsável comercial.
// Ambos alimentam TODOS os blocos da página ao mesmo tempo (KPIs, funil,
// custo de aquisição, metas e receita recorrente). O período escolhido
// também é exibido ao lado do título da página.
//
// Sem lógica de cálculo aqui — só seleção e desenho.

const OPCOES: { valor: PeriodoTipo; rotulo: string }[] = [
  { valor: 'mes', rotulo: 'Mês atual' },
  { valor: 'trimestre', rotulo: 'Trimestre' },
  { valor: 'ano2026', rotulo: 'Ano de 2026' },
  { valor: 'personalizado', rotulo: 'Intervalo personalizado' },
]

interface Props {
  selecao: SelecaoFiltros
  responsaveis: UsuarioCrm[]
  onChange: (sel: SelecaoFiltros) => void
}

export function DashboardFiltrosBar({ selecao, responsaveis, onChange }: Props) {
  const atualizar = (parcial: Partial<SelecaoFiltros>) => onChange({ ...selecao, ...parcial })

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* período — no celular ocupa a largura toda, empilhado */}
      <div className="flex flex-col gap-1 w-full sm:w-auto">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          Período
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selecao.tipo} onValueChange={(v) => atualizar({ tipo: v as PeriodoTipo })}>
            <SelectTrigger className="w-full sm:w-[210px] h-9 bg-white rounded-lg text-sm">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {OPCOES.map((o) => (
                <SelectItem key={o.valor} value={o.valor}>
                  {o.rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selecao.tipo === 'personalizado' && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={selecao.dataInicio ?? ''}
                onChange={(e) => atualizar({ dataInicio: e.target.value })}
                className="h-9 w-[150px] bg-white rounded-lg text-sm"
                aria-label="Data inicial"
              />
              <span className="text-xs text-slate-400">até</span>
              <Input
                type="date"
                value={selecao.dataFim ?? ''}
                onChange={(e) => atualizar({ dataFim: e.target.value })}
                className="h-9 w-[150px] bg-white rounded-lg text-sm"
                aria-label="Data final"
              />
            </div>
          )}
        </div>
      </div>

      {/* responsável comercial */}
      <div className="flex flex-col gap-1 w-full sm:w-auto">
        <label
          htmlFor="filtro-responsavel"
          className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"
        >
          <User className="h-3.5 w-3.5" />
          Responsável comercial
        </label>
        {/* label associado por id ao trigger (o shadcn SelectTrigger não
            recebe <label> nativo; htmlFor + aria-labelledby cobrem teclado
            e leitores de tela) */}
        <Select
          value={selecao.responsavel || 'todos'}
          onValueChange={(v) => atualizar({ responsavel: v === 'todos' ? '' : v })}
        >
          <SelectTrigger
            id="filtro-responsavel"
            className="w-full sm:w-[210px] h-9 bg-white rounded-lg text-sm"
          >
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {responsaveis.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

// Rótulo do período atual (texto do usuário, ex. "Dashboard · Nov/2026")
export const rotuloPeriodoAtual = (sel: SelecaoFiltros) => rotuloPeriodo(sel)

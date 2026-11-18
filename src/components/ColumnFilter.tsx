import { useState, useMemo, useEffect, useRef } from 'react'
import { Check, Filter, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { compararTexto } from '@/lib/ordenacao-alfabetica'

export type ColunaFiltravelId = 'titulo' | 'contato' | 'etapa' | 'prioridade' | 'previsao'

export interface ColunaFiltravel {
  id: ColunaFiltravelId
  rotulo: string
}

export interface FiltroColuna {
  id: ColunaFiltravelId
  valores: string[]
}

interface ColumnFilterProps {
  coluna: string
  valores: string[]
  selecionados: string[]
  onChange: (valores: string[]) => void
}

/**
 * Filtro dropdown reutilizável por coluna:
 * - ícone de filtro no cabeçalho
 * - opções extraídas dos próprios dados da coluna
 * - seleção múltipla + busca interna + opção "Todos"
 */
export function ColumnFilter({ coluna, valores, selecionados, onChange }: ColumnFilterProps) {
  const [open, setOpen] = useState(false)
  const [busca, setBusca] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const opcoes = useMemo(() => {
    const unicos = Array.from(new Set(valores.filter((v) => v !== '')))
    return unicos.sort((a, b) => compararTexto(a, b))
  }, [valores])

  const filtradas = useMemo(
    () => opcoes.filter((o) => o.toLowerCase().includes(busca.toLowerCase())),
    [opcoes, busca],
  )

  useEffect(() => {
    if (!open) return
    const fora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [open])

  const ativo = selecionados.length > 0

  const toggle = (valor: string) => {
    if (selecionados.includes(valor)) {
      onChange(selecionados.filter((v) => v !== valor))
    } else {
      onChange([...selecionados, valor])
    }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-label={`Filtrar coluna ${coluna}`}
        title={`Filtrar coluna ${coluna}`}
        className={cn(
          'inline-flex items-center justify-center rounded-md p-1 transition-colors',
          ativo
            ? 'text-teal-700 bg-teal-50'
            : 'text-slate-300 hover:text-teal-700 hover:bg-slate-100',
        )}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
          setBusca('')
        }}
      >
        <Filter className="h-3 w-3" />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-30 w-56 rounded-lg border border-slate-200 bg-white shadow-lg p-2 text-left normal-case"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              placeholder={`Buscar em ${coluna.toLowerCase()}...`}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-slate-50 pl-7 pr-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>

          <button
            type="button"
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors',
              selecionados.length === 0
                ? 'bg-teal-50 text-teal-800'
                : 'text-slate-600 hover:bg-slate-100',
            )}
            onClick={() => onChange([])}
          >
            <span
              className={cn(
                'flex h-3.5 w-3.5 items-center justify-center rounded border',
                selecionados.length === 0
                  ? 'border-teal-700 bg-teal-700'
                  : 'border-slate-300 bg-white',
              )}
            />
            Todos
          </button>

          <div className="max-h-52 overflow-y-auto mt-1">
            {filtradas.length === 0 ? (
              <p className="px-2 py-2 text-xs text-slate-400">Nenhuma opção encontrada.</p>
            ) : (
              filtradas.map((op) => {
                const marcado = selecionados.includes(op)
                return (
                  <button
                    key={op}
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
                      marcado
                        ? 'bg-teal-50 text-teal-800 font-semibold'
                        : 'text-slate-600 hover:bg-slate-100',
                    )}
                    onClick={() => toggle(op)}
                  >
                    <span
                      className={cn(
                        'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border',
                        marcado ? 'border-teal-700 bg-teal-700' : 'border-slate-300 bg-white',
                      )}
                    >
                      <Check
                        className={cn('h-2.5 w-2.5', marcado ? 'opacity-100' : 'opacity-0')}
                        strokeWidth={3}
                      />
                    </span>
                    <span className="truncate">{op}</span>
                  </button>
                )
              })
            )}
          </div>

          {ativo && (
            <button
              type="button"
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-50"
              onClick={() => onChange([])}
            >
              Limpar seleção
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** Colunas filtráveis da Lista de Leads (reutilizável por outras listas). */
export const COLUNAS_FILTRAVEIS: ColunaFiltravel[] = [
  { id: 'titulo', rotulo: 'Título' },
  { id: 'contato', rotulo: 'Contato' },
  { id: 'etapa', rotulo: 'Etapa' },
  { id: 'prioridade', rotulo: 'Prioridade' },
  { id: 'previsao', rotulo: 'Previsão' },
]

/** Extrai os valores distintos de uma coluna a partir dos dados (para as opções do dropdown). */
export function getValoresColuna<T>(
  dados: T[],
  valorColuna: (item: T, id: ColunaFiltravelId) => string,
  id: ColunaFiltravelId,
): string[] {
  return dados.map((item) => valorColuna(item, id))
}

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Inbox,
  LifeBuoy,
  UserCheck,
  UserX,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  listarSolicitacoesAcesso,
  avaliarSolicitacaoAcesso,
  type SolicitacaoAcesso,
  StatusSolicitacao,
} from '@/services/solicitacoes'
import { FormularioSuporte } from '@/components/FormularioSuporte'

const EMAIL_ADMIN = 'paulo@condutiva.com.br'

const inputClasse =
  'bg-white border-slate-200 pl-9 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#84bd22]'

type Filtro = 'todos' | StatusSolicitacao

const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'pendente', label: 'Pendente' },
  { id: 'aprovado', label: 'Aprovado' },
  { id: 'negado', label: 'Negado' },
  { id: 'todos', label: 'Todos' },
]

const badgeStatus: Record<StatusSolicitacao, string> = {
  pendente: 'border-amber-200 bg-amber-50 text-amber-700',
  aprovado: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  negado: 'border-rose-200 bg-rose-50 text-rose-700',
}

const labelStatus: Record<StatusSolicitacao, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  negado: 'Negado',
}

const iconeStatus: Record<StatusSolicitacao, typeof Clock> = {
  pendente: Clock,
  aprovado: CheckCircle2,
  negado: XCircle,
}

const labelVinculo: Record<string, string> = {
  colaborador: 'Colaborador',
  parceiro: 'Parceiro autorizado',
}

const formatarData = (valor?: string) => {
  if (!valor) return '-'
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(valor))
  } catch {
    return valor
  }
}

// Painel de aprovação de acessos — exclusivo de paulo@condutiva.com.br.
// Aprovar/Negar gravam status, avaliador (e-mail) e data via API real.
export default function AprovacoesAcesso() {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoAcesso[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<Filtro>('pendente')
  const [avaliando, setAvaliando] = useState<string | null>(null)
  const [mostrarSuporte, setMostrarSuporte] = useState(false)

  const carregar = async () => {
    setLoading(true)
    try {
      setSolicitacoes(await listarSolicitacoesAcesso())
    } catch {
      toast.error('Erro ao carregar solicitações de acesso.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const filtradas = useMemo(() => {
    if (filtro === 'todos') return solicitacoes
    return solicitacoes.filter((s) => s.status === filtro)
  }, [solicitacoes, filtro])

  const contagem = useMemo(() => {
    const porStatus = (s: StatusSolicitacao) => solicitacoes.filter((x) => x.status === s).length
    return {
      pendente: porStatus('pendente'),
      aprovado: porStatus('aprovado'),
      negado: porStatus('negado'),
      todos: solicitacoes.length,
    }
  }, [solicitacoes])

  const avaliar = async (solicitacao: SolicitacaoAcesso, status: StatusSolicitacao) => {
    setAvaliando(solicitacao.id)
    try {
      await avaliarSolicitacaoAcesso(solicitacao.id, status, EMAIL_ADMIN)
      toast.success(
        status === 'aprovado'
          ? `Pedido de ${solicitacao.nome} aprovado.`
          : `Pedido de ${solicitacao.nome} negado.`,
      )
      await carregar()
    } catch {
      toast.error('Não foi possível registrar a avaliação. Tente novamente.')
    } finally {
      setAvaliando(null)
    }
  }

  if (mostrarSuporte) {
    return (
      <div className="space-y-6 pb-12">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <LifeBuoy className="h-6 w-6 text-[#84bd22]" />
            Solicitação de suporte
          </h2>
          <p className="text-sm text-slate-500">
            Sua mensagem vai direto para o administrador da Condutiva.
          </p>
        </div>
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-6">
            <FormularioSuporte
              onVoltarInterno={() => setMostrarSuporte(false)}
              rotuloVoltar="Voltar para as solicitações"
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-[#84bd22]" />
            Solicitações de Acesso
          </h2>
          <p className="text-sm text-slate-500">
            Avalie os pedidos de acesso ao CRM — a liberação passa por aqui.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={carregar}
            disabled={loading}
            className="border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filtros por status */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        {FILTROS.map((f) => (
          <Button
            key={f.id}
            variant={filtro === f.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFiltro(f.id)}
            className={
              filtro === f.id
                ? f.id === 'pendente'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-[#84bd22] text-slate-950 font-bold'
                : 'border-slate-200 text-slate-600'
            }
          >
            {f.label} ({contagem[f.id]})
          </Button>
        ))}
      </div>

      {/* Lista de solicitações */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Solicitante</th>
                <th className="py-3.5 px-4 hidden md:table-cell">Contato</th>
                <th className="py-3.5 px-4 hidden lg:table-cell">Vínculo</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-[#84bd22]" />
                      <p className="text-xs">Carregando solicitações...</p>
                    </div>
                  </td>
                </tr>
              ) : filtradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Inbox className="h-8 w-8 text-slate-300" />
                      <p className="font-medium text-slate-600">
                        Nenhuma solicitação {filtro === 'todos' ? '' : 'neste filtro'}.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtradas.map((s) => {
                  const IconeStatus = iconeStatus[s.status]
                  const pendente = s.status === 'pendente'

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900 truncate">{s.nome}</p>
                        <p className="text-xs text-slate-500">
                          Pedido em {formatarData(s.created)}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 hidden md:table-cell">
                        <p className="text-xs text-slate-700">{s.email}</p>
                        <p className="text-xs text-slate-500">{s.telefone}</p>
                      </td>

                      <td className="py-3.5 px-4 hidden lg:table-cell">
                        <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2.5 py-1 text-xs font-semibold">
                          {labelVinculo[s.vinculo] || s.vinculo}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant="outline"
                          className={`gap-1 text-[11px] font-semibold ${badgeStatus[s.status]}`}
                        >
                          <IconeStatus className="h-3 w-3" />
                          {labelStatus[s.status]}
                        </Badge>
                        {!pendente && (
                          <p className="mt-1 text-[11px] text-slate-400">
                            por {s.avaliado_por || '—'} · {formatarData(s.avaliado_em)}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {pendente ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              disabled={avaliando === s.id}
                              onClick={() => avaliar(s, 'aprovado')}
                              className="bg-[#84bd22] hover:bg-[#74a91e] text-slate-950 font-bold h-8"
                            >
                              <UserCheck className="h-3.5 w-3.5 mr-1 text-slate-950" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={avaliando === s.id}
                              onClick={() => avaliar(s, 'negado')}
                              className="border-rose-200 text-rose-600 hover:bg-rose-50 h-8"
                            >
                              <UserX className="h-3.5 w-3.5 mr-1" />
                              Negar
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Avaliado</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Canal de suporte — também acessível daqui (complemento do menu interno) */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setMostrarSuporte(true)}>
          <LifeBuoy className="h-4 w-4 mr-1.5" />
          Canal de suporte
        </Button>
      </div>
    </div>
  )
}

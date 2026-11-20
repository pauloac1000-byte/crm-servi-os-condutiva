import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Navigate } from 'react-router-dom'
import {
  carregarUsoAssistente,
  agregarUso,
  carregarNomesUsuarios,
  UsoAgregado,
} from '@/services/assistente-uso'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bot, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react'

const LIMITE_DIARIO = 30

/**
 * Painel de uso do assistente de IA — rota /assistente-uso, SOMENTE perfil
 * admin (mesmo critério de /users: user.role === 'admin' via AdminRoute).
 * Mostra consultas por dia, por usuário e contagem de erros — apenas TOTAIS,
 * nunca o texto das perguntas/respostas (LGPD).
 */
export default function AssistenteUso() {
  const { isAdmin } = useAuth()
  const [agregado, setAgregado] = useState<UsoAgregado | null>(null)
  const [nomes, setNomes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = async () => {
    setLoading(true)
    setErro('')
    try {
      const [registros, mapaNomes] = await Promise.all([
        carregarUsoAssistente(14),
        carregarNomesUsuarios(),
      ])
      setNomes(mapaNomes)
      setAgregado(agregarUso(registros, 14))
    } catch {
      setErro('Não foi possível carregar os dados de uso do assistente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) carregar()
  }, [isAdmin])

  if (!isAdmin) return <Navigate to="/" replace />

  const rotuloUsuario = (id: string) =>
    nomes[id] || (id === '(sem usuário)' ? id : id.substring(0, 8))

  const maxDia = agregado ? Math.max(1, ...agregado.porDia.map((d) => d.total)) : 1

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Bot className="h-6 w-6 text-[#84bd22]" />
            Uso do Assistente de IA
          </h2>
          <p className="text-sm text-slate-500">
            Consultas por dia, por usuário e erros (últimos 14 dias). Limite: {LIMITE_DIARIO}{' '}
            perguntas por usuário por dia. Apenas totais — nenhum conteúdo de pergunta ou resposta é
            exibido.
          </p>
        </div>
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

      {erro && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {erro}
        </div>
      )}

      {loading && !agregado ? (
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="py-12 text-center text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#84bd22]" />
            <p className="mt-2 text-xs">Carregando dados de uso...</p>
          </CardContent>
        </Card>
      ) : agregado ? (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Consultas (14 dias)
                </CardDescription>
                <CardTitle className="text-2xl font-extrabold text-slate-900">
                  {agregado.total14Dias}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-xs text-slate-500">
                  Hoje: {agregado.porDia[agregado.porDia.length - 1]?.total ?? 0}
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-xs font-semibold text-[#84bd22] uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> Usuários ativos (14 dias)
                </CardDescription>
                <CardTitle className="text-2xl font-extrabold text-slate-900">
                  {agregado.porUsuario.length}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-xs text-slate-500">Usuários que fizeram ao menos uma consulta</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-xs font-semibold text-rose-500 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Erros (14 dias)
                </CardDescription>
                <CardTitle className="text-2xl font-extrabold text-slate-900">
                  {agregado.totalErros14Dias}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-xs text-slate-500">
                  {agregado.errosUltimos7Dias} nos últimos 7 dias
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Consultas por dia */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold text-slate-900">Consultas por dia</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Total de perguntas respondidas por dia (UTC)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {agregado.porDia.every((d) => d.total === 0) ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  Nenhuma consulta registrada nos últimos 14 dias.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {agregado.porDia.map((d) => (
                    <div key={d.dia} className="flex items-center gap-2 text-xs">
                      <span className="w-20 shrink-0 text-slate-500">{d.dia.substring(5)}</span>
                      <div className="h-4 flex-1 rounded bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-[#84bd22] rounded"
                          style={{ width: `${(d.total / maxDia) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-semibold text-slate-700">{d.total}</span>
                      {d.erros > 0 && (
                        <Badge
                          variant="outline"
                          className="border-rose-200 bg-rose-50 text-rose-600 text-[10px] px-1.5 py-0 shrink-0"
                        >
                          {d.erros} erro{d.erros > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Consultas por usuário */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold text-slate-900">
                Consultas por usuário
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Totais por usuário no período — limite de {LIMITE_DIARIO} por dia
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {agregado.porUsuario.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  Nenhum usuário fez consultas no período.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Usuário</th>
                        <th className="py-2.5 px-3 text-right">Hoje</th>
                        <th className="py-2.5 px-3 text-right">Total (14 dias)</th>
                        <th className="py-2.5 px-3 text-right">Erros</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {agregado.porUsuario.map((u) => (
                        <tr key={u.usuarioId} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {rotuloUsuario(u.usuarioId)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span
                              className={
                                u.hoje >= LIMITE_DIARIO
                                  ? 'font-bold text-rose-600'
                                  : 'text-slate-700'
                              }
                            >
                              {u.hoje}
                            </span>
                            {u.hoje >= LIMITE_DIARIO && (
                              <span className="ml-1.5 text-[10px] font-semibold text-rose-500">
                                (teto)
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700">{u.total}</td>
                          <td className="py-2.5 px-3 text-right">
                            {u.erros > 0 ? (
                              <span className="font-semibold text-rose-600">{u.erros}</span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}

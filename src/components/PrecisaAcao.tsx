import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Link } from 'react-router-dom'
import { Wrench, Clock, FileText, ChevronRight, AlertTriangle } from 'lucide-react'
import { usePrecisaAcao } from '@/hooks/use-precisa-acao'
import { ItemPrecisaAcao } from '@/services/precisa-acao'

// Bloco "Precisa de ação" do Dashboard: três listas curtas (máx. 5 itens),
// somente leitura. Clique no item abre o registro (OS abre a edição na tela de
// Ordens de Serviço via ?os=; negócio abre o drawer de detalhe em /deals via
// ?deal=). "Ver todos" leva à tela correspondente.
export function PrecisaAcao() {
  const navigate = useNavigate()
  const { dados, loading } = usePrecisaAcao()

  const listas = useMemo(
    () => [
      {
        chave: 'os',
        titulo: 'OS com prazo crítico',
        descricaoVazio: 'Nada pendente de OS',
        icone: Wrench,
        itens: dados.osAtrasadas,
        verTodos: '/ordens-servico?situacao=vencendo',
        onClick: (item: ItemPrecisaAcao) => navigate(`/ordens-servico?os=${item.id}`),
      },
      {
        chave: 'parados',
        titulo: 'Negócios parados',
        descricaoVazio: 'Nenhum negócio parado além do prazo',
        icone: Clock,
        itens: dados.negociosParados,
        verTodos: '/pipeline',
        onClick: (item: ItemPrecisaAcao) => navigate(`/deals?deal=${item.id}`),
      },
      {
        chave: 'propostas',
        titulo: 'Propostas sem retorno',
        descricaoVazio: 'Sem propostas aguardando retorno',
        icone: FileText,
        itens: dados.propostasSemRetorno,
        verTodos: '/pipeline',
        onClick: (item: ItemPrecisaAcao) => navigate(`/deals?deal=${item.id}`),
      },
    ],
    [dados, navigate],
  )

  return (
    <Card className="border-slate-200/80 bg-white shadow-sm rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-bold text-slate-900">Precisa de ação</CardTitle>
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
          <AlertTriangle className="h-3 w-3" /> hoje
        </Badge>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {listas.map((lista) => (
            <div
              key={lista.chave}
              className="rounded-2xl bg-slate-50 border border-slate-100 p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    <lista.icone className="h-3.5 w-3.5 text-teal-700" />
                  </div>
                  <p className="text-xs font-bold text-slate-700 truncate">{lista.titulo}</p>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-slate-200 text-slate-700 text-[10px] px-1.5 font-bold shrink-0"
                >
                  {loading ? '…' : lista.itens.length}
                </Badge>
              </div>

              {!loading && lista.itens.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-4">
                  {lista.descricaoVazio}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {lista.itens.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => lista.onClick(item)}
                      className="w-full text-left p-2 rounded-xl bg-white border border-slate-200/80 shadow-sm hover:border-teal-600/50 hover:shadow transition-all group"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <p className="text-xs font-bold text-slate-800 truncate">{item.titulo}</p>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-teal-700 shrink-0" />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">{item.detalhe}</p>
                    </button>
                  ))}
                </div>
              )}

              <Link
                to={lista.verTodos}
                className="block text-right text-[11px] font-semibold text-teal-700 hover:underline pt-1"
              >
                Ver todos
              </Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

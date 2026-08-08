import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getDeals } from '@/services/deals'
import { getPipelineStages } from '@/services/pipeline_stages'
import { getActivities, toggleActivityStatus } from '@/services/activities'
import { getContacts } from '@/services/contacts'
import { Deal, PipelineStage, Activity, Contact } from '@/types/crm'
import {
  DollarSign,
  Briefcase,
  TrendingUp,
  PieChart as PieChartIcon,
  Plus,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import { DealModal } from '@/components/DealModal'
import { ContactModal } from '@/components/ContactModal'
import { Link } from 'react-router-dom'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'

export default function Index() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [dealModalOpen, setDealModalOpen] = useState(false)
  const [contactModalOpen, setContactModalOpen] = useState(false)

  const loadDashboardData = async () => {
    try {
      const [d, s, a, c] = await Promise.all([
        getDeals(),
        getPipelineStages(),
        getActivities(),
        getContacts(),
      ])
      setDeals(d)
      setStages(s)
      setActivities(a)
      setContacts(c)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  useRealtime('deals', () => loadDashboardData())
  useRealtime('activities', () => loadDashboardData())

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val)

  const wonStageId = stages.find((s) => s.name.toLowerCase().includes('ganho'))?.id
  const lostStageId = stages.find((s) => s.name.toLowerCase().includes('perdido'))?.id

  const totalWonRevenue = deals
    .filter((d) => d.stage === wonStageId)
    .reduce((sum, d) => sum + (d.value || 0), 0)

  const openDeals = deals.filter((d) => d.stage !== wonStageId && d.stage !== lostStageId)
  const totalPipelineValue = openDeals.reduce((sum, d) => sum + (d.value || 0), 0)

  const totalClosedCount = deals.filter(
    (d) => d.stage === wonStageId || d.stage === lostStageId,
  ).length
  const wonCount = deals.filter((d) => d.stage === wonStageId).length
  const conversionRate = totalClosedCount > 0 ? Math.round((wonCount / totalClosedCount) * 100) : 0

  const pendingActivities = activities.filter((a) => a.status === 'pendente').slice(0, 5)
  const recentDeals = deals.slice(0, 5)

  const handleCompleteActivity = async (id: string, currentStatus: 'pendente' | 'concluída') => {
    try {
      await toggleActivityStatus(id, currentStatus)
      toast.success('Atividade atualizada!')
      loadDashboardData()
    } catch (_) {
      toast.error('Erro ao atualizar atividade.')
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Visão Geral de Vendas
          </h2>
          <p className="text-sm text-slate-500">
            Desempenho da unidade de serviços Condutiva Tecnologia
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setContactModalOpen(true)}
            variant="outline"
            className="border-slate-300 text-slate-700 font-semibold text-xs h-10 hover:bg-slate-100"
          >
            <Plus className="mr-1.5 h-4 w-4 text-slate-500" />
            Novo Contato
          </Button>
          <Button
            onClick={() => setDealModalOpen(true)}
            className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs h-10 shadow-md shadow-teal-700/20"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Novo Negócio
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-all rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Receita Fechada
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(totalWonRevenue)}
              </h3>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>+12.4% este mês</span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <DollarSign className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-all rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Negócios Abertos
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{openDeals.length}</h3>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">Em andamento no funil</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Briefcase className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-all rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Valor do Pipeline
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(totalPipelineValue)}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">Oportunidades ativas</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <PieChartIcon className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-all rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Taxa de Conversão
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{conversionRate}%</h3>
              <p className="text-[11px] text-teal-600 mt-1 font-semibold">Meta de 40% atingida</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 font-black text-sm">
              {conversionRate}%
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200/80 bg-white shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
              <span>Funil de Vendas por Etapa</span>
              <span className="text-xs font-normal text-slate-400">
                Total: {deals.length} oportunidades
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {stages.map((stage) => {
              const stageDeals = deals.filter((d) => d.stage === stage.id)
              const stageValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0)
              const maxVal = Math.max(
                ...stages.map((st) =>
                  deals.filter((d) => d.stage === st.id).reduce((s, x) => s + (x.value || 0), 0),
                ),
                1,
              )
              const pct = Math.round((stageValue / maxVal) * 100)

              return (
                <div key={stage.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="flex items-center gap-2 font-semibold text-slate-800">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      {stage.name} ({stageDeals.length})
                    </span>
                    <span className="font-bold text-slate-900">{formatCurrency(stageValue)}</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: stage.color }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm rounded-2xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold text-slate-900">
              Atividades Pendentes
            </CardTitle>
            <Link to="/activities" className="text-xs font-semibold text-teal-700 hover:underline">
              Ver todas
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {pendingActivities.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Nenhuma atividade pendente!</p>
            ) : (
              pendingActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2"
                >
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-800 truncate">{act.title}</p>
                    <p className="text-[11px] text-slate-400 capitalize">
                      {act.type} •{' '}
                      {act.due_date
                        ? new Date(act.due_date).toLocaleDateString('pt-BR')
                        : 'Sem data'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full"
                    onClick={() => handleCompleteActivity(act.id, act.status)}
                  >
                    <CheckCircle2 className="h-5 w-5" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/80 bg-white shadow-sm rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-bold text-slate-900">
            Últimos Negócios em Negociação
          </CardTitle>
          <Link
            to="/deals"
            className="text-xs font-semibold text-teal-700 hover:underline flex items-center gap-1"
          >
            Ver lista completa <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-lg">Título</th>
                  <th className="p-3">Contato</th>
                  <th className="p-3">Etapa</th>
                  <th className="p-3">Valor</th>
                  <th className="p-3 rounded-r-lg">Previsão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentDeals.map((deal) => (
                  <tr key={deal.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-semibold text-slate-900">{deal.title}</td>
                    <td className="p-3 text-xs text-slate-500">
                      {deal.expand?.contact?.name || 'N/A'}
                    </td>
                    <td className="p-3">
                      {deal.expand?.stage && (
                        <span
                          className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold"
                          style={{
                            backgroundColor: `${deal.expand.stage.color}15`,
                            color: deal.expand.stage.color,
                          }}
                        >
                          {deal.expand.stage.name}
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-bold text-slate-900">{formatCurrency(deal.value)}</td>
                    <td className="p-3 text-xs text-slate-400">
                      {deal.expected_close_date
                        ? new Date(deal.expected_close_date).toLocaleDateString('pt-BR')
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <DealModal
        open={dealModalOpen}
        onOpenChange={setDealModalOpen}
        stages={stages}
        contacts={contacts}
        onSuccess={loadDashboardData}
      />

      <ContactModal
        open={contactModalOpen}
        onOpenChange={setContactModalOpen}
        onSuccess={loadDashboardData}
      />
    </div>
  )
}

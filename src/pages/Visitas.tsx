import { useState, useEffect, useMemo } from 'react'
import { getVisitas, deleteVisita } from '@/services/visitas'
import { getContacts } from '@/services/contacts'
import { getDeals } from '@/services/deals'
import { getUsers } from '@/services/users'
import { useAuth } from '@/hooks/use-auth'
import { VisitaComercial, Contact, Deal, User } from '@/types/crm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Car,
  Trash2,
  Edit2,
  MapPin,
  Clock,
  Briefcase,
  Settings,
  Download,
} from 'lucide-react'
import { baixarCsv, linhaCsv, montarCsv, nomeArquivoCsv } from '@/lib/exportar-csv'
import { VisitasModal } from '@/components/VisitasModal'
import { ConfiguracoesModal } from '@/components/ConfiguracoesModal'
import { getConfiguracoes } from '@/services/configuracoes'
import { useRealtime } from '@/hooks/use-realtime'
import { useEficienciaComercial } from '@/hooks/use-eficiencia-comercial'
import { compararTexto, tempoData } from '@/lib/ordenacao-alfabetica'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { BotaoExportarPdf } from '@/components/BotaoExportarPdf'
import { gerarPdfPadrao, type PdfSessao } from '@/lib/pdf-generico'
import { TrendingUp } from 'lucide-react'

export default function Visitas() {
  const { user } = useAuth()
  const [visitas, setVisitas] = useState<VisitaComercial[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [visitaToEdit, setVisitaToEdit] = useState<VisitaComercial | null>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const [custoHora, setCustoHora] = useState(90)
  const isAdmin = user?.role === 'admin'

  // Filtros: período (intervalo de datas), responsável, lead e tipo de visita
  const [dataDe, setDataDe] = useState('')
  const [dataAte, setDataAte] = useState('')
  const [responsavelFiltro, setResponsavelFiltro] = useState('todos')
  const [leadFiltro, setLeadFiltro] = useState('todos')
  const [tipoFiltro, setTipoFiltro] = useState('todos')
  const [leadComboAberto, setLeadComboAberto] = useState(false)

  const loadData = async () => {
    try {
      const [v, c, d, u] = await Promise.all([getVisitas(), getContacts(), getDeals(), getUsers()])
      setVisitas(v)
      setContacts(c)
      setDeals(d)
      setUsers(u)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadData()
    getConfiguracoes()
      .then((c) => {
        if (c && typeof c.custo_hora_comercial === 'number' && c.custo_hora_comercial > 0)
          setCustoHora(c.custo_hora_comercial)
      })
      .catch(() => {
        /* usa o padrão */
      })
  }, [])

  useRealtime('visitas_comerciais', () => loadData())

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta visita?')) {
      try {
        await deleteVisita(id)
        toast.success('Visita excluída!')
        loadData()
      } catch (_) {
        toast.error('Erro ao excluir visita.')
      }
    }
  }

  const visitasFiltradas = useMemo(() => {
    return (
      visitas
        .filter((v) => {
          if (dataDe && v.data && v.data < `${dataDe} 00:00:00.000Z`) return false
          if (dataAte && v.data && v.data > `${dataAte} 23:59:59.000Z`) return false
          if (responsavelFiltro !== 'todos' && v.responsavel !== responsavelFiltro) return false
          if (leadFiltro !== 'todos' && v.contato !== leadFiltro) return false
          if (tipoFiltro !== 'todos' && v.tipo !== tipoFiltro) return false
          return true
        })
        // Ordem inicial: lead/empresa de A a Z; dentro do mesmo lead, data mais recente primeiro
        .sort((a, b) => {
          const porNome = compararTexto(
            a.empresa || a.expand?.contato?.name,
            b.empresa || b.expand?.contato?.name,
          )
          if (porNome !== 0) return porNome
          return tempoData(b.data) - tempoData(a.data)
        })
    )
  }, [visitas, dataDe, dataAte, responsavelFiltro, leadFiltro, tipoFiltro])

  const custoTotalPeriodo = useMemo(
    () => visitasFiltradas.reduce((soma, v) => soma + (v.custo_total || 0), 0),
    [visitasFiltradas],
  )

  // Indicadores de eficiência comercial do período (dados do Skip Cloud).
  const eficiencia = useEficienciaComercial({
    dataDe,
    dataAte,
    responsavel: responsavelFiltro,
    lead: leadFiltro,
    tipo: tipoFiltro as 'presencial' | 'remota' | 'todos',
  })
  // recarrega os indicadores junto com os dados (tempo real)
  useEffect(() => {
    eficiencia.recalcular()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitas])

  // Leads que têm ao menos uma visita registrada (opções do dropdown Lead)
  const leadsComVisita = useMemo(() => {
    const ids = new Set(visitas.map((v) => v.contato).filter(Boolean) as string[])
    return contacts
      .filter((c) => ids.has(c.id))
      .sort((a, b) => compararTexto(a.company || a.name, b.company || b.name))
  }, [visitas, contacts])

  const nomeLead = (id: string) => {
    const c = contacts.find((x) => x.id === id)
    return c ? c.company || c.name : ''
  }

  const rotuloLeadFiltro =
    leadFiltro !== 'todos' ? nomeLead(leadFiltro) || 'Lead selecionado' : 'Todos os leads'

  const limparFiltros = () => {
    setDataDe('')
    setDataAte('')
    setResponsavelFiltro('todos')
    setLeadFiltro('todos')
    setTipoFiltro('todos')
  }

  const filtrosAtivos =
    !!dataDe ||
    !!dataAte ||
    responsavelFiltro !== 'todos' ||
    leadFiltro !== 'todos' ||
    tipoFiltro !== 'todos'

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const nomeResponsavel = (v: VisitaComercial) =>
    v.expand?.responsavel?.name || v.expand?.responsavel?.email || ''

  // Título do card: empresa do lead vinculada; sem empresa, nome do contato
  const tituloVisita = (v: VisitaComercial) => (v.empresa || v.expand?.contato?.name || '').trim()

  // Cidade – estado do contato vinculado (a visita não guarda localidade própria)
  const localidadeVisita = (v: VisitaComercial) =>
    [v.expand?.contato?.cidade, v.expand?.contato?.estado]
      .map((p) => (p || '').trim())
      .filter(Boolean)
      .join(' – ')

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Visitas Comerciais</h2>
          <p className="text-sm text-slate-500">
            Custo das visitas feitas para gerar e avançar leads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BotaoExportarPdf
            aoGerar={async () => {
              const pendentes = visitasFiltradas.filter((v) => (v.resultado || '') === 'pendente')
              const concluidas = visitasFiltradas.filter((v) => (v.resultado || '') === 'concluida')
              const resumo: PdfSessao[] = [
                {
                  titulo: 'Resumo',
                  linhas: [
                    { header: 'Total de visitas', valor: String(visitasFiltradas.length) },
                    { header: 'Pendentes', valor: String(pendentes.length) },
                    { header: 'Concluídas', valor: String(concluidas.length) },
                    { header: 'Custo total no período', valor: formatCurrency(custoTotalPeriodo) },
                  ],
                },
              ]
              const colunas = [
                'Data',
                'Empresa',
                'Contato',
                'Tipo',
                'Responsável',
                'KM rodados',
                'Horas dedicadas',
                'Combustível (R$)',
                'Pedágio (R$)',
                'Alimentação (R$)',
                'Hospedagem (R$)',
                'Outros custos (R$)',
                'Custo total (R$)',
                'Resultado',
              ]
              const linhas = visitasFiltradas.map((v) => [
                v.data ? v.data.replace('T', ' ').slice(0, 16) : '—',
                tituloVisita(v) || '—',
                v.expand?.contato?.name || '—',
                v.tipo === 'presencial' ? 'Presencial' : v.tipo === 'remota' ? 'Remota' : '—',
                nomeResponsavel(v) || '—',
                v.km_rodados != null ? String(v.km_rodados) : '—',
                v.horas_dedicadas != null ? String(v.horas_dedicadas) : '—',
                formatCurrency(v.valor_combustivel || 0),
                formatCurrency(v.pedagio || 0),
                formatCurrency(v.alimentacao || 0),
                formatCurrency(v.hospedagem || 0),
                formatCurrency(v.outros_custos || 0),
                formatCurrency(v.custo_total || 0),
                v.resultado || '—',
              ])
              const filtrosPdf: string[] = []
              if (dataDe) filtrosPdf.push(`Período a partir de ${dataDe}`)
              if (dataAte) filtrosPdf.push(`Período até ${dataAte}`)
              if (responsavelFiltro !== 'todos') {
                const u = users.find((x) => x.id === responsavelFiltro)
                filtrosPdf.push(`Responsável: ${u?.name || u?.email || responsavelFiltro}`)
              }
              if (leadFiltro !== 'todos')
                filtrosPdf.push(`Lead: ${nomeLead(leadFiltro) || leadFiltro}`)
              if (tipoFiltro !== 'todos')
                filtrosPdf.push(`Tipo: ${tipoFiltro === 'presencial' ? 'Presencial' : 'Remota'}`)
              await gerarPdfPadrao({
                titulo: 'Visitas Comerciais',
                filtros: filtrosPdf,
                resumo,
                colunas,
                linhas,
                prefixoArquivo: 'visitas',
                orientacao: 'landscape',
              })
            }}
          />
          {isAdmin && (
            <Button
              onClick={() => setConfigOpen(true)}
              variant="outline"
              className="font-semibold text-xs h-10"
            >
              <Settings className="mr-1.5 h-4 w-4" /> Configurações
            </Button>
          )}
          <Button
            onClick={() => {
              setVisitaToEdit(null)
              setModalOpen(true)
            }}
            className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs h-10 shadow-md shadow-teal-700/20"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Nova Visita
          </Button>
          <Button
            onClick={() =>
              baixarCsv(
                nomeArquivoCsv('visitas'),
                montarCsv(
                  [
                    'Data',
                    'Empresa',
                    'Contato',
                    'Tipo',
                    'Responsável',
                    'KM rodados',
                    'Horas dedicadas',
                    'Combustível (R$)',
                    'Pedágio (R$)',
                    'Alimentação (R$)',
                    'Hospedagem (R$)',
                    'Outros custos (R$)',
                    'Custo total (R$)',
                    'Resultado',
                  ],
                  visitasFiltradas.map((v) =>
                    linhaCsv([
                      { valor: v.data, tipo: { dataHora: true } },
                      { valor: v.empresa || v.expand?.contato?.name },
                      { valor: v.expand?.contato?.name },
                      { valor: v.tipo },
                      { valor: v.expand?.responsavel?.name || v.expand?.responsavel?.email },
                      { valor: v.km_rodados },
                      { valor: v.horas_dedicadas },
                      { valor: v.valor_combustivel, tipo: { moeda: true } },
                      { valor: v.pedagio, tipo: { moeda: true } },
                      { valor: v.alimentacao, tipo: { moeda: true } },
                      { valor: v.hospedagem, tipo: { moeda: true } },
                      { valor: v.outros_custos, tipo: { moeda: true } },
                      { valor: v.custo_total, tipo: { moeda: true } },
                      { valor: v.resultado },
                    ]),
                  ),
                ),
              )
            }
            variant="outline"
            className="font-semibold text-xs h-10"
          >
            <Download className="mr-1.5 h-4 w-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filtros: período e responsável */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div className="space-y-1.5">
          <Label htmlFor="f_de" className="text-slate-700 font-semibold text-xs">
            Período — de
          </Label>
          <Input id="f_de" type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f_ate" className="text-slate-700 font-semibold text-xs">
            até
          </Label>
          <Input
            id="f_ate"
            type="date"
            value={dataAte}
            onChange={(e) => setDataAte(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f_resp" className="text-slate-700 font-semibold text-xs">
            Responsável
          </Label>
          <Select value={responsavelFiltro} onValueChange={setResponsavelFiltro}>
            <SelectTrigger id="f_resp">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f_lead" className="text-slate-700 font-semibold text-xs">
            Lead
          </Label>
          <Popover open={leadComboAberto} onOpenChange={setLeadComboAberto}>
            <PopoverTrigger asChild>
              <Button
                id="f_lead"
                variant="outline"
                role="combobox"
                aria-expanded={leadComboAberto}
                className="w-full justify-between font-normal h-10"
              >
                <span className="truncate">{rotuloLeadFiltro}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar lead…" />
                <CommandList>
                  <CommandEmpty>Nenhum lead encontrado.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="todos"
                      onSelect={() => {
                        setLeadFiltro('todos')
                        setLeadComboAberto(false)
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          leadFiltro === 'todos' ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      Todos os leads
                    </CommandItem>
                  </CommandGroup>
                  <CommandGroup heading="Leads com visita registrada">
                    {leadsComVisita.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={`${c.company || c.name} ${c.name}`}
                        onSelect={() => {
                          setLeadFiltro(c.id)
                          setLeadComboAberto(false)
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            leadFiltro === c.id ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <span className="truncate">
                          {c.company || c.name}
                          {c.company && c.name ? ` — ${c.name}` : ''}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f_tipo" className="text-slate-700 font-semibold text-xs">
            Tipo de visita
          </Label>
          <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
            <SelectTrigger id="f_tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="presencial">Presencial</SelectItem>
              <SelectItem value="remota">Remoto</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-700 font-semibold text-xs opacity-0 select-none">
            Ações
          </Label>
          <Button
            variant="outline"
            onClick={limparFiltros}
            disabled={!filtrosAtivos}
            className="w-full h-10 font-semibold text-xs"
          >
            Limpar filtros
          </Button>
        </div>
        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-teal-50 border border-teal-200">
          <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
            Custo no período
          </span>
          <span className="text-sm font-black text-teal-700">
            {formatCurrency(custoTotalPeriodo)}
          </span>
        </div>
      </div>

      {/* Indicadores de eficiência comercial do período (sem gráfico) */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-3.5 w-3.5 text-teal-700" />
          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
            Eficiência comercial — período
          </span>
        </div>
        {eficiencia.carregando ? (
          <p className="text-xs text-slate-400">Calculando indicadores…</p>
        ) : eficiencia.erro ? (
          <p className="text-xs text-rose-500">{eficiencia.erro}</p>
        ) : eficiencia.dados ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <Indicador
              rotulo="Custo por lead qualificado"
              valor={eficiencia.dados.custoPorLeadQualificado}
              moeda
              base={eficiencia.dados.qtdLeadsQualificados}
            />
            <Indicador
              rotulo="Custo por proposta"
              valor={eficiencia.dados.custoPorProposta}
              moeda
              base={eficiencia.dados.qtdPropostas}
            />
            <Indicador
              rotulo="Custo por contrato assinado"
              valor={eficiencia.dados.custoPorContratoAssinado}
              moeda
              base={eficiencia.dados.qtdContratosAssinados}
            />
            <Indicador
              rotulo="Custo médio por visita"
              valor={eficiencia.dados.custoMedioPorVisita}
              moeda
              base={eficiencia.dados.qtdVisitas}
            />
            <Indicador
              rotulo="Visitas por contrato assinado"
              valor={eficiencia.dados.visitasPorContratoAssinado}
              base={eficiencia.dados.qtdContratosAssinados}
            />
            <Indicador
              rotulo="Custo total de prospecção"
              valor={eficiencia.dados.custoTotalProspeccao}
              moeda
            />
          </div>
        ) : null}
      </div>

      {visitasFiltradas.length === 0 ? (
        <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
          Nenhuma visita registrada para os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-3">
          {visitasFiltradas.map((v) => (
            <div
              key={v.id}
              className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:border-slate-300"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-8 w-8 rounded-full shrink-0 flex items-center justify-center bg-teal-50 text-teal-700">
                  <Car className="h-4 w-4" />
                </div>
                <div>
                  {/* Título: empresa do lead (sem empresa, cai no nome do contato) */}
                  {tituloVisita(v) && (
                    <h3
                      className="text-lg font-bold leading-tight capitalize"
                      style={{ color: 'var(--condutiva-texto)' }}
                    >
                      {tituloVisita(v)}
                    </h3>
                  )}
                  {/* Cidade – estado do contato vinculado, em tamanho menor */}
                  {localidadeVisita(v) && (
                    <p className="text-xs capitalize" style={{ color: 'var(--condutiva-cinza)' }}>
                      {localidadeVisita(v)}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    {v.expand?.contato && tituloVisita(v) !== v.expand.contato.name && (
                      <span
                        className="flex items-center gap-1 text-xs"
                        style={{ color: 'var(--condutiva-cinza)' }}
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        {v.expand.contato.name}
                      </span>
                    )}
                    {v.tipo && (
                      <span className="text-xs font-semibold capitalize text-slate-600">
                        {v.tipo}
                      </span>
                    )}
                    {v.data && (
                      <span
                        className="text-xs flex items-center gap-1"
                        style={{ color: 'var(--condutiva-cinza)' }}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(v.data).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                    {nomeResponsavel(v) && (
                      <span
                        className="text-[11px] font-medium bg-slate-100 rounded-full px-2 py-0.5"
                        style={{ color: 'var(--condutiva-cinza)' }}
                      >
                        {nomeResponsavel(v)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1.5">
                    {!!v.km_rodados && <span>{v.km_rodados} km</span>}
                    {!!v.horas_dedicadas && <span>{v.horas_dedicadas} h</span>}
                  </div>

                  {/* Composição do custo */}
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                    {!!v.valor_combustivel && (
                      <span>Combustível: {formatCurrency(v.valor_combustivel)}</span>
                    )}
                    {!!v.pedagio && <span>Pedágio: {formatCurrency(v.pedagio)}</span>}
                    {!!v.alimentacao && <span>Alimentação: {formatCurrency(v.alimentacao)}</span>}
                    {!!v.hospedagem && <span>Hospedagem: {formatCurrency(v.hospedagem)}</span>}
                    {!!v.outros_custos && <span>Outros: {formatCurrency(v.outros_custos)}</span>}
                    {!!v.horas_dedicadas && (
                      <span className="text-slate-600 font-medium">
                        Horas ({v.horas_dedicadas} h × {formatCurrency(custoHora)}):{' '}
                        {formatCurrency(v.horas_dedicadas * custoHora)}
                      </span>
                    )}
                  </div>

                  {v.resultado && (
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{v.resultado}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <span className="text-base font-black text-teal-700">
                  {formatCurrency(v.custo_total || 0)}
                </span>
                {isAdmin && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-teal-700"
                      onClick={() => {
                        setVisitaToEdit(v)
                        setModalOpen(true)
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
                      onClick={() => handleDelete(v.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <VisitasModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        contacts={contacts}
        deals={deals}
        users={users}
        visitaToEdit={visitaToEdit}
        defaultResponsavelId={user?.id}
        onSuccess={loadData}
      />

      <ConfiguracoesModal open={configOpen} onOpenChange={setConfigOpen} onSuccess={() => {}} />
    </div>
  )
}

// Célula discreta de um indicador (sem gráfico; segue o visual da tela).
function Indicador({
  rotulo,
  valor,
  moeda,
  base,
}: {
  rotulo: string
  valor: number | null
  moeda?: boolean
  base?: number
}) {
  const formatar = (v: number) =>
    moeda
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
      : v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  return (
    <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/70">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide leading-tight">
        {rotulo}
      </p>
      <p className="text-sm font-black text-slate-900 mt-0.5">
        {valor == null ? '—' : formatar(valor)}
      </p>
      {typeof base === 'number' && (
        <p className="text-[10px] text-slate-400">
          base: {base} {base === 1 ? 'registro' : 'registros'}
        </p>
      )}
    </div>
  )
}

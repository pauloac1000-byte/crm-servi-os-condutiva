export type UserRole = 'admin' | 'user'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role?: UserRole
  created?: string
  updated?: string
  verified?: boolean
}

export interface Contact {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  role?: string
  cidade?: string
  estado?: string
  status: 'lead' | 'prospect' | 'cliente' | 'inativo'
  notes?: string
  owner: string
  created: string
  updated: string
}

export interface PipelineStage {
  id: string
  name: string
  order: number
  color: string
  created: string
  updated: string
}

// Etapa oficial do funil de SERVIÇOS (coleção "etapas_funil" no Skip Cloud).
// Os textos (nome, objetivo, atividade, critério de saída, prazo) são editáveis
// pela coleção — a interface lê direto dela, ordenado por "ordem", sem hardcode.
export type DealStatus = 'em andamento' | 'ganho' | 'perdido'

export interface EtapaFunil {
  id: string
  ordem: number
  nome: string
  objetivo?: string
  atividade_principal?: string
  criterio_saida?: string
  // itens do critério de saída — um por caixa de confirmação na tela do negócio
  criterio_itens?: string[]
  prazo_alvo_dias?: number
  cor?: string
  created: string
  updated: string
}

// Plano de serviço oficial (coleção "planos" no Skip Cloud)
export interface Plano {
  id: string
  nome: string
  descricao?: string
  valor_mensal_referencia?: number
  escopo?: string
  created?: string
  updated?: string
}

export interface Deal {
  id: string
  title: string
  // plano de serviço escolhido pelo cliente (coleção planos)
  plano?: string
  // valores do contrato: valor_total = valor_mensal × prazo_contrato_meses
  valor_mensal?: number
  prazo_contrato_meses?: number
  // calculado no servidor pelo hook deals_valor_total.pb.js
  valor_total?: number
  stage: string
  // etapa oficial do funil de serviços (coleção etapas_funil)
  etapa?: string
  // etapa em que o negócio parou, quando status = perdido
  etapa_anterior?: string
  status?: DealStatus
  contact: string
  owner: string
  // itens do critério de saída da etapa atual já confirmados (texto do item)
  criterio_marcados?: string[]
  // justificativa gravada quando o admin força o avanço de etapa
  justificativa_avanco?: string
  // sinaliza ao hook do backend que o admin está forçando o avanço (não é exibido)
  forcar_avanco?: boolean
  // data/hora da entrada na etapa atual (estampada automaticamente pelo hook)
  etapa_desde?: string
  // usuário responsável pela mudança que deu entrada na etapa atual
  etapa_desde_usuario?: string
  expected_close_date?: string
  priority: 'baixa' | 'média' | 'alta'
  notes?: string
  created: string
  updated: string
  expand?: {
    stage?: PipelineStage
    etapa?: EtapaFunil
    etapa_anterior?: EtapaFunil
    contact?: Contact
    owner?: User
    plano?: Plano
  }
}

// Entrada do histórico do negócio (coleção "historico_negocios" no Skip Cloud)
export interface HistoricoNegocio {
  id: string
  deal: string
  owner?: string
  tipo: 'avanco' | 'avanco_forcado' | 'criacao' | 'perda' | 'ganho' | 'outro' | 'entrada_etapa'
  titulo?: string
  descricao?: string
  etapa_de?: string
  etapa_para?: string
  justificativa?: string
  created: string
  updated: string
  expand?: {
    etapa_de?: EtapaFunil
    etapa_para?: EtapaFunil
    owner?: User
  }
}

// Contrato assinado — fonte da receita contratada da unidade de serviços
// (coleção "contratos" no Skip Cloud). Declaração unificada mais abaixo.
export type ContratoStatus = 'ativo' | 'encerrado' | 'suspenso'
export type ContratoTipo = 'novo' | 'renovação' | 'expansão' | 'contração' | 'churn'

// Movimento de receita recorrente (coleção "movimentos_receita" no Skip Cloud).
// Um por evento: contrato criado (novo), valor alterado (expansão/contração),
// encerramento (churn) ou lançamento manual. Competência no formato AAAA-MM.
export interface MovimentoReceita {
  id: string
  contrato?: string
  competencia?: string
  tipo?: ContratoTipo
  valor_mensal?: number
  responsavel?: string
  created: string
  updated: string
  expand?: {
    contrato?: Contrato
    responsavel?: User
  }
}

// Visita comercial registrada para gerar ou avançar leads
// (coleção "visitas_comerciais" no Skip Cloud). custo_total é calculado
// no servidor (hook), somando os valores monetários da visita.
export interface VisitaComercial {
  id: string
  // nome da empresa visitada (denormalizado do contato, escolhido no modal)
  empresa?: string
  data?: string
  contato?: string
  negocio?: string
  responsavel?: string
  tipo?: 'presencial' | 'remota'
  km_rodados?: number
  valor_combustivel?: number
  pedagio?: number
  alimentacao?: number
  hospedagem?: number
  horas_dedicadas?: number
  outros_custos?: number
  resultado?: string
  custo_total?: number
  created: string
  updated: string
  expand?: {
    contato?: Contact
    negocio?: Deal
    responsavel?: User
  }
}

// Contrato assinado — fonte da receita contratada da unidade de serviços
// (coleção "contratos" no Skip Cloud).
export interface Contrato {
  id: string
  cliente?: string
  negocio?: string
  plano?: string
  responsavel?: string
  // observações de texto livre sobre o que foi contratado (escopo, condições)
  informacoes_plano?: string
  valor_mensal?: number
  data_inicio?: string
  data_fim?: string
  status?: ContratoStatus
  tipo?: ContratoTipo
  created: string
  updated: string
  expand?: {
    cliente?: Contact
    negocio?: Deal
    plano?: Plano
    responsavel?: User
  }
}

// Ordem de serviço executada para um cliente da unidade de serviços
// (coleção "ordens_servico" no Skip Cloud).
export type OrdemServicoStatus = 'aberta' | 'em execução' | 'concluída' | 'cancelada'

export interface OrdemServico {
  id: string
  cliente: string
  // nome da empresa do cliente (denormalizado do contato, escolhido no modal)
  empresa?: string
  contrato?: string
  equipamento?: string
  descricao: string
  data_abertura: string
  prazo_acordado?: string
  data_encerramento?: string
  // true = encerrada dentro do prazo acordado (gravado pelo hook no backend);
  // null/ausente = concluída sem prazo ou sem data de encerramento
  no_prazo?: boolean
  status: OrdemServicoStatus
  responsavel_tecnico?: string
  observacoes?: string
  created: string
  updated: string
  expand?: {
    cliente?: Contact
    contrato?: Contrato
    responsavel_tecnico?: User
  }
}

// Metas mensais e anuais dos KPIs da unidade de serviços
// (coleção "metas" no Skip Cloud). Um registro por ano + mês + kpi;
// mes vazio/0 representa a meta anual.
export type MetaKpi =
  | 'RCS'
  | 'taxa_conversao_leads'
  | 'ticket_medio'
  | 'os_no_prazo'
  | 'NRR'
  | 'leads_qualificados'
  | 'propostas_enviadas'
  | 'custo_por_contrato'

export interface Meta {
  id: string
  ano: number
  // 0 ou ausente = meta anual
  mes?: number
  kpi: MetaKpi
  valor_meta?: number
  created: string
  updated: string
}

export interface Activity {
  id: string
  title: string
  type: 'ligação' | 'e-mail' | 'reunião' | 'follow-up'
  status: 'pendente' | 'concluída'
  description?: string
  due_date?: string
  contact?: string
  deal?: string
  owner: string
  created: string
  updated: string
  expand?: {
    contact?: Contact
    deal?: Deal
    owner?: User
  }
}

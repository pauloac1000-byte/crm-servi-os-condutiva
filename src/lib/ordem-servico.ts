import type { OrdemServicoStatus, OrdemServico } from '@/types/crm'

// Status da ordem de serviço (select "status" da coleção ordens_servico)
export const ORDEM_SERVICO_STATUS: OrdemServicoStatus[] = [
  'aberta',
  'em execução',
  'concluída',
  'cancelada',
]

// Cores do badge de status, iguais às do padrão de Contratos/Visitas
export const statusOsClasses = (status?: string) => {
  switch (status) {
    case 'aberta':
      return 'bg-sky-50 text-sky-700 border-sky-200'
    case 'em execução':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'concluída':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'cancelada':
      return 'bg-slate-100 text-slate-600 border-slate-200'
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

// "AAAA-MM-DD" (ou data com hora) → data local, sem deslocamento de fuso
export const formatarDataOS = (d?: string) => {
  if (!d) return '—'
  const soData = d.split(' ')[0].split('T')[0]
  const [ano, mes, dia] = soData.split('-').map(Number)
  if (!ano || !mes || !dia) return '—'
  return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR')
}

// Data de hoje no formato AAAA-MM-DD (fuso local)
export const hojeISO = () => {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

// OS em aberto cujo prazo acordado já passou
export const isAtrasada = (os: OrdemServico) => {
  if (!os.prazo_acordado) return false
  if (os.status === 'concluída' || os.status === 'cancelada') return false
  return os.prazo_acordado.split(' ')[0].split('T')[0] < hojeISO()
}

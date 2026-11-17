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

// Parte AAAA-MM-DD de uma data PocketBase (sem deslocamento de fuso)
const parteData = (d?: string) => d?.split(' ')[0].split('T')[0] || ''

// Indicador de situação de prazo, em dias corridos a partir de hoje:
//   "no-prazo"    → encerrada dentro do prazo acordado (no_prazo true)
//   "fora-prazo"  → encerrada fora do prazo (no_prazo false)
//   "vencendo"    → aberta/em execução com prazo vencendo em até 2 dias (ou já vencida)
//   null          → sem indicador (cancelada, concluída sem prazo/encerramento,
//                    ou aberta com prazo ainda distante)
export const situacaoPrazoOS = (
  os: OrdemServico,
): 'no-prazo' | 'fora-prazo' | 'vencendo' | null => {
  if (os.status === 'concluída') {
    if (os.no_prazo === true) return 'no-prazo'
    if (os.no_prazo === false) return 'fora-prazo'
    return null
  }
  if (os.status === 'cancelada') return null
  // aberta / em execução: prazo vencendo em até 2 dias (ou já vencido)
  const prazo = parteData(os.prazo_acordado)
  if (!prazo) return null
  const limite = new Date()
  limite.setDate(limite.getDate() + 2)
  const limiteISO = `${limite.getFullYear()}-${String(limite.getMonth() + 1).padStart(2, '0')}-${String(limite.getDate()).padStart(2, '0')}`
  return prazo <= limiteISO ? 'vencendo' : null
}

// Cores do indicador de situação de prazo
export const situacaoPrazoClasses: Record<string, string> = {
  'no-prazo': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'fora-prazo': 'bg-rose-50 text-rose-700 border-rose-200',
  vencendo: 'bg-amber-50 text-amber-700 border-amber-200',
}

export const situacaoPrazoRotulo: Record<string, string> = {
  'no-prazo': 'No prazo',
  'fora-prazo': 'Fora do prazo',
  vencendo: 'Prazo vencendo',
}

// Taxa de execução no prazo (%): concluídas dentro do prazo ÷ total concluídas.
// null quando não há OS concluídas no recorte ("—" na tela).
export const taxaNoPrazo = (ordens: OrdemServico[]): number | null => {
  const concluidas = ordens.filter((os) => os.status === 'concluída')
  if (concluidas.length === 0) return null
  const noPrazo = concluidas.filter((os) => os.no_prazo === true).length
  return Math.round((noPrazo / concluidas.length) * 100)
}

import pb from '@/lib/pocketbase/client'
import type { ConsultaFuncao } from '@/services/assistente'

/**
 * Resolução de "#id" por nome, SÓ na exibição do painel.
 * O texto enviado ao provedor de IA nunca contém nomes — apenas ids e números.
 * A busca usa o cliente PocketBase existente: se o id não existir ou o usuário
 * não tiver permissão de leitura sobre o registro, o "#id" permanece como está.
 */

const LIMITE_POR_LOTE = 60

// Campos pedidos por coleção — todos não identificadores de pessoa (o nome do
// deal/contato NÃO é pedido: o rótulo exibido usa empresa/número/valor, que o
// usuário já vê nas telas).
const CAMPOS: Record<string, string> = {
  deals: 'id,title,valor_total,status',
  activities: 'id,title,type,status',
  visitas_comerciais: 'id,tipo,data',
  contratos: 'id,status,tipo,valor_mensal',
  metas: 'id,ano,mes,kpi,valor_meta',
}

const FUNCAO_PARA_COLECAO: Record<string, string> = {
  consultar_leads: 'deals',
  consultar_atividades_pendentes: 'activities',
  consultar_visitas: 'visitas_comerciais',
  consultar_contratos: 'contratos',
  consultar_metas: 'metas',
}

// Extrai todos os "#<id>" únicos de um texto (ids PocketBase: 15 caracteres).
export function extrairIdsCitados(texto: string): string[] {
  const vistos = new Set<string>()
  const re = /#([A-Za-z0-9]{6,15})/g
  let m: RegExpExecArray | null
  while ((m = re.exec(texto)) !== null) {
    vistos.add(m[1])
  }
  return [...vistos]
}

type Nomeador = (registro: Record<string, unknown>) => string

function fatiar<T>(lista: T[], tamanho: number): T[][] {
  if (!lista.length) return []
  const fatias: T[][] = []
  for (let i = 0; i < lista.length; i += tamanho) {
    fatias.push(lista.slice(i, i + tamanho))
  }
  return fatias
}

function moeda(valor: unknown): string {
  const n = Number(valor)
  if (!Number.isFinite(n) || n === 0) return ''
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const MESES_PT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
]

// Busca os registros de UMA coleção pelos ids; ids ausentes ou sem permissão
// simplesmente não entram no mapa (o "#id" fica no texto).
async function buscarNomes(
  colecao: string,
  ids: string[],
  nomear: Nomeador,
): Promise<Map<string, string>> {
  const nomes = new Map<string, string>()
  const campos = CAMPOS[colecao]
  if (!campos) return nomes
  for (const lote of fatiar(ids, LIMITE_POR_LOTE)) {
    const filtro = lote.map((id) => `id="${id}"`).join(' || ')
    try {
      const pagina = await pb.collection(colecao).getList(1, LIMITE_POR_LOTE, {
        filter: filtro,
        fields: campos,
      })
      for (const r of pagina.items as unknown as Record<string, unknown>[]) {
        nomes.set(String(r.id), nomear(r))
      }
    } catch {
      // 403 (sem permissão) ou erro transitório: mantém o "#id" no texto.
    }
  }
  return nomes
}

function nomearDeal(r: Record<string, unknown>): string {
  const titulo = r.title ? String(r.title) : ''
  const valor = moeda(r.valor_total)
  return [titulo, valor].filter(Boolean).join(' · ') || 'lead'
}

function nomearAtividade(r: Record<string, unknown>): string {
  const titulo = r.title ? String(r.title) : ''
  return titulo || 'atividade'
}

function nomearVisita(r: Record<string, unknown>): string {
  const data = r.data ? String(r.data).slice(0, 10) : ''
  const tipo = r.tipo ? String(r.tipo) : ''
  return [tipo, data].filter(Boolean).join(' · ') || 'visita'
}

function nomearContrato(r: Record<string, unknown>): string {
  const partes: string[] = []
  const valor = moeda(r.valor_mensal)
  if (valor) partes.push(valor + '/mês')
  if (r.status) partes.push(String(r.status))
  if (r.tipo) partes.push(String(r.tipo))
  return partes.join(' · ') || 'contrato'
}

function nomearMeta(r: Record<string, unknown>): string {
  const partes: string[] = []
  if (r.kpi) partes.push(String(r.kpi))
  if (r.ano) {
    const mesN = Number(r.mes)
    const mes = mesN >= 1 && mesN <= 12 ? `${MESES_PT[mesN - 1]}/` : ''
    partes.push(`${mes}${String(r.ano)}`)
  }
  const valor = moeda(r.valor_meta)
  if (valor) partes.push(valor)
  return partes.join(' · ') || 'meta'
}

const NOMEADORES: Record<string, Nomeador> = {
  deals: nomearDeal,
  activities: nomearAtividade,
  visitas_comerciais: nomearVisita,
  contratos: nomearContrato,
  metas: nomearMeta,
}

/**
 * Substitui cada "#id" citado pelo rótulo legível do registro, buscando nas
 * coleções das funções que o modelo acionou. Ids não encontrados ou sem
 * permissão permanecem como "#id". Roda APENAS no painel, sobre o texto a
 * exibir — nunca sobre o texto enviado ao provedor.
 */
export async function substituirIdsPorNomes(
  texto: string,
  consultas: ConsultaFuncao[],
): Promise<string> {
  const ids = extrairIdsCitados(texto)
  if (!ids.length) return texto

  const colecoes = new Set<string>()
  for (const consulta of consultas) {
    const alvo = FUNCAO_PARA_COLECAO[consulta.funcao]
    if (alvo) colecoes.add(alvo)
  }
  if (!colecoes.size) colecoes.add('deals')

  const mapa = new Map<string, string>()
  for (const colecao of colecoes) {
    const nomes = await buscarNomes(colecao, ids, NOMEADORES[colecao])
    for (const [id, nome] of nomes) mapa.set(id, nome)
  }

  return texto.replace(/#([A-Za-z0-9]{6,15})/g, (completo, id: string) => {
    return mapa.get(id) ?? completo
  })
}

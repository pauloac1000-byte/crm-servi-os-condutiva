import pb from '@/lib/pocketbase/client'

/**
 * Painel admin do assistente de IA (tela /assistente-uso, só perfil admin).
 * Lê assistente_logs — regra de API aberta ao admin pela migration 0036 — e
 * agrega NO CLIENTE por dia e por usuário. LGPD: aqui só existem TOTAIS
 * (contagem de consultas e de erros); a coleção NÃO guarda o texto das
 * perguntas/respostas, então nenhum conteúdo aparece nesta tela.
 */

export interface UsoAssistente {
  id: string
  usuario_id: string
  modelo: string
  erro: string
  latencia_ms: number
  created: string
}

export async function carregarUsoAssistente(dias = 14): Promise<UsoAssistente[]> {
  const desde = new Date()
  desde.setUTCDate(desde.getUTCDate() - dias)
  const desdeISO = desde.toISOString().substring(0, 10)
  const lista = await pb.collection('assistente_logs').getFullList({
    filter: `created >= "${desdeISO}"`,
    sort: '-created',
    fields: 'id,usuario_id,modelo,erro,latencia_ms,created',
  })
  return lista as unknown as UsoAssistente[]
}

export interface UsoPorUsuario {
  usuarioId: string
  total: number
  erros: number
  hoje: number
}

export interface UsoAgregado {
  porDia: { dia: string; total: number; erros: number }[]
  porUsuario: UsoPorUsuario[]
  errosUltimos7Dias: number
  total14Dias: number
  totalErros14Dias: number
}

const diaUtcDe = (created: string) => (created || '').substring(0, 10)
const hojeUtc = () => new Date().toISOString().substring(0, 10)

export function agregarUso(registros: UsoAssistente[], dias = 14): UsoAgregado {
  const diasLista: string[] = []
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    diasLista.push(d.toISOString().substring(0, 10))
  }

  const porDiaMap: Record<string, { total: number; erros: number }> = {}
  for (const dia of diasLista) porDiaMap[dia] = { total: 0, erros: 0 }

  const porUsuarioMap: Record<string, UsoPorUsuario> = {}
  const diaHoje = hojeUtc()
  let erros7 = 0
  const limite7 = diasLista[diasLista.length - 8] // primeiro dos últimos 7 dias

  for (const r of registros) {
    const dia = diaUtcDe(r.created)
    const temErro = (r.erro || '').trim() !== ''
    if (!porDiaMap[dia]) continue
    porDiaMap[dia].total += 1
    if (temErro) porDiaMap[dia].erros += 1

    const uid = (r.usuario_id || '').trim() || '(sem usuário)'
    if (!porUsuarioMap[uid]) {
      porUsuarioMap[uid] = { usuarioId: uid, total: 0, erros: 0, hoje: 0 }
    }
    porUsuarioMap[uid].total += 1
    if (temErro) porUsuarioMap[uid].erros += 1
    if (dia === diaHoje) porUsuarioMap[uid].hoje += 1

    if (temErro && dia >= limite7) erros7 += 1
  }

  const porDia = diasLista.map((dia) => ({ dia, ...porDiaMap[dia] }))
  const porUsuario = Object.values(porUsuarioMap).sort((a, b) => b.total - a.total)
  const total14Dias = registros.length
  const totalErros14Dias = registros.filter((r) => (r.erro || '').trim() !== '').length

  return { porDia, porUsuario, errosUltimos7Dias: erros7, total14Dias, totalErros14Dias }
}

// nomes dos usuários (id → nome) para o painel; o admin já tem leitura da coleção
export async function carregarNomesUsuarios(): Promise<Record<string, string>> {
  const nomes: Record<string, string> = {}
  try {
    const lista = await pb.collection('users').getFullList({
      fields: 'id,name,email',
    })
    for (const u of lista as unknown as { id: string; name?: string; email: string }[]) {
      nomes[u.id] = u.name || u.email
    }
  } catch {
    // sem acesso (ex.: conta antiga sem perfil admin pela regra nova): ids crus
  }
  return nomes
}

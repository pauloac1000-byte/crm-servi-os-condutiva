import pb from '@/lib/pocketbase/client'

/**
 * Sessão com ciclo de vida do DOCUMENTO (não do navegador).
 *
 * O authStore padrão do PocketBase (LocalAuthStore) persiste o token em
 * localStorage: fechar a aba/navegador não invalida nada e, ao reabrir, a rota
 * protegida reautentica sozinha. Aqui substituímos os métodos save/clear da
 * instância para que o token exista APENAS na memória do documento carregado —
 * qualquer novo carregamento (nova aba, reabrir o navegador, digitar URL,
 * recarregar) começa sem sessão e a guarda de rota cai na tela de login.
 */

const CHAVE_MARCADOR = 'crm_sessao_ativa'
// Token persistido por versões anteriores do app — descartado no primeiro boot.
const CHAVES_LEGADO = ['pocketbase_auth', 'pb_auth']

/** Marca que existe (ou existiu) uma sessão nesta origem — usado pelo aviso de sessão encerrada. */
export const marcarSessaoAtiva = () => {
  try {
    localStorage.setItem(CHAVE_MARCADOR, String(Date.now()))
  } catch {
    /* armazenamento indisponível — só o aviso deixa de funcionar */
  }
}

/** Remove a marca de sessão (logout manual não deve mostrar o aviso automático). */
export const limparMarcadorSessao = () => {
  try {
    localStorage.removeItem(CHAVE_MARCADOR)
  } catch {
    /* ignore */
  }
}

/** Indica se houve sessão ativa anteriormente nesta origem (base do aviso). */
export const haviaSessaoAtiva = () => {
  try {
    return Boolean(localStorage.getItem(CHAVE_MARCADOR))
  } catch {
    return false
  }
}

type MetodosStore = {
  save: (token: string, record?: Record<string, unknown> | null) => void
  clear: () => void
  baseToken: string
  baseModel: Record<string, unknown> | null
  triggerChange: () => void
}

type GettersStore = {
  token: string
  record: Record<string, unknown> | null
}

/**
 * Reconfigura o cliente PocketBase existente para manter a sessão só em
 * memória e descarta qualquer token persistido por versões anteriores.
 * Nada mais muda para o app: onChange continua o do SDK e isValid volta a
 * refletir a sessão em memória (ele lê token/record, sobrescritos abaixo).
 */
export const aplicarSessaoEmMemoria = () => {
  // 1. Descarta token legado em localStorage (sessão de antes desta mudança).
  for (const chave of CHAVES_LEGADO) {
    try {
      localStorage.removeItem(chave)
    } catch {
      /* ignore */
    }
  }

  const store = pb.authStore as unknown as MetodosStore & GettersStore
  if (store.baseToken || store.baseModel) {
    store.baseToken = ''
    store.baseModel = null
    store.triggerChange()
  }

  // 2. save/clear da instância passam a atualizar só a memória do documento:
  //    repetimos a implementação base (campos privados + evento de mudança) e
  //    pulamos a persistência em localStorage que o LocalAuthStore faz por cima.
  store.save = (token: string, record?: Record<string, unknown> | null) => {
    store.baseToken = token || ''
    store.baseModel = (record || null) as MetodosStore['baseModel']
    store.triggerChange()
  }
  store.clear = () => {
    store.save('', null)
  }

  // 3. No SDK ~0.26 os getters token/record do LocalAuthStore leem do
  //    localStorage (que aqui fica vazio por design) — isso deixaria isValid
  //    false e o header Authorization vazio mesmo com login bem-sucedido.
  //    Sobrescrevemos esses getters NA INSTÂNCIA para lerem da memória.
  //    Ainda gravamos em baseToken/baseModel (campos privados do SDK), nunca
  //    em localStorage, e o armazenamento é apenas da aba/documento atual.
  for (const [propriedade, campo] of [
    ['token', 'baseToken'],
    ['record', 'baseModel'],
  ] as const) {
    Object.defineProperty(pb.authStore, propriedade, {
      get: () => (store as unknown as Record<string, unknown>)[campo],
      configurable: true,
      enumerable: true,
    })
  }
}

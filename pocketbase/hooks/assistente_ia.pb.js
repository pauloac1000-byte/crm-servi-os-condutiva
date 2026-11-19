// pb_hooks — rota POST /backend/v1/assistente-ia (assistente de IA do CRM).
//
// Recebe { pergunta }, chama o provedor (API compatível com OpenAI) em
// IA_BASE_URL + /chat/completions com IA_API_KEY e IA_MODELO (lidos por nome,
// nunca gravados no código) e responde apenas { resposta }.
// Nenhum dado do CRM é enviado: só a pergunta digitada.
// Regras do projeto: rotas routerAdd respondem sempre com e.json; a chave e o
// header Authorization nunca vão para log nem para a resposta — só a categoria do erro.
// ATENÇÃO (JSVM): callbacks não enxergam declarações de topo de arquivo —
// toda a lógica vive inline dentro do handler.

routerAdd(
  'POST',
  '/backend/v1/assistente-ia',
  (e) => {
    const inicio = Date.now()
    const TIMEOUT_SEGUNDOS = 20
    const MAX_TOKENS = 600
    const MAX_PERGUNTA = 2000

    const MSG_NAO_CONFIGURADO = 'Assistente indisponível no momento. Avise o administrador.'
    const MSG_LIMITE = 'Limite de uso do assistente atingido. Tente novamente mais tarde.'
    const MSG_FALHA = 'O assistente não conseguiu responder agora. Tente novamente.'
    const MSG_TEMPO = 'O assistente demorou demais para responder. Tente novamente.'

    // grava o registro de log; falha de log nunca derruba a resposta
    const registrarLog = (modelo, tokens, latencia, erro) => {
      try {
        const col = e.app.findCollectionByNameOrId('assistente_logs')
        const rec = new Record(col)
        rec.set('usuario_id', e.auth.id)
        rec.set('modelo', modelo || '')
        rec.set('tokens', tokens || 0)
        rec.set('latencia_ms', latencia)
        rec.set('erro', erro || '')
        e.app.save(rec)
      } catch (_) {
        console.log('assistente_ia: falha ao gravar log')
      }
    }

    const corpo = e.requestInfo().body || {}
    const pergunta = typeof corpo.pergunta === 'string' ? corpo.pergunta.trim() : ''
    if (!pergunta || pergunta.length > MAX_PERGUNTA) {
      return e.json(400, { erro: 'Digite uma pergunta de até 2000 caracteres.' })
    }

    const baseUrl = ($os.getenv('IA_BASE_URL') || '').trim().replace(/\/+$/, '')
    const apiKey = ($os.getenv('IA_API_KEY') || '').trim()
    const modelo = ($os.getenv('IA_MODELO') || '').trim()
    if (!baseUrl || !apiKey || !modelo) {
      console.log('assistente_ia: configuração ausente')
      registrarLog(modelo, 0, Date.now() - inicio, 'configuração ausente')
      return e.json(503, { erro: MSG_NAO_CONFIGURADO })
    }

    let res
    try {
      res = $http.send({
        url: baseUrl + '/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + apiKey,
        },
        body: JSON.stringify({
          model: modelo,
          messages: [{ role: 'user', content: pergunta }],
          max_tokens: MAX_TOKENS,
        }),
        timeout: TIMEOUT_SEGUNDOS,
      })
    } catch (err) {
      // a mensagem crua pode trazer detalhes de rede: só a categoria é usada
      const txt = String((err && err.message) || err || '').toLowerCase()
      const latencia = Date.now() - inicio
      if (/timeout|timed out|deadline|context canceled/.test(txt)) {
        console.log('assistente_ia: tempo esgotado em ' + latencia + 'ms')
        registrarLog(modelo, 0, latencia, 'tempo esgotado')
        return e.json(504, { erro: MSG_TEMPO })
      }
      console.log('assistente_ia: falha do provedor em ' + latencia + 'ms')
      registrarLog(modelo, 0, latencia, 'falha do provedor')
      return e.json(502, { erro: MSG_FALHA })
    }

    const latencia = Date.now() - inicio
    if (res.statusCode === 429 || res.statusCode === 413) {
      console.log(
        'assistente_ia: limite de tokens (status ' + res.statusCode + ') em ' + latencia + 'ms',
      )
      registrarLog(modelo, 0, latencia, 'limite de tokens')
      return e.json(429, { erro: MSG_LIMITE })
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      console.log(
        'assistente_ia: falha do provedor (status ' + res.statusCode + ') em ' + latencia + 'ms',
      )
      registrarLog(modelo, 0, latencia, 'falha do provedor')
      return e.json(502, { erro: MSG_FALHA })
    }

    let dados = res.json
    if (!dados) {
      try {
        dados = JSON.parse(toString(res.body))
      } catch (_) {
        dados = null
      }
    }

    const choice = dados && dados.choices && dados.choices[0]
    const texto =
      choice && choice.message && typeof choice.message.content === 'string'
        ? choice.message.content.trim()
        : ''
    const tokens =
      dados && dados.usage && typeof dados.usage.total_tokens === 'number'
        ? dados.usage.total_tokens
        : 0

    if (!texto) {
      console.log('assistente_ia: falha do provedor (resposta vazia) em ' + latencia + 'ms')
      registrarLog(modelo, tokens, latencia, 'falha do provedor')
      return e.json(502, { erro: MSG_FALHA })
    }

    registrarLog(modelo, tokens, latencia, '')
    return e.json(200, { resposta: texto })
  },
  $apis.requireAuth(),
)

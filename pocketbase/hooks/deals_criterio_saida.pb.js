// pb_hooks — validação do critério de saída na mudança de etapa do negócio.
//
// Regras (aplicadas no SERVIDOR, além do frontend):
//  1. Ao avançar para a etapa seguinte (ordem +1) sem todos os itens do
//     critério de saída marcados em "criterio_marcados", o avanço é BLOQUEADO
//     (a API responde com erro, não com 200+write pulado).
//  2. Somente um admin (users.role = 'admin') pode FORÇAR o avanço, enviando
//     "forcar_avanco = true" + "justificativa_avanco" (texto obrigatório).
//  3. Todo avanço (normal ou forçado) grava um registro no histórico do
//     negócio (coleção historico_negocios), com a justificativa quando forçado.
//  4. Ao mudar de etapa, "criterio_marcados" é reiniciado para a nova etapa.
//
// ATENÇÃO (JSVM): callbacks não enxergam declarações de topo de arquivo —
// toda a lógica vive inline dentro de cada callback.
//
// IMPORTANTE: e.next() é chamado em TODOS os caminhos de sucesso. Um caminho
// que termina sem e.next() faz o PocketBase PULAR o write no banco enquanto a
// API responde 200 — era exatamente o bug do arrastar para a etapa seguinte.
// A validação do critério de saída roda ANTES de zerar o checklist: ela lê os
// itens marcados que chegam no request (record), nunca um estado já zerado.

onRecordUpdate((e) => {
  const record = e.record
  const original = record.original()

  const etapaAntes = original.getString('etapa')
  const etapaDepois = record.getString('etapa')

  // Sem troca de etapa: nada a validar ou limpar — apenas segue o fluxo normal.
  if (!etapaAntes || !etapaDepois || etapaAntes === etapaDepois) {
    e.next()
    return
  }

  const status = record.getString('status')

  let etapaAntesRec = null
  let etapaDepoisRec = null
  let ordemAntes = 0
  let ordemDepois = 0
  try {
    etapaAntesRec = app.findRecordById('etapas_funil', etapaAntes)
    etapaDepoisRec = app.findRecordById('etapas_funil', etapaDepois)
    ordemAntes = etapaAntesRec.getInt('ordem')
    ordemDepois = etapaDepoisRec.getInt('ordem')
  } catch (err) {
    // Etapa inexistente/removida: não bloqueia nem estampa nada — grava como veio.
    console.log('deals_criterio_saida: etapa não encontrada: ' + err)
    e.next()
    return
  }

  const eAvanco = ordemDepois === ordemAntes + 1
  const eAvancoForcado = record.getBool('forcar_avanco')

  if (eAvanco && status !== 'perdido') {
    // Valida o critério de saída da etapa ORIGEM contra o que chega no request
    // (record ainda contém os itens marcados — o zeramento só acontece depois).
    const parseJsonArray = function (rec, field) {
      const raw = rec.getString(field)
      if (!raw) return []
      try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
      } catch (_) {
        return []
      }
    }
    const itens = parseJsonArray(etapaAntesRec, 'criterio_itens')
    const marcados = parseJsonArray(record, 'criterio_marcados')

    const faltam = []
    for (let i = 0; i < itens.length; i++) {
      if (marcados.indexOf(itens[i]) === -1) faltam.push(itens[i])
    }

    const justificativa = record.getString('justificativa_avanco')

    if (faltam.length > 0 && !eAvancoForcado) {
      // Bloqueio: responde com ERRO (BadRequestError), nunca 200 sem write.
      throw new BadRequestError(
        'Esta oportunidade ainda não cumpriu o critério de saída da etapa atual',
      )
    }

    if (faltam.length > 0 && eAvancoForcado) {
      // Só admin pode forçar, e com justificativa obrigatória
      const auth = e.auth
      let isAdmin = false
      if (auth) {
        try {
          const userRec = app.findRecordById('users', auth.id)
          isAdmin = userRec.getString('role') === 'admin'
        } catch (_) {
          isAdmin = false
        }
      }
      if (!isAdmin) {
        throw new ForbiddenError('Apenas o administrador pode forçar o avanço de etapa.')
      }
      if (!justificativa || !justificativa.trim()) {
        throw new BadRequestError('Informe a justificativa para forçar o avanço de etapa.')
      }
    }

    // Avanço válido: grava no histórico do negócio
    try {
      const colecaoHistorico = app.findCollectionByNameOrId('historico_negocios')
      const hist = new Record(colecaoHistorico)
      hist.set('deal', record.id)
      hist.set('owner', e.auth ? e.auth.id : original.getString('owner'))
      hist.set('tipo', faltam.length > 0 ? 'avanco_forcado' : 'avanco')
      hist.set(
        'titulo',
        faltam.length > 0
          ? 'Avanço forçado para ' + etapaDepoisRec.getString('nome')
          : 'Avanço para ' + etapaDepoisRec.getString('nome'),
      )
      let descricao =
        'Etapa anterior: ' + etapaAntesRec.getString('nome') + '. Critério de saída cumprido.'
      if (faltam.length > 0) {
        descricao =
          'Etapa anterior: ' +
          etapaAntesRec.getString('nome') +
          '. Critério de saída NÃO cumprido — itens pendentes: ' +
          faltam.join('; ') +
          '.'
      }
      hist.set('descricao', descricao)
      hist.set('etapa_de', etapaAntes)
      hist.set('etapa_para', etapaDepois)
      if (faltam.length > 0) {
        hist.set('justificativa', justificativa)
      }
      app.save(hist)
    } catch (err) {
      // Falha ao gravar histórico não pode impedir a troca de etapa nem pular o write.
      console.log('deals_criterio_saida: falha ao gravar histórico: ' + err)
    }
  }

  // Mudou de etapa (qualquer direção): reinicia o checklist para a nova etapa
  // e limpa os campos auxiliares — sempre DEPOIS da validação.
  record.set('criterio_marcados', [])
  record.set('forcar_avanco', false)
  if (!eAvanco) {
    record.set('justificativa_avanco', '')
  }

  // Único caminho de sucesso: chama e.next() para o write acontecer de fato.
  e.next()
}, 'deals')

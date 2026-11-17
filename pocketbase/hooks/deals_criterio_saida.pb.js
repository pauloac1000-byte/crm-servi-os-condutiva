// pb_hooks — validação do critério de saída na mudança de etapa do negócio.
//
// Regras (aplicadas no SERVIDOR, além do frontend):
//  1. Ao avançar para a etapa seguinte (ordem +1) sem todos os itens do
//     critério de saída marcados em "criterio_marcados", o avanço é BLOQUEADO.
//  2. Somente um admin (users.role = 'admin') pode FORÇAR o avanço, enviando
//     "forcar_avanco = true" + "justificativa_avanco" (texto obrigatório).
//  3. Todo avanço (normal ou forçado) grava um registro no histórico do
//     negócio (coleção historico_negocios), com a justificativa quando forçado.
//  4. Ao mudar de etapa, "criterio_marcados" é reiniciado para a nova etapa.

onRecordUpdate((e) => {
  // Lê os itens de um campo json (PocketBase devolve bytes crus em record.get).
  const parseJsonArray = function (record, field) {
    const raw = record.getString(field)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch (_) {
      return []
    }
  }

  const record = e.record
  const original = record.original()

  const etapaAntes = original.getString('etapa')
  const etapaDepois = record.getString('etapa')
  if (!etapaAntes || !etapaDepois || etapaAntes === etapaDepois) {
    e.next()
    return
  }

  // Status perdido: recuar/definir etapa_anterior não é "avanço"
  const status = record.getString('status')

  const etapaAntesRec = app.findRecordById('etapas_funil', etapaAntes)
  const etapaDepoisRec = app.findRecordById('etapas_funil', etapaDepois)

  const ordemAntes = etapaAntesRec.getInt('ordem')
  const ordemDepois = etapaDepoisRec.getInt('ordem')

  const eAvanco = ordemDepois === ordemAntes + 1
  const eAvancoForcado = record.getBool('forcar_avanco')

  if (eAvanco && status !== 'perdido') {
    const itens = parseJsonArray(etapaAntesRec, 'criterio_itens')
    const marcados = parseJsonArray(record, 'criterio_marcados')

    const faltam = []
    for (let i = 0; i < itens.length; i++) {
      if (marcados.indexOf(itens[i]) === -1) faltam.push(itens[i])
    }

    const justificativa = record.getString('justificativa_avanco')

    if (faltam.length > 0 && !eAvancoForcado) {
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
  }

  // Mudou de etapa: reinicia o checklist para a nova etapa
  record.set('criterio_marcados', [])
  // Campos auxiliares não persistem
  record.set('forcar_avanco', false)
  if (!eAvanco) {
    record.set('justificativa_avanco', '')
  }

  e.next()
}, 'deals')

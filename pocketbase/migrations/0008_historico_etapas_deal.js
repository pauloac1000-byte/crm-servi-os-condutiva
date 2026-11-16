migrate(
  (app) => {
    // ------------------------------------------------------------------
    // 1. deals: campos de entrada na etapa atual
    //    - etapa_desde: data/hora da entrada na etapa atual (estampada
    //      automaticamente pelo hook a cada mudança de etapa)
    //    - etapa_desde_usuario: usuário responsável pela mudança que deu
    //      entrada nesta etapa (@request.auth da troca, sem digitação)
    // ------------------------------------------------------------------
    const dealsCol = app.findCollectionByNameOrId('deals')
    let mudou = false
    if (!dealsCol.fields.getByName('etapa_desde')) {
      dealsCol.fields.add(new DateField({ name: 'etapa_desde' }))
      mudou = true
    }
    if (!dealsCol.fields.getByName('etapa_desde_usuario')) {
      dealsCol.fields.add(
        new RelationField({
          name: 'etapa_desde_usuario',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        }),
      )
      mudou = true
    }
    if (mudou) app.save(dealsCol)

    // ------------------------------------------------------------------
    // 2. Backfill idempotente dos negócios existentes: preenche
    //    etapa_desde com a data do último registro de histórico do deal
    //    (entrada na etapa atual) e, na falta dele, com "updated" (e
    //    "created" quando updated estiver vazio). Atualiza também o
    //    usuário responsável quando conhecido. Roda limpo em base vazia.
    // ------------------------------------------------------------------
    const deals = app.findRecordsByFilter('deals', '', '-created', 1000000, 0)
    for (let i = 0; i < deals.length; i++) {
      const d = deals[i]
      if (d.getString('etapa_desde')) continue // já tem data — não sobrescreve

      let data = ''
      let usuario = d.getString('etapa_desde_usuario')
      try {
        const hist = app.findRecordsByFilter(
          'historico_negocios',
          "deal = '" + d.id + "'",
          '-created',
          1,
          0,
        )
        if (hist.length > 0) {
          data = hist[0].getString('created')
          if (!usuario) usuario = hist[0].getString('owner')
        }
      } catch (_) {}

      if (!data) {
        data = d.getString('updated')
        if (!data) data = d.getString('created')
      }
      if (!data) continue

      d.set('etapa_desde', data)
      if (usuario && !d.getString('etapa_desde_usuario')) {
        d.set('etapa_desde_usuario', usuario)
      }
      app.save(d)
    }
  },
  (app) => {
    try {
      const dealsCol = app.findCollectionByNameOrId('deals')
      ;['etapa_desde', 'etapa_desde_usuario'].forEach((f) => {
        const field = dealsCol.fields.getByName(f)
        if (field) dealsCol.fields.removeByName(f)
      })
      app.save(dealsCol)
    } catch (_) {}
  },
)

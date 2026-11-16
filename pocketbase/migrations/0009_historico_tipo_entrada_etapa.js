migrate(
  (app) => {
    // ------------------------------------------------------------------
    // historico_negocios: novo tipo de evento "entrada_etapa" — gravado
    // automaticamente pelo hook (deals_historico_etapas.pb.js) sempre que
    // o negócio entra em uma etapa (mudança de etapa, sem digitação).
    // O campo select "tipo" é recriado com a lista completa de valores
    // (adicionar valor via field.set não é suportado no JSVM).
    // ------------------------------------------------------------------
    const col = app.findCollectionByNameOrId('historico_negocios')
    const tipoAtual = col.fields.getByName('tipo')
    let valores = ['avanco', 'avanco_forcado', 'criacao', 'perda', 'ganho', 'outro']
    try {
      const atuais = JSON.parse(tipoAtual.getString('values') || '[]') ?? []
      if (Array.isArray(atuais) && atuais.length > 0) valores = atuais
    } catch (_) {}
    if (valores.indexOf('entrada_etapa') !== -1) return // já aplicado

    col.fields.removeByName('tipo')
    col.fields.add(
      new SelectField({
        name: 'tipo',
        values: valores.concat(['entrada_etapa']),
        maxSelect: 1,
      }),
    )
    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('historico_negocios')
      const tipoAtual = col.fields.getByName('tipo')
      let valores = []
      try {
        valores = JSON.parse(tipoAtual.getString('values') || '[]') ?? []
      } catch (_) {}
      if (!Array.isArray(valores)) valores = []
      col.fields.removeByName('tipo')
      col.fields.add(
        new SelectField({
          name: 'tipo',
          values: valores.filter((v) => v !== 'entrada_etapa'),
          maxSelect: 1,
        }),
      )
      app.save(col)
    } catch (_) {}
  },
)

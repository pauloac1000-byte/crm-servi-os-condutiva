// Atualiza assistente_logs: funções de leitura acionadas e linhas por chamada.
// Migration aditiva — só adiciona colunas, nunca toca em dados.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('assistente_logs')

    if (!collection.fields.getByName('funcoes_acionadas')) {
      collection.fields.add(
        new TextField({
          name: 'funcoes_acionadas',
          max: 0,
        }),
      )
    }
    if (!collection.fields.getByName('linhas_por_funcao')) {
      collection.fields.add(
        new TextField({
          name: 'linhas_por_funcao',
          max: 0,
        }),
      )
    }

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('assistente_logs')

    const f = collection.fields.getByName('funcoes_acionadas')
    if (f) {
      collection.fields.removeByName('funcoes_acionadas')
    }
    const l = collection.fields.getByName('linhas_por_funcao')
    if (l) {
      collection.fields.removeByName('linhas_por_funcao')
    }
    app.save(collection)
  },
)

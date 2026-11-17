// 0019 — campo "informacoes_plano" (texto livre, opcional) na coleção
// "contratos": observações sobre o que foi contratado — escopo, condições.
// Idempotente: só cria o campo se ele ainda não existir. Sem dados de exemplo.

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('contratos')
    if (!col.fields.getByName('informacoes_plano')) {
      col.fields.add(new TextField({ name: 'informacoes_plano', max: 2000 }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('contratos')
    if (col.fields.getByName('informacoes_plano')) {
      col.fields.removeByName('informacoes_plano')
      app.save(col)
    }
  },
)

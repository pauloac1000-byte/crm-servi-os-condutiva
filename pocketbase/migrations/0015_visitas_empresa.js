// 0015 — campo "empresa" na coleção "visitas_comerciais": nome da empresa
// visitada, escolhido no modal a partir das empresas distintas dos contatos.
// Guarda o texto da empresa (não uma relação) para acompanhar o campo
// "company" dos contatos, que também é texto livre. Idempotente: só cria o
// campo se ele ainda não existir. Sem dados de exemplo.

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('visitas_comerciais')
    if (!col.fields.getByName('empresa')) {
      col.fields.add(new TextField({ name: 'empresa', max: 200 }))
    }
    col.addIndex('idx_visitas_empresa', false, 'empresa', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('visitas_comerciais')
    if (col.fields.getByName('empresa')) {
      col.fields.removeByName('empresa')
      col.removeIndex('idx_visitas_empresa')
      app.save(col)
    }
  },
)

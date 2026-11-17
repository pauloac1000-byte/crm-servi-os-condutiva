// 0021 — campo "empresa" na coleção "ordens_servico": nome da empresa do
// cliente (unidade atendida), escolhido no modal a partir das empresas
// distintas dos contatos — mesmo padrão do campo "empresa" das visitas
// comerciais (0015). Guarda o TEXTO da empresa (não uma relação) para
// acompanhar o campo "company" dos contatos, que também é texto livre.
// Idempotente: só cria o campo se ele ainda não existir. Sem dados de exemplo.

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('ordens_servico')
    if (!col.fields.getByName('empresa')) {
      col.fields.add(new TextField({ name: 'empresa', max: 200 }))
    }
    col.addIndex('idx_ordens_servico_empresa', false, 'empresa', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('ordens_servico')
    if (col.fields.getByName('empresa')) {
      col.fields.removeByName('empresa')
      col.removeIndex('idx_ordens_servico_empresa')
      app.save(col)
    }
  },
)

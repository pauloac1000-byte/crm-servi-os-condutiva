// 0017 — cria a coleção "contratos": contratos assinados, fonte da receita
// contratada da unidade de serviços. Sem dados de exemplo (coleção nasce vazia).
//
// Campos: cliente (contato), negócio de origem, plano, responsável, valores
// (valor_mensal, valor_implantacao), datas (data_inicio, data_fim), status
// (ativo | encerrado | suspenso) e tipo (novo | renovação | expansão | contração | churn).

migrate(
  (app) => {
    const collection = new Collection({
      name: 'contratos',
      type: 'base',
      // Mesmo padrão das demais coleções do CRM: listagem por responsável,
      // criação por qualquer usuário autenticado.
      listRule: "@request.auth.id != '' && responsavel = @request.auth.id",
      viewRule: "@request.auth.id != '' && responsavel = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && responsavel = @request.auth.id",
      deleteRule: "@request.auth.id != '' && responsavel = @request.auth.id",
      fields: [
        {
          name: 'cliente',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('contacts').id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'negocio',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('deals').id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'plano',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('planos').id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'responsavel',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'valor_mensal', type: 'number' },
        { name: 'valor_implantacao', type: 'number' },
        { name: 'data_inicio', type: 'date' },
        { name: 'data_fim', type: 'date' },
        {
          name: 'status',
          type: 'select',
          values: ['ativo', 'encerrado', 'suspenso'],
          maxSelect: 1,
        },
        {
          name: 'tipo',
          type: 'select',
          values: ['novo', 'renovação', 'expansão', 'contração', 'churn'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_contratos_responsavel ON contratos (responsavel)',
        'CREATE INDEX idx_contratos_status ON contratos (status)',
        'CREATE INDEX idx_contratos_data_inicio ON contratos (data_inicio)',
        'CREATE INDEX idx_contratos_cliente ON contratos (cliente)',
        'CREATE INDEX idx_contratos_negocio ON contratos (negocio)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('contratos')
    app.delete(collection)
  },
)

// 0020 — cria a coleção "ordens_servico": ordens de serviço executadas para os
// clientes da unidade de serviços. Sem dados de exemplo (coleção nasce vazia).
//
// Campos: cliente (contato), contrato (opcional), equipamento, descricao,
// data_abertura, prazo_acordado (opcional), data_encerramento (opcional),
// status (aberta | em execução | concluída | cancelada), responsavel_tecnico
// (usuário, opcional) e observacoes.

migrate(
  (app) => {
    const collection = new Collection({
      name: 'ordens_servico',
      type: 'base',
      // OS são compartilhadas pela equipe técnica: qualquer usuário autenticado
      // lê, cria, edita e exclui.
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'cliente',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('contacts').id,
          cascadeDelete: false,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'contrato',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('contratos').id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'equipamento', type: 'text', max: 255 },
        { name: 'descricao', type: 'text', max: 5000, required: true },
        { name: 'data_abertura', type: 'date', required: true },
        { name: 'prazo_acordado', type: 'date' },
        { name: 'data_encerramento', type: 'date' },
        {
          name: 'status',
          type: 'select',
          values: ['aberta', 'em execução', 'concluída', 'cancelada'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'responsavel_tecnico',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'observacoes', type: 'text', max: 5000 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_ordens_servico_cliente ON ordens_servico (cliente)',
        'CREATE INDEX idx_ordens_servico_contrato ON ordens_servico (contrato)',
        'CREATE INDEX idx_ordens_servico_status ON ordens_servico (status)',
        'CREATE INDEX idx_ordens_servico_data_abertura ON ordens_servico (data_abertura)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('ordens_servico')
    app.delete(collection)
  },
)

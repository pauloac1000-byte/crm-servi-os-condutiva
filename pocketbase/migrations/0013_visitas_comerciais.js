// 0013 — cria a coleção "visitas_comerciais": custo de cada visita comercial
// feita para gerar ou avançar leads. Sem dados de exemplo (coleção nasce vazia).
//
// Campos: data, contato (opcional), negócio (opcional), responsável, tipo
// (presencial | remota), km_rodados, valor_combustivel, pedagio, alimentacao,
// hospedagem, horas_dedicadas, outros_custos, resultado (texto) e custo_total
// (preenchido automaticamente pelo hook visitas_custo_total.pb.js — soma dos
// valores monetários; km e horas não entram na soma).

migrate(
  (app) => {
    const collection = new Collection({
      name: 'visitas_comerciais',
      type: 'base',
      // Mesmo padrão das demais coleções do CRM: listagem por responsável,
      // criação por qualquer usuário autenticado.
      listRule: "@request.auth.id != '' && responsavel = @request.auth.id",
      viewRule: "@request.auth.id != '' && responsavel = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && responsavel = @request.auth.id",
      deleteRule: "@request.auth.id != '' && responsavel = @request.auth.id",
      fields: [
        { name: 'data', type: 'date' },
        {
          name: 'contato',
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
          name: 'responsavel',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'tipo', type: 'select', values: ['presencial', 'remota'], maxSelect: 1 },
        { name: 'km_rodados', type: 'number' },
        { name: 'valor_combustivel', type: 'number' },
        { name: 'pedagio', type: 'number' },
        { name: 'alimentacao', type: 'number' },
        { name: 'hospedagem', type: 'number' },
        { name: 'horas_dedicadas', type: 'number' },
        { name: 'outros_custos', type: 'number' },
        { name: 'resultado', type: 'text' },
        { name: 'custo_total', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_visitas_responsavel ON visitas_comerciais (responsavel)',
        'CREATE INDEX idx_visitas_data ON visitas_comerciais (data)',
        'CREATE INDEX idx_visitas_negocio ON visitas_comerciais (negocio)',
        'CREATE INDEX idx_visitas_contato ON visitas_comerciais (contato)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('visitas_comerciais')
    app.delete(collection)
  },
)

// 0018 — cria a coleção "movimentos_receita": acompanhamento da receita
// recorrente mês a mês (base para o cálculo do NRR). Coleção nasce vazia,
// sem dados de exemplo.
//
// Campos: competência (texto AAAA-MM), contrato (relação opcional — movimento
// manual pode não ter contrato), tipo (novo | expansão | contração | churn |
// renovação), valor mensal correspondente ao movimento e responsável.
// Movimentos automáticos são gravados pelo hook contratos_movimentos.pb.js;
// movimentos manuais podem ser lançados pela tela de Contratos.
//
// Regras no mesmo padrão da coleção "contratos": listagem/edição por
// responsável, criação por qualquer usuário autenticado. Em movimentos
// automáticos o responsável é o dono do contrato (gravado pelo hook).

migrate(
  (app) => {
    const collection = new Collection({
      name: 'movimentos_receita',
      type: 'base',
      listRule: "@request.auth.id != '' && responsavel = @request.auth.id",
      viewRule: "@request.auth.id != '' && responsavel = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && responsavel = @request.auth.id",
      deleteRule: "@request.auth.id != '' && responsavel = @request.auth.id",
      fields: [
        {
          name: 'contrato',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('contratos').id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'competencia',
          type: 'text',
          // AAAA-MM — ex.: 2026-11
          pattern: '^[0-9]{4}-[0-9]{2}$',
        },
        {
          name: 'tipo',
          type: 'select',
          values: ['novo', 'expansão', 'contração', 'churn', 'renovação'],
          maxSelect: 1,
        },
        { name: 'valor_mensal', type: 'number' },
        {
          name: 'responsavel',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_movimentos_receita_competencia ON movimentos_receita (competencia)',
        'CREATE INDEX idx_movimentos_receita_contrato ON movimentos_receita (contrato)',
        'CREATE INDEX idx_movimentos_receita_responsavel ON movimentos_receita (responsavel)',
        'CREATE INDEX idx_movimentos_receita_tipo ON movimentos_receita (tipo)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('movimentos_receita')
    app.delete(collection)
  },
)

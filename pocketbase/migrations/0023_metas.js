// Coleção "metas": metas mensais e anuais dos KPIs da unidade de serviços.
// Registro por ano + mês + kpi (mês vazio/0 = meta anual).
// Regras: leitura para qualquer usuário autenticado; gravação apenas admin
// (mesmo padrão da coleção "configuracoes"). Nasce vazia, sem dados de exemplo.
migrate(
  (app) => {
    const collection = new Collection({
      name: 'metas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      fields: [
        // ano da meta (ex.: 2026)
        { name: 'ano', type: 'number', required: true, onlyInt: true },
        // mês 1..12 — vazio quando a meta é anual
        { name: 'mes', type: 'number', onlyInt: true, min: 1, max: 12 },
        // KPI da meta
        {
          name: 'kpi',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: [
            'RCS',
            'taxa_conversao_leads',
            'ticket_medio',
            'os_no_prazo',
            'NRR',
            'leads_qualificados',
            'propostas_enviadas',
            'custo_por_contrato',
          ],
        },
        // valor da meta (unidade conforme o KPI: %, R$ ou contagem)
        { name: 'valor_meta', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_metas_ano_mes_kpi ON metas (ano, mes, kpi)'],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('metas')
    app.delete(collection)
  },
)

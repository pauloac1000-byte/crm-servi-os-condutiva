// 0016 — planos de serviço e valor total do negócio.
//
// 1. Cria a coleção "planos" (configuração oficial da empresa — mesmo padrão do
//    seed de etapas_funil): nome, descrição, valor_mensal_referencia e escopo.
// 2. Popula os três planos oficiais: Básico, Intermediário e Avançado.
// 3. Acrescenta em "deals": plano (relação), valor_mensal, valor_implantacao e
//    prazo_contrato_meses. O campo valor_total (implantação + mensal × prazo)
//    é preenchido automaticamente pelo hook deals_valor_total.pb.js.
// Sem dados de exemplo de teste — apenas os planos oficiais da empresa.

migrate(
  (app) => {
    // ------------------------------------------------------------------
    // 1. Coleção planos — idempotente (só cria se não existir)
    // ------------------------------------------------------------------
    try {
      app.findCollectionByNameOrId('planos')
    } catch (_) {
      const collection = new Collection({
        name: 'planos',
        type: 'base',
        // Mesmo padrão de etapas_funil: configuração oficial — leitura para
        // usuários autenticados, escrita só por administradores do painel.
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: 'nome', type: 'text', required: true },
          { name: 'descricao', type: 'text' },
          { name: 'valor_mensal_referencia', type: 'number' },
          { name: 'escopo', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_planos_nome ON planos (nome)'],
      })
      app.save(collection)
    }

    // ------------------------------------------------------------------
    // 2. Planos oficiais da empresa (idempotente — nada de dados de exemplo)
    // ------------------------------------------------------------------
    const planosOficiais = [
      {
        nome: 'Básico',
        descricao:
          'Plano de entrada: monitoramento essencial de infraestrutura e suporte sob demanda.',
        valor_mensal_referencia: 990.0,
        escopo:
          'Monitoramento de ativos críticos, atendimento em horário comercial e suporte corretivo sob demanda.',
      },
      {
        nome: 'Intermediário',
        descricao: 'Plano intermediário: gestão proativa de infraestrutura e suporte estendido.',
        valor_mensal_referencia: 1990.0,
        escopo:
          'Monitoramento completo, gestão de patches e vulnerabilidades, suporte em horário estendido e relatórios mensais.',
      },
      {
        nome: 'Avançado',
        descricao:
          'Plano avançado: operação de TI gerenciada com segurança e resposta a incidentes.',
        valor_mensal_referencia: 3490.0,
        escopo:
          'Operação gerenciada ponta a ponta, gestão de segurança, resposta a incidentes, backup gerenciado e relatórios executivos.',
      },
    ]

    for (let i = 0; i < planosOficiais.length; i++) {
      const p = planosOficiais[i]
      try {
        app.findFirstRecordByData('planos', 'nome', p.nome)
      } catch (_) {
        const record = new Record(app.findCollectionByNameOrId('planos'))
        record.set('nome', p.nome)
        record.set('descricao', p.descricao)
        record.set('valor_mensal_referencia', p.valor_mensal_referencia)
        record.set('escopo', p.escopo)
        app.save(record)
      }
    }

    // ------------------------------------------------------------------
    // 3. deals: plano + valores do contrato. Negócios existentes ficam
    //    intactos: sem esses campos preenchidos, o valor antigo continua
    //    valendo (hook só recalcula quando há dados suficientes).
    // ------------------------------------------------------------------
    const planosColId = app.findCollectionByNameOrId('planos').id
    const dealsCol = app.findCollectionByNameOrId('deals')
    let dealsMudou = false

    if (!dealsCol.fields.getByName('plano')) {
      dealsCol.fields.add(
        new RelationField({
          name: 'plano',
          collectionId: planosColId,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
      dealsMudou = true
    }
    if (!dealsCol.fields.getByName('valor_mensal')) {
      dealsCol.fields.add(new NumberField({ name: 'valor_mensal' }))
      dealsMudou = true
    }
    if (!dealsCol.fields.getByName('valor_implantacao')) {
      dealsCol.fields.add(new NumberField({ name: 'valor_implantacao' }))
      dealsMudou = true
    }
    if (!dealsCol.fields.getByName('prazo_contrato_meses')) {
      dealsCol.fields.add(new NumberField({ name: 'prazo_contrato_meses', onlyInt: true, min: 0 }))
      dealsMudou = true
    }
    if (!dealsCol.fields.getByName('valor_total')) {
      dealsCol.fields.add(new NumberField({ name: 'valor_total' }))
      dealsMudou = true
    }
    if (dealsMudou) app.save(dealsCol)
  },
  (app) => {
    // Reverte: remove os campos novos de deals e apaga a coleção planos
    try {
      const dealsCol = app.findCollectionByNameOrId('deals')
      ;[
        'plano',
        'valor_mensal',
        'valor_implantacao',
        'prazo_contrato_meses',
        'valor_total',
      ].forEach((nome) => {
        if (dealsCol.fields.getByName(nome)) dealsCol.fields.removeByName(nome)
      })
      app.save(dealsCol)
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('planos'))
    } catch (_) {}
  },
)

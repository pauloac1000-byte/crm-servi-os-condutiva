migrate(
  (app) => {
    // ------------------------------------------------------------------
    // 1. Coleção etapas_funil — etapas oficiais da unidade de SERVIÇOS
    //    (textos editáveis pela coleção; a interface lê daqui, ordenado por "ordem")
    // ------------------------------------------------------------------
    try {
      app.findCollectionByNameOrId('etapas_funil')
    } catch (_) {
      const collection = new Collection({
        name: 'etapas_funil',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: 'ordem', type: 'number' },
          { name: 'nome', type: 'text', required: true },
          { name: 'objetivo', type: 'text' },
          { name: 'atividade_principal', type: 'text' },
          { name: 'criterio_saida', type: 'text' },
          { name: 'prazo_alvo_dias', type: 'number' },
          // cor usada apenas para manter o visual atual do Kanban (ponto/borda da coluna)
          { name: 'cor', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_etapas_funil_ordem ON etapas_funil (ordem)'],
      })
      app.save(collection)
    }

    // ------------------------------------------------------------------
    // 2. Popula as 7 etapas oficiais (idempotente — nada de dados de exemplo)
    // ------------------------------------------------------------------
    const etapasOficiais = [
      {
        ordem: 1,
        nome: 'Lead',
        objetivo:
          'Captar e registrar novos interesses gerados por marketing, indicação ou prospecção ativa.',
        atividade_principal:
          'Registrar o lead no CRM com dados de contato e realizar o primeiro contato.',
        criterio_saida: 'Lead registrado com contato válido e primeiro contato realizado.',
        prazo_alvo_dias: 2,
        cor: '#6366F1',
      },
      {
        ordem: 2,
        nome: 'Contato',
        objetivo:
          'Estabelecer conexão com o lead e entender o contexto e a necessidade preliminar.',
        atividade_principal:
          'Ligação ou reunião de descoberta para entender o cenário de TI do prospect.',
        criterio_saida: 'Necessidade inicial identificada e próximo passo agendado com o cliente.',
        prazo_alvo_dias: 5,
        cor: '#0EA5E9',
      },
      {
        ordem: 3,
        nome: 'Qualificado',
        objetivo:
          'Validar o fit da oportunidade com os serviços da unidade (perfil, orçamento e decisores).',
        atividade_principal:
          'Reunião de qualificação com o decisor para validar dor, urgência e orçamento.',
        criterio_saida:
          'Orçamento e decisor confirmados; dor compatível com os serviços Condutiva.',
        prazo_alvo_dias: 10,
        cor: '#14B8A6',
      },
      {
        ordem: 4,
        nome: 'Diagnóstico',
        objetivo: 'Levantar tecnicamente o cenário do cliente e dimensionar o escopo dos serviços.',
        atividade_principal: 'Diagnóstico técnico/assessment conduzido pelo time especializado.',
        criterio_saida: 'Escopo, requisitos e esforço mapeados e validados com o cliente.',
        prazo_alvo_dias: 20,
        cor: '#8B5CF6',
      },
      {
        ordem: 5,
        nome: 'Proposta',
        objetivo: 'Formalizar comercialmente a solução: escopo, prazos, valores e condições.',
        atividade_principal: 'Elaborar e apresentar a proposta técnica e comercial ao cliente.',
        criterio_saida: 'Proposta apresentada e em discussão ativa com o decisor.',
        prazo_alvo_dias: 30,
        cor: '#F59E0B',
      },
      {
        ordem: 6,
        nome: 'Compromisso',
        objetivo: 'Conduzir o fechamento: alinhamento jurídico, negociação final e assinatura.',
        atividade_principal:
          'Negociação final, ajustes de minuta contratual e coleta da assinatura.',
        criterio_saida: 'Contrato assinado ou recusa formal registrada pelo cliente.',
        prazo_alvo_dias: 45,
        cor: '#F97316',
      },
      {
        ordem: 7,
        nome: 'Cliente ativo',
        objetivo: 'Iniciar a entrega dos serviços e garantir a ativação e a satisfação do cliente.',
        atividade_principal: 'Kick-off do projeto, plano de entrega e acompanhamento da operação.',
        criterio_saida: 'Projeto iniciado e cliente em operação assistida pela Condutiva.',
        prazo_alvo_dias: 60,
        cor: '#10B981',
      },
    ]

    for (let i = 0; i < etapasOficiais.length; i++) {
      const e = etapasOficiais[i]
      try {
        app.findFirstRecordByData('etapas_funil', 'nome', e.nome)
      } catch (_) {
        const record = new Record(app.findCollectionByNameOrId('etapas_funil'))
        record.set('ordem', e.ordem)
        record.set('nome', e.nome)
        record.set('objetivo', e.objetivo)
        record.set('atividade_principal', e.atividade_principal)
        record.set('criterio_saida', e.criterio_saida)
        record.set('prazo_alvo_dias', e.prazo_alvo_dias)
        record.set('cor', e.cor)
        app.save(record)
      }
    }

    const etapaIdByNome = {}
    app.findRecordsByFilter('etapas_funil', '', 'ordem', 100, 0).forEach((r) => {
      etapaIdByNome[r.getString('nome')] = r.id
    })

    // ------------------------------------------------------------------
    // 3. deals: novos campos etapa (funil oficial), etapa_anterior e status.
    //    O campo legado "stage" (antiga pipeline_stages) é preservado intacto.
    // ------------------------------------------------------------------
    const etapasColId = app.findCollectionByNameOrId('etapas_funil').id
    const dealsCol = app.findCollectionByNameOrId('deals')
    let dealsMudou = false

    if (!dealsCol.fields.getByName('status')) {
      dealsCol.fields.add(
        new SelectField({
          name: 'status',
          values: ['em andamento', 'ganho', 'perdido'],
          maxSelect: 1,
        }),
      )
      dealsMudou = true
    }
    if (!dealsCol.fields.getByName('etapa')) {
      dealsCol.fields.add(
        new RelationField({ name: 'etapa', collectionId: etapasColId, maxSelect: 1 }),
      )
      dealsMudou = true
    }
    if (!dealsCol.fields.getByName('etapa_anterior')) {
      dealsCol.fields.add(
        new RelationField({ name: 'etapa_anterior', collectionId: etapasColId, maxSelect: 1 }),
      )
      dealsMudou = true
    }
    if (dealsMudou) app.save(dealsCol)

    // ------------------------------------------------------------------
    // 4. Migra os negócios existentes (idempotente — roda limpo em base vazia):
    //    Prospecção→Lead, Qualificação→Qualificado, Proposta→Proposta,
    //    Negociação→Compromisso, Fechado/Ganho→Cliente ativo (status ganho),
    //    Fechado/Perdido→status perdido (a etapa em que parou não consta no modelo antigo)
    // ------------------------------------------------------------------
    const mapaAntigo = {
      Prospecção: 'Lead',
      Qualificação: 'Qualificado',
      Proposta: 'Proposta',
      Negociação: 'Compromisso',
      'Fechado/Ganho': 'Cliente ativo',
      'Fechado/Perdido': '',
    }

    const oldStageNome = {}
    try {
      app.findRecordsByFilter('pipeline_stages', '', '', 1000, 0).forEach((r) => {
        oldStageNome[r.id] = r.getString('name')
      })
    } catch (_) {
      // coleção antiga inexistente (base nova) — nada a mapear
    }

    const deals = app.findRecordsByFilter('deals', '', '-created', 1000000, 0)
    for (let i = 0; i < deals.length; i++) {
      const d = deals[i]
      const etapaAtual = d.getString('etapa')
      const statusAtual = d.getString('status')
      if (etapaAtual !== '' && statusAtual !== '') continue // já migrado

      const nomeAntigo = oldStageNome[d.getString('stage')] || ''
      const novoNome = mapaAntigo[nomeAntigo]

      if (novoNome && etapaIdByNome[novoNome]) {
        d.set('etapa', etapaIdByNome[novoNome])
      }
      if (nomeAntigo === 'Fechado/Ganho') {
        d.set('status', 'ganho')
      } else if (nomeAntigo === 'Fechado/Perdido') {
        d.set('status', 'perdido')
      } else if (statusAtual === '') {
        d.set('status', 'em andamento')
      }
      app.save(d)
    }
  },
  (app) => {
    // Reverte: limpa os novos campos de deals e remove a coleção etapas_funil
    try {
      const deals = app.findRecordsByFilter('deals', '', '', 1000000, 0)
      for (let i = 0; i < deals.length; i++) {
        const d = deals[i]
        d.set('etapa', '')
        d.set('etapa_anterior', '')
        d.set('status', '')
        app.save(d)
      }
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('etapas_funil'))
    } catch (_) {}
  },
)

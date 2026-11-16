migrate(
  (app) => {
    // ------------------------------------------------------------------
    // 1. etapas_funil: campo "criterio_itens" (json) — lista de itens do
    //    critério de saída, um por caixa de confirmação da tela do negócio.
    //    Para a etapa 3 Qualificado são 4 itens (equipamento, dor, decisor,
    //    momento); para as demais, 1 item (o critério inteiro).
    //    O texto completo continua em "criterio_saida" e continua exibido.
    // ------------------------------------------------------------------
    const etapasCol = app.findCollectionByNameOrId('etapas_funil')
    if (!etapasCol.fields.getByName('criterio_itens')) {
      etapasCol.fields.add(new JSONField({ name: 'criterio_itens', maxSize: 2000000 }))
      app.save(etapasCol)
    }

    // Itens por etapa (idempotente: preenche só quem está vazio)
    const itensPorOrdem = {
      1: ['Lead registrado com contato válido e primeiro contato realizado.'],
      2: ['Necessidade inicial identificada e próximo passo agendado com o cliente.'],
      3: [
        'Equipamento/tamanho da oportunidade confirmado',
        'Dor/necessidade compatível com os serviços Condutiva',
        'Decisor identificado e acessível',
        'Momento/timing adequado para avançar',
      ],
      4: ['Escopo, requisitos e esforço mapeados e validados com o cliente.'],
      5: ['Proposta apresentada e em discussão ativa com o decisor.'],
      6: ['Contrato assinado ou recusa formal registrada pelo cliente.'],
      7: ['Projeto iniciado e cliente em operação assistida pela Condutiva.'],
    }

    const etapas = app.findRecordsByFilter('etapas_funil', '', 'ordem', 100, 0)
    for (let i = 0; i < etapas.length; i++) {
      const etapa = etapas[i]
      const ordem = etapa.getInt('ordem')
      const itens = itensPorOrdem[ordem]
      if (!itens) continue
      // idempotente: não sobrescreve itens já gravados
      let atual = []
      try {
        atual = JSON.parse(etapa.getString('criterio_itens') || 'null') ?? []
      } catch (_) {
        atual = []
      }
      if (Array.isArray(atual) && atual.length > 0) continue
      etapa.set('criterio_itens', itens)
      app.save(etapa)
    }

    // ------------------------------------------------------------------
    // 2. deals: checkboxes de critério por item + justificativa do admin
    //    no avanço forçado. Negócios antigos começam desmarcados (vazio).
    //    "criterio_marcados" guarda a lista dos ITENS CONFIRMADOS da etapa
    //    atual (texto do item); ao mudar de etapa, o hook/zera quem move.
    // ------------------------------------------------------------------
    const dealsCol = app.findCollectionByNameOrId('deals')
    let dealsMudou = false
    if (!dealsCol.fields.getByName('criterio_marcados')) {
      dealsCol.fields.add(new JSONField({ name: 'criterio_marcados', maxSize: 2000000 }))
      dealsMudou = true
    }
    if (!dealsCol.fields.getByName('justificativa_avanco')) {
      dealsCol.fields.add(new TextField({ name: 'justificativa_avanco' }))
      dealsMudou = true
    }
    if (dealsMudou) app.save(dealsCol)

    // ------------------------------------------------------------------
    // 3. Coleção historico_negocios: histórico do negócio (avanços,
    //    avanços forçados pelo admin com justificativa, perdas, etc.)
    // ------------------------------------------------------------------
    try {
      app.findCollectionByNameOrId('historico_negocios')
    } catch (_) {
      const historico = new Collection({
        name: 'historico_negocios',
        type: 'base',
        listRule: "@request.auth.id != '' && owner = @request.auth.id",
        viewRule: "@request.auth.id != '' && owner = @request.auth.id",
        createRule: "@request.auth.id != '' && owner = @request.auth.id",
        updateRule: "@request.auth.id != '' && owner = @request.auth.id",
        deleteRule: "@request.auth.id != '' && owner = @request.auth.id",
        fields: [
          {
            name: 'deal',
            type: 'relation',
            required: true,
            collectionId: app.findCollectionByNameOrId('deals').id,
            maxSelect: 1,
            cascadeDelete: true,
          },
          {
            name: 'owner',
            type: 'relation',
            required: false,
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          },
          {
            name: 'tipo',
            type: 'select',
            values: ['avanco', 'avanco_forcado', 'criacao', 'perda', 'ganho', 'outro'],
            maxSelect: 1,
          },
          { name: 'titulo', type: 'text' },
          { name: 'descricao', type: 'text' },
          {
            name: 'etapa_de',
            type: 'relation',
            collectionId: app.findCollectionByNameOrId('etapas_funil').id,
            maxSelect: 1,
          },
          {
            name: 'etapa_para',
            type: 'relation',
            collectionId: app.findCollectionByNameOrId('etapas_funil').id,
            maxSelect: 1,
          },
          { name: 'justificativa', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_historico_negocios_deal ON historico_negocios (deal)',
          'CREATE INDEX idx_historico_negocios_owner ON historico_negocios (owner)',
        ],
      })
      app.save(historico)
    }
  },
  (app) => {
    // Reverte: remove os campos novos e a coleção de histórico.
    try {
      const dealsCol = app.findCollectionByNameOrId('deals')
      ;['criterio_marcados', 'justificativa_avanco'].forEach((f) => {
        const field = dealsCol.fields.getByName(f)
        if (field) dealsCol.fields.removeByName(f)
      })
      app.save(dealsCol)
    } catch (_) {}
    try {
      const etapasCol = app.findCollectionByNameOrId('etapas_funil')
      const field = etapasCol.fields.getByName('criterio_itens')
      if (field) etapasCol.fields.removeByName('criterio_itens')
      app.save(etapasCol)
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('historico_negocios'))
    } catch (_) {}
  },
)

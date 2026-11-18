/// <reference path="../pb_data/types.d.ts" />
// migration 0027 — simplifica o formulário de lead: os valores do contrato
// (valor_mensal / prazo_contrato_meses) passam a ser informados apenas na
// proposta/contrato (tela Contratos). Em troca, o lead ganha os campos de
// localização da empresa:
//   - empresa (texto, opcional) — nome da empresa do lead
//   - cidade  (texto, opcional)
//   - estado  (texto, opcional)
// Campos texto simples (plain text), não obrigatórios. Nenhum dado existente
// é alterado — apenas campos novos são adicionados.
migrate(
  (app) => {
    const deals = app.findCollectionByNameOrId('deals')

    if (!deals.fields.getByName('empresa')) {
      deals.fields.add(new TextField({ name: 'empresa', required: false }))
    }
    if (!deals.fields.getByName('cidade')) {
      deals.fields.add(new TextField({ name: 'cidade', required: false }))
    }
    if (!deals.fields.getByName('estado')) {
      deals.fields.add(new TextField({ name: 'estado', required: false }))
    }
    app.save(deals)
  },
  (app) => {
    // rollback: remove os campos adicionados (texto opcional, sem dados críticos)
    const deals = app.findCollectionByNameOrId('deals')
    const campos = ['empresa', 'cidade', 'estado']
    for (let i = 0; i < campos.length; i++) {
      const f = deals.fields.getByName(campos[i])
      if (f) {
        deals.fields.removeByName(campos[i])
      }
    }
    app.save(deals)
  },
)

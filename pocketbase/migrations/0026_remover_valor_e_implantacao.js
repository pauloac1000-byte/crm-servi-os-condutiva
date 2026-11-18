/// <reference path="../pb_data/types.d.ts" />
// migration 0026 — remove os campos "Valor (R$)" (value) e
// "Valor de Implantação (R$)" (valor_implantacao) do CRM, conforme pedido:
//   - deals: dropa value e valor_implantacao (valor_total passa a ser
//     calculado pelo hook deals_valor_total.pb.js como valor_mensal ×
//     prazo_contrato_meses);
//   - contratos: dropa valor_implantacao (o total do contrato na tela é
//     valor_mensal × prazo).
// Dados nessas colunas podem ser descartados (aprovado pelo usuário).
migrate(
  (app) => {
    const deals = app.findCollectionByNameOrId('deals')
    const fDealsValue = deals.fields.getByName('value')
    if (fDealsValue) {
      deals.fields.removeByName('value')
    }
    const fDealsImpl = deals.fields.getByName('valor_implantacao')
    if (fDealsImpl) {
      deals.fields.removeByName('valor_implantacao')
    }
    app.save(deals)

    const contratos = app.findCollectionByNameOrId('contratos')
    const fContrImpl = contratos.fields.getByName('valor_implantacao')
    if (fContrImpl) {
      contratos.fields.removeByName('valor_implantacao')
    }
    app.save(contratos)
  },
  (app) => {
    // rollback: recria os campos removidos (sem dados — os dados foram descartados)
    const deals = app.findCollectionByNameOrId('deals')
    if (!deals.fields.getByName('value')) {
      deals.fields.add(new NumberField({ name: 'value' }))
    }
    if (!deals.fields.getByName('valor_implantacao')) {
      deals.fields.add(new NumberField({ name: 'valor_implantacao' }))
    }
    app.save(deals)

    const contratos = app.findCollectionByNameOrId('contratos')
    if (!contratos.fields.getByName('valor_implantacao')) {
      contratos.fields.add(new NumberField({ name: 'valor_implantacao' }))
    }
    app.save(contratos)
  },
)

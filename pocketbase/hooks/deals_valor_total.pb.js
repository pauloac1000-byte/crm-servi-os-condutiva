// pb_hooks — valor_total do negócio (coleção "deals").
//
// valor_total = valor mensal × prazo (meses) do CONTRATO vinculado ao negócio
// (contratos.negocio) — os campos de contrato saíram do formulário de lead
// (valor_mensal/prazo_contrato_meses foram removidos do CRM).
//
// Regras:
//   - Calculado SEMPRE no servidor (create + update), coerente com o
//     custo_total das visitas — o cliente não define esse número.
//   - Prazo = diferença data_fim − data_inicio (30,44 dias/mês, arredondada),
//     o mesmo critério do motor de KPIs (src/services/kpis.ts); sem data_fim,
//     12 meses (padrão do funil). Sem contrato vinculado: 0.
//   - Sem contrato vinculado, valor_total = 0 (lead sem proposta fechada).
// ATENÇÃO (JSVM): callbacks não enxergam declarações de topo de arquivo —
// toda a lógica vive inline dentro de cada callback.
// ATENÇÃO: em hooks de registro não existe a global "app" — usar e.app.

onRecordCreate((e) => {
  const record = e.record
  let valorTotal = 0
  try {
    const contratos = e.app.findRecordsByFilter('contratos', 'negocio = {:id}', '-created', 1, 0, {
      id: record.id,
    })
    if (contratos.length > 0) {
      const c = contratos[0]
      const mensal = c.getFloat('valor_mensal')
      const ini = (c.getString('data_inicio') || '').split(' ')[0].split('T')[0]
      const fim = (c.getString('data_fim') || '').split(' ')[0].split('T')[0]
      let prazo = 12
      if (ini && fim) {
        const dias =
          (new Date(fim).getTime() - new Date(ini).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
        prazo = Math.round(dias)
      }
      if (mensal > 0 && prazo > 0) valorTotal = mensal * prazo
    }
  } catch (err) {
    console.log('deals_valor_total: falha ao buscar contrato vinculado: ' + err)
  }
  record.set('valor_total', valorTotal)
  e.next()
}, 'deals')

onRecordUpdate((e) => {
  const record = e.record
  let valorTotal = 0
  try {
    const contratos = e.app.findRecordsByFilter('contratos', 'negocio = {:id}', '-created', 1, 0, {
      id: record.id,
    })
    if (contratos.length > 0) {
      const c = contratos[0]
      const mensal = c.getFloat('valor_mensal')
      const ini = (c.getString('data_inicio') || '').split(' ')[0].split('T')[0]
      const fim = (c.getString('data_fim') || '').split(' ')[0].split('T')[0]
      let prazo = 12
      if (ini && fim) {
        const dias =
          (new Date(fim).getTime() - new Date(ini).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
        prazo = Math.round(dias)
      }
      if (mensal > 0 && prazo > 0) valorTotal = mensal * prazo
    }
  } catch (err) {
    console.log('deals_valor_total: falha ao buscar contrato vinculado: ' + err)
  }
  record.set('valor_total', valorTotal)
  e.next()
}, 'deals')

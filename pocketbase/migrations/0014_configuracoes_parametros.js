// 0014 — coleção "configuracoes": parâmetros globais do sistema, editáveis
// apenas pelo administrador (regras: leitura para qualquer usuário autenticado,
// escrita só para admin — @request.auth.role = "admin").
//
// Um único registro (seed idempotente):
//   - custo_km: custo por km rodado (padrão R$ 2,50) — usado para pré-preencher
//     o valor do combustível no cadastro de visitas.
//   - custo_hora_comercial: custo da hora comercial (padrão R$ 90,00) — usado
//     pelo hook visitas_custo_total.pb.js para somar horas_dedicadas × custo ao
//     custo_total da visita.
// O hook lê estes parâmetros server-side, sem depender das regras de acesso.

migrate(
  (app) => {
    const collection = new Collection({
      name: 'configuracoes',
      type: 'base',
      // Somente admin grava; usuários autenticados leem (o form de visitas
      // precisa do custo_km para o cálculo do combustível).
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      fields: [
        { name: 'custo_km', type: 'number' },
        { name: 'custo_hora_comercial', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)

    // Seed idempotente: cria o registro de parâmetros apenas se não existir.
    const existing = app.findRecordsByFilter('configuracoes', '', '', 1, 0)
    if (existing.length === 0) {
      const record = new Record(collection)
      record.set('custo_km', 2.5)
      record.set('custo_hora_comercial', 90.0)
      app.save(record)
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('configuracoes')
    app.delete(collection)
  },
)

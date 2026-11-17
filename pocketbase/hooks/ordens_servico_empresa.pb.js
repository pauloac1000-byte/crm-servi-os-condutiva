// pb_hooks — campo "empresa" da ordem de serviço.
//
// Mantém o nome da empresa do cliente (unidade atendida) sempre coerente com o
// contato vinculado: se a OS veio sem "empresa" (registros antigos ou payload
// sem o campo), deriva do campo "company" do contato; se veio preenchida,
// preserva (o usuário escolheu a empresa no modal).
// Roda no servidor em toda criação e edição. Em hooks de registro o banco é
// acessado via e.app (nunca "app") e TODO caminho termina com e.next() —
// sem e.next() o PocketBase pula a gravação e responde 200.
// ATENÇÃO (JSVM): callbacks não enxergam declarações de topo de arquivo —
// toda a lógica vive inline dentro de cada callback.

onRecordCreate((e) => {
  const record = e.record
  if (!record.getString('empresa')) {
    try {
      const contato = e.app.findRecordById('contacts', record.getString('cliente'))
      record.set('empresa', (contato.getString('company') || '').trim())
    } catch (_) {
      // contato inexistente/sem acesso: deixa a empresa como veio
    }
  }
  e.next()
}, 'ordens_servico')

onRecordUpdate((e) => {
  const record = e.record
  if (!record.getString('empresa')) {
    try {
      const contato = e.app.findRecordById('contacts', record.getString('cliente'))
      record.set('empresa', (contato.getString('company') || '').trim())
    } catch (_) {
      // contato inexistente/sem acesso: deixa a empresa como veio
    }
  }
  e.next()
}, 'ordens_servico')

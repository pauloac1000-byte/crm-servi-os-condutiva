// pb_hooks — coleção "metas": somente administrador grava.
// As regras da coleção já exigem @request.auth.role = 'admin' para
// create/update/delete; este hook é uma segunda barreira no servidor para que
// usuário comum não consiga gravar metas chamando a API.
// Regras do projeto: em hooks de registro o banco é acessado via e.app
// (nunca "app") e TODO caminho de sucesso termina com e.next() — bloqueio
// termina em throw, nunca em return silencioso.

onRecordCreate((e) => {
  if (!e.auth || e.auth.getString('role') !== 'admin') {
    throw new ForbiddenError('Apenas o administrador pode definir metas.')
  }
  e.next()
}, 'metas')

onRecordUpdate((e) => {
  if (!e.auth || e.auth.getString('role') !== 'admin') {
    throw new ForbiddenError('Apenas o administrador pode alterar metas.')
  }
  e.next()
}, 'metas')

onRecordDelete((e) => {
  if (!e.auth || e.auth.getString('role') !== 'admin') {
    throw new ForbiddenError('Apenas o administrador pode excluir metas.')
  }
  e.next()
}, 'metas')

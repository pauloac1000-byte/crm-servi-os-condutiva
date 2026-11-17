// pb_hooks — coleção "metas": somente administrador grava.
// Usa os ganchos de *Request* (onRecordCreateRequest/UpdateRequest/DeleteRequest),
// que rodam no ciclo da requisição HTTP e têm acesso à sessão do chamador
// (e.auth). Os ganchos de banco (onRecordCreate/Update/Delete) NÃO têm
// e.auth — por isso a checagem anterior bloqueava até o admin (403).
// As regras da coleção já exigem @request.auth.role = 'admin' para
// create/update/delete; este hook é uma segunda barreira no servidor para que
// usuário comum não consiga gravar metas chamando a API.
// Regras do projeto: em hooks de registro o banco é acessado via e.app
// (nunca "app") e TODO caminho de sucesso termina com e.next() — bloqueio
// termina em throw, nunca em return silencioso.

onRecordCreateRequest((e) => {
  if (!e.auth || e.auth.getString('role') !== 'admin') {
    throw new ForbiddenError('Apenas o administrador pode definir metas.')
  }
  e.next()
}, 'metas')

onRecordUpdateRequest((e) => {
  if (!e.auth || e.auth.getString('role') !== 'admin') {
    throw new ForbiddenError('Apenas o administrador pode alterar metas.')
  }
  e.next()
}, 'metas')

onRecordDeleteRequest((e) => {
  if (!e.auth || e.auth.getString('role') !== 'admin') {
    throw new ForbiddenError('Apenas o administrador pode excluir metas.')
  }
  e.next()
}, 'metas')

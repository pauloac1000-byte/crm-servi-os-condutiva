// pb_hooks — exclusão com dependências e barreiras de papel (admin).
//
// A tela de Negócios só expõe o botão "Excluir" ao administrador (useAuth),
// mas nada impede um usuário comum de chamar a API diretamente. Este hook
// garante que APENAS o admin exclua negócios, contatos e usuários, e que a
// exclusão do admin NÃO falhe por causa de registros dependentes:
//   - negócio → apaga atividades, visitas, ordens de serviço, histórico,
//     contratos (e os movimentos de receita de cada contrato) antes do delete;
//   - contato → apaga ordens de serviço (cliente obrigatório), visitas e
//     negócios vinculados (recursivamente, com suas dependências);
//   - usuário → desvincula (NULL) registros que apontam para ele.
// Também reafirma que metas são gravadas apenas pelo admin (regra que já
// existia em metas_rules.pb.js, absorvida aqui).
//
// Regras do projeto: em hooks de registro o banco é acessado via e.app (nunca
// a global "app") e TODO caminho de sucesso termina com e.next() — bloqueio
// termina em throw, nunca em return silencioso. O superusuário (painel do
// PocketBase) não passa por aqui (e.auth vazio) e continua com poder total.
// ATENÇÃO (JSVM): callbacks não enxergam declarações de topo de arquivo —
// toda a lógica vive inline dentro de cada callback.

onRecordDeleteRequest(
  (e) => {
    // --- barreira de papel: apenas o admin exclui estes cadastros ---
    var isAdmin = false
    if (e.auth) {
      try {
        var userRec = e.app.findRecordById('users', e.auth.id)
        isAdmin = userRec.getString('role') === 'admin'
      } catch (_) {
        isAdmin = false
      }
    }
    if (!isAdmin) {
      throw new ForbiddenError('Apenas o administrador pode excluir este cadastro.')
    }

    // --- exclusão em cascata para não falhar com dependências obrigatórias ---
    var colecoesDependentesDeDeal = [
      { nome: 'activities', campo: 'deal' },
      { nome: 'visitas_comerciais', campo: 'negocio' },
      { nome: 'ordens_servico', campo: 'negocio' },
      { nome: 'historico_negocios', campo: 'deal' },
    ]
    var colecoesDependentesDeContato = [
      { nome: 'visitas_comerciais', campo: 'contato' },
      { nome: 'ordens_servico', campo: 'cliente' },
    ]

    var apagarContrato = function (contratoId) {
      var movimentos = e.app.findRecordsByFilter(
        'movimentos_receita',
        "contrato = '" + contratoId + "'",
      )
      for (var m = 0; m < movimentos.length; m++) {
        e.app.delete(movimentos[m])
      }
      e.app.delete(e.app.findRecordById('contratos', contratoId))
    }

    var apagarNegocio = function (dealId) {
      for (var c = 0; c < colecoesDependentesDeDeal.length; c++) {
        var dep = colecoesDependentesDeDeal[c]
        var registros = e.app.findRecordsByFilter(dep.nome, dep.campo + " = '" + dealId + "'")
        for (var i = 0; i < registros.length; i++) {
          e.app.delete(registros[i])
        }
      }
      var contratos = e.app.findRecordsByFilter('contratos', "negocio = '" + dealId + "'")
      for (var k = 0; k < contratos.length; k++) {
        apagarContrato(contratos[k].getString('id'))
      }
      e.app.delete(e.app.findRecordById('deals', dealId))
    }

    var apagarContato = function (contatoId) {
      for (var c = 0; c < colecoesDependentesDeContato.length; c++) {
        var dep = colecoesDependentesDeContato[c]
        var registros = e.app.findRecordsByFilter(dep.nome, dep.campo + " = '" + contatoId + "'")
        for (var i = 0; i < registros.length; i++) {
          e.app.delete(registros[i])
        }
      }
      // Negócios do contato: usa a mesma rotina do negócio (atividades, visitas,
      // OS, histórico, contratos + movimentos) para não deixar órfãos.
      var negocios = e.app.findRecordsByFilter('deals', "contact = '" + contatoId + "'")
      for (var k = 0; k < negocios.length; k++) {
        apagarNegocio(negocios[k].getString('id'))
      }
      e.app.delete(e.app.findRecordById('contacts', contatoId))
    }

    var desvincularUsuario = function (userId) {
      var alvos = [
        { nome: 'contacts', campo: 'owner' },
        { nome: 'deals', campo: 'owner' },
        { nome: 'activities', campo: 'owner' },
        { nome: 'historico_negocios', campo: 'owner' },
        { nome: 'visitas_comerciais', campo: 'responsavel' },
        { nome: 'contratos', campo: 'responsavel' },
        { nome: 'movimentos_receita', campo: 'responsavel' },
        { nome: 'ordens_servico', campo: 'responsavel_tecnico' },
        { nome: 'deals', campo: 'etapa_desde_usuario' },
      ]
      for (var t = 0; t < alvos.length; t++) {
        var alvo = alvos[t]
        var registros = e.app.findRecordsByFilter(alvo.nome, alvo.campo + " = '" + userId + "'")
        for (var i = 0; i < registros.length; i++) {
          var rec = registros[i]
          rec.set(alvo.campo, '')
          e.app.save(rec)
        }
      }
    }

    if (e.collection.name === 'deals') {
      apagarNegocio(e.record.id)
    } else if (e.collection.name === 'contacts') {
      apagarContato(e.record.id)
    } else if (e.collection.name === 'users') {
      desvincularUsuario(e.record.id)
    }
    // Depois da exclusão em cascata o registro original já não existe — o
    // request de delete termina aqui, sem e.next() (apagar de novo um registro
    // já removido devolveria 404 e estragaria a resposta).
  },
  'deals',
  'contacts',
  'users',
)

// metas: apenas o admin grava (regra que já existia; barreira no servidor).
onRecordCreateRequest((e) => {
  var isAdmin = false
  if (e.auth) {
    try {
      var userRec = e.app.findRecordById('users', e.auth.id)
      isAdmin = userRec.getString('role') === 'admin'
    } catch (_) {
      isAdmin = false
    }
  }
  if (!isAdmin) {
    throw new ForbiddenError('Apenas o administrador pode definir metas.')
  }
  e.next()
}, 'metas')

onRecordUpdateRequest((e) => {
  var isAdmin = false
  if (e.auth) {
    try {
      var userRec = e.app.findRecordById('users', e.auth.id)
      isAdmin = userRec.getString('role') === 'admin'
    } catch (_) {
      isAdmin = false
    }
  }
  if (!isAdmin) {
    throw new ForbiddenError('Apenas o administrador pode alterar metas.')
  }
  e.next()
}, 'metas')

onRecordDeleteRequest((e) => {
  var isAdmin = false
  if (e.auth) {
    try {
      var userRec = e.app.findRecordById('users', e.auth.id)
      isAdmin = userRec.getString('role') === 'admin'
    } catch (_) {
      isAdmin = false
    }
  }
  if (!isAdmin) {
    throw new ForbiddenError('Apenas o administrador pode excluir metas.')
  }
  e.next()
}, 'metas')

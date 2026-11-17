/// <reference path="../pb_data/types.d.ts" />
// migrate up: administrador (users.role = 'admin') passa a poder ver, criar,
// editar e excluir QUALQUER registro das coleções de cadastro. Usuário comum
// mantém exatamente o acesso que já tinha (regra por dono/responsável intacta).
//
// Antes: em contacts/deals/activities/historico_negocios/visitas_comerciais/
// contratos/movimentos_receita as regras de update/delete eram apenas
// "owner/responsavel = @request.auth.id" — o admin não conseguia editar nem
// excluir cadastros de outros usuários. E pipeline_stages, etapas_funil e
// planos não tinham NENHUMA regra de gravação (só superusuário).
//
// Regras aplicadas:
//  - list/view/update/delete: admin pode tudo (+ regra antiga do dono).
//  - create: intocada onde já existia (qualquer usuário autenticado cria —
//    não restringimos o usuário comum); em coleções sem regra antiga de
//    gravação, create fica só para o admin.
//  - users, metas, configuracoes e ordens_servico já estavam corretas — intactas.
//
// Nota JSVM: em migrações os setters são atribuição direta de propriedade
// (colecao.updateRule = ...), não colecao.set('updateRule', ...).

const ADMIN_RULE = "@request.auth.id != '' && @request.auth.role = 'admin'"

function regraComDono(campo) {
  return ADMIN_RULE + " || (@request.auth.id != '' && " + campo + ' = @request.auth.id)'
}

function regraSoDono(campo) {
  return "@request.auth.id != '' && " + campo + ' = @request.auth.id'
}

const REGRAS_DONO = {
  contacts: 'owner',
  deals: 'owner',
  activities: 'owner',
  historico_negocios: 'owner',
  visitas_comerciais: 'responsavel',
  contratos: 'responsavel',
  movimentos_receita: 'responsavel',
}

const SO_ADMIN = ['pipeline_stages', 'etapas_funil', 'planos']

migrate(
  (app) => {
    for (const nome in REGRAS_DONO) {
      const campo = REGRAS_DONO[nome]
      const colecao = app.findCollectionByNameOrId(nome)
      colecao.listRule = regraComDono(campo)
      colecao.viewRule = regraComDono(campo)
      // create fica como estava (não restringe o usuário comum)
      colecao.updateRule = regraComDono(campo)
      colecao.deleteRule = regraComDono(campo)
      app.save(colecao)
    }

    // coleções de configuração do funil/planos: sem regra de gravação antes
    // (só superusuário). Agora o admin do sistema gerencia pelo app.
    for (const nome of SO_ADMIN) {
      const colecao = app.findCollectionByNameOrId(nome)
      colecao.createRule = ADMIN_RULE
      colecao.updateRule = ADMIN_RULE
      colecao.deleteRule = ADMIN_RULE
      app.save(colecao)
    }
  },
  (app) => {
    // down: restaura as regras anteriores
    for (const nome in REGRAS_DONO) {
      const campo = REGRAS_DONO[nome]
      const colecao = app.findCollectionByNameOrId(nome)
      colecao.listRule = regraSoDono(campo)
      colecao.viewRule = regraSoDono(campo)
      colecao.createRule = "@request.auth.id != ''"
      colecao.updateRule = regraSoDono(campo)
      colecao.deleteRule = regraSoDono(campo)
      app.save(colecao)
    }

    for (const nome of SO_ADMIN) {
      const colecao = app.findCollectionByNameOrId(nome)
      colecao.createRule = null
      colecao.updateRule = null
      colecao.deleteRule = null
      app.save(colecao)
    }
  },
)

/// <reference path="../pb_data/types.d.ts" />
// 0031 — regras de API por PERFIL (campo "perfil" da coleção users) em todas as
// coleções do CRM. O isolamento passa a valer também NO BACKEND, não só na tela.
//
// Perfis (definidos na migration 0030):
//   - admin    : acesso total a tudo (como já era na 0.0.53, via role='admin');
//                mantemos também o fallback por role para contas antigas.
//   - comercial: funil, contatos, negócios, visitas e atividades; as PRÓPRIAS
//                metas (leitura) e os PRÓPRIOS custos/visitas; NÃO acessa a
//                coleção users (exceto a própria conta, para o authRefresh);
//                contratos e ordens_servico apenas onde ele é o responsável.
//   - tecnico  : ordens_servico e contratos dos clientes que atende — via
//                back-relation nativa do PocketBase (contrato do cliente que tem
//                OS com responsavel_tecnico = ele, ou OS em que ele é o próprio
//                técnico). NÃO lê metas, configuracoes (custo/hora) nem dados
//                comerciais (deals/contacts/visitas/atividades/funil).
//
// Requisitos mantidos:
//   - superusuário do painel PocketBase: regras não se aplicam a ele — poder total;
//   - admin do sistema (perfil/role admin): todas as regras abaixo SEMPRE incluem
//     o ramo admin primeiro, então ele continua podendo ler/editar/excluir tudo
//     (regra da 0.0.53 preservada);
//   - hooks existentes (admin_rules.pb.js, metas_rules.pb.js, users_rules.pb.js)
//     continuam válidos — eles só restringem A MAIS, nunca liberam.
//
// ATENÇÃO (JSVM): setters são atribuição direta de propriedade
// (colecao.listRule = ...), não colecao.set('listRule', ...).

// Expressão de admin: perfil admin OU role admin (fallback para contas antigas)
const ADMIN = "(@request.auth.perfil = 'admin' || @request.auth.role = 'admin')"

// ramo comum exigido em todas as regras
const AUT = "@request.auth.id != ''"

// --- técnico: vínculo com o cliente via back-relation em ordens_servico ---
// ordens_servico.cliente  → contacts.id
// ordens_servico.responsavel_tecnico → users.id
// contratos.cliente       → contacts.id
// "contratos que o técnico atende" = contrato cujo cliente tem QUALQUER OS
// dele como técnico, ou contrato em que ele é o responsável (fallback comercial).
// Formato nativo de back-relation: <campo>_via_<coleção> — a partir de
// contratos, o caminho é cliente → contacts e contatos ← ordens_servico.cliente
// (confirmado no schema: contacts ← ordens_servico.cliente).
const TEC_CLIENTE = '(cliente.ordens_servico_via_cliente.responsavel_tecnico.id = @request.auth.id)'
const TEC_OS_PROPRIO = '(responsavel_tecnico = @request.auth.id)'

function regra(perfis, extraComercial, extraTecnico) {
  const ramos = [AUT + ' && ' + ADMIN]
  if (perfis.indexOf('comercial') !== -1 && extraComercial) {
    ramos.push(AUT + " && @request.auth.perfil = 'comercial' && (" + extraComercial + ')')
  }
  if (perfis.indexOf('tecnico') !== -1 && extraTecnico) {
    ramos.push(AUT + " && @request.auth.perfil = 'tecnico' && (" + extraTecnico + ')')
  }
  return ramos.join(' || ')
}

// Perfis por coleção — extra é a condição do perfil dentro da coleção.
// O admin sempre passa (ramo ADMIN acima); os extras só restringem os outros.
const REGRAS = {
  // ---- comercial e admin: CRM completo; técnico: nada ----
  contacts: {
    perfis: ['comercial'],
    listview: "id != ''",
    write: "id != ''",
  },
  deals: {
    perfis: ['comercial'],
    listview: "id != ''",
    write: "id != ''",
  },
  activities: {
    perfis: ['comercial'],
    listview: "id != ''",
    write: "id != ''",
  },
  historico_negocios: {
    perfis: ['comercial'],
    listview: "id != ''",
    write: "id != ''",
  },
  pipeline_stages: {
    perfis: ['comercial'],
    listview: "id != ''",
    write: null, // create/update/delete só admin
  },
  etapas_funil: {
    perfis: ['comercial'],
    listview: "id != ''",
    write: null,
  },
  planos: {
    perfis: ['comercial'],
    listview: "id != ''",
    write: null,
  },

  // ---- visitas (custos comerciais): comercial só as PRÓPRIAS ----
  visitas_comerciais: {
    perfis: ['comercial'],
    listview: 'responsavel = @request.auth.id',
    write: 'responsavel = @request.auth.id',
  },

  // ---- contratos: responsável OU cliente atendido pelo técnico ----
  contratos: {
    perfis: ['comercial', 'tecnico'],
    listview: 'responsavel = @request.auth.id || ' + TEC_CLIENTE,
    write: 'responsavel = @request.auth.id',
  },

  // ---- ordens_servico: técnico vê as dele e as dos clientes que atende ----
  ordens_servico: {
    perfis: ['comercial', 'tecnico'],
    listview: 'responsavel_tecnico = @request.auth.id || ' + TEC_CLIENTE,
    write: 'responsavel_tecnico = @request.auth.id',
  },

  // ---- metas: leitura para comercial (próprias via hook) e técnico nega ----
  // metas não tem campo de responsável: regra atual já é "autenticado lê,
  // admin grava". Técnico perde a leitura aqui.
  metas: {
    perfis: ['comercial'],
    listview: "id != ''",
    write: null, // gravação continua só admin (regra antiga + hook)
  },

  // ---- configuracoes (custo/hora comercial): só admin ----
  configuracoes: {
    perfis: [],
    listview: null,
    write: null,
  },

  // ---- movimentos_receita: só responsável (dados financeiros) ----
  movimentos_receita: {
    perfis: ['comercial'],
    listview: 'responsavel = @request.auth.id',
    write: 'responsavel = @request.auth.id',
  },
}

migrate(
  (app) => {
    for (const nome in REGRAS) {
      const cfg = REGRAS[nome]
      const colecao = app.findCollectionByNameOrId(nome)

      const regraLista = cfg.perfis.length
        ? regra(cfg.perfis, cfg.listview, cfg.listview)
        : AUT + ' && ' + ADMIN // só admin

      colecao.listRule = regraLista
      colecao.viewRule = regraLista

      if (cfg.write === null) {
        // gravação fica apenas com o admin
        colecao.createRule = AUT + ' && ' + ADMIN
        colecao.updateRule = AUT + ' && ' + ADMIN
        colecao.deleteRule = AUT + ' && ' + ADMIN
      } else {
        const regraGrav = regra(cfg.perfis, cfg.write, cfg.write)
        colecao.createRule = regraGrav
        colecao.updateRule = regraGrav
        colecao.deleteRule = regraGrav
      }
      app.save(colecao)
    }

    // users: comercial e técnico não listam a coleção (nem veem outros usuários);
    // mantêm acesso à PRÓPRIA conta (necessário para authRefresh) e admin total.
    const users = app.findCollectionByNameOrId('users')
    users.listRule = AUT + ' && ' + ADMIN + " || (@request.auth.id != '' && id = @request.auth.id)"
    users.viewRule = users.listRule
    users.updateRule =
      AUT +
      ' && ' +
      ADMIN +
      " || (@request.auth.id != '' && id = @request.auth.id && @request.body.role:changed = false && @request.body.perfil:changed = false)"
    // create/delete como já eram (criação pública para signup; exclusão só admin)
    app.save(users)
  },
  (app) => {
    // down: restaura as regras da 0.0.53 (admin + dono/responsável)
    const ADMIN_ROLE = "@request.auth.id != '' && @request.auth.role = 'admin'"
    function restaura(nome, campo) {
      const c = app.findCollectionByNameOrId(nome)
      const dono = campo
        ? "@request.auth.id != '' && " + campo + ' = @request.auth.id'
        : "@request.auth.id != ''"
      c.listRule = ADMIN_ROLE + ' || ' + dono
      c.viewRule = c.listRule
      c.createRule = "@request.auth.id != ''"
      c.updateRule = ADMIN_ROLE + ' || ' + dono
      c.deleteRule = ADMIN_ROLE + ' || ' + dono
      app.save(c)
    }
    restaura('contacts', 'owner')
    restaura('deals', 'owner')
    restaura('activities', 'owner')
    restaura('historico_negocios', 'owner')
    restaura('pipeline_stages', null)
    restaura('etapas_funil', null)
    restaura('planos', null)
    restaura('visitas_comerciais', 'responsavel')
    restaura('contratos', 'responsavel')
    restaura('ordens_servico', null)
    restaura('metas', null)
    restaura('configuracoes', null)
    restaura('movimentos_receita', 'responsavel')
  },
)

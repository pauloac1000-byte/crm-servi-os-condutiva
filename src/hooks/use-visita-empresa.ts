import { useState, useMemo, useCallback } from 'react'
import { Contact, Deal } from '@/types/crm'

// Chave/rótulo de uma localidade (cidade + estado) de um contato
export const chaveLocalidade = (cidade?: string, estado?: string) =>
  `${(cidade || '').trim()}|${(estado || '').trim()}`

export const rotuloLocalidade = (cidade?: string, estado?: string) =>
  [cidade, estado].filter(Boolean).join(' - ')

// Valor do select de localidade que representa "todas as localidades"
export const CHAVE_TODAS = '__todas__'

type SetValoresFn = (updater: (prev: any) => any) => void

interface UseVisitaEmpresaParams {
  contacts: Contact[]
  deals: Deal[]
  contatoId: string
  negocioId: string
  /** setter do estado geral do formulário do modal */
  setValores: SetValoresFn
}

/**
 * Lógica do fluxo Empresa → Localidade (cidade/estado) → Contato no modal de
 * visitas. Empresas = valores distintos do campo "company" dos contatos;
 * localidades = pares cidade/estado distintos entre os contatos da empresa;
 * contatos = apenas os da empresa (e da localidade escolhida, quando houver).
 */
export function useVisitaEmpresa({
  contacts,
  deals,
  contatoId,
  negocioId,
  setValores,
}: UseVisitaEmpresaParams) {
  const [empresa, setEmpresa] = useState('')
  const [localidade, setLocalidade] = useState('')

  // Empresas distintas a partir dos contatos; mantém a empresa já gravada na
  // visita mesmo que nenhum contato a tenha mais.
  const empresasDisponiveis = useMemo(() => {
    const unicas = new Set(contacts.map((c) => (c.company || '').trim()).filter(Boolean))
    if (empresa) unicas.add(empresa)
    return Array.from(unicas).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [contacts, empresa])

  const contatosDaEmpresa = useMemo(
    () => (empresa ? contacts.filter((c) => (c.company || '').trim() === empresa) : []),
    [contacts, empresa],
  )

  // Localidades (cidade + estado) distintas entre os contatos da empresa
  const localidadesDaEmpresa = useMemo(() => {
    const mapa = new Map<string, { cidade: string; estado: string }>()
    contatosDaEmpresa.forEach((c) => {
      const cidade = (c.cidade || '').trim()
      const estado = (c.estado || '').trim()
      if (!cidade && !estado) return
      const chave = chaveLocalidade(cidade, estado)
      if (!mapa.has(chave)) mapa.set(chave, { cidade, estado })
    })
    return Array.from(mapa.values()).sort((a, b) =>
      rotuloLocalidade(a.cidade, a.estado).localeCompare(
        rotuloLocalidade(b.cidade, b.estado),
        'pt-BR',
      ),
    )
  }, [contatosDaEmpresa])

  // Com uma única localidade, ela já vale por si (select nem aparece)
  const localidadeEfetiva =
    localidadesDaEmpresa.length === 1
      ? chaveLocalidade(localidadesDaEmpresa[0].cidade, localidadesDaEmpresa[0].estado)
      : localidade

  const contatosFiltrados = useMemo(() => {
    if (!localidadeEfetiva) return contatosDaEmpresa
    const [cidade, estado] = localidadeEfetiva.split('|')
    return contatosDaEmpresa.filter(
      (c) => (c.cidade || '').trim() === cidade && (c.estado || '').trim() === estado,
    )
  }, [contatosDaEmpresa, localidadeEfetiva])

  // Sem empresa escolhida: não lista contatos — exceto o contato já gravado na
  // visita (edição de visitas antigas sem empresa), para não perdê-lo.
  const contatosParaLista = useMemo(() => {
    if (empresa) return contatosFiltrados
    if (contatoId) return contacts.filter((c) => c.id === contatoId)
    return []
  }, [empresa, contatosFiltrados, contatoId, contacts])

  // Negócios filtrados pela empresa selecionada (pelo contato do negócio);
  // o negócio já gravado na visita entra sempre, para não sumir na edição.
  const negociosFiltrados = useMemo(() => {
    if (!empresa) return deals
    const daEmpresa = deals.filter((d) => (d.expand?.contact?.company || '').trim() === empresa)
    if (negocioId && !daEmpresa.some((d) => d.id === negocioId)) {
      const atual = deals.find((d) => d.id === negocioId)
      if (atual) return [...daEmpresa, atual]
    }
    return daEmpresa
  }, [deals, empresa, negocioId])

  /** Repõe empresa/localidade ao abrir o modal (edição) — não limpa contato. */
  const resetEmpresa = useCallback(
    (novaEmpresa: string, novoContatoId: string) => {
      setEmpresa(novaEmpresa)
      const c = contacts.find((x) => x.id === novoContatoId)
      const localidadeDoContato =
        c && (c.company || '').trim() === novaEmpresa ? chaveLocalidade(c.cidade, c.estado) : ''
      // Só fixa a localidade se a empresa tiver mais de uma (senão a única
      // já é implícita e o select nem é mostrado)
      const multiplas =
        new Set(
          contacts
            .filter((x) => (x.company || '').trim() === novaEmpresa)
            .map((x) => chaveLocalidade(x.cidade, x.estado))
            .filter((k) => k !== '|'),
        ).size > 1
      setLocalidade(multiplas ? localidadeDoContato : '')
    },
    [contacts],
  )

  /** Usuário escolheu uma empresa: limpa contato e negócio de outra empresa. */
  const selecionarEmpresa = useCallback(
    (novaEmpresa: string) => {
      setEmpresa(novaEmpresa)
      setLocalidade('')
      setValores((v) => {
        const negocio = deals.find((d) => d.id === v.negocioId)
        const negocioMesmaEmpresa =
          !!negocio && (negocio.expand?.contact?.company || '').trim() === novaEmpresa
        return {
          ...v,
          contatoId: '',
          negocioId: negocioMesmaEmpresa ? v.negocioId : '',
        }
      })
    },
    [deals, setValores],
  )

  /** Usuário escolheu uma localidade: limpa contato de outra localidade. */
  const selecionarLocalidade = useCallback(
    (chave: string) => {
      const efetiva = chave === CHAVE_TODAS ? '' : chave
      setLocalidade(efetiva)
      if (!efetiva) return
      const [cidade, estado] = efetiva.split('|')
      setValores((v) => {
        const c = contacts.find((x) => x.id === v.contatoId)
        if (!c) return v
        const mesma = (c.cidade || '').trim() === cidade && (c.estado || '').trim() === estado
        return mesma ? v : { ...v, contatoId: '' }
      })
    },
    [contacts, setValores],
  )

  return {
    empresa,
    empresasDisponiveis,
    localidadesDaEmpresa,
    localidade,
    contatosParaLista,
    negociosFiltrados,
    resetEmpresa,
    selecionarEmpresa,
    selecionarLocalidade,
  }
}

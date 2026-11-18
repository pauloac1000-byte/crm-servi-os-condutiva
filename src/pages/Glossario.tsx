import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import type { EtapaFunil } from '@/types/crm'
import { INDICADORES, ROTULO_GRUPO, type IndicadorDoc } from '@/lib/glossario-indicadores'
import { Info, Layers } from 'lucide-react'

// Página "Glossário de indicadores": documentação dentro do sistema de como
// cada indicador é calculado (fórmula, fonte dos dados, meta e leitura) e das
// 7 etapas do funil com seus critérios de saída. O conteúdo dos indicadores
// vem do módulo compartilhado src/lib/glossario-indicadores.ts (o mesmo usado
// pelo ícone de informação dos cartões de KPI); as etapas vêm da coleção
// etapas_funil do Skip Cloud — sem dados de exemplo.

const ORDEM_GRUPOS: IndicadorDoc['grupo'][] = ['kpis', 'custo', 'receita', 'metas']

export default function Glossario() {
  const [etapas, setEtapas] = useState<EtapaFunil[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let vivo = true
    pb.collection('etapas_funil')
      .getFullList<EtapaFunil>({ sort: 'ordem' })
      .then((r) => {
        if (vivo) setEtapas(r)
      })
      .catch(() => {
        if (vivo) setEtapas([])
      })
      .finally(() => {
        if (vivo) setCarregando(false)
      })
    return () => {
      vivo = false
    }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Glossário de indicadores</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-3xl">
          Como cada indicador do CRM é calculado: fórmula, fonte dos dados, meta e leitura. As
          mesmas explicações estão disponíveis no ícone{' '}
          <Info className="inline h-3 w-3 -mt-0.5" aria-hidden="true" /> dos cartões de KPI do
          Dashboard.
        </p>
      </div>

      {ORDEM_GRUPOS.map((grupo) => {
        const itens = INDICADORES.filter((i) => i.grupo === grupo)
        if (itens.length === 0) return null
        return (
          <section key={grupo} className="space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {ROTULO_GRUPO[grupo]}
            </h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {itens.map((i) => (
                <article
                  key={i.chave}
                  className="border border-slate-200/80 bg-white shadow-sm rounded-2xl p-5 space-y-3"
                >
                  <h3 className="text-sm font-bold text-slate-900">{i.nome}</h3>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Fórmula
                    </p>
                    <p className="text-[13px] text-slate-700 leading-relaxed">{i.fórmula}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Fonte dos dados
                    </p>
                    <p className="text-[13px] text-slate-700 leading-relaxed">{i.fonte}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Meta
                    </p>
                    <p className="text-[13px] text-slate-700 leading-relaxed">{i.meta}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Leitura do indicador
                    </p>
                    <p className="text-[13px] text-slate-700 leading-relaxed">{i.leitura}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )
      })}

      {/* Etapas do funil: dados reais da coleção etapas_funil */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <Layers className="h-4 w-4" aria-hidden="true" />
          Etapas do funil e critérios de saída
        </h2>
        {carregando ? (
          <p className="text-sm text-slate-400">Carregando etapas…</p>
        ) : etapas.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma etapa cadastrada em etapas_funil.</p>
        ) : (
          <ol className="space-y-3">
            {etapas.map((e) => (
              <li
                key={e.id}
                className="border border-slate-200/80 bg-white shadow-sm rounded-2xl p-5"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: e.cor || '#64748b' }}
                    aria-hidden="true"
                  >
                    {e.ordem}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{e.nome}</h3>
                  {e.prazo_alvo_dias ? (
                    <span className="ml-auto text-[11px] font-semibold text-slate-400">
                      prazo alvo: {e.prazo_alvo_dias} dias
                    </span>
                  ) : null}
                </div>
                {e.objetivo ? (
                  <p className="mt-2 text-[13px] text-slate-600 leading-relaxed">{e.objetivo}</p>
                ) : null}
                {e.atividade_principal ? (
                  <p className="mt-1 text-[13px] text-slate-500 leading-relaxed">
                    <span className="font-semibold text-slate-600">Atividade: </span>
                    {e.atividade_principal}
                  </p>
                ) : null}
                <div className="mt-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Critério de saída
                  </p>
                  {(e.criterio_itens && e.criterio_itens.length > 0) || e.criterio_saida ? (
                    <ul className="mt-1 space-y-1">
                      {(e.criterio_itens && e.criterio_itens.length > 0
                        ? e.criterio_itens
                        : [e.criterio_saida]
                      )
                        .filter((c): c is string => !!c)
                        .map((c, idx) => (
                          <li
                            key={idx}
                            className="text-[13px] text-slate-700 leading-relaxed flex gap-2"
                          >
                            <span className="text-teal-600 font-bold" aria-hidden="true">
                              •
                            </span>
                            <span>{c}</span>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-[13px] text-slate-400">
                      Nenhum critério cadastrado para esta etapa.
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

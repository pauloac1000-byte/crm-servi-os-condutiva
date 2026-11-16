import pb from '@/lib/pocketbase/client'
import { EtapaFunil, Deal } from '@/types/crm'

// Lê as etapas oficiais da coleção "etapas_funil" no Skip Cloud,
// ordenadas pelo campo "ordem" — nada de lista hardcoded na interface.
export async function getPipelineStages(): Promise<EtapaFunil[]> {
  const records = await pb.collection('etapas_funil').getFullList<EtapaFunil>({
    sort: 'ordem',
  })
  return records as unknown as EtapaFunil[]
}

export async function getStagesWithDeals(): Promise<Record<string, Deal[]>> {
  const stages = await getPipelineStages()
  const deals = await pb.collection('deals').getFullList<Deal>({
    filter: "status='em andamento'",
    expand: 'contact,etapa,etapa_anterior',
  })
  const grouped: Record<string, Deal[]> = {}
  stages.forEach((stage) => {
    grouped[stage.id] = deals.filter((d) => d.etapa === stage.id)
  })
  return grouped
}

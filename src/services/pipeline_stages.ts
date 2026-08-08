import pb from '@/lib/pocketbase/client'
import { PipelineStage } from '@/types/crm'

export const getPipelineStages = async (): Promise<PipelineStage[]> => {
  return pb.collection('pipeline_stages').getFullList<PipelineStage>({ sort: 'order' })
}

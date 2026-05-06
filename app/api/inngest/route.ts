import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import {
  refreshAllGithubMetrics,
  prepareWeeklyDigest,
  sendWeeklyDigest,
} from '@/lib/inngest/functions'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [refreshAllGithubMetrics, prepareWeeklyDigest, sendWeeklyDigest],
})

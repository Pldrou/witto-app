import { inngest } from './client'
import { db } from '@/db'
import { projects } from '@/db/schema'
import { isNotNull } from 'drizzle-orm'
import { refreshProjectMetrics } from '@/lib/metrics/refresh'

export const refreshAllGithubMetrics = inngest.createFunction(
  {
    id: 'refresh-all-github-metrics',
    triggers: { cron: '0 * * * *' }, // top of every hour
  },
  async ({ step }) => {
    const repos = await step.run('list-projects', async () => {
      return db
        .select({ id: projects.id })
        .from(projects)
        .where(isNotNull(projects.githubRepo))
    })

    for (const p of repos) {
      await step.run(`refresh-${p.id}`, async () => {
        return refreshProjectMetrics(p.id)
      })
    }

    return { count: repos.length }
  }
)

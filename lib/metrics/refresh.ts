import { db } from '@/db'
import { projects, metricSnapshots } from '@/db/schema'
import { fetchGithubRepoData } from '@/lib/integrations/github'
import { fetchStripeRevenue } from '@/lib/integrations/stripe'
import { eq } from 'drizzle-orm'

export async function refreshProjectMetrics(projectId: string) {
  const [project] = await db
    .select().from(projects).where(eq(projects.id, projectId)).limit(1)
  if (!project) return { skipped: 'not-found' as const }

  const now = new Date()
  const rows: typeof metricSnapshots.$inferInsert[] = []

  if (project.githubRepo) {
    const data = await fetchGithubRepoData(project.githubRepo)
    rows.push({
      projectId: project.id, metric: 'github_stars',
      value: String(data.stars), capturedAt: now,
    })
    if (data.lastCommitAt) {
      rows.push({
        projectId: project.id, metric: 'github_last_commit_at',
        value: String(data.lastCommitAt.getTime()), capturedAt: now,
      })
    }
  }

  if (project.stripeSecretKey) {
    try {
      const revenue = await fetchStripeRevenue(project.stripeSecretKey)
      rows.push({
        projectId: project.id, metric: 'stripe_revenue_30d_cents',
        value: String(revenue.cents30d), capturedAt: now,
      })
      if (revenue.currency && revenue.currency !== project.currency) {
        await db.update(projects)
          .set({ currency: revenue.currency })
          .where(eq(projects.id, project.id))
      }
    } catch (err) {
      console.error(`Stripe fetch failed for project ${project.id}:`, err)
      // continue — bad Stripe key shouldn't kill GitHub refresh
    }
  }

  if (rows.length === 0) return { skipped: 'no-providers' as const }
  await db.insert(metricSnapshots).values(rows)
  return { refreshed: project.id, count: rows.length }
}

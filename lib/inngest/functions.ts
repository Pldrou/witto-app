import { inngest } from './client'
import { db } from '@/db'
import { users, projects, metricSnapshots } from '@/db/schema'
import { and, eq, lte, desc, isNotNull } from 'drizzle-orm'
import { refreshProjectMetrics } from '@/lib/metrics/refresh'
import { Resend } from 'resend'
import { DigestEmail, type DigestProject } from '@/lib/email/digest'

const resend = new Resend(process.env.RESEND_API_KEY)

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

export const prepareWeeklyDigest = inngest.createFunction(
  {
    id: 'prepare-weekly-digest',
    triggers: { cron: 'TZ=Europe/Nicosia 0 19 * * 0' }, // Sunday 7pm
  },
  async ({ step }) => {
    const allUsers = await step.run('list-users', async () =>
      db.select().from(users)
    )

    if (allUsers.length === 0) return { queued: 0 }

    await step.sendEvent(
      'fanout-digests',
      allUsers.map((u) => ({
        name: 'digest/send',
        data: { userId: u.id, email: u.email },
      }))
    )

    return { queued: allUsers.length }
  }
)

export const sendWeeklyDigest = inngest.createFunction(
  {
    id: 'send-weekly-digest',
    triggers: { event: 'digest/send' },
  },
  async ({ event, step }) => {
    const { userId, email } = event.data as { userId: string; email: string }

    const userProjects = await step.run('list-projects', async () =>
      db.select().from(projects).where(eq(projects.userId, userId))
    )

    if (userProjects.length === 0) return { skipped: 'no-projects' }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const enriched: DigestProject[] = await step.run('build-digest', async () => {
      return Promise.all(
        userProjects.map(async (p) => {
          const [latestStars] = await db
            .select()
            .from(metricSnapshots)
            .where(and(eq(metricSnapshots.projectId, p.id), eq(metricSnapshots.metric, 'github_stars')))
            .orderBy(desc(metricSnapshots.capturedAt))
            .limit(1)

          const [pastStars] = await db
            .select()
            .from(metricSnapshots)
            .where(
              and(
                eq(metricSnapshots.projectId, p.id),
                eq(metricSnapshots.metric, 'github_stars'),
                lte(metricSnapshots.capturedAt, weekAgo)
              )
            )
            .orderBy(desc(metricSnapshots.capturedAt))
            .limit(1)

          const [lastCommit] = await db
            .select()
            .from(metricSnapshots)
            .where(and(eq(metricSnapshots.projectId, p.id), eq(metricSnapshots.metric, 'github_last_commit_at')))
            .orderBy(desc(metricSnapshots.capturedAt))
            .limit(1)

          const stars = latestStars ? Number(latestStars.value) : null
          const past = pastStars ? Number(pastStars.value) : null
          const starsDelta = stars !== null && past !== null ? stars - past : null
          const daysSinceLastCommit = lastCommit
            ? Math.floor((Date.now() - Number(lastCommit.value)) / (1000 * 60 * 60 * 24))
            : null

          return { name: p.name, url: p.url, stars, starsDelta, daysSinceLastCommit }
        })
      )
    })

    await step.run('send-email', async () => {
      await resend.emails.send({
        from: 'Witto <hello@witto.co>', // change to digest@witto.co after domain verify
        to: email,
        subject: `Witto weekly — ${enriched.length} project${enriched.length === 1 ? '' : 's'}`,
        react: DigestEmail({ data: { weekStarting: weekAgo, projects: enriched } }),
      })
    })

    return { sent: email }
  }
)

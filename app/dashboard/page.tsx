import { db } from '@/db'
import { projects, metricSnapshots } from '@/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { getOrCreateUser } from '@/lib/auth'
import { createProject, refreshProject } from './actions'

async function getLatestMetric(projectId: string, metric: string) {
  const [row] = await db
    .select()
    .from(metricSnapshots)
    .where(and(eq(metricSnapshots.projectId, projectId), eq(metricSnapshots.metric, metric)))
    .orderBy(desc(metricSnapshots.capturedAt))
    .limit(1)
  return row
}

function daysAgo(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
}

function commitText(days: number | null): string | null {
  if (days === null) return null
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

function syncedAgo(date: Date): string {
  const m = Math.floor((Date.now() - date.getTime()) / (1000 * 60))
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default async function DashboardPage() {
  const user = await getOrCreateUser()
  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.id))
    .orderBy(desc(projects.createdAt))

  const enriched = await Promise.all(
    userProjects.map(async (p) => {
      const [stars, lastCommit] = await Promise.all([
        getLatestMetric(p.id, 'github_stars'),
        getLatestMetric(p.id, 'github_last_commit_at'),
      ])
      const starsNum = stars ? Number(stars.value) : null
      const days = lastCommit ? daysAgo(new Date(Number(lastCommit.value))) : null
      const sync =
        [stars?.capturedAt, lastCommit?.capturedAt]
          .filter((d): d is Date => Boolean(d))
          .sort((a, b) => b.getTime() - a.getTime())[0] ?? null
      return { ...p, starsNum, days, sync }
    }),
  )

  const totalStars = enriched.reduce((s, p) => s + (p.starsNum ?? 0), 0)
  const active = enriched.filter((p) => p.days !== null && p.days <= 14).length
  const stale = enriched.filter((p) => p.days !== null && p.days > 14).length
  const lastSync = enriched
    .map((p) => p.sync)
    .filter((d): d is Date => Boolean(d))
    .sort((a, b) => b.getTime() - a.getTime())[0]

  const now = new Date()
  const dateLabel = `${now.toLocaleDateString('en-US', { weekday: 'long' })} · ${now.toLocaleDateString(
    'en-US',
    { month: 'long', day: 'numeric' },
  )}`

  return (
    <main className="px-8">
      <section className="mx-auto" style={{ maxWidth: 1200, paddingTop: 96, paddingBottom: 160 }}>
        <div className="flex items-end justify-between mb-4">
          <div>
            <div
              className="mono text-[12px] tracking-[0.16em] uppercase mb-6"
              style={{ color: 'var(--text-3)' }}
            >
              {dateLabel}
            </div>
            <h1
              className="tighter font-semibold"
              style={{ fontSize: 64, lineHeight: 1, letterSpacing: '-0.045em' }}
            >
              Your projects.
            </h1>
          </div>

          <div className="flex items-end gap-12 pb-2">
            <SummaryStat label="In flight" value={enriched.length} />
            <SummaryStat label="Active" value={active} />
            <SummaryStat label="Stars total" value={totalStars} />
            <SummaryStat label="Stale" value={stale} tone={stale > 0 ? 'red' : 'neutral'} />
          </div>
        </div>

        <div style={{ height: 64 }} />

        <div className="mb-16">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-medium" style={{ fontSize: 18, letterSpacing: '-0.018em' }}>
              Add a project
            </h2>
            <span className="mono text-[12px]" style={{ color: 'var(--text-4)' }}>
              Optional fields can be filled later
            </span>
          </div>
          <form action={createProject} className="card p-6">
            <div className="grid grid-cols-12 gap-3 items-center">
              <input
                name="name"
                placeholder="Project name"
                required
                className="field col-span-3 px-4 h-[42px] text-[14px]"
              />
              <input
                name="url"
                placeholder="https://yourproject.com"
                className="field col-span-4 px-4 h-[42px] text-[14px]"
              />
              <input
                name="githubRepo"
                placeholder="owner/repo"
                className="field mono col-span-3 px-4 h-[42px] text-[13px]"
              />
              <button
                type="submit"
                className="btn-secondary col-span-2 h-[42px] text-[13.5px] whitespace-nowrap"
              >
                Add project
              </button>
            </div>
          </form>
        </div>

        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-medium" style={{ fontSize: 18, letterSpacing: '-0.018em' }}>
            Portfolio
          </h2>
          <span className="mono text-[12px] num" style={{ color: 'var(--text-4)' }}>
            {String(enriched.length).padStart(2, '0')} projects
            {lastSync && ` · last sync ${syncedAgo(lastSync)}`}
          </span>
        </div>

        {enriched.length === 0 ? (
          <div className="card p-12 text-center" style={{ color: 'var(--text-3)' }}>
            No projects yet. Add one above.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {enriched.map((p) => {
              const isSparse = !p.url && !p.githubRepo
              const isStale = p.days !== null && p.days > 14
              const text = commitText(p.days)
              return (
                <article key={p.id} className="card px-7 py-6">
                  <div className="flex items-start justify-between gap-8">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3
                          className="font-semibold tight"
                          style={{ fontSize: 19, letterSpacing: '-0.024em' }}
                        >
                          {p.name}
                        </h3>
                        {isSparse && (
                          <span
                            className="mono text-[10.5px] tracking-[0.14em] uppercase px-2 py-0.5 rounded-full"
                            style={{
                              color: 'var(--text-3)',
                              background: '#1a1a1f',
                              border: '1px solid #20202a',
                            }}
                          >
                            Draft
                          </span>
                        )}
                      </div>
                      <div
                        className="flex items-center gap-5 text-[13.5px]"
                        style={{ color: 'var(--text-3)' }}
                      >
                        {p.url ? (
                          <a
                            href={p.url}
                            className="hover:text-white transition-colors"
                            style={{ color: 'var(--text-2)' }}
                          >
                            {p.url.replace(/^https?:\/\//, '')}
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-4)' }}>— no link yet</span>
                        )}
                        <span style={{ color: 'var(--text-4)' }}>·</span>
                        {p.githubRepo ? (
                          <span className="mono text-[12.5px]" style={{ color: 'var(--text-3)' }}>
                            github.com/{p.githubRepo}
                          </span>
                        ) : (
                          <span className="mono text-[12.5px]" style={{ color: 'var(--text-4)' }}>
                            — no repo connected
                          </span>
                        )}
                      </div>
                    </div>

                    {!isSparse && (
                      <div className="flex items-center gap-10 pt-1">
                        <div className="flex flex-col items-end">
                          <div
                            className="mono text-[10.5px] tracking-[0.18em] uppercase mb-1.5"
                            style={{ color: 'var(--text-4)' }}
                          >
                            Stars
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span
                              className="num font-semibold tight"
                              style={{
                                fontSize: 24,
                                letterSpacing: '-0.03em',
                                color: 'var(--text)',
                              }}
                            >
                              {p.starsNum ?? '—'}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end" style={{ minWidth: 132 }}>
                          <div
                            className="mono text-[10.5px] tracking-[0.18em] uppercase mb-1.5"
                            style={{ color: 'var(--text-4)' }}
                          >
                            Last commit
                          </div>
                          <div
                            className="num font-semibold tight"
                            style={{
                              fontSize: 24,
                              letterSpacing: '-0.03em',
                              color: isStale ? 'var(--red-soft)' : 'var(--text)',
                            }}
                          >
                            {text ?? '—'}
                          </div>
                          {isStale && (
                            <div className="text-[11px] mt-0.5" style={{ color: 'var(--red)' }}>
                              going quiet
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col items-end gap-2">
                      {p.githubRepo ? (
                        <form action={refreshProject.bind(null, p.id)}>
                          <button
                            type="submit"
                            className="btn-ghost px-3 h-[30px] text-[12.5px] flex items-center gap-1.5"
                            style={{ border: '1px solid #1f1f24' }}
                          >
                            <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                              <path
                                d="M14 8a6 6 0 1 1-1.76-4.24M14 3v3.5h-3.5"
                                stroke="currentColor"
                                strokeWidth="1.4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Refresh
                          </button>
                        </form>
                      ) : (
                        <button
                          className="btn-ghost px-3 h-[30px] text-[12.5px]"
                          style={{ border: '1px solid #1f1f24' }}
                        >
                          Finish setup
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}

function SummaryStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: number
  tone?: 'neutral' | 'red' | 'green'
}) {
  const color =
    tone === 'red' ? 'var(--red-soft)' : tone === 'green' ? 'var(--green-soft)' : 'var(--text)'
  return (
    <div className="flex flex-col items-end">
      <div
        className="mono text-[11px] tracking-[0.16em] uppercase mb-2"
        style={{ color: 'var(--text-4)' }}
      >
        {label}
      </div>
      <div
        className="num font-semibold tighter"
        style={{ fontSize: 32, lineHeight: 1, color, letterSpacing: '-0.04em' }}
      >
        {value}
      </div>
    </div>
  )
}

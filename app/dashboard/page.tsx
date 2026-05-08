import { db } from '@/db'
import { projects, milestones, metricSnapshots } from '@/db/schema'
import { eq, desc, and, asc, sql } from 'drizzle-orm'
import { getOrCreateUser } from '@/lib/auth'
import {
  createProject,
  refreshProject,
  addMilestone,
  toggleMilestone,
  removeMilestone,
} from './actions'

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

type MilestoneRow = {
  id: string
  label: string
  position: number
  completedAt: Date | null
}

export default async function DashboardPage() {
  const user = await getOrCreateUser()
  const userProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      url: projects.url,
      githubRepo: projects.githubRepo,
      currency: projects.currency,
      createdAt: projects.createdAt,
      hasStripe: sql<boolean>`${projects.stripeSecretKey} IS NOT NULL`,
    })
    .from(projects)
    .where(eq(projects.userId, user.id))
    .orderBy(desc(projects.createdAt))

  const enriched = await Promise.all(
    userProjects.map(async (p) => {
      const [stars, lastCommit, revenue, projectMilestones] = await Promise.all([
        getLatestMetric(p.id, 'github_stars'),
        getLatestMetric(p.id, 'github_last_commit_at'),
        getLatestMetric(p.id, 'stripe_revenue_30d_cents'),
        db
          .select({
            id: milestones.id,
            label: milestones.label,
            position: milestones.position,
            completedAt: milestones.completedAt,
          })
          .from(milestones)
          .where(eq(milestones.projectId, p.id))
          .orderBy(asc(milestones.position)),
      ])
      const starsNum = stars ? Number(stars.value) : null
      const days = lastCommit ? daysAgo(new Date(Number(lastCommit.value))) : null
      const revenueCents = revenue ? Number(revenue.value) : null
      const sync =
        [stars?.capturedAt, lastCommit?.capturedAt, revenue?.capturedAt]
          .filter((d): d is Date => Boolean(d))
          .sort((a, b) => b.getTime() - a.getTime())[0] ?? null
      return {
        ...p,
        starsNum,
        days,
        revenueCents,
        sync,
        milestones: projectMilestones as MilestoneRow[],
      }
    }),
  )

  const now = new Date()
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const inMotion = enriched.filter((p) => {
    if (p.createdAt && p.createdAt > fourteenDaysAgo) return true
    return p.milestones.some(
      (m) => m.completedAt && m.completedAt > fourteenDaysAgo,
    )
  }).length

  const hitThisWeek = enriched.reduce((sum, p) => {
    return (
      sum +
      p.milestones.filter((m) => m.completedAt && m.completedAt > sevenDaysAgo).length
    )
  }, 0)

  const lastSync = enriched
    .map((p) => p.sync)
    .filter((d): d is Date => Boolean(d))
    .sort((a, b) => b.getTime() - a.getTime())[0]

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
              What you&apos;re making.
            </h1>
          </div>

          <div className="flex items-end gap-12 pb-2">
            <SummaryStat label="In motion" value={inMotion} />
            <SummaryStat label="Hit this week" value={hitThisWeek} tone={hitThisWeek > 0 ? 'green' : 'neutral'} />
            <SummaryStat label="Projects" value={enriched.length} />
          </div>
        </div>

        <div style={{ height: 64 }} />

        <div className="mb-16">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-medium" style={{ fontSize: 18, letterSpacing: '-0.018em' }}>
              Start something
            </h2>
            <span className="mono text-[12px]" style={{ color: 'var(--text-4)' }}>
              Only the name is required
            </span>
          </div>
          <form action={createProject} className="card p-6">
            <div className="grid grid-cols-12 gap-3 items-start">
              <input
                name="name"
                placeholder="Project name"
                required
                className="field col-span-4 px-4 h-[42px] text-[14px]"
              />
              <input
                name="url"
                placeholder="https://yourproject.com"
                className="field col-span-4 px-4 h-[42px] text-[14px]"
              />
              <input
                name="githubRepo"
                placeholder="owner/repo (optional)"
                className="field mono col-span-4 px-4 h-[42px] text-[13px]"
              />
              <textarea
                name="milestones"
                placeholder={'First few milestones, one per line\ne.g.\nidea sketch\ndomain bought\nlanding live'}
                rows={4}
                className="field col-span-10 px-4 py-3 text-[14px] resize-none"
                style={{ lineHeight: 1.45 }}
              />
              <div className="col-span-2 flex flex-col gap-3">
                <input
                  name="stripeSecretKey"
                  type="password"
                  placeholder="Stripe key"
                  className="field mono px-4 h-[42px] text-[12.5px]"
                />
                <button
                  type="submit"
                  className="btn-secondary h-[42px] text-[13.5px] whitespace-nowrap"
                >
                  Add project
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-medium" style={{ fontSize: 18, letterSpacing: '-0.018em' }}>
            In flight
          </h2>
          <span className="mono text-[12px] num" style={{ color: 'var(--text-4)' }}>
            {String(enriched.length).padStart(2, '0')} projects
            {lastSync && ` · last sync ${syncedAgo(lastSync)}`}
          </span>
        </div>

        {enriched.length === 0 ? (
          <div className="card p-12 text-center" style={{ color: 'var(--text-3)' }}>
            Nothing here yet. The first one is the hardest — add it above.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {enriched.map((p) => {
              const total = p.milestones.length
              const done = p.milestones.filter((m) => m.completedAt).length
              const hasFuel =
                p.starsNum !== null || p.days !== null || p.revenueCents !== null
              const fmt = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: p.currency || 'usd',
                maximumFractionDigits: 0,
              })
              return (
                <article key={p.id} className="card px-7 py-6">
                  <div className="flex items-start justify-between gap-8 mb-5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1.5">
                        <h3
                          className="font-semibold tight"
                          style={{ fontSize: 19, letterSpacing: '-0.024em' }}
                        >
                          {p.name}
                        </h3>
                        {total === 0 && (
                          <span
                            className="mono text-[10.5px] tracking-[0.14em] uppercase px-2 py-0.5 rounded-full"
                            style={{
                              color: 'var(--text-3)',
                              background: '#1a1a1f',
                              border: '1px solid #20202a',
                            }}
                          >
                            Just started
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
                        {p.githubRepo && (
                          <>
                            <span style={{ color: 'var(--text-4)' }}>·</span>
                            <span className="mono text-[12.5px]" style={{ color: 'var(--text-3)' }}>
                              github.com/{p.githubRepo}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pt-1">
                      {total > 0 && <ProgressBadge done={done} total={total} />}
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
                      ) : null}
                    </div>
                  </div>

                  <Milestones projectId={p.id} list={p.milestones} />

                  {hasFuel && (
                    <div
                      className="flex items-center gap-6 mt-6 pt-5 text-[12.5px] mono"
                      style={{ borderTop: '1px solid #1c1c21', color: 'var(--text-4)' }}
                    >
                      {p.starsNum !== null && (
                        <span>
                          <span style={{ color: 'var(--text-3)' }} className="num">
                            {p.starsNum}
                          </span>
                          <span> stars</span>
                        </span>
                      )}
                      {p.days !== null && (
                        <span>
                          last commit · <span style={{ color: 'var(--text-3)' }}>{commitText(p.days)}</span>
                        </span>
                      )}
                      {p.revenueCents !== null && (
                        <span>
                          <span style={{ color: 'var(--text-3)' }} className="num">
                            {fmt.format(p.revenueCents / 100)}
                          </span>
                          <span> · 30d</span>
                        </span>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}

function ProgressBadge({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  const isComplete = done === total && total > 0
  return (
    <div className="flex flex-col items-end" style={{ minWidth: 110 }}>
      <div
        className="mono text-[10.5px] tracking-[0.18em] uppercase mb-1.5"
        style={{ color: 'var(--text-4)' }}
      >
        {isComplete ? 'Finished' : 'Progress'}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className="num font-semibold tight"
          style={{
            fontSize: 22,
            letterSpacing: '-0.03em',
            color: isComplete ? 'var(--green-soft)' : 'var(--text)',
          }}
        >
          {done}
        </span>
        <span style={{ fontSize: 14, color: 'var(--text-4)' }} className="num">
          / {total}
        </span>
        <span
          className="mono text-[11px] ml-2 num"
          style={{ color: isComplete ? 'var(--green)' : 'var(--text-4)' }}
        >
          {pct}%
        </span>
      </div>
    </div>
  )
}

function Milestones({ projectId, list }: { projectId: string; list: MilestoneRow[] }) {
  if (list.length === 0) {
    return (
      <div className="rounded-xl px-4 py-4" style={{ background: '#101013', border: '1px solid #1a1a1f' }}>
        <div className="text-[13px] mb-3" style={{ color: 'var(--text-3)' }}>
          What's the first thing? A milestone you'd be proud to tick off.
        </div>
        <AddMilestoneForm projectId={projectId} placeholder="e.g. domain bought" />
      </div>
    )
  }
  return (
    <div className="space-y-1">
      {list.map((m) => (
        <MilestoneRowItem key={m.id} milestone={m} />
      ))}
      <div className="pt-2">
        <AddMilestoneForm projectId={projectId} placeholder="add another milestone" subtle />
      </div>
    </div>
  )
}

function MilestoneRowItem({ milestone }: { milestone: MilestoneRow }) {
  const done = !!milestone.completedAt
  return (
    <div
      className="group flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-lg hover:bg-[#131318] transition-colors"
    >
      <form action={toggleMilestone.bind(null, milestone.id)} className="flex">
        <button
          type="submit"
          aria-label={done ? 'Mark incomplete' : 'Mark complete'}
          className="flex items-center justify-center"
          style={{
            width: 18,
            height: 18,
            borderRadius: 999,
            border: done ? '1px solid var(--green-soft)' : '1px solid #2a2a31',
            background: done ? 'var(--green-soft)' : 'transparent',
            transition: 'background 0.15s ease, border-color 0.15s ease',
          }}
        >
          {done && (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path
                d="M2.5 6.2l2.3 2.3 4.7-5"
                stroke="#0a0a0c"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </form>
      <span
        className="text-[14px] flex-1"
        style={{
          color: done ? 'var(--text-3)' : 'var(--text)',
          textDecoration: done ? 'line-through' : 'none',
          textDecorationColor: 'var(--text-4)',
        }}
      >
        {milestone.label}
      </span>
      <form
        action={removeMilestone.bind(null, milestone.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <button
          type="submit"
          aria-label="Remove milestone"
          className="text-[15px] leading-none px-2 py-1 rounded"
          style={{ color: 'var(--text-4)' }}
        >
          ×
        </button>
      </form>
    </div>
  )
}

function AddMilestoneForm({
  projectId,
  placeholder,
  subtle = false,
}: {
  projectId: string
  placeholder: string
  subtle?: boolean
}) {
  return (
    <form action={addMilestone.bind(null, projectId)} className="flex items-center gap-2">
      <input
        name="label"
        placeholder={placeholder}
        autoComplete="off"
        maxLength={80}
        required
        className={`field flex-1 px-3 ${subtle ? 'h-[34px] text-[13px]' : 'h-[38px] text-[14px]'}`}
        style={subtle ? { background: 'transparent', border: '1px dashed #20202a' } : undefined}
      />
      <button
        type="submit"
        className={`btn-secondary px-3 ${subtle ? 'h-[34px] text-[12.5px]' : 'h-[38px] text-[13px]'}`}
      >
        Add
      </button>
    </form>
  )
}

function SummaryStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: number
  tone?: 'neutral' | 'green'
}) {
  const color = tone === 'green' ? 'var(--green-soft)' : 'var(--text)'
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

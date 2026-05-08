import { Show } from '@clerk/nextjs'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="px-8">
      <section
        className="mx-auto flex flex-col items-center text-center"
        style={{ maxWidth: 920, paddingTop: 168, paddingBottom: 200 }}
      >
        <div
          className="mono text-[12px] tracking-[0.18em] uppercase mb-10"
          style={{ color: 'var(--text-3)' }}
        >
          For the projects you actually started
        </div>

        <h1
          className="tighter font-semibold"
          style={{
            fontSize: 88,
            lineHeight: 0.96,
            letterSpacing: '-0.052em',
            color: 'var(--text)',
            textWrap: 'balance',
          }}
        >
          Finish what you<br />started.
        </h1>

        <p
          className="mt-8"
          style={{
            fontSize: 22,
            lineHeight: 1.42,
            color: 'var(--text-2)',
            maxWidth: 640,
            fontWeight: 400,
            letterSpacing: '-0.014em',
            textWrap: 'pretty',
          }}
        >
          A quiet home for the half-dozen things you have in flight. Break each one into
          a few small milestones, tick them off, watch the progress fill in. The opposite
          of a productivity app.
        </p>

        <div className="mt-12 flex items-center gap-4">
          <Show when="signed-out">
            <Link
              href="/sign-in"
              className="btn-primary px-6 h-[46px] text-[15px] inline-flex items-center"
            >
              Start tracking
            </Link>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="btn-primary px-6 h-[46px] text-[15px] inline-flex items-center"
            >
              Open your dashboard
            </Link>
          </Show>
          <button className="btn-ghost px-4 h-[46px] text-[15px]" style={{ color: 'var(--text-2)' }}>
            See a sample &nbsp;→
          </button>
        </div>

        <div className="mt-10 mono text-[12px]" style={{ color: 'var(--text-4)' }}>
          Free while in beta · No card · No streaks to break
        </div>
      </section>

      <section className="mx-auto" style={{ maxWidth: 1080, paddingBottom: 160 }}>
        <div className="hairline-divider mb-24" />
        <div className="grid grid-cols-3 gap-16">
          <FeatureCol
            kicker="01"
            title="Milestones you actually tick."
            body="Five small wins beat one finish line. Break each project into the next handful of milestones — domain bought, landing live, first signup — and tick them as you get there."
          />
          <FeatureCol
            kicker="02"
            title="A gentle weekly check-in."
            body="Every Monday, what you moved this week. No streaks, no red bars, no guilt about the project you didn't open. Optional, off by default."
          />
          <FeatureCol
            kicker="03"
            title="Private by design."
            body="No public profile, no leaderboard, no follower count. Witto is for you and the work — not for performance, not for anyone watching."
          />
        </div>
      </section>
    </main>
  )
}

function FeatureCol({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  return (
    <div>
      <div
        className="mono text-[11px] tracking-[0.2em] mb-5"
        style={{ color: 'var(--text-4)' }}
      >
        {kicker}
      </div>
      <h3
        className="font-medium mb-3"
        style={{
          fontSize: 22,
          lineHeight: 1.2,
          letterSpacing: '-0.022em',
          color: 'var(--text)',
        }}
      >
        {title}
      </h3>
      <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--text-2)' }}>{body}</p>
    </div>
  )
}

import { Show, SignInButton } from '@clerk/nextjs'
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
          A private dashboard · for people who ship
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
          Track every project<br />you ship.
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
          Witto is your private dashboard for the half-dozen things you have in flight.
          Stars, traffic, revenue — one screen, weekly digest, no ceremony.
        </p>

        <div className="mt-12 flex items-center gap-4">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="btn-primary px-6 h-[46px] text-[15px]">
                Sign in to your dashboard
              </button>
            </SignInButton>
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
          Free while in beta · No card · Built by indie hackers
        </div>
      </section>

      <section className="mx-auto" style={{ maxWidth: 1080, paddingBottom: 160 }}>
        <div className="hairline-divider mb-24" />
        <div className="grid grid-cols-3 gap-16">
          <FeatureCol
            kicker="01"
            title="One screen for the whole portfolio."
            body="Five, ten, fifteen projects — each one a card. Stars, last commit, revenue when you connect it. Glance, then move on."
          />
          <FeatureCol
            kicker="02"
            title="A weekly digest in your inbox."
            body="Every Monday, what moved and what went quiet. The kind of email you actually open. Optional, off by default."
          />
          <FeatureCol
            kicker="03"
            title="Yours. Private by design."
            body="No public profile, no leaderboard, no follower count. Witto is for you and the work — not for performance."
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

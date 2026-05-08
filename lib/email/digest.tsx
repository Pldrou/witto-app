import {
  Html, Body, Container, Heading, Text, Section, Hr,
} from '@react-email/components'

export type DigestProject = {
  name: string
  url: string | null
  stars: number | null
  starsDelta: number | null
  daysSinceLastCommit: number | null
  revenueCents30d: number | null
  revenueDeltaCents: number | null  // vs 7 days ago
  currency: string
}

export type DigestData = {
  weekStarting: Date
  projects: DigestProject[]
}

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (currency || 'usd').toUpperCase(),
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function DigestEmail({ data }: { data: DigestData }) {
  return (
    <Html>
      <Body style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#fafafa' }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
          <Heading>Witto weekly</Heading>
          <Text style={{ color: '#666' }}>
            Week of {data.weekStarting.toLocaleDateString()}
          </Text>
          <Hr />
          {data.projects.length === 0 ? (
            <Text>No projects to report on. Add some at witto.co/dashboard.</Text>
          ) : (
            data.projects.map((p) => (
              <Section key={p.name} style={{ marginBottom: 24 }}>
                <Heading as="h3">{p.name}</Heading>
                {p.url && <Text style={{ color: '#666', margin: 0 }}>{p.url}</Text>}
                {p.stars !== null && (
                  <Text>
                    ⭐ {p.stars}
                    {p.starsDelta !== null && p.starsDelta !== 0 && (
                      <> ({p.starsDelta > 0 ? '+' : ''}{p.starsDelta} this week)</>
                    )}
                  </Text>
                )}
                {p.revenueCents30d !== null && (
                  <Text>
                    {formatCurrency(p.revenueCents30d, p.currency)} this month
                    {p.revenueDeltaCents !== null && p.revenueDeltaCents !== 0 && (
                      <span style={{ color: p.revenueDeltaCents > 0 ? '#3a8a5c' : '#b91c1c' }}>
                        {' '}({p.revenueDeltaCents > 0 ? '+' : ''}{formatCurrency(p.revenueDeltaCents, p.currency)} vs last week)
                      </span>
                    )}
                  </Text>
                )}
                {p.daysSinceLastCommit !== null && (
                  <Text style={p.daysSinceLastCommit > 14 ? { color: '#b91c1c' } : undefined}>
                    {p.daysSinceLastCommit === 0
                      ? 'Last commit today'
                      : p.daysSinceLastCommit === 1
                      ? 'Last commit yesterday'
                      : `Last commit ${p.daysSinceLastCommit} days ago`}
                    {p.daysSinceLastCommit > 14 && ' — getting stale'}
                  </Text>
                )}
              </Section>
            ))
          )}
          <Hr />
          <Text style={{ color: '#999', fontSize: 12 }}>
            Sent by Witto. View your dashboard at witto.co/dashboard.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

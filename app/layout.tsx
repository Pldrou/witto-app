import type { Metadata } from 'next'
import { ClerkProvider, Show } from '@clerk/nextjs'
import { UserMenu } from '@/components/user-menu'
import { Inter_Tight, JetBrains_Mono, Geist } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const interTight = Inter_Tight({
  variable: '--font-inter-tight',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const jetBrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'Witto',
  description: 'Finish what you started. A quiet home for the projects you have in flight.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className={`${interTight.variable} ${jetBrainsMono.variable} antialiased`}>
        <ClerkProvider>
          <header className="header-blur sticky top-0 z-40">
            <div className="mx-auto" style={{ maxWidth: 1200 }}>
              <div className="flex items-center justify-between h-[60px] px-8">
                <Link href="/" className="flex items-center gap-2 group" aria-label="Witto home">
                  <span className="text-[18px] font-semibold tighter" style={{ color: 'var(--text)' }}>
                    witto
                  </span>
                </Link>

                <nav className="flex items-center gap-5 text-[14px]">
                  <Show when="signed-out">
                    <a href="#" className="btn-ghost px-3 py-1.5" style={{ color: 'var(--text-2)' }}>Changelog</a>
                    <a href="#" className="btn-ghost px-3 py-1.5" style={{ color: 'var(--text-2)' }}>Pricing</a>
                    <Link href="/sign-in" className="btn-ghost px-3 py-1.5" style={{ color: 'var(--text)' }}>
                      Sign in
                    </Link>
                  </Show>
                  <Show when="signed-in">
                    <Link href="/dashboard" className="btn-ghost px-3 py-1.5" style={{ color: 'var(--text)' }}>
                      Dashboard
                    </Link>
                    <UserMenu />
                  </Show>
                </nav>
              </div>
            </div>
          </header>

          {children}

          <footer className="px-8 pb-12 pt-8">
            <div
              className="mx-auto flex items-center justify-between text-[12px] mono"
              style={{ maxWidth: 1200, color: 'var(--text-4)' }}
            >
              <div>witto · v0.4.2</div>
              <div className="flex gap-6">
                <a href="#" className="hover:text-white">Changelog</a>
                <a href="#" className="hover:text-white">Privacy</a>
                <a href="#" className="hover:text-white">Contact</a>
              </div>
            </div>
          </footer>
        </ClerkProvider>
      </body>
    </html>
  )
}

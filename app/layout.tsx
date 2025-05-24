import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'kmla',
  description: 'A simple analysis tool for Keyboard Maestro usage logs on macro usage, keyboard activity, and time patterns.',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

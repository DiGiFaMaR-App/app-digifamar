import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

/** DiGiFaMaR brand palette (mirrors src/styles.css design tokens). */
export const COLORS = {
  forest: '#0F2C1A',
  forestHover: '#163F25',
  sage: '#9AB79E',
  terracotta: '#B4552F',
  mist: '#F5F7F3',
  ink: '#0B1410',
  muted: '#5A6B60',
  border: '#E3E9E2',
  white: '#ffffff',
} as const

export const SITE_URL = 'https://app.digifamar.com'
export const SUPPORT_EMAIL = 'support@digifamar.com'

export const main = {
  backgroundColor: COLORS.white,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  margin: '0',
  padding: '0',
}

export const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px 24px 40px',
}

export const card = {
  border: `1px solid ${COLORS.border}`,
  borderRadius: '14px',
  padding: '28px 26px',
  backgroundColor: COLORS.white,
}

export const h1 = {
  fontSize: '22px',
  lineHeight: '1.3',
  fontWeight: 700 as const,
  color: COLORS.ink,
  margin: '0 0 16px',
}

export const text = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: COLORS.muted,
  margin: '0 0 18px',
}

export const strongText = { ...text, color: COLORS.ink }

export const button = {
  display: 'inline-block',
  backgroundColor: COLORS.forest,
  color: COLORS.white,
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '10px',
  padding: '13px 24px',
  textDecoration: 'none',
}

export const link = { color: COLORS.forest, textDecoration: 'underline' }

export const codeStyle = {
  display: 'inline-block',
  fontFamily: "'SFMono-Regular', Menlo, Consolas, monospace",
  fontSize: '28px',
  letterSpacing: '8px',
  fontWeight: 700 as const,
  color: COLORS.forest,
  backgroundColor: COLORS.mist,
  borderRadius: '10px',
  padding: '14px 20px',
  margin: '0 0 20px',
}

export const smallPrint = {
  fontSize: '12px',
  lineHeight: '1.6',
  color: '#8A9690',
  margin: '18px 0 0',
}

const hr = { borderColor: COLORS.border, margin: '28px 0 16px' }

const wordmark = {
  fontSize: '20px',
  fontWeight: 800 as const,
  letterSpacing: '0.5px',
  color: COLORS.forest,
  textDecoration: 'none',
  margin: '0',
}

const tagline = {
  fontSize: '12px',
  color: COLORS.sage,
  margin: '4px 0 24px',
  letterSpacing: '0.4px',
}

interface LayoutProps {
  preview: string
  heading?: string
  children: React.ReactNode
}

/** Shared branded shell for every DiGiFaMaR email. */
export const BrandLayout = ({ preview, heading, children }: LayoutProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section>
          <Link href={SITE_URL} style={wordmark}>
            DiGiFaMaR
          </Link>
          <Text style={tagline}>From American farms, direct to you</Text>
        </Section>
        <Section style={card}>
          {heading ? <Heading style={h1}>{heading}</Heading> : null}
          {children}
        </Section>
        <Hr style={hr} />
        <Text style={smallPrint}>
          DiGiFaMaR — the U.S. digital farmers market. Questions? Reach us at{' '}
          <Link href={`mailto:${SUPPORT_EMAIL}`} style={link}>
            {SUPPORT_EMAIL}
          </Link>
          .
        </Text>
      </Container>
    </Body>
  </Html>
)

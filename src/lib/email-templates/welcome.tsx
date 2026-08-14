import * as React from 'react'
import { Button, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { BrandLayout, SITE_URL, button, smallPrint, strongText, text } from './theme'

interface WelcomeEmailProps {
  name?: string
  role?: string
}

const WelcomeEmail = ({ name, role }: WelcomeEmailProps) => (
  <BrandLayout
    preview="Welcome to DiGiFaMaR — America's farms, direct to market"
    heading={name ? `Welcome, ${name}` : 'Welcome to DiGiFaMaR'}
  >
    <Text style={strongText}>Your account is ready.</Text>
    <Text style={text}>
      {role === 'farmer'
        ? 'Set up your farm profile, list what you have available, and set your own prices and delivery terms. You keep 90% of each sale before external escrow, payment-processing and withdrawal charges — DiGiFaMaR takes a flat 10% platform fee.'
        : 'Browse verified U.S. farms near you, order directly from the grower, and pay through escrow. Funds are only released to the farmer after you confirm delivery with your 6-digit release code.'}
    </Text>
    <Button style={button} href={role === 'farmer' ? `${SITE_URL}/dashboard/farmer` : `${SITE_URL}/market`}>
      {role === 'farmer' ? 'Go to my farm dashboard' : 'Browse the marketplace'}
    </Button>
    <Text style={smallPrint}>
      You're receiving this because an account was created with this email
      address on DiGiFaMaR.
    </Text>
  </BrandLayout>
)

export const template = {
  component: WelcomeEmail,
  subject: 'Welcome to DiGiFaMaR',
  displayName: 'Account welcome',
  previewData: { name: 'Jordan', role: 'buyer' },
} satisfies TemplateEntry

export default WelcomeEmail

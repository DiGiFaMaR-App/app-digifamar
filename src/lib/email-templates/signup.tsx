import * as React from 'react'
import { Button, Link, Text } from '@react-email/components'
import { BrandLayout, button, link, smallPrint, strongText, text } from './theme'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ recipient, confirmationUrl }: SignupEmailProps) => (
  <BrandLayout preview="Confirm your email to start buying and selling on DiGiFaMaR" heading="Confirm your email">
    <Text style={strongText}>Welcome to DiGiFaMaR.</Text>
    <Text style={text}>
      Confirm{' '}
      <Link href={`mailto:${recipient}`} style={link}>
        {recipient}
      </Link>{' '}
      to activate your account and start browsing verified U.S. farms with
      escrow-protected orders.
    </Text>
    <Button style={button} href={confirmationUrl}>
      Verify my email
    </Button>
    <Text style={smallPrint}>
      If you didn't create a DiGiFaMaR account, you can safely ignore this email.
    </Text>
  </BrandLayout>
)

export default SignupEmail

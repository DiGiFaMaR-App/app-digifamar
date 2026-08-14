import * as React from 'react'
import { Button, Text } from '@react-email/components'
import { BrandLayout, button, smallPrint, text } from './theme'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <BrandLayout preview="Your DiGiFaMaR login link" heading="Your login link">
    <Text style={text}>
      Use the button below to sign in to DiGiFaMaR. For your security this link
      expires shortly and can only be used once.
    </Text>
    <Button style={button} href={confirmationUrl}>
      Log in
    </Button>
    <Text style={smallPrint}>
      If you didn't request this link, you can safely ignore this email.
    </Text>
  </BrandLayout>
)

export default MagicLinkEmail

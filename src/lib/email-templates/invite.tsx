import * as React from 'react'
import { Button, Text } from '@react-email/components'
import { BrandLayout, button, smallPrint, text } from './theme'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <BrandLayout preview="You've been invited to join DiGiFaMaR" heading="You've been invited">
    <Text style={text}>
      You've been invited to join DiGiFaMaR, the digital farmers market
      connecting American farms directly with buyers. Accept your invitation to
      create your account.
    </Text>
    <Button style={button} href={confirmationUrl}>
      Accept invitation
    </Button>
    <Text style={smallPrint}>
      If you weren't expecting this invitation, you can safely ignore this email.
    </Text>
  </BrandLayout>
)

export default InviteEmail

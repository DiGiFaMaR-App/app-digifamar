import * as React from 'react'
import { Button, Text } from '@react-email/components'
import { BrandLayout, button, smallPrint, text } from './theme'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <BrandLayout preview="Reset your DiGiFaMaR password" heading="Reset your password">
    <Text style={text}>
      We received a request to reset the password on your DiGiFaMaR account.
      Choose a new password using the button below — the link expires shortly.
    </Text>
    <Button style={button} href={confirmationUrl}>
      Reset password
    </Button>
    <Text style={smallPrint}>
      If you didn't request this, you can safely ignore this email — your
      password stays unchanged. Never share this link with anyone, including
      someone claiming to be DiGiFaMaR support.
    </Text>
  </BrandLayout>
)

export default RecoveryEmail

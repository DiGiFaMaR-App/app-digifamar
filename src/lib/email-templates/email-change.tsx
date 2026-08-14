import * as React from 'react'
import { Button, Link, Text } from '@react-email/components'
import { BrandLayout, button, link, smallPrint, text } from './theme'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <BrandLayout
    preview="Confirm your new DiGiFaMaR email address"
    heading="Confirm your email change"
  >
    <Text style={text}>
      You asked to change the email on your DiGiFaMaR account from{' '}
      <Link href={`mailto:${oldEmail}`} style={link}>
        {oldEmail}
      </Link>{' '}
      to{' '}
      <Link href={`mailto:${newEmail}`} style={link}>
        {newEmail}
      </Link>
      . Confirm the change below.
    </Text>
    <Button style={button} href={confirmationUrl}>
      Confirm email change
    </Button>
    <Text style={smallPrint}>
      If you didn't request this change, ignore this email and contact
      support@digifamar.com — your current address stays active.
    </Text>
  </BrandLayout>
)

export default EmailChangeEmail

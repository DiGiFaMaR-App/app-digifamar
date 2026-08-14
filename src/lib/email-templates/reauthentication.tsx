import * as React from 'react'
import { Text } from '@react-email/components'
import { BrandLayout, codeStyle, smallPrint, text } from './theme'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <BrandLayout preview="Your DiGiFaMaR verification code" heading="Confirm it's you">
    <Text style={text}>Use this code to confirm your identity on DiGiFaMaR:</Text>
    <Text style={codeStyle}>{token}</Text>
    <Text style={smallPrint}>
      This code expires shortly. DiGiFaMaR will never ask you for this code by
      phone or message. If you didn't request it, ignore this email.
    </Text>
  </BrandLayout>
)

export default ReauthenticationEmail

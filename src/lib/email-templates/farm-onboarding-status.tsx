import * as React from 'react'
import { Button, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import {
  BrandLayout,
  COLORS,
  SITE_URL,
  button,
  smallPrint,
  strongText,
  text,
} from './theme'

type Status = 'submitted' | 'under_review' | 'approved' | 'changes_requested' | 'rejected'

interface FarmOnboardingStatusProps {
  farmName?: string
  status?: Status
  reason?: string
}

const COPY: Record<Status, { title: string; body: string; cta: string }> = {
  submitted: {
    title: 'We received your farm application',
    body: 'Thanks for applying to sell on DiGiFaMaR. Our team reviews farm details and verification documents, and we will email you as soon as there is an update.',
    cta: 'View my application',
  },
  under_review: {
    title: 'Your farm is under review',
    body: 'A reviewer is checking your farm details and documents now. No action is needed from you unless we ask for something specific.',
    cta: 'View my application',
  },
  approved: {
    title: 'Your farm is verified',
    body: 'Your farm has been approved. You can now publish listings, set your own prices and delivery terms, and accept escrow-protected orders from buyers.',
    cta: 'Create my first listing',
  },
  changes_requested: {
    title: 'We need a little more from you',
    body: 'We could not finish verifying your farm with the information provided. Please review the note below and resubmit — it usually only takes a few minutes.',
    cta: 'Update my application',
  },
  rejected: {
    title: 'Your farm application was not approved',
    body: 'We were unable to approve your farm at this time. If you believe this was a mistake, reply to support@digifamar.com and a human will take another look.',
    cta: 'Contact support',
  },
}

const noteBox = {
  backgroundColor: COLORS.mist,
  borderLeft: `3px solid ${COLORS.terracotta}`,
  borderRadius: '8px',
  padding: '14px 16px',
  margin: '0 0 20px',
}

const FarmOnboardingStatusEmail = ({
  farmName,
  status = 'submitted',
  reason,
}: FarmOnboardingStatusProps) => {
  const copy = COPY[status] ?? COPY.submitted
  return (
    <BrandLayout preview={copy.title} heading={copy.title}>
      <Text style={strongText}>
        {farmName ? `${farmName} — application update` : 'Farm application update'}
      </Text>
      <Text style={text}>{copy.body}</Text>
      {reason ? (
        <Section style={noteBox}>
          <Text style={{ ...text, margin: '0', color: COLORS.ink }}>{reason}</Text>
        </Section>
      ) : null}
      <Button style={button} href={`${SITE_URL}/farmer/verification`}>
        {copy.cta}
      </Button>
      <Text style={smallPrint}>
        You're receiving this because you started a farmer application on
        DiGiFaMaR.
      </Text>
    </BrandLayout>
  )
}

export const template = {
  component: FarmOnboardingStatusEmail,
  subject: (data: Record<string, any>) =>
    (COPY[(data?.['status'] as Status) ?? 'submitted'] ?? COPY.submitted).title +
    ' · DiGiFaMaR',
  displayName: 'Farm onboarding status',
  previewData: {
    farmName: 'Willow Creek Farm',
    status: 'approved',
  },
} satisfies TemplateEntry

export default FarmOnboardingStatusEmail

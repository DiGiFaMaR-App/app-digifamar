import * as React from 'react'
import { Button, Hr, Row, Column, Section, Text } from '@react-email/components'
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

interface OrderItem {
  name?: string
  quantity?: number | string
  unit?: string
  total?: string
}

interface OrderConfirmationProps {
  buyerName?: string
  orderId?: string
  farmName?: string
  items?: OrderItem[]
  total?: string
  deliveryTerms?: string
}

const rowLabel = { ...text, margin: '0', fontSize: '14px' }
const rowValue = {
  ...text,
  margin: '0',
  fontSize: '14px',
  color: COLORS.ink,
  textAlign: 'right' as const,
}

const OrderConfirmationEmail = ({
  buyerName,
  orderId,
  farmName,
  items = [],
  total,
  deliveryTerms,
}: OrderConfirmationProps) => (
  <BrandLayout
    preview={`Your DiGiFaMaR order${orderId ? ` #${orderId}` : ''} is confirmed`}
    heading="Your order is confirmed"
  >
    <Text style={strongText}>
      {buyerName ? `Thanks, ${buyerName}.` : 'Thanks for your order.'}
    </Text>
    <Text style={text}>
      {farmName
        ? `Your order with ${farmName} has been placed and your payment is held in escrow.`
        : 'Your order has been placed and your payment is held in escrow.'}{' '}
      Funds are only released to the farmer after you confirm delivery with your
      6-digit release code.
    </Text>

    {items.length > 0 ? (
      <Section>
        {items.map((item, i) => (
          <Row key={i}>
            <Column>
              <Text style={rowLabel}>
                {item.name ?? 'Item'}
                {item.quantity ? ` × ${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : ''}
              </Text>
            </Column>
            <Column>
              <Text style={rowValue}>{item.total ?? ''}</Text>
            </Column>
          </Row>
        ))}
        <Hr style={{ borderColor: COLORS.border, margin: '12px 0' }} />
      </Section>
    ) : null}

    {total ? (
      <Row>
        <Column>
          <Text style={{ ...rowLabel, color: COLORS.ink, fontWeight: 700 }}>Order total</Text>
        </Column>
        <Column>
          <Text style={{ ...rowValue, fontWeight: 700 }}>{total}</Text>
        </Column>
      </Row>
    ) : null}

    {deliveryTerms ? <Text style={text}>Delivery: {deliveryTerms}</Text> : null}

    <Button style={button} href={orderId ? `${SITE_URL}/orders/${orderId}` : `${SITE_URL}/orders`}>
      Track my order
    </Button>
    <Text style={smallPrint}>
      Keep your 6-digit release code private until the goods are in hand and
      correct. Need help? support@digifamar.com
    </Text>
  </BrandLayout>
)

export const template = {
  component: OrderConfirmationEmail,
  subject: (data: Record<string, any>) =>
    data?.['orderId']
      ? `Order confirmed · #${String(data['orderId']).slice(0, 8)} · DiGiFaMaR`
      : 'Your DiGiFaMaR order is confirmed',
  displayName: 'Buyer order confirmation',
  previewData: {
    buyerName: 'Jordan',
    orderId: 'a1b2c3d4',
    farmName: 'Willow Creek Farm',
    items: [{ name: 'Heirloom tomatoes', quantity: 10, unit: 'lb', total: '$45.00' }],
    total: '$45.00',
    deliveryTerms: 'Farm pickup, Sat 9am–1pm',
  },
} satisfies TemplateEntry

export default OrderConfirmationEmail

import { Text, Section, Hr, Button, Img, Row, Column, Link } from '@react-email/components'
import * as React from 'react'
import { Base } from './base'

export const CART_ABANDONED = 'cart-abandoned'

export interface CartAbandonedItem {
  title: string
  subtitle?: string | null
  thumbnail?: string | null
  quantity: number
  unit_price: number
  product_handle?: string | null
}

export interface CartAbandonedTemplateProps {
  email: string
  items: CartAbandonedItem[]
  cartUrl: string
  totalAmount?: number
  currencyCode?: string
  preview?: string
}

export const isCartAbandonedData = (data: any): data is CartAbandonedTemplateProps =>
  typeof data.email === 'string' && Array.isArray(data.items) && data.items.length > 0

function formatPrice(amount: number): string {
  return amount.toFixed(2).replace('.', ',') + ' €'
}

export const CartAbandonedTemplate: React.FC<CartAbandonedTemplateProps> & {
  PreviewProps: CartAbandonedTemplateProps
} = ({ email, items, cartUrl, totalAmount, preview }) => {
  const total = totalAmount ?? items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const freeShippingRemaining = 75 - total
  const previewText = preview || `Votre sélection vous attend chez La Cabrade — ${items.length} article${items.length > 1 ? 's' : ''} dans votre panier`

  return (
    <Base preview={previewText}>
      {/* En-tête */}
      <Section style={{ textAlign: 'center', paddingBottom: '24px' }}>
        <Text style={{ margin: 0, fontSize: '13px', color: '#92400e', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          La Cabrade · Sellerie équestre
        </Text>
        <Text style={{ margin: '12px 0 0', fontSize: '22px', fontWeight: '700', color: '#111827', lineHeight: '1.3' }}>
          Vous avez oublié quelque chose
        </Text>
        <Text style={{ margin: '8px 0 0', fontSize: '15px', color: '#6b7280', lineHeight: '1.5' }}>
          Votre panier vous attend — les articles peuvent partir vite.
        </Text>
      </Section>

      <Hr style={{ borderColor: '#e5e7eb', margin: '0 0 24px' }} />

      {/* Articles */}
      <Section>
        <Text style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Votre sélection ({items.length} article{items.length > 1 ? 's' : ''})
        </Text>

        {items.slice(0, 4).map((item, i) => (
          <Row key={i} style={{ marginBottom: '12px' }}>
            <Column style={{ width: '64px', verticalAlign: 'top' }}>
              {item.thumbnail ? (
                <Img
                  src={item.thumbnail}
                  alt={item.title}
                  width="56"
                  height="56"
                  style={{ borderRadius: '6px', objectFit: 'cover', border: '1px solid #e5e7eb' }}
                />
              ) : (
                <div style={{ width: '56px', height: '56px', backgroundColor: '#f3f4f6', borderRadius: '6px' }} />
              )}
            </Column>
            <Column style={{ verticalAlign: 'top', paddingLeft: '12px' }}>
              <Text style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '600', color: '#111827', lineHeight: '1.3' }}>
                {item.title}
              </Text>
              {item.subtitle && item.subtitle !== 'Default' && (
                <Text style={{ margin: '0 0 4px', fontSize: '12px', color: '#6b7280' }}>
                  {item.subtitle}
                </Text>
              )}
              <Text style={{ margin: 0, fontSize: '13px', color: '#92400e', fontWeight: '600' }}>
                {formatPrice(item.unit_price * item.quantity)}
                {item.quantity > 1 && (
                  <span style={{ fontWeight: 'normal', color: '#9ca3af' }}> ({item.quantity} × {formatPrice(item.unit_price)})</span>
                )}
              </Text>
            </Column>
          </Row>
        ))}

        {items.length > 4 && (
          <Text style={{ margin: '8px 0 0', fontSize: '13px', color: '#6b7280' }}>
            + {items.length - 4} autre{items.length - 4 > 1 ? 's' : ''} article{items.length - 4 > 1 ? 's' : ''}
          </Text>
        )}
      </Section>

      <Hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />

      {/* Total + livraison */}
      <Section>
        <Row>
          <Column><Text style={{ margin: 0, fontSize: '14px', color: '#374151', fontWeight: '600' }}>Total panier</Text></Column>
          <Column style={{ textAlign: 'right' }}>
            <Text style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#111827' }}>{formatPrice(total)}</Text>
          </Column>
        </Row>
        {freeShippingRemaining > 0 ? (
          <Text style={{ margin: '8px 0 0', fontSize: '12px', color: '#6b7280', backgroundColor: '#fef3c7', padding: '8px 10px', borderRadius: '6px' }}>
            Plus que {formatPrice(freeShippingRemaining)} pour bénéficier de la livraison gratuite
          </Text>
        ) : (
          <Text style={{ margin: '8px 0 0', fontSize: '12px', color: '#065f46', backgroundColor: '#d1fae5', padding: '8px 10px', borderRadius: '6px' }}>
            Livraison gratuite incluse
          </Text>
        )}
      </Section>

      {/* CTA principal */}
      <Section style={{ textAlign: 'center', padding: '24px 0 8px' }}>
        <Button
          href={cartUrl}
          style={{
            backgroundColor: '#92400e',
            color: '#ffffff',
            borderRadius: '8px',
            padding: '14px 32px',
            fontSize: '15px',
            fontWeight: '700',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Reprendre mon panier
        </Button>
        <Text style={{ margin: '12px 0 0', fontSize: '12px', color: '#9ca3af' }}>
          Votre panier est sauvegardé, mais les stocks sont limités.
        </Text>
      </Section>

      <Hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />

      {/* Trust signals */}
      <Section>
        <Row>
          {[
            ['Paiement sécurisé', 'Carte, Virement, Bancontact'],
            ['Livraison Bpost', 'Belgique & France'],
            ['Retours 14 jours', 'À charge du client'],
          ].map(([label, sub]) => (
            <Column key={label} style={{ textAlign: 'center', padding: '0 8px' }}>
              <Text style={{ margin: 0, fontSize: '12px', fontWeight: '600', color: '#374151' }}>{label}</Text>
              <Text style={{ margin: '2px 0 0', fontSize: '11px', color: '#9ca3af' }}>{sub}</Text>
            </Column>
          ))}
        </Row>
      </Section>

      <Hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />

      {/* Footer */}
      <Section style={{ textAlign: 'center' }}>
        <Text style={{ margin: 0, fontSize: '11px', color: '#9ca3af', lineHeight: '1.5' }}>
          Une question ?{' '}
          <Link href="mailto:contact@sellerie-lacabrade.be" style={{ color: '#92400e' }}>
            contact@sellerie-lacabrade.be
          </Link>
          {' '}· Rue de la Clef 96, 4621 Retinne (Liège)
        </Text>
        <Text style={{ margin: '6px 0 0', fontSize: '10px', color: '#d1d5db' }}>
          Vous recevez cet email car vous avez laissé des articles dans votre panier sur{' '}
          <Link href="https://www.sellerie-lacabrade.be" style={{ color: '#d1d5db' }}>sellerie-lacabrade.be</Link>.
        </Text>
      </Section>
    </Base>
  )
}

CartAbandonedTemplate.PreviewProps = {
  email: 'test@example.com',
  cartUrl: 'https://www.sellerie-lacabrade.be/be/cart',
  items: [
    { title: 'Casque Premium SAMSHIELD', subtitle: 'Noir mat - M', thumbnail: null, quantity: 1, unit_price: 349 },
    { title: 'Tapis de selle Pro EQUIPE', subtitle: 'Blanc - 17.5"', thumbnail: null, quantity: 1, unit_price: 89.9 },
  ],
  totalAmount: 438.9,
}

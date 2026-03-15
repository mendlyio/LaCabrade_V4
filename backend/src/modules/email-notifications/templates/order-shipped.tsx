import { Text, Section, Hr, Button, Img, Row, Column, Link } from '@react-email/components'
import * as React from 'react'
import { Base } from './base'
import { OrderDTO, OrderAddressDTO, FulfillmentDTO } from '@medusajs/framework/types'
import { SuggestedProduct } from './order-placed'

export const ORDER_SHIPPED = 'order-shipped'

interface OrderShippedPreviewProps {
  order: OrderDTO & { display_id: string }
  fulfillment: FulfillmentDTO & { tracking_numbers?: string[], data?: { public_tracking_url?: string } }
  shippingAddress: OrderAddressDTO
  suggestedProducts?: SuggestedProduct[]
}

export interface OrderShippedTemplateProps {
  order: OrderDTO & { display_id: string }
  fulfillment: FulfillmentDTO & { tracking_numbers?: string[], data?: { public_tracking_url?: string } }
  shippingAddress: OrderAddressDTO
  suggestedProducts?: SuggestedProduct[]
  preview?: string
}

export const isOrderShippedTemplateData = (data: any): data is OrderShippedTemplateProps =>
  typeof data.order === 'object' && typeof data.fulfillment === 'object' && typeof data.shippingAddress === 'object'

export const OrderShippedTemplate: React.FC<OrderShippedTemplateProps> & {
  PreviewProps: OrderShippedPreviewProps
} = ({ order, fulfillment, shippingAddress, suggestedProducts, preview = 'Votre commande a été expédiée !' }) => {
  const trackingNumber = fulfillment.tracking_numbers && fulfillment.tracking_numbers.length > 0 
    ? fulfillment.tracking_numbers[0] 
    : null

  const trackingUrl = fulfillment.data?.public_tracking_url || 
    (trackingNumber 
      ? `https://track.bpost.be/btr/web/#/search?itemCode=${trackingNumber}&lang=fr&postalCode=${shippingAddress.postal_code}` 
      : '#')

  return (
    <Base preview={preview}>
      {/* Brand Header */}
      <Section style={{ textAlign: 'center' as const, padding: '0 0 8px' }}>
        <Text style={{
          fontSize: '11px',
          fontWeight: 'bold' as const,
          letterSpacing: '3px',
          textTransform: 'uppercase' as const,
          color: '#92400E',
          margin: '0 0 2px',
        }}>
          LA CABRADE
        </Text>
        <Text style={{ fontSize: '12px', color: '#9CA3AF', margin: '0' }}>
          Sellerie Équestre
        </Text>
      </Section>

      <Hr style={{ borderColor: '#E5E7EB', margin: '16px 0 24px' }} />

      <Section>
        <Text style={{ fontSize: '24px', fontWeight: 'bold' as const, textAlign: 'center' as const, margin: '0 0 8px', color: '#D97706' }}>
          Commande expédiée !
        </Text>

        <Text style={{ margin: '0 0 15px', fontSize: '16px', color: '#374151' }}>
          Bonjour <strong>{shippingAddress.first_name}</strong>,
        </Text>

        <Text style={{ margin: '0 0 30px', lineHeight: '1.6', color: '#4B5563' }}>
          Bonne nouvelle ! Votre commande <strong>#{order.display_id}</strong> a été expédiée et est en route vers vous.
        </Text>

        {trackingNumber && (
          <Section style={{ 
            backgroundColor: '#FEF3C7', 
            padding: '20px', 
            borderRadius: '8px', 
            margin: '0 0 24px' 
          }}>
            <Text style={{ fontSize: '14px', fontWeight: 'bold' as const, margin: '0 0 10px', color: '#92400E' }}>
              Numéro de suivi
            </Text>
            <Text style={{ fontSize: '18px', fontWeight: 'bold' as const, margin: '0 0 10px', color: '#1F2937', letterSpacing: '1px' }}>
              {trackingNumber}
            </Text>
            <Button
              href={trackingUrl}
              style={{
                backgroundColor: '#D97706',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 'bold' as const,
                display: 'inline-block',
                marginTop: '10px'
              }}
            >
              Suivre ma commande
            </Button>
          </Section>
        )}

        <Hr style={{ margin: '0 0 24px', borderColor: '#E5E7EB' }} />

        <Text style={{ fontSize: '16px', fontWeight: 'bold' as const, margin: '0 0 10px', color: '#1F2937' }}>
          Adresse de livraison
        </Text>
        <Section style={{ backgroundColor: '#F9FAFB', padding: '15px', borderRadius: '6px', margin: '0 0 4px' }}>
          <Text style={{ margin: '0 0 4px', fontWeight: '600' as const, fontSize: '14px', color: '#1F2937' }}>
            {shippingAddress.first_name} {shippingAddress.last_name}
          </Text>
          <Text style={{ margin: '0 0 2px', fontSize: '13px', color: '#6B7280' }}>
            {shippingAddress.address_1}
          </Text>
          {shippingAddress.address_2 && (
            <Text style={{ margin: '0 0 2px', fontSize: '13px', color: '#6B7280' }}>
              {shippingAddress.address_2}
            </Text>
          )}
          <Text style={{ margin: '0', fontSize: '13px', color: '#6B7280' }}>
            {shippingAddress.postal_code} {shippingAddress.city}
            {shippingAddress.province ? `, ${shippingAddress.province}` : ''}
            {' — '}
            {(shippingAddress.country_code || '').toUpperCase()}
          </Text>
        </Section>

        <Hr style={{ margin: '24px 0', borderColor: '#E5E7EB' }} />

        <Text style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 5px' }}>
          <strong>Délai de livraison estimé :</strong> 2–4 jours ouvrables
        </Text>
        <Text style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 20px' }}>
          Vous recevrez une notification dès que votre colis sera livré.
        </Text>

        {/* Cross-sell */}
        {suggestedProducts && suggestedProducts.length > 0 && (
          <>
            <Hr style={{ borderColor: '#E5E7EB', margin: '4px 0 24px' }} />

            <Text style={{
              fontSize: '16px',
              fontWeight: 'bold' as const,
              color: '#1F2937',
              margin: '0 0 4px',
              textAlign: 'center' as const,
            }}>
              En attendant votre colis...
            </Text>
            <Text style={{
              fontSize: '13px',
              color: '#9CA3AF',
              margin: '0 0 16px',
              textAlign: 'center' as const,
            }}>
              Découvrez nos suggestions
            </Text>

            <Section>
              <Row>
                {suggestedProducts.map((product) => (
                  <Column
                    key={product.url}
                    style={{
                      width: `${Math.floor(100 / suggestedProducts.length)}%`,
                      textAlign: 'center' as const,
                      verticalAlign: 'top' as const,
                      padding: '0 6px',
                    }}
                  >
                    <Link href={product.url} style={{ textDecoration: 'none' }}>
                      <Img
                        src={product.thumbnail}
                        alt={product.title}
                        width={130}
                        height={130}
                        style={{
                          borderRadius: '8px',
                          display: 'block',
                          margin: '0 auto 8px',
                          border: '1px solid #E5E7EB',
                        }}
                      />
                      <Text style={{
                        margin: '0',
                        fontSize: '13px',
                        color: '#374151',
                        fontWeight: '500' as const,
                        lineHeight: '1.3',
                      }}>
                        {product.title}
                      </Text>
                    </Link>
                  </Column>
                ))}
              </Row>
            </Section>

            <Section style={{ textAlign: 'center' as const, margin: '16px 0 0' }}>
              <Button
                href="https://www.sellerie-lacabrade.be/store"
                style={{
                  backgroundColor: '#92400E',
                  color: '#ffffff',
                  padding: '10px 24px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontWeight: '600' as const,
                  fontSize: '13px',
                }}
              >
                Découvrir toute la boutique
              </Button>
            </Section>
          </>
        )}

        <Hr style={{ borderColor: '#E5E7EB', margin: '24px 0 16px' }} />

        <Text style={{ fontSize: '13px', color: '#6B7280', textAlign: 'center' as const, margin: '0 0 8px', lineHeight: '1.5' }}>
          Des questions ? <Link href="mailto:contact@sellerie-lacabrade.be" style={{ color: '#92400E' }}>Contactez-nous</Link>
        </Text>
        
        <Text style={{ fontSize: '13px', color: '#6B7280', textAlign: 'center' as const, margin: '0', lineHeight: '1.5' }}>
          Merci pour votre confiance !<br/>
          <strong>L&apos;équipe La Cabrade</strong>
        </Text>
      </Section>
    </Base>
  )
}

OrderShippedTemplate.PreviewProps = {
  order: {
    id: 'test-order-id',
    display_id: '1234',
    created_at: new Date().toISOString(),
    email: 'client@example.com',
    currency_code: 'EUR',
  } as any,
  fulfillment: {
    id: 'fulfillment-1',
    tracking_numbers: ['323123456789BE'],
    created_at: new Date().toISOString(),
  } as any,
  shippingAddress: {
    first_name: 'Marie',
    last_name: 'Dubois',
    address_1: 'Rue de la Sellerie 42',
    city: 'Bruxelles',
    province: '',
    postal_code: '1000',
    country_code: 'BE'
  },
  suggestedProducts: [
    {
      title: 'Bridon cuir havane',
      thumbnail: 'https://via.placeholder.com/200x200/FEF3C7/92400E?text=Bridon',
      url: 'https://www.sellerie-lacabrade.be/products/bridon-cuir-havane',
    },
    {
      title: 'Guêtres protection tendons',
      thumbnail: 'https://via.placeholder.com/200x200/FEF3C7/92400E?text=Guetres',
      url: 'https://www.sellerie-lacabrade.be/products/guetres-protection',
    },
  ],
} as any

export default OrderShippedTemplate

import { Text, Section, Hr, Button } from '@react-email/components'
import * as React from 'react'
import { Base } from './base'
import { OrderDTO, OrderAddressDTO, FulfillmentDTO } from '@medusajs/framework/types'

export const ORDER_SHIPPED = 'order-shipped'

interface OrderShippedPreviewProps {
  order: OrderDTO & { display_id: string }
  fulfillment: FulfillmentDTO & { tracking_numbers?: string[], data?: { public_tracking_url?: string } }
  shippingAddress: OrderAddressDTO
}

export interface OrderShippedTemplateProps {
  order: OrderDTO & { display_id: string }
  fulfillment: FulfillmentDTO & { tracking_numbers?: string[], data?: { public_tracking_url?: string } }
  shippingAddress: OrderAddressDTO
  preview?: string
}

export const isOrderShippedTemplateData = (data: any): data is OrderShippedTemplateProps =>
  typeof data.order === 'object' && typeof data.fulfillment === 'object' && typeof data.shippingAddress === 'object'

export const OrderShippedTemplate: React.FC<OrderShippedTemplateProps> & {
  PreviewProps: OrderShippedPreviewProps
} = ({ order, fulfillment, shippingAddress, preview = 'Votre commande a été expédiée !' }) => {
  const trackingNumber = fulfillment.tracking_numbers && fulfillment.tracking_numbers.length > 0 
    ? fulfillment.tracking_numbers[0] 
    : null

  // URL prioritaire fournie par le backend (incluant code postal etc)
  const trackingUrl = fulfillment.data?.public_tracking_url || 
    (trackingNumber 
      ? `https://track.bpost.be/btr/web/#/search?itemCode=${trackingNumber}&lang=fr&postalCode=${shippingAddress.postal_code}` 
      : '#')

  return (
    <Base preview={preview}>
      <Section>
        <Text style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center', margin: '0 0 30px', color: '#D97706' }}>
          🚀 Commande Expédiée !
        </Text>

        <Text style={{ margin: '0 0 15px' }}>
          Bonjour {shippingAddress.first_name} {shippingAddress.last_name},
        </Text>

        <Text style={{ margin: '0 0 30px' }}>
          Excellente nouvelle ! Votre commande <strong>#{order.display_id}</strong> a été expédiée et est en route vers vous. 🏇
        </Text>

        {trackingNumber && (
          <>
            <Section style={{ 
              backgroundColor: '#FEF3C7', 
              padding: '20px', 
              borderRadius: '8px', 
              margin: '20px 0' 
            }}>
              <Text style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 10px', color: '#92400E' }}>
                📦 Numéro de Suivi
              </Text>
              <Text style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 10px', color: '#1F2937', letterSpacing: '1px' }}>
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
                  fontWeight: 'bold',
                  display: 'inline-block',
                  marginTop: '10px'
                }}
              >
                Suivre ma commande
              </Button>
            </Section>
          </>
        )}

        <Hr style={{ margin: '30px 0', borderColor: '#E5E7EB' }} />

        <Text style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 10px', color: '#1F2937' }}>
          📍 Adresse de Livraison
        </Text>
        <Section style={{ backgroundColor: '#F9FAFB', padding: '15px', borderRadius: '6px', margin: '10px 0' }}>
          <Text style={{ margin: '0 0 5px' }}>
            <strong>{shippingAddress.first_name} {shippingAddress.last_name}</strong>
          </Text>
          <Text style={{ margin: '0 0 5px' }}>
            {shippingAddress.address_1}
          </Text>
          {shippingAddress.address_2 && (
            <Text style={{ margin: '0 0 5px' }}>
              {shippingAddress.address_2}
            </Text>
          )}
          <Text style={{ margin: '0 0 5px' }}>
            {shippingAddress.postal_code} {shippingAddress.city}
          </Text>
          <Text style={{ margin: '0' }}>
            {shippingAddress.province && `${shippingAddress.province}, `}{shippingAddress.country_code}
          </Text>
        </Section>

        <Hr style={{ margin: '30px 0', borderColor: '#E5E7EB' }} />

        <Text style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 5px' }}>
          ⏱️ <strong>Délai de livraison estimé :</strong> 2-4 jours ouvrables
        </Text>
        <Text style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 20px' }}>
          Vous recevrez une notification dès que votre colis sera livré.
        </Text>

        <Hr style={{ margin: '30px 0', borderColor: '#E5E7EB' }} />

        <Text style={{ fontSize: '14px', color: '#6B7280', textAlign: 'center', margin: '0' }}>
          Des questions ? Contactez-nous à <a href="mailto:info@sellerie-lacabrade.be" style={{ color: '#D97706' }}>info@sellerie-lacabrade.be</a>
        </Text>
        
        <Text style={{ fontSize: '14px', color: '#6B7280', textAlign: 'center', margin: '20px 0 0' }}>
          Merci pour votre confiance !<br/>
          <strong>L'équipe La Cabrade</strong> 🐴
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
  }
} as any

export default OrderShippedTemplate


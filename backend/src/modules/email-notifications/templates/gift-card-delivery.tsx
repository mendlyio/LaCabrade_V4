import { Text, Section, Hr, Link } from '@react-email/components'
import * as React from 'react'
import { Base } from './base'

export const GIFT_CARD_DELIVERY = 'gift-card-delivery'

export interface GiftCardDeliveryTemplateProps {
  code: string
  amount: number // en euros
  recipientName: string
  senderName: string
  message: string
  preview?: string
}

export const isGiftCardDeliveryData = (data: any): data is GiftCardDeliveryTemplateProps =>
  typeof data.code === 'string' &&
  typeof data.amount === 'number' &&
  typeof data.recipientName === 'string'

export const GiftCardDeliveryTemplate: React.FC<GiftCardDeliveryTemplateProps> & {
  PreviewProps: GiftCardDeliveryTemplateProps
} = ({
  code,
  amount,
  recipientName,
  senderName,
  message,
  preview = 'Vous avez reçu un bon cadeau La Cabrade !'
}) => {
  return (
    <Base preview={preview}>
      <Section>
        {/* Header */}
        <Text style={{
          fontSize: '12px',
          fontWeight: 'bold',
          textAlign: 'center',
          color: '#9e354a',
          letterSpacing: '3px',
          textTransform: 'uppercase' as const,
          margin: '0 0 5px'
        }}>
          LA CABRADE
        </Text>

        <Text style={{
          fontSize: '26px',
          fontWeight: 'bold',
          textAlign: 'center',
          color: '#1a1a1a',
          margin: '0 0 20px'
        }}>
          🎁 Vous avez reçu un Bon Cadeau !
        </Text>

        <Hr style={{ borderColor: '#9e354a', margin: '0 0 25px' }} />

        {/* Destinataire */}
        <Text style={{ fontSize: '16px', margin: '0 0 15px', color: '#333' }}>
          Bonjour <strong>{recipientName}</strong>,
        </Text>

        <Text style={{ fontSize: '14px', margin: '0 0 20px', color: '#555', lineHeight: '1.5' }}>
          {senderName ? (
            <>{senderName} vous a offert un bon cadeau La Cabrade d&apos;une valeur de :</>
          ) : (
            <>Vous avez reçu un bon cadeau La Cabrade d&apos;une valeur de :</>
          )}
        </Text>

        {/* Montant */}
        <div style={{
          textAlign: 'center',
          padding: '25px',
          backgroundColor: '#fdf5f3',
          borderRadius: '12px',
          margin: '0 0 20px'
        }}>
          <Text style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: '#9e354a',
            margin: '0',
            lineHeight: '1'
          }}>
            {amount}€
          </Text>
        </div>

        {/* Message personnalisé */}
        {message && (
          <div style={{
            padding: '15px 20px',
            backgroundColor: '#f9f9f9',
            borderLeft: '3px solid #9e354a',
            borderRadius: '0 8px 8px 0',
            margin: '0 0 20px'
          }}>
            <Text style={{
              fontSize: '13px',
              color: '#666',
              margin: '0 0 5px',
              fontStyle: 'italic'
            }}>
              Message :
            </Text>
            <Text style={{
              fontSize: '14px',
              color: '#333',
              margin: '0',
              lineHeight: '1.5'
            }}>
              &ldquo;{message}&rdquo;
            </Text>
          </div>
        )}

        <Hr style={{ margin: '20px 0', borderColor: '#eee' }} />

        {/* Code du bon cadeau */}
        <Text style={{
          fontSize: '14px',
          fontWeight: 'bold',
          textAlign: 'center',
          color: '#333',
          margin: '0 0 10px'
        }}>
          Votre code bon cadeau :
        </Text>

        <div style={{
          textAlign: 'center',
          padding: '15px 25px',
          backgroundColor: '#9e354a',
          borderRadius: '8px',
          margin: '0 auto 20px',
        }}>
          <Text style={{
            fontSize: '22px',
            fontWeight: 'bold',
            fontFamily: 'Courier New, monospace',
            color: '#ffffff',
            margin: '0',
            letterSpacing: '2px'
          }}>
            {code}
          </Text>
        </div>

        <Hr style={{ margin: '20px 0', borderColor: '#eee' }} />

        {/* Instructions */}
        <Text style={{
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#333',
          margin: '0 0 10px'
        }}>
          Comment utiliser votre bon cadeau ?
        </Text>

        <Text style={{ fontSize: '13px', color: '#555', margin: '0 0 5px', lineHeight: '1.6' }}>
          1. Rendez-vous sur <Link href="https://www.sellerie-lacabrade.be" style={{ color: '#9e354a' }}>sellerie-lacabrade.be</Link> ou en magasin à Fléron
        </Text>
        <Text style={{ fontSize: '13px', color: '#555', margin: '0 0 5px', lineHeight: '1.6' }}>
          2. Faites votre shopping parmi plus de 5000 produits d&apos;équitation
        </Text>
        <Text style={{ fontSize: '13px', color: '#555', margin: '0 0 5px', lineHeight: '1.6' }}>
          3. Au moment du paiement, saisissez votre code <strong>{code}</strong>
        </Text>
        <Text style={{ fontSize: '13px', color: '#555', margin: '0 0 20px', lineHeight: '1.6' }}>
          4. Le montant sera automatiquement déduit de votre commande
        </Text>

        <Hr style={{ margin: '20px 0', borderColor: '#eee' }} />

        {/* Mentions légales */}
        <Text style={{
          fontSize: '11px',
          color: '#999',
          textAlign: 'center',
          margin: '0 0 5px',
          lineHeight: '1.4'
        }}>
          Ce bon cadeau est valable 1 an à compter de la date d&apos;émission.
        </Text>
        <Text style={{
          fontSize: '11px',
          color: '#999',
          textAlign: 'center',
          margin: '0',
          lineHeight: '1.4'
        }}>
          Il est utilisable en une ou plusieurs fois et ne peut être échangé contre de l&apos;argent.
        </Text>
      </Section>
    </Base>
  )
}

GiftCardDeliveryTemplate.PreviewProps = {
  code: 'LC-AB3D-EF7H-JK9M',
  amount: 50,
  recipientName: 'Marie Dupont',
  senderName: 'Jean Martin',
  message: 'Joyeux anniversaire ! J\'espère que tu trouveras de belles choses pour toi et ton cheval.',
  preview: 'Vous avez reçu un bon cadeau La Cabrade !'
}

export default GiftCardDeliveryTemplate

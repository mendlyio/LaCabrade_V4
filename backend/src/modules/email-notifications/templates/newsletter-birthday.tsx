import { Text, Section, Hr, Button } from '@react-email/components'
import * as React from 'react'
import { Base } from './base'

export const NEWSLETTER_BIRTHDAY = 'newsletter-birthday'

export interface NewsletterBirthdayTemplateProps {
  email: string
  promoCode: string
  preview?: string
}

export const isNewsletterBirthdayData = (data: any): data is NewsletterBirthdayTemplateProps =>
  typeof data.email === 'string' && typeof data.promoCode === 'string'

export const NewsletterBirthdayTemplate: React.FC<NewsletterBirthdayTemplateProps> & {
  PreviewProps: NewsletterBirthdayTemplateProps
} = ({ email, promoCode, preview = 'Joyeux anniversaire ! 🎂 Un cadeau vous attend chez La Cabrade' }) => {
  return (
    <Base preview={preview}>
      <Section>
        <Text style={{ fontSize: '32px', fontWeight: 'bold', textAlign: 'center', margin: '0 0 8px', color: '#92400E' }}>
          🎂 Joyeux Anniversaire !
        </Text>

        <Text style={{ fontSize: '16px', textAlign: 'center', color: '#6B7280', margin: '0 0 30px' }}>
          La Cabrade vous souhaite une très belle journée 🐴
        </Text>

        <Text style={{ margin: '0 0 20px', lineHeight: '1.6' }}>
          Toute l'équipe La Cabrade vous souhaite un merveilleux anniversaire !
        </Text>

        <Text style={{ margin: '0 0 20px', lineHeight: '1.6' }}>
          Pour célébrer ce jour spécial avec vous, nous avons préparé un cadeau exclusif :
        </Text>

        <Hr style={{ margin: '30px 0', borderColor: '#E5E7EB' }} />

        <Section style={{
          background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
          padding: '30px',
          borderRadius: '12px',
          margin: '20px 0',
          textAlign: 'center',
          border: '2px dashed #D97706',
        }}>
          <Text style={{ fontSize: '24px', margin: '0 0 8px' }}>🎁</Text>
          <Text style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 10px', color: '#92400E' }}>
            -10% pour votre anniversaire
          </Text>
          <Text style={{ fontSize: '14px', margin: '0 0 18px', color: '#1F2937' }}>
            Votre code cadeau anniversaire, valable <strong>7 jours</strong> :
          </Text>
          <Text style={{
            fontSize: '28px',
            fontWeight: 'bold',
            margin: '0 0 15px',
            color: '#D97706',
            letterSpacing: '3px',
            backgroundColor: '#FFFFFF',
            padding: '12px 24px',
            borderRadius: '8px',
            display: 'inline-block',
            boxShadow: '0 2px 8px rgba(217,119,6,0.15)',
          }}>
            {promoCode}
          </Text>
          <Text style={{ fontSize: '12px', margin: '0', color: '#6B7280' }}>
            Code à usage unique — valable sur toute la boutique
          </Text>
        </Section>

        <Hr style={{ margin: '30px 0', borderColor: '#E5E7EB' }} />

        <Section style={{ textAlign: 'center', margin: '30px 0' }}>
          <Button
            href="https://www.sellerie-lacabrade.be"
            style={{
              backgroundColor: '#D97706',
              color: '#ffffff',
              padding: '14px 32px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '16px',
              display: 'inline-block',
            }}
          >
            Profiter de mon cadeau anniversaire
          </Button>
        </Section>

        <Hr style={{ margin: '30px 0', borderColor: '#E5E7EB' }} />

        <Text style={{ fontSize: '13px', color: '#9CA3AF', textAlign: 'center', margin: '0' }}>
          Vous recevez cet email car vous êtes inscrit(e) à notre newsletter ({email}).
        </Text>
        <Text style={{ fontSize: '14px', color: '#6B7280', textAlign: 'center', margin: '16px 0 0' }}>
          Avec toute notre affection,<br />
          <strong>L'équipe La Cabrade</strong> 🏇
        </Text>
      </Section>
    </Base>
  )
}

NewsletterBirthdayTemplate.PreviewProps = {
  email: 'sophie@example.com',
  promoCode: 'ANNIV-XY7Z32',
} as NewsletterBirthdayTemplateProps

export default NewsletterBirthdayTemplate

import { Text, Section, Hr, Button } from '@react-email/components'
import * as React from 'react'
import { Base } from './base'

export const NEWSLETTER_WELCOME = 'newsletter-welcome'

export interface NewsletterWelcomeTemplateProps {
  email: string
  promoCode: string
  preview?: string
}

export const isNewsletterWelcomeData = (data: any): data is NewsletterWelcomeTemplateProps =>
  typeof data.email === 'string' && typeof data.promoCode === 'string'

export const NewsletterWelcomeTemplate: React.FC<NewsletterWelcomeTemplateProps> & {
  PreviewProps: NewsletterWelcomeTemplateProps
} = ({ email, promoCode, preview = 'Votre code -10% est arrivé ! 🎁' }) => {
  return (
    <Base preview={preview}>
      <Section>
        <Text style={{ fontSize: '28px', fontWeight: 'bold', textAlign: 'center', margin: '0 0 10px', color: '#92400E' }}>
          🐴 Merci de votre inscription !
        </Text>

        <Text style={{ fontSize: '16px', textAlign: 'center', color: '#6B7280', margin: '0 0 30px' }}>
          La Cabrade — Sellerie équestre
        </Text>

        <Text style={{ margin: '0 0 20px', lineHeight: '1.6' }}>
          Bienvenue dans la communauté La Cabrade !
        </Text>

        <Text style={{ margin: '0 0 20px', lineHeight: '1.6' }}>
          Vous êtes désormais inscrit(e) à notre newsletter et profiterez en avant-première de nos nouveautés, promotions exclusives et conseils équestres.
        </Text>

        <Hr style={{ margin: '30px 0', borderColor: '#E5E7EB' }} />

        <Section style={{
          backgroundColor: '#FEF3C7',
          padding: '25px',
          borderRadius: '8px',
          margin: '20px 0',
          textAlign: 'center'
        }}>
          <Text style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 10px', color: '#92400E' }}>
            🎁 Votre cadeau de bienvenue
          </Text>
          <Text style={{ fontSize: '14px', margin: '0 0 15px', color: '#1F2937' }}>
            Profitez de <strong>-10% sur votre prochaine commande</strong> avec le code :
          </Text>
          <Text style={{
            fontSize: '26px',
            fontWeight: 'bold',
            margin: '0 0 15px',
            color: '#D97706',
            letterSpacing: '3px',
            backgroundColor: '#FFFFFF',
            padding: '12px 24px',
            borderRadius: '6px',
            display: 'inline-block',
          }}>
            {promoCode}
          </Text>
          <Text style={{ fontSize: '12px', margin: '0', color: '#6B7280' }}>
            Code à usage unique — valable hors articles Outlet déjà soldés
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
            Découvrir la boutique
          </Button>
        </Section>

        <Hr style={{ margin: '30px 0', borderColor: '#E5E7EB' }} />

        <Text style={{ fontSize: '13px', color: '#9CA3AF', textAlign: 'center', margin: '0' }}>
          Vous recevez cet email car vous vous êtes inscrit(e) à notre newsletter avec l'adresse {email}.
        </Text>
        <Text style={{ fontSize: '14px', color: '#6B7280', textAlign: 'center', margin: '16px 0 0' }}>
          À très bientôt,<br />
          <strong>L'équipe La Cabrade</strong> 🏇
        </Text>
      </Section>
    </Base>
  )
}

NewsletterWelcomeTemplate.PreviewProps = {
  email: 'sophie@example.com',
  promoCode: 'NL-ABC123',
} as NewsletterWelcomeTemplateProps

export default NewsletterWelcomeTemplate

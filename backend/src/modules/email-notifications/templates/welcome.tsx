import { Text, Section, Hr, Button } from '@react-email/components'
import * as React from 'react'
import { Base } from './base'

export const WELCOME = 'welcome'

interface WelcomePreviewProps {
  firstName: string
  email: string
  promoCode?: string
}

export interface WelcomeTemplateProps {
  firstName: string
  email: string
  promoCode?: string
  preview?: string
}

export const isWelcomeTemplateData = (data: any): data is WelcomeTemplateProps =>
  typeof data.firstName === 'string' && typeof data.email === 'string'

export const WelcomeTemplate: React.FC<WelcomeTemplateProps> & {
  PreviewProps: WelcomePreviewProps
} = ({ firstName, email, promoCode = 'BIENVENUE10', preview = 'Bienvenue chez La Cabrade !' }) => {
  return (
    <Base preview={preview}>
      <Section>
        <Text style={{ fontSize: '28px', fontWeight: 'bold', textAlign: 'center', margin: '0 0 10px', color: '#D97706' }}>
          🐴 Bienvenue chez La Cabrade !
        </Text>
        
        <Text style={{ fontSize: '16px', textAlign: 'center', color: '#6B7280', margin: '0 0 30px' }}>
          Votre sellerie équestre de confiance
        </Text>

        <Text style={{ margin: '0 0 15px', fontSize: '16px' }}>
          Bonjour {firstName},
        </Text>

        <Text style={{ margin: '0 0 20px', lineHeight: '1.6' }}>
          Nous sommes ravis de vous accueillir dans la famille La Cabrade ! 🎉
        </Text>

        <Text style={{ margin: '0 0 20px', lineHeight: '1.6' }}>
          Depuis des années, nous nous passionnons pour l'équitation et nous nous engageons à vous offrir 
          des produits de sellerie de <strong>qualité supérieure</strong> pour vous et votre cheval.
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
            🎁 Cadeau de Bienvenue
          </Text>
          <Text style={{ fontSize: '14px', margin: '0 0 15px', color: '#1F2937' }}>
            Profitez de <strong>10% de réduction</strong> sur votre première commande avec le code :
          </Text>
          <Text style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            margin: '0 0 15px', 
            color: '#D97706',
            letterSpacing: '2px',
            backgroundColor: '#FFFFFF',
            padding: '10px 20px',
            borderRadius: '6px',
            display: 'inline-block'
          }}>
            {promoCode}
          </Text>
          <Text style={{ fontSize: '12px', margin: '0', color: '#6B7280' }}>
            Code valable pour une utilisation unique
          </Text>
        </Section>

        <Hr style={{ margin: '30px 0', borderColor: '#E5E7EB' }} />

        <Text style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 15px', color: '#1F2937' }}>
          ✨ Ce qui vous attend :
        </Text>

        <Section style={{ margin: '0 0 20px' }}>
          <Text style={{ margin: '0 0 10px', display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ marginRight: '8px' }}>🏆</span>
            <span>Des produits de <strong>qualité professionnelle</strong></span>
          </Text>
          <Text style={{ margin: '0 0 10px', display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ marginRight: '8px' }}>🚚</span>
            <span><strong>Livraison gratuite</strong> dès 100€ d'achat</span>
          </Text>
          <Text style={{ margin: '0 0 10px', display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ marginRight: '8px' }}>💬</span>
            <span>Des <strong>conseils d'experts</strong> passionnés d'équitation</span>
          </Text>
          <Text style={{ margin: '0 0 10px', display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ marginRight: '8px' }}>🔄</span>
            <span><strong>Retours gratuits</strong> sous 30 jours</span>
          </Text>
          <Text style={{ margin: '0 0 10px', display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ marginRight: '8px' }}>🎯</span>
            <span>Des <strong>nouveautés</strong> et <strong>promotions exclusives</strong></span>
          </Text>
        </Section>

        <Section style={{ textAlign: 'center', margin: '30px 0' }}>
          <Button
            href="https://www.sellerie-lacabrade.be/store"
            style={{
              backgroundColor: '#D97706',
              color: '#ffffff',
              padding: '14px 32px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '16px',
              display: 'inline-block'
            }}
          >
            Découvrir la boutique
          </Button>
        </Section>

        <Hr style={{ margin: '30px 0', borderColor: '#E5E7EB' }} />

        <Text style={{ fontSize: '14px', color: '#6B7280', textAlign: 'center', margin: '0 0 10px' }}>
          Une question ? Notre équipe est là pour vous aider !
        </Text>
        <Text style={{ fontSize: '14px', color: '#6B7280', textAlign: 'center', margin: '0 0 20px' }}>
          📧 <a href="mailto:contact@sellerie-lacabrade.be" style={{ color: '#D97706' }}>contact@sellerie-lacabrade.be</a>
        </Text>

        <Text style={{ fontSize: '14px', color: '#6B7280', textAlign: 'center', margin: '20px 0 0' }}>
          À très bientôt,<br/>
          <strong>L'équipe La Cabrade</strong> 🏇
        </Text>
      </Section>
    </Base>
  )
}

WelcomeTemplate.PreviewProps = {
  firstName: 'Sophie',
  email: 'sophie@example.com',
  promoCode: 'BIENVENUE10'
} as WelcomePreviewProps

export default WelcomeTemplate




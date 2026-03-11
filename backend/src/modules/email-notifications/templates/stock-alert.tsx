import { Text, Section, Hr, Button } from '@react-email/components'
import * as React from 'react'
import { Base } from './base'

export const STOCK_ALERT = 'stock-alert'

interface StockAlertPreviewProps {
  productTitle: string
  productUrl: string
  productImage?: string
  customerEmail: string
}

export interface StockAlertTemplateProps {
  productTitle: string
  productUrl: string
  productImage?: string
  customerEmail: string
  preview?: string
}

export const isStockAlertTemplateData = (data: any): data is StockAlertTemplateProps =>
  typeof data.productTitle === 'string' && typeof data.productUrl === 'string'

export const StockAlertTemplate: React.FC<StockAlertTemplateProps> & {
  PreviewProps: StockAlertPreviewProps
} = ({ 
  productTitle, 
  productUrl, 
  productImage, 
  customerEmail,
  preview = 'Bonne nouvelle ! Le produit est de retour en stock !' 
}) => {
  return (
    <Base preview={preview}>
      <Section>
        <Text style={{ fontSize: '28px', fontWeight: 'bold', textAlign: 'center', margin: '0 0 10px', color: '#D97706' }}>
          🎉 De Retour en Stock !
        </Text>
        
        <Text style={{ fontSize: '16px', textAlign: 'center', color: '#6B7280', margin: '0 0 30px' }}>
          Le produit que vous attendiez est à nouveau disponible
        </Text>

        <Hr style={{ margin: '30px 0', borderColor: '#E5E7EB' }} />

        {productImage && (
          <Section style={{ textAlign: 'center', margin: '20px 0' }}>
            <img 
              src={productImage} 
              alt={productTitle}
              style={{ 
                maxWidth: '300px', 
                height: 'auto', 
                borderRadius: '8px',
                border: '2px solid #E5E7EB'
              }} 
            />
          </Section>
        )}

        <Section style={{ 
          backgroundColor: '#FEF3C7', 
          padding: '25px', 
          borderRadius: '8px', 
          margin: '20px 0',
          textAlign: 'center'
        }}>
          <Text style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 10px', color: '#1F2937' }}>
            {productTitle}
          </Text>
          <Text style={{ fontSize: '14px', margin: '0 0 20px', color: '#6B7280' }}>
            Ce produit est à nouveau en stock ! Dépêchez-vous, les stocks sont limités.
          </Text>
          <Button
            href={productUrl}
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
            Voir le produit
          </Button>
        </Section>

        <Hr style={{ margin: '30px 0', borderColor: '#E5E7EB' }} />

        <Text style={{ fontSize: '14px', color: '#6B7280', lineHeight: '1.6', margin: '0 0 15px' }}>
          ⚡ <strong>Agissez vite !</strong> Les produits populaires partent rapidement. Ne manquez pas cette opportunité.
        </Text>

        <Text style={{ fontSize: '14px', color: '#6B7280', lineHeight: '1.6', margin: '0 0 20px' }}>
          💝 <strong>Livraison gratuite</strong> dès 100€ d'achat en Belgique.
        </Text>

        <Hr style={{ margin: '30px 0', borderColor: '#E5E7EB' }} />

        <Text style={{ fontSize: '12px', color: '#9CA3AF', textAlign: 'center', margin: '0 0 10px' }}>
          Vous recevez cet email car vous avez demandé à être averti du retour en stock de ce produit.
        </Text>
        
        <Text style={{ fontSize: '12px', color: '#9CA3AF', textAlign: 'center', margin: '0 0 20px' }}>
          Si vous ne souhaitez plus recevoir ces alertes, vous pouvez vous désabonner depuis votre compte.
        </Text>

        <Text style={{ fontSize: '14px', color: '#6B7280', textAlign: 'center', margin: '20px 0 0' }}>
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

StockAlertTemplate.PreviewProps = {
  productTitle: 'Selle Dressage Cuir Premium',
  productUrl: 'https://www.sellerie-lacabrade.be/products/selle-dressage-premium',
  productImage: 'https://via.placeholder.com/300x300',
  customerEmail: 'client@example.com'
} as StockAlertPreviewProps

export default StockAlertTemplate

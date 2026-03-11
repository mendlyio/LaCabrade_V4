import { Text, Section, Button } from '@react-email/components'
import * as React from 'react'
import { Base } from './base'

export const PASSWORD_RESET = 'password-reset'

export interface PasswordResetTemplateProps {
  reset_url: string
  email?: string
  preview?: string
}

export const isPasswordResetTemplateData = (data: any): data is PasswordResetTemplateProps =>
  typeof data?.reset_url === 'string'

export const PasswordResetTemplate: React.FC<PasswordResetTemplateProps> = ({
  reset_url,
  email,
  preview = 'Réinitialisez votre mot de passe'
}) => {
  return (
    <Base preview={preview}>
      <Section>
        <Text style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center', margin: '0 0 30px', color: '#D97706' }}>
          Réinitialisation de votre mot de passe
        </Text>

        <Text style={{ margin: '0 0 15px', fontSize: '16px' }}>
          Bonjour{email ? ` ${email}` : ''},
        </Text>

        <Text style={{ margin: '0 0 25px', lineHeight: '1.6' }}>
          Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte La Cabrade.
          Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe.
        </Text>

        <Section style={{ textAlign: 'center', margin: '30px 0' }}>
          <Button
            href={reset_url}
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
            Réinitialiser mon mot de passe
          </Button>
        </Section>

        <Text style={{ margin: '0 0 10px', fontSize: '14px', color: '#6B7280' }}>
          Ou copiez ce lien dans votre navigateur :
        </Text>
        <Text style={{ margin: '0 0 25px', fontSize: '12px', color: '#2563eb', wordBreak: 'break-all' }}>
          <a href={reset_url} style={{ color: '#2563eb' }}>{reset_url}</a>
        </Text>

        <Text style={{ margin: '0 0 10px', fontSize: '12px', color: '#6B7280' }}>
          Ce lien expire bientôt pour des raisons de sécurité.
        </Text>
        <Text style={{ margin: '0 0 20px', fontSize: '12px', color: '#6B7280' }}>
          Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email. Votre mot de passe restera inchangé.
        </Text>

        <Text style={{ fontSize: '14px', color: '#6B7280', textAlign: 'center', margin: '20px 0 0' }}>
          L'équipe La Cabrade
        </Text>
      </Section>
    </Base>
  )
}

export default PasswordResetTemplate

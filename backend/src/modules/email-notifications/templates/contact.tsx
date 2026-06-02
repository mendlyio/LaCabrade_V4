import { Html, Body, Head, Preview } from '@react-email/components'
import * as React from 'react'

export const CONTACT_FORM = 'contact-form'
export const CONTACT_CONFIRMATION = 'contact-confirmation'

export interface ContactEmailProps {
  /** HTML complet et auto-stylé construit côté route /store/contact */
  html: string
  preview?: string
}

export const isContactEmailData = (data: any): data is ContactEmailProps =>
  !!data && typeof data.html === 'string' && data.html.length > 0

/**
 * Template générique : rend le HTML déjà composé (en-tête, corps, footer) tel quel.
 * Utilisé pour le formulaire de contact (email équipe + confirmation client).
 */
export const ContactEmailTemplate: React.FC<ContactEmailProps> = ({
  html,
  preview = 'La Cabrade',
}) => {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: '#f4f4f5', margin: 0, padding: 0 }}>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </Body>
    </Html>
  )
}

export default ContactEmailTemplate

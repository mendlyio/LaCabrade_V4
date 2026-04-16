import { Text, Section, Hr, Button } from '@react-email/components'
import * as React from 'react'
import { Base } from './base'

export const ORDER_STATUS_UPDATED = 'order-status-updated'

export interface OrderStatusUpdatedTemplateProps {
  order: {
    id: string
    display_id: string | number
    email: string
    status: string
    created_at?: string
  }
  newStatus: string
  preview?: string
}

export const isOrderStatusUpdatedTemplateData = (data: any): data is OrderStatusUpdatedTemplateProps =>
  typeof data.order === 'object' && typeof data.newStatus === 'string'

const STATUS_LABELS: Record<string, { label: string; description: string; color: string }> = {
  pending: {
    label: 'En attente',
    description: 'Votre commande est en attente de traitement.',
    color: '#f59e0b',
  },
  processing: {
    label: 'En cours de traitement',
    description: 'Votre commande est en cours de préparation.',
    color: '#3b82f6',
  },
  completed: {
    label: 'Terminée',
    description: 'Votre commande a été traitée avec succès.',
    color: '#10b981',
  },
  canceled: {
    label: 'Annulée',
    description: 'Votre commande a été annulée. Si vous avez des questions, n\'hésitez pas à nous contacter.',
    color: '#ef4444',
  },
  requires_action: {
    label: 'Action requise',
    description: 'Une action est requise pour votre commande. Veuillez nous contacter.',
    color: '#f97316',
  },
  archived: {
    label: 'Archivée',
    description: 'Votre commande a été archivée.',
    color: '#6b7280',
  },
}

export const OrderStatusUpdatedTemplate = ({
  order,
  newStatus,
  preview,
}: OrderStatusUpdatedTemplateProps) => {
  const statusInfo = STATUS_LABELS[newStatus] || {
    label: newStatus,
    description: `Le statut de votre commande a été mis à jour : ${newStatus}.`,
    color: '#6b7280',
  }

  const displayId = order.display_id || order.id
  const storeUrl = process.env.STORE_URL || 'https://www.sellerie-lacabrade.be'

  return (
    <Base preview={preview || `Mise à jour de votre commande #${displayId}`}>
      {/* En-tête statut */}
      <Section style={{ textAlign: 'center', padding: '32px 0 16px' }}>
        <div
          style={{
            display: 'inline-block',
            backgroundColor: statusInfo.color,
            color: '#ffffff',
            borderRadius: '24px',
            padding: '8px 24px',
            fontSize: '14px',
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          {statusInfo.label}
        </div>
      </Section>

      {/* Titre */}
      <Section>
        <Text
          style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#1f2937',
            textAlign: 'center',
            margin: '0 0 8px',
          }}
        >
          Mise à jour de votre commande #{displayId}
        </Text>
        <Text
          style={{
            fontSize: '15px',
            color: '#6b7280',
            textAlign: 'center',
            margin: '0 0 24px',
          }}
        >
          {statusInfo.description}
        </Text>
      </Section>

      <Hr style={{ borderColor: '#e5e7eb', margin: '0 0 24px' }} />

      {/* Détails commande */}
      <Section
        style={{
          backgroundColor: '#f9fafb',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
        }}
      >
        <Text style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 4px' }}>
          Numéro de commande
        </Text>
        <Text style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937', margin: '0 0 16px' }}>
          #{displayId}
        </Text>
        <Text style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 4px' }}>
          Nouveau statut
        </Text>
        <Text
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: statusInfo.color,
            margin: '0',
          }}
        >
          {statusInfo.label}
        </Text>
      </Section>

      {/* CTA */}
      <Section style={{ textAlign: 'center', marginBottom: '24px' }}>
        <Button
          href={`${storeUrl}/account/orders`}
          style={{
            backgroundColor: '#d4793b',
            color: '#ffffff',
            padding: '12px 32px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Voir mes commandes
        </Button>
      </Section>

      <Hr style={{ borderColor: '#e5e7eb', margin: '0 0 16px' }} />

      <Text style={{ fontSize: '13px', color: '#9ca3af', textAlign: 'center', margin: '0' }}>
        Des questions ? Contactez-nous à{' '}
        <a href="mailto:contact@sellerie-lacabrade.be" style={{ color: '#d4793b' }}>
          contact@sellerie-lacabrade.be
        </a>
      </Text>
    </Base>
  )
}

export default OrderStatusUpdatedTemplate

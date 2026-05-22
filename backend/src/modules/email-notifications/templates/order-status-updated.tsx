import { Text, Section, Hr, Button } from '@react-email/components'
import * as React from 'react'
import { Base } from './base'
import { getCustomStatusDef, STORE_PICKUP_INFO } from '../../../lib/order-custom-statuses'

export const ORDER_STATUS_UPDATED = 'order-status-updated'

export interface OrderStatusUpdatedTemplateProps {
  order: {
    id: string
    display_id: string | number
    email: string
    status: string
    created_at?: string
  }
  /**
   * Statut envoyé dans l'email. Peut être :
   *  - Un statut Medusa natif (pending, processing, completed, …)
   *  - Un statut custom (recue, expediee, dispo_magasin, …) défini dans
   *    lib/order-custom-statuses.ts
   */
  newStatus: string
  /** Note libre éventuelle à inclure dans le mail. */
  customMessage?: string
  /** Données contextuelles injectées selon le statut. */
  context?: {
    bpostTracking?: string | null
    bpostTrackingUrl?: string | null
    pickupRelais?: {
      name?: string | null
      address?: string | null
      postalCode?: string | null
      city?: string | null
    } | null
  }
  preview?: string
}

export const isOrderStatusUpdatedTemplateData = (data: any): data is OrderStatusUpdatedTemplateProps =>
  typeof data.order === 'object' && typeof data.newStatus === 'string'

// Statuts Medusa natifs (anciens — gardés pour compatibilité descendante)
const NATIVE_STATUS_LABELS: Record<string, { label: string; description: string; color: string }> = {
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
    description: "Votre commande a été annulée. Si vous avez des questions, n'hésitez pas à nous contacter.",
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
  customMessage,
  context,
  preview,
}: OrderStatusUpdatedTemplateProps) => {
  // Statut custom prioritaire — sinon fallback sur statut Medusa natif
  const customDef = getCustomStatusDef(newStatus)
  const statusInfo = customDef
    ? { label: customDef.label, description: customDef.emailBody, color: customDef.color }
    : NATIVE_STATUS_LABELS[newStatus] || {
        label: newStatus,
        description: `Le statut de votre commande a été mis à jour : ${newStatus}.`,
        color: '#6b7280',
      }

  const displayId = order.display_id || order.id
  const storeUrl = process.env.STORE_URL || 'https://www.sellerie-lacabrade.be'

  const showBpost = customDef?.contexts.includes('bpost_tracking') && context?.bpostTracking
  const showStore = customDef?.contexts.includes('pickup_store')
  const showRelais = customDef?.contexts.includes('pickup_relais') && context?.pickupRelais

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
            lineHeight: '1.5',
          }}
        >
          {statusInfo.description}
        </Text>
      </Section>

      {/* Message personnalisé éventuel */}
      {customMessage && customMessage.trim() && (
        <Section
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '24px',
          }}
        >
          <Text style={{ fontSize: '14px', color: '#92400e', margin: 0, lineHeight: '1.5' }}>
            {customMessage}
          </Text>
        </Section>
      )}

      {/* Suivi Bpost */}
      {showBpost && (
        <Section
          style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '12px',
            padding: '18px',
            marginBottom: '24px',
          }}
        >
          <Text style={{ fontSize: '13px', color: '#047857', margin: '0 0 4px', fontWeight: 600 }}>
            NUMÉRO DE SUIVI
          </Text>
          <Text
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#065f46',
              margin: '0 0 12px',
              fontFamily: 'monospace',
              letterSpacing: '0.05em',
            }}
          >
            {context!.bpostTracking}
          </Text>
          {context?.bpostTrackingUrl && (
            <Button
              href={context.bpostTrackingUrl}
              style={{
                backgroundColor: '#059669',
                color: '#ffffff',
                padding: '10px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Suivre mon colis
            </Button>
          )}
        </Section>
      )}

      {/* Point relais Bpost */}
      {showRelais && context?.pickupRelais && (
        <Section
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '12px',
            padding: '18px',
            marginBottom: '24px',
          }}
        >
          <Text style={{ fontSize: '13px', color: '#92400e', margin: '0 0 8px', fontWeight: 600 }}>
            POINT RELAIS BPOST
          </Text>
          {context.pickupRelais.name && (
            <Text style={{ fontSize: '15px', fontWeight: 700, color: '#78350f', margin: '0 0 4px' }}>
              {context.pickupRelais.name}
            </Text>
          )}
          {context.pickupRelais.address && (
            <Text style={{ fontSize: '14px', color: '#78350f', margin: '0 0 2px' }}>
              {context.pickupRelais.address}
            </Text>
          )}
          {(context.pickupRelais.postalCode || context.pickupRelais.city) && (
            <Text style={{ fontSize: '14px', color: '#78350f', margin: '0' }}>
              {context.pickupRelais.postalCode} {context.pickupRelais.city}
            </Text>
          )}
        </Section>
      )}

      {/* Retrait magasin La Cabrade */}
      {showStore && (
        <Section
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '12px',
            padding: '18px',
            marginBottom: '24px',
          }}
        >
          <Text style={{ fontSize: '13px', color: '#92400e', margin: '0 0 8px', fontWeight: 600 }}>
            OÙ NOUS TROUVER
          </Text>
          <Text style={{ fontSize: '15px', fontWeight: 700, color: '#78350f', margin: '0 0 4px' }}>
            {STORE_PICKUP_INFO.name}
          </Text>
          <Text style={{ fontSize: '14px', color: '#78350f', margin: '0 0 2px' }}>
            {STORE_PICKUP_INFO.street}
          </Text>
          <Text style={{ fontSize: '14px', color: '#78350f', margin: '0 0 12px' }}>
            {STORE_PICKUP_INFO.postalCode} {STORE_PICKUP_INFO.city} — {STORE_PICKUP_INFO.country}
          </Text>
          <Text style={{ fontSize: '13px', color: '#92400e', margin: '0 0 6px', fontWeight: 600 }}>
            HORAIRES
          </Text>
          {STORE_PICKUP_INFO.hours.map((h) => (
            <Text key={h.day} style={{ fontSize: '13px', color: '#78350f', margin: '0 0 2px' }}>
              <span style={{ display: 'inline-block', minWidth: '140px' }}>{h.day}</span>
              {h.hours}
            </Text>
          ))}
          <Text style={{ fontSize: '13px', color: '#78350f', margin: '12px 0 0' }}>
            📞 {STORE_PICKUP_INFO.phone}
          </Text>
        </Section>
      )}

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
          État
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

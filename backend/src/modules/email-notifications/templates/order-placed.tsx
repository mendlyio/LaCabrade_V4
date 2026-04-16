import { Text, Section, Hr, Button, Img, Row, Column, Link } from '@react-email/components'
import * as React from 'react'
import { Base } from './base'
import { OrderDTO, OrderAddressDTO } from '@medusajs/framework/types'

export const ORDER_PLACED = 'order-placed'

export interface SuggestedProduct {
  title: string
  thumbnail: string
  url: string
}

interface OrderPlacedPreviewProps {
  order: OrderDTO & { display_id: string; display_total?: number; summary: { raw_current_order_total: { value: number } } }
  shippingAddress: OrderAddressDTO
  suggestedProducts?: SuggestedProduct[]
}

export interface OrderPlacedTemplateProps {
  order: OrderDTO & {
    display_id: string
    display_total?: number
    summary?: { raw_current_order_total?: { value?: number } }
  }
  shippingAddress: OrderAddressDTO
  suggestedProducts?: SuggestedProduct[]
  preview?: string
}

export const isOrderPlacedTemplateData = (data: any): data is OrderPlacedTemplateProps =>
  typeof data.order === 'object' && typeof data.shippingAddress === 'object'

function formatPrice(amount: number): string {
  return amount.toFixed(2).replace('.', ',') + ' €'
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('fr-BE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return new Date(dateStr).toLocaleDateString()
  }
}

function isGiftCardItem(item: any): boolean {
  return !!(
    item.metadata?.is_gift_card ||
    String(item.product_title || item.title || '').toLowerCase().includes('bon cadeau') ||
    (item.variant_sku || '').startsWith('GC-')
  )
}

function getItemUnitPriceEuros(item: any): number {
  return Number(item.unit_price) || 0
}

export const OrderPlacedTemplate: React.FC<OrderPlacedTemplateProps> & {
  PreviewProps: OrderPlacedPreviewProps
} = ({
  order,
  shippingAddress,
  suggestedProducts,
  preview = 'Merci pour votre commande chez La Cabrade !',
}) => {
  const items = order.items || []
  const shippingMethods = (order as any).shipping_methods || []
  const pickupLocation = (order as any).metadata?.pickup_location

  // Coût brut de livraison (avant ajustements/promos)
  const shippingCostRaw = shippingMethods.reduce(
    (sum: number, m: any) => sum + (Number(m.amount) || 0),
    0
  )
  // Ajustements sur les méthodes de livraison (livraison gratuite via code promo = montant négatif)
  const shippingAdjustmentTotal = shippingMethods.reduce((sum: number, m: any) => {
    const adjs: any[] = m.adjustments || []
    return sum + adjs.reduce((s: number, a: any) => s + Number(a.amount || 0), 0)
  }, 0)
  // Coût effectif de livraison après promos (0 si livraison offerte)
  const shippingCost = Math.max(0, shippingCostRaw + shippingAdjustmentTotal)

  // Réductions sur les articles (depuis les adjustments Medusa — HT → TTC)
  const VAT_RATE = 0.21
  const itemDiscountHT = items.reduce((sum, item) => {
    const adjs: any[] = (item as any).adjustments || []
    return sum + adjs.reduce((s: number, a: any) => s + Math.abs(Number(a.amount || 0)), 0)
  }, 0)
  const itemDiscountTotal = Math.round(itemDiscountHT * (1 + VAT_RATE) * 100) / 100
  // Réduction livraison (différence entre brut et effectif)
  const shippingDiscountTotal = Math.max(0, shippingCostRaw - shippingCost)
  const totalDiscount = itemDiscountTotal + shippingDiscountTotal

  // Déduction bon cadeau depuis order.metadata.applied_gift_cards
  const appliedGiftCards: Array<{ code: string; balance: number }> =
    (order as any).metadata?.applied_gift_cards || []
  const giftCardTotal = appliedGiftCards.reduce(
    (sum, gc) => sum + Number(gc.balance || 0),
    0
  )

  // Total payé : display_total autoritatif (calculé depuis order.total dans le subscriber)
  // Inclut déjà les déductions GC, promos, livraison
  const total = Number(
    (order as any).display_total
    ?? (order as any).summary?.current_order_total
    ?? (order as any).summary?.original_order_total
  )

  return (
    <Base preview={preview}>
      {/* Brand Header */}
      <Section style={{ textAlign: 'center' as const, padding: '0 0 8px' }}>
        <Text style={{
          fontSize: '11px',
          fontWeight: 'bold' as const,
          letterSpacing: '3px',
          textTransform: 'uppercase' as const,
          color: '#92400E',
          margin: '0 0 2px',
        }}>
          LA CABRADE
        </Text>
        <Text style={{ fontSize: '12px', color: '#9CA3AF', margin: '0' }}>
          Sellerie Équestre
        </Text>
      </Section>

      <Hr style={{ borderColor: '#E5E7EB', margin: '16px 0 24px' }} />

      {/* Confirmation */}
      <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
        <Text style={{
          fontSize: '24px',
          fontWeight: 'bold' as const,
          color: '#059669',
          margin: '0 0 8px',
        }}>
          Commande confirmée
        </Text>
        <Text style={{
          fontSize: '16px',
          color: '#374151',
          margin: '0',
          lineHeight: '1.5',
        }}>
          Merci pour votre commande, <strong>{shippingAddress.first_name}</strong> !
        </Text>
      </Section>

      {/* Order Meta */}
      <Section style={{
        backgroundColor: '#F9FAFB',
        borderRadius: '8px',
        padding: '16px 20px',
        margin: '0 0 24px',
      }}>
        <Row>
          <Column>
            <Text style={{ margin: '0', fontSize: '12px', color: '#6B7280' }}>Commande</Text>
            <Text style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 'bold' as const, color: '#1F2937' }}>
              #{order.display_id}
            </Text>
          </Column>
          <Column style={{ textAlign: 'right' as const }}>
            <Text style={{ margin: '0', fontSize: '12px', color: '#6B7280' }}>Date</Text>
            <Text style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 'bold' as const, color: '#1F2937' }}>
              {formatDate(String(order.created_at))}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Items */}
      <Text style={{
        fontSize: '16px',
        fontWeight: 'bold' as const,
        color: '#1F2937',
        margin: '0 0 16px',
      }}>
        Récapitulatif
      </Text>

      <Section>
        {items.map((item) => {
          const unitPrice = getItemUnitPriceEuros(item)
          const lineTotal = unitPrice * (item.quantity || 1)
          const showVariant =
            item.variant_title &&
            item.variant_title !== item.product_title &&
            item.variant_title.toLowerCase() !== 'default'

          return (
            <Row key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
              <Column style={{ width: '56px', verticalAlign: 'top' as const, padding: '12px 12px 12px 0' }}>
                {(item as any).thumbnail ? (
                  <Img
                    src={(item as any).thumbnail}
                    width={48}
                    height={48}
                    alt={item.product_title}
                    style={{ borderRadius: '6px', display: 'block' }}
                  />
                ) : (
                  <div style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: '#F3F4F6',
                    borderRadius: '6px',
                  }} />
                )}
              </Column>
              <Column style={{ verticalAlign: 'top' as const, padding: '12px 0' }}>
                <Text style={{ margin: '0', fontWeight: '600' as const, fontSize: '14px', color: '#1F2937' }}>
                  {item.product_title}
                </Text>
                {showVariant && (
                  <Text style={{ margin: '2px 0 0', fontSize: '12px', color: '#6B7280' }}>
                    {item.variant_title}
                  </Text>
                )}
                <Text style={{ margin: '4px 0 0', fontSize: '12px', color: '#9CA3AF' }}>
                  {formatPrice(unitPrice)} × {item.quantity}
                </Text>
              </Column>
              <Column style={{ width: '80px', verticalAlign: 'top' as const, padding: '12px 0 12px 8px', textAlign: 'right' as const }}>
                <Text style={{ margin: '0', fontWeight: '600' as const, fontSize: '14px', color: '#1F2937' }}>
                  {formatPrice(lineTotal)}
                </Text>
              </Column>
            </Row>
          )
        })}
      </Section>

      {/* Totals */}
      <Section style={{ padding: '16px 0 0' }}>
        {shippingMethods.length > 0 && (
          <Row>
            <Column>
              <Text style={{ margin: '0 0 4px', fontSize: '14px', color: '#6B7280' }}>
                Livraison ({shippingMethods[0].name})
              </Text>
            </Column>
            <Column style={{ textAlign: 'right' as const }}>
              <Text style={{
                margin: '0 0 4px',
                fontSize: '14px',
                color: shippingCost === 0 ? '#059669' : '#1F2937',
                fontWeight: shippingCost === 0 ? ('600' as const) : ('400' as const),
              }}>
                {shippingCost > 0 ? formatPrice(shippingCost) : 'Offerte'}
              </Text>
            </Column>
          </Row>
        )}
        {totalDiscount > 0 && (
          <Row>
            <Column>
              <Text style={{ margin: '0 0 4px', fontSize: '14px', color: '#059669' }}>
                Réduction(s)
              </Text>
            </Column>
            <Column style={{ textAlign: 'right' as const }}>
              <Text style={{
                margin: '0 0 4px',
                fontSize: '14px',
                fontWeight: '600' as const,
                color: '#059669',
              }}>
                -{formatPrice(totalDiscount)}
              </Text>
            </Column>
          </Row>
        )}
        {giftCardTotal > 0 && (
          <Row>
            <Column>
              <Text style={{ margin: '0 0 4px', fontSize: '14px', color: '#059669' }}>
                Bon(s) cadeau
              </Text>
            </Column>
            <Column style={{ textAlign: 'right' as const }}>
              <Text style={{
                margin: '0 0 4px',
                fontSize: '14px',
                fontWeight: '600' as const,
                color: '#059669',
              }}>
                -{formatPrice(giftCardTotal)}
              </Text>
            </Column>
          </Row>
        )}
      </Section>

      <Hr style={{ borderColor: '#D1D5DB', margin: '8px 0 12px' }} />

      <Section>
        <Row>
          <Column>
            <Text style={{ margin: '0', fontSize: '18px', fontWeight: 'bold' as const, color: '#1F2937' }}>
              Total payé
            </Text>
          </Column>
          <Column style={{ textAlign: 'right' as const }}>
            <Text style={{ margin: '0', fontSize: '18px', fontWeight: 'bold' as const, color: '#92400E' }}>
              {formatPrice(total)}
            </Text>
          </Column>
        </Row>
      </Section>

      <Hr style={{ borderColor: '#E5E7EB', margin: '24px 0' }} />

      {/* Shipping Address */}
      <Text style={{
        fontSize: '16px',
        fontWeight: 'bold' as const,
        color: '#1F2937',
        margin: '0 0 12px',
      }}>
        {pickupLocation ? 'Retrait en magasin' : 'Adresse de livraison'}
      </Text>

      {pickupLocation && (
        <Section style={{
          backgroundColor: '#FEF3C7',
          borderRadius: '6px',
          padding: '12px 16px',
          margin: '0 0 12px',
        }}>
          <Text style={{ margin: '0', fontSize: '14px', fontWeight: '600' as const, color: '#92400E' }}>
            {pickupLocation.name}
          </Text>
          <Text style={{ margin: '4px 0 0', fontSize: '13px', color: '#78350F' }}>
            {pickupLocation.address}
          </Text>
        </Section>
      )}

      <Section style={{
        backgroundColor: '#F9FAFB',
        borderRadius: '6px',
        padding: '12px 16px',
        margin: '0 0 4px',
      }}>
        <Text style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '600' as const, color: '#1F2937' }}>
          {shippingAddress.first_name} {shippingAddress.last_name}
        </Text>
        {(shippingAddress as any).company && (
          <Text style={{ margin: '0 0 2px', fontSize: '13px', color: '#6B7280' }}>
            {(shippingAddress as any).company}
          </Text>
        )}
        <Text style={{ margin: '0 0 2px', fontSize: '13px', color: '#6B7280' }}>
          {shippingAddress.address_1}
        </Text>
        {shippingAddress.address_2 && (
          <Text style={{ margin: '0 0 2px', fontSize: '13px', color: '#6B7280' }}>
            {shippingAddress.address_2}
          </Text>
        )}
        <Text style={{ margin: '0', fontSize: '13px', color: '#6B7280' }}>
          {shippingAddress.postal_code} {shippingAddress.city}
          {shippingAddress.province ? `, ${shippingAddress.province}` : ''}
          {' — '}
          {(shippingAddress.country_code || '').toUpperCase()}
        </Text>
      </Section>

      {/* Cross-sell */}
      {suggestedProducts && suggestedProducts.length > 0 && (
        <>
          <Hr style={{ borderColor: '#E5E7EB', margin: '24px 0' }} />

          <Text style={{
            fontSize: '16px',
            fontWeight: 'bold' as const,
            color: '#1F2937',
            margin: '0 0 4px',
            textAlign: 'center' as const,
          }}>
            Complétez votre équipement
          </Text>
          <Text style={{
            fontSize: '13px',
            color: '#9CA3AF',
            margin: '0 0 16px',
            textAlign: 'center' as const,
          }}>
            Sélection choisie pour vous
          </Text>

          <Section>
            <Row>
              {suggestedProducts.map((product) => (
                <Column
                  key={product.url}
                  style={{
                    width: `${Math.floor(100 / suggestedProducts.length)}%`,
                    textAlign: 'center' as const,
                    verticalAlign: 'top' as const,
                    padding: '0 6px',
                  }}
                >
                  <Link href={product.url} style={{ textDecoration: 'none' }}>
                    <Img
                      src={product.thumbnail}
                      alt={product.title}
                      width={130}
                      height={130}
                      style={{
                        borderRadius: '8px',
                        display: 'block',
                        margin: '0 auto 8px',
                        border: '1px solid #E5E7EB',
                      }}
                    />
                    <Text style={{
                      margin: '0',
                      fontSize: '13px',
                      color: '#374151',
                      fontWeight: '500' as const,
                      lineHeight: '1.3',
                    }}>
                      {product.title}
                    </Text>
                  </Link>
                </Column>
              ))}
            </Row>
          </Section>

          <Section style={{ textAlign: 'center' as const, margin: '16px 0 0' }}>
            <Button
              href="https://www.sellerie-lacabrade.be/store"
              style={{
                backgroundColor: '#92400E',
                color: '#ffffff',
                padding: '10px 24px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: '600' as const,
                fontSize: '13px',
              }}
            >
              Découvrir toute la boutique
            </Button>
          </Section>
        </>
      )}

      <Hr style={{ borderColor: '#E5E7EB', margin: '24px 0 16px' }} />

      {/* Footer */}
      <Text style={{
        fontSize: '13px',
        color: '#6B7280',
        textAlign: 'center' as const,
        margin: '0 0 8px',
        lineHeight: '1.5',
      }}>
        Une question sur votre commande ?{' '}
        <Link href="mailto:contact@sellerie-lacabrade.be" style={{ color: '#92400E' }}>
          Contactez-nous
        </Link>
      </Text>
      <Text style={{
        fontSize: '13px',
        color: '#6B7280',
        textAlign: 'center' as const,
        margin: '0',
        lineHeight: '1.5',
      }}>
        Merci pour votre confiance !
        <br />
        <strong>L&apos;équipe La Cabrade</strong>
      </Text>
    </Base>
  )
}

OrderPlacedTemplate.PreviewProps = {
  order: {
    id: 'test-order-id',
    display_id: '1042',
    display_total: 156.90,
    created_at: new Date().toISOString(),
    email: 'marie.dupont@example.com',
    currency_code: 'EUR',
    items: [
      {
        id: 'item-1',
        title: 'Noir / Taille M',
        product_title: 'Veste d\'équitation Classique',
        variant_title: 'Noir / Taille M',
        quantity: 1,
        unit_price: 129.90,
        thumbnail: 'https://via.placeholder.com/100x100/F3F4F6/374151?text=Veste',
      },
      {
        id: 'item-2',
        title: 'Marron',
        product_title: 'Cravache cuir tressé',
        variant_title: 'Marron',
        quantity: 2,
        unit_price: 12.50,
        thumbnail: 'https://via.placeholder.com/100x100/F3F4F6/374151?text=Cravache',
      },
    ],
    shipping_methods: [
      { name: 'Bpost Standard', amount: 6.50 },
    ],
    summary: { raw_current_order_total: { value: 161.40 } },
  } as any,
  shippingAddress: {
    first_name: 'Marie',
    last_name: 'Dupont',
    address_1: 'Rue de la Sellerie 42',
    city: 'Bruxelles',
    province: '',
    postal_code: '1000',
    country_code: 'be',
  },
  suggestedProducts: [
    {
      title: 'Tapis de selle Dressage Premium',
      thumbnail: 'https://via.placeholder.com/200x200/FEF3C7/92400E?text=Tapis',
      url: 'https://www.sellerie-lacabrade.be/products/tapis-dressage-premium',
    },
    {
      title: 'Bonnet anti-mouches élégant',
      thumbnail: 'https://via.placeholder.com/200x200/FEF3C7/92400E?text=Bonnet',
      url: 'https://www.sellerie-lacabrade.be/products/bonnet-anti-mouches',
    },
  ],
} as OrderPlacedPreviewProps

export default OrderPlacedTemplate

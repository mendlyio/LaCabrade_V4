import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Text } from "@medusajs/ui"

/**
 * Affiche un encadré rouge bien visible sur la page commande lorsque le client
 * a souscrit l'assurance colis. Permet à l'équipe de penser à assurer le colis
 * auprès de Bpost avant l'expédition.
 */
const OrderInsuranceWidget = ({ data: order }: { data: any }) => {
  try {
    const insurance = order?.metadata?.insurance as
      | { enabled?: boolean; amount?: number; tier?: string; goods_value?: number }
      | undefined

    if (!insurance || insurance.enabled !== true) {
      return null
    }

    const amount = Number(insurance.amount ?? 0)
    const tier = insurance.tier ? String(insurance.tier) : null
    const goods = Number(insurance.goods_value ?? 0)

    return (
      <Container className="p-0 mb-2">
        <div
          style={{
            border: "2px solid #dc2626",
            backgroundColor: "#fef2f2",
            borderRadius: "8px",
            padding: "16px 20px",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "22px", lineHeight: "1.2" }}>🛡️</span>
          <div>
            <Text
              weight="plus"
              style={{ color: "#991b1b", fontSize: "15px", margin: 0 }}
            >
              ⚠️ Attention — le client a pris une assurance sur son colis
            </Text>
            <Text style={{ color: "#b91c1c", fontSize: "13px", marginTop: "4px" }}>
              Pensez à assurer ce colis auprès de Bpost avant l&apos;expédition.
              {amount > 0 && ` Montant facturé au client : ${amount.toFixed(2)} €`}
              {tier && ` (couverture ${tier})`}
              {goods > 0 && ` — valeur des articles : ${goods.toFixed(2)} €.`}
            </Text>
          </div>
        </div>
      </Container>
    )
  } catch {
    return null
  }
}

export const config = defineWidgetConfig({
  zone: "order.details.before",
})

export default OrderInsuranceWidget

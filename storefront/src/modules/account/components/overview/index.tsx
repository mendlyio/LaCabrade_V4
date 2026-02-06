import { Container } from "@medusajs/ui"

import ChevronDown from "@modules/common/icons/chevron-down"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type OverviewProps = {
  customer: HttpTypes.StoreCustomer | null
  orders: HttpTypes.StoreOrder[] | null
}

const Overview = ({ customer, orders }: OverviewProps) => {
  return (
    <div data-testid="overview-page-wrapper">
      <div className="hidden small:block">
        <div className="flex flex-col gap-2 mb-6">
          <span
            className="text-2xl font-semibold text-gray-900"
            data-testid="welcome-message"
            data-value={customer?.first_name}
          >
            Bonjour {customer?.first_name}
          </span>
          <span className="text-sm text-gray-600">
            Connecté avec{" "}
            <span
              className="font-semibold text-gray-900"
              data-testid="customer-email"
              data-value={customer?.email}
            >
              {customer?.email}
            </span>
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Profil complété</h3>
                <div className="flex items-end gap-2">
                  <span
                    className="text-3xl font-bold text-gray-900"
                    data-testid="customer-profile-completion"
                    data-value={getProfileCompletion(customer)}
                  >
                    {getProfileCompletion(customer)}%
                  </span>
                  <span className="text-xs uppercase tracking-wide text-gray-500">
                    complété
                  </span>
                </div>
              </div>
              <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Adresses enregistrées</h3>
                <div className="flex items-end gap-2">
                  <span
                    className="text-3xl font-bold text-gray-900"
                    data-testid="addresses-count"
                    data-value={customer?.addresses?.length || 0}
                  >
                    {customer?.addresses?.length || 0}
                  </span>
                  <span className="text-xs uppercase tracking-wide text-gray-500">
                    sauvegardées
                  </span>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl p-5 bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Dernières commandes</h3>
                <LocalizedClientLink
                  href="/account/orders"
                  className="text-sm text-amber-600 hover:text-amber-700 font-semibold"
                >
                  Voir tout
                </LocalizedClientLink>
              </div>
              <ul className="flex flex-col gap-y-3" data-testid="orders-wrapper">
                {orders && orders.length > 0 ? (
                  orders.slice(0, 5).map((order) => {
                    return (
                      <li
                        key={order.id}
                        data-testid="order-wrapper"
                        data-value={order.id}
                      >
                        <LocalizedClientLink
                          href={`/account/orders/details/${order.id}`}
                        >
                          <Container className="bg-gray-50 border border-gray-200 rounded-lg flex justify-between items-center p-4 hover:border-amber-300 hover:shadow-sm transition-all">
                            <div className="grid grid-cols-3 grid-rows-2 text-sm gap-x-4 flex-1">
                              <span className="font-semibold text-gray-700">Date</span>
                              <span className="font-semibold text-gray-700">Commande</span>
                              <span className="font-semibold text-gray-700">Total</span>
                              <span data-testid="order-created-date">
                                {new Date(order.created_at).toLocaleDateString("fr-FR")}
                              </span>
                              <span
                                data-testid="order-id"
                                data-value={order.display_id}
                              >
                                #{order.display_id}
                              </span>
                              <span data-testid="order-amount">
                                {convertToLocale({
                                  amount: order.total,
                                  currency_code: order.currency_code,
                                })}
                              </span>
                            </div>
                            <span className="sr-only">
                              Voir la commande #{order.display_id}
                            </span>
                            <ChevronDown className="-rotate-90 text-gray-400" />
                          </Container>
                        </LocalizedClientLink>
                      </li>
                    )
                  })
                ) : (
                  <span data-testid="no-orders-message" className="text-sm text-gray-500">
                    Aucune commande récente
                  </span>
                )}
              </ul>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Actions rapides</h3>
            <div className="space-y-3">
              <LocalizedClientLink
                href="/account/profile"
                className="flex items-center justify-between rounded-lg bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:text-amber-700 hover:border-amber-300 border border-gray-200 transition-colors"
              >
                Mettre à jour mon profil
                <ChevronDown className="-rotate-90 text-gray-400" />
              </LocalizedClientLink>
              <LocalizedClientLink
                href="/account/addresses"
                className="flex items-center justify-between rounded-lg bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:text-amber-700 hover:border-amber-300 border border-gray-200 transition-colors"
              >
                Gérer mes adresses
                <ChevronDown className="-rotate-90 text-gray-400" />
              </LocalizedClientLink>
              <LocalizedClientLink
                href="/account/orders"
                className="flex items-center justify-between rounded-lg bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:text-amber-700 hover:border-amber-300 border border-gray-200 transition-colors"
              >
                Suivre mes commandes
                <ChevronDown className="-rotate-90 text-gray-400" />
              </LocalizedClientLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const getProfileCompletion = (customer: HttpTypes.StoreCustomer | null) => {
  let count = 0

  if (!customer) {
    return 0
  }

  if (customer.email) {
    count++
  }

  if (customer.first_name && customer.last_name) {
    count++
  }

  if (customer.phone) {
    count++
  }

  const billingAddress = customer.addresses?.find(
    (addr) => addr.is_default_billing
  )

  if (billingAddress) {
    count++
  }

  return (count / 4) * 100
}

export default Overview

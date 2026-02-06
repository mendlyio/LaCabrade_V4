import React from "react"

import UnderlineLink from "@modules/common/components/interactive-link"

import AccountNav from "../components/account-nav"
import { HttpTypes } from "@medusajs/types"

interface AccountLayoutProps {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
}

const AccountLayout: React.FC<AccountLayoutProps> = ({
  customer,
  children,
}) => {
  return (
    <div className="flex-1 bg-gradient-to-b from-white to-gray-50 py-10 small:py-14" data-testid="account-page">
      <div className="content-container">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Mon compte</h1>
          <p className="text-gray-600 mt-2">
            Gérez vos informations, vos adresses et vos commandes en un seul endroit.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
          <div className="grid grid-cols-1 small:grid-cols-[260px_1fr] gap-6 p-6 sm:p-10">
            <div>{customer && <AccountNav customer={customer} />}</div>
            <div className="flex-1">{children}</div>
          </div>

          <div className="flex flex-col small:flex-row items-start small:items-center justify-between border-t border-gray-100 px-6 sm:px-10 py-6 gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Besoin d'aide ?</h3>
              <span className="text-sm text-gray-600">
                Consultez notre page contact pour obtenir une réponse rapide.
              </span>
            </div>
            <div>
              <UnderlineLink href="/contact">
                Nous contacter
              </UnderlineLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountLayout

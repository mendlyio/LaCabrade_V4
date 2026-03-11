import { getCustomer } from "@lib/data/customer"
import { refreshAuthToken } from "@lib/data/auth-refresh"
import AccountLayout from "@modules/account/templates/account-layout"

export default async function AccountPageLayout({
  dashboard,
  login,
}: {
  dashboard?: React.ReactNode
  login?: React.ReactNode
}) {
  const customer = await getCustomer().catch(() => null)

  if (!customer) {
    return <>{login}</>
  }

  // Rafraîchir le token à chaque visite du compte pour prolonger la session
  refreshAuthToken()

  return <AccountLayout customer={customer}>{dashboard}</AccountLayout>
}

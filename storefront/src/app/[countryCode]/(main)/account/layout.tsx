import { getCustomer } from "@lib/data/customer"
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

  return <AccountLayout customer={customer}>{dashboard}</AccountLayout>
}

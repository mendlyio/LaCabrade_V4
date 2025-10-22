import { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Mes commandes - La Cabrade",
}

export default function CommandesPage({
  params,
}: {
  params: { countryCode: string }
}) {
  // Rediriger vers la page account
  redirect(`/${params.countryCode}/account`)
}


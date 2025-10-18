import { Metadata } from "next"
import WishlistTemplate from "@modules/wishlist/templates/wishlist-template"
import { getRegion } from "@lib/data/regions"

export const metadata: Metadata = {
  title: "Ma Liste de Souhaits | La Cabrade",
  description: "Retrouvez tous vos produits favoris dans votre liste de souhaits",
}

type Props = {
  params: { countryCode: string }
}

export default async function WishlistPage({ params }: Props) {
  const { countryCode } = params
  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  return (
    <WishlistTemplate 
      region={region} 
      countryCode={countryCode} 
    />
  )
}


import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCategoryByHandle, listCategories } from "@lib/data/categories"
import { listRegions } from "@lib/data/regions"
import { StoreProductCategory, StoreRegion } from "@medusajs/types"
import CategoryTemplateModern from "@modules/categories/templates/category-template-modern"
import BreadcrumbJsonLd from "@modules/common/components/json-ld/breadcrumb-jsonld"

type Props = {
  params: Promise<{ category: string[]; countryCode: string }>
  searchParams: {
    sortBy?: string
    page?: string
    q?: string
    collection?: string
    price_min?: string
    price_max?: string
    in_stock?: string
    on_sale?: string
  }
}

// Force dynamic rendering to avoid build-time API calls
export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  // Skip static generation if backend is not available (Railway builds)
  try {
    const product_categories = await listCategories()

    if (!product_categories) {
      return []
    }

    const countryCodes = await listRegions().then((regions: StoreRegion[]) =>
      regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat()
    )

    const categoryHandles = product_categories.map(
      (category: any) => category.handle
    )

    const staticParams = countryCodes
      ?.map((countryCode: string | undefined) =>
        categoryHandles.map((handle: any) => ({
          countryCode,
          category: [handle],
        }))
      )
      .flat()

    return staticParams
  } catch (error) {
    console.log('⚠️  Backend not available during build, skipping static generation')
    return []
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { category, countryCode } = await params
    const { product_categories } = await getCategoryByHandle(category)

    if (!product_categories || product_categories.length === 0) {
      return { title: "Catégorie | La Cabrade" }
    }

    const title = product_categories
      .map((category: StoreProductCategory) => category.name)
      .join(" | ")

    const lastCategory = product_categories[product_categories.length - 1]
    const handle = (lastCategory?.handle || "").toLowerCase()

    // Titres SEO ciblés par catégorie — incluent les mots-clés recherchés
    const seoTitles: Record<string, string> = {
      "cavalier": "Vêtements & Équipement Cavalier — Sellerie La Cabrade Liège",
      "cheval": "Équipement Cheval — Selles, Tapis, Briderie | La Cabrade Belgique",
      "casques": "Casques d'Équitation Homologués — Samshield, GPA, KEP | La Cabrade",
      "bottes-et-bottines": "Bottes d'Équitation & Demi-Jambes — Parlanti, Tattini | La Cabrade",
      "bottes": "Bottes d'Équitation & Demi-Jambes — Parlanti, Tattini | La Cabrade",
      "selles": "Selles d'Équitation Dressage & CSO — Equipe, Childéric | La Cabrade",
      "selles-sur-mesure": "Selles sur Mesure — Equipe, Childéric, Stubben | La Cabrade Liège",
      "pantalons": "Pantalons d'Équitation Femme & Homme — Grandes Marques | La Cabrade",
      "outlet": "Outlet Équestre — Soldes & Promotions jusqu'à -60% | La Cabrade",
      "nouveautes": "Nouveautés Équestres — Vêtements & Équipement | La Cabrade Belgique",
      "protections-dorsales-et-airbags": "Gilets Airbag & Protège-Dos Équitation — Hit Air, Helite | La Cabrade",
      "briderie": "Briderie Équestre — Brides, Filets, Licols, Rênes | La Cabrade",
      "brides-et-bridons": "Brides & Bridons Équitation — Cuir & Synthétique | La Cabrade Belgique",
      "tapis": "Tapis de Selle — Dressage, CSO, Randonnée | La Cabrade Belgique",
      "couvertures-anti-eczema-et-anti-mouche": "Couvertures Anti-Mouche & Anti-Eczéma Cheval | La Cabrade",
      "couvertures": "Couvertures Cheval — Écurie, Paddock, Transport | La Cabrade Belgique",
      "-ecurie": "Matériel d'Écurie & Sellerie | La Cabrade Liège",
      "ecurie": "Matériel d'Écurie & Sellerie | La Cabrade Liège",
      "bijoux-et-autres": "Bijoux Équestres & Accessoires Cavalier | La Cabrade Belgique",
      "lc-equestrian": "LC Equestrian — Marque Sellerie La Cabrade | Équipement Artisanal",
      "la-cabrade": "Marque La Cabrade — Équipement Équestre Artisanal | Sellerie Liège",
    }

    // Descriptions SEO riches par catégorie — améliorent le CTR depuis Google
    const seoDescriptions: Record<string, string> = {
      "cavalier": "Vêtements et équipement cavalier : pantalons, vestes, bottes, casques, gants et protections dorsales. Grandes marques équestres livrées en Belgique et France.",
      "cheval": "Équipement pour cheval : selles, briderie, tapis, couvertures, protections, soins et compléments alimentaires. Tout pour le bien-être de votre cheval.",
      "casques": "Casques équestres homologués : Samshield, GPA, Charles Owen, KEP. Sécurité et style pour cavaliers et cavalières. Livraison rapide en Belgique.",
      "selles": "Selles de dressage, CSO et randonnée : Equipe, Childéric, Stubben. Selles sur mesure disponibles. Sellerie La Cabrade, expert depuis plus de 20 ans.",
      "bottes-et-bottines": "Bottes et demi-jambes d'équitation : Parlanti, Cavallo, Tattini. Bottes sur mesure et prêt-à-porter pour cavaliers et cavalières.",
      "bottes": "Bottes et demi-jambes d'équitation : Parlanti, Cavallo, Tattini. Bottes sur mesure et prêt-à-porter pour cavaliers et cavalières.",
      "outlet": "Outlet équestre : soldes et promotions jusqu'à -60% sur des articles de grandes marques. Stocks limités, profitez-en vite !",
      "nouveautes": "Nouveautés équestres : les dernières collections de vêtements, équipements et soins pour cavaliers et chevaux. Découvrez les nouveaux arrivages.",
      "selles-sur-mesure": "Selles sur mesure : conception personnalisée avec les marques Equipe, Childéric et Stubben. Prise de morphologie gratuite à Retinne (Liège).",
      "protections-dorsales-et-airbags": "Gilets airbag et protections dorsales : Hit Air, Point Two, Helite. Protection maximale pour cavaliers. Essayage possible en magasin à Retinne.",
      "briderie": "Briderie équestre : brides, filets, licols, rênes et sangles. Large choix de briderie en cuir et synthétique pour toutes les disciplines.",
      "brides-et-bridons": "Brides et bridons pour cheval : cuir anglais, synthétique, western. Toutes disciplines, toutes tailles. Sellerie La Cabrade, Belgique.",
      "tapis": "Tapis de selle : dressage, CSO, randonnée. Tapis sur mesure et collection disponibles chez La Cabrade, sellerie équestre à Retinne (Liège).",
      "couvertures-anti-eczema-et-anti-mouche": "Couvertures anti-mouche et anti-eczéma pour cheval. Protection efficace contre les insectes. Grandes marques équestres chez La Cabrade.",
      "couvertures": "Couvertures pour cheval : d'écurie, de paddock, de transport et de refroidissement. Toutes saisons, toutes marques chez La Cabrade.",
      "pantalons": "Pantalons d'équitation femme et homme : collants, jodhpurs, breeches. Harcour, Cavalleria Toscana, QHP. Livraison rapide en Belgique.",
    }

    const description = lastCategory?.description
      || seoDescriptions[handle]
      || `Découvrez notre sélection ${title} — équipement équestre de qualité chez La Cabrade, sellerie à Retinne (Liège). Livraison rapide en Belgique et France.`

    const seoTitle = seoTitles[handle] || `${title} — Sellerie La Cabrade Belgique`
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://localhost:8000"

    return {
      title: seoTitle,
      description,
      openGraph: {
        title: seoTitle,
        description,
      },
      alternates: {
        canonical: `${baseUrl}/${countryCode}/categories/${category.join("/")}`,
      },
    }
  } catch {
    return { title: "Catégorie | La Cabrade" }
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category, countryCode } = await params
  let product_categories
  try {
    const result = await getCategoryByHandle(category)
    product_categories = result?.product_categories
  } catch (error) {
    console.error("Erreur lors de la récupération des catégories:", error)
    notFound()
  }

  if (!product_categories || product_categories.length === 0) {
    notFound()
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.sellerie-lacabrade.be"
  const breadcrumbItems = [
    { name: "Accueil", url: `${baseUrl}/${countryCode}` },
    { name: "Boutique", url: `${baseUrl}/${countryCode}/store` },
    ...product_categories.map((cat: StoreProductCategory, idx: number) => ({
      name: cat.name,
      url: `${baseUrl}/${countryCode}/categories/${category.slice(0, idx + 1).join("/")}`,
    })),
  ]

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <CategoryTemplateModern
        categories={product_categories}
        searchParams={searchParams}
        countryCode={countryCode}
      />
    </>
  )
}

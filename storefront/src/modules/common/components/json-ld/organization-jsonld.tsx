const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://localhost:8000"

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "La Cabrade",
  url: BASE_URL,
  logo: "https://ik.imagekit.io/kodt9cn6f/Logo-cabrade.webp",
  description:
    "Sellerie équestre La Cabrade : équipement cavalier et cheval, cuirs artisanaux, LC Equestrian et grandes marques.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Rue de la Clef, 96",
    addressLocality: "Fléron",
    postalCode: "4620",
    addressCountry: "BE",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+3243586099",
    contactType: "customer service",
    availableLanguage: ["French", "Dutch"],
  },
  sameAs: [
    "https://www.facebook.com/SellerieLaCabrade/?locale=fr_FR",
    "https://www.instagram.com/lacabrade/?hl=fr",
    "https://www.tiktok.com/@selleriela.cabrade",
  ],
}

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "La Cabrade",
  url: BASE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${BASE_URL}/be/store?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
}

export default function OrganizationJsonLd() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </>
  )
}

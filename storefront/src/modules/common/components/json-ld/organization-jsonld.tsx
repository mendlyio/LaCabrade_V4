const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://localhost:8000"

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "La Cabrade",
  url: BASE_URL,
  logo: "https://ik.imagekit.io/kodt9cn6f/Cabrade/favicon.ico",
  description:
    "Sellerie équestre La Cabrade : équipement cavalier et cheval, cuirs artisanaux, LC Equestrian et grandes marques.",
  address: {
    "@type": "PostalAddress",
    addressCountry: "BE",
  },
  sameAs: [],
}

export default function OrganizationJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
    />
  )
}

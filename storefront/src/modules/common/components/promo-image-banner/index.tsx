import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type PromoImageBannerProps = {
  /** Activer/désactiver le banner */
  active?: boolean
  /** Date de début UTC (si définie, le banner ne s'affiche qu'à partir de cette date) */
  startDate?: Date
  /** Date de fin UTC (si définie, le banner disparaît automatiquement après cette date) */
  endDate?: Date
  /** URL de l'image du banner */
  src: string
  /** Texte alternatif de l'image */
  alt?: string
  /** Lien cliquable du banner (optionnel) */
  href?: string
  /** Classes CSS supplémentaires */
  className?: string
}

/**
 * Banner promotionnel image réutilisable.
 * Désactiver facilement via la prop `active={false}` ou en passant une `endDate` dépassée.
 */
export default function PromoImageBanner({
  active = true,
  startDate,
  endDate,
  src,
  alt = "Promotion",
  href,
  className = "",
}: PromoImageBannerProps) {
  if (!active) return null

  const now = new Date()
  if (startDate && now < startDate) return null
  if (endDate && now > endDate) return null

  const banner = (
    <div className={`w-full overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={1920}
        height={600}
        quality={85}
        unoptimized
        className="w-full h-auto object-cover"
        priority
        sizes="100vw"
      />
    </div>
  )

  if (href) {
    return (
      <LocalizedClientLink href={href} className="block w-full">
        {banner}
      </LocalizedClientLink>
    )
  }

  return banner
}

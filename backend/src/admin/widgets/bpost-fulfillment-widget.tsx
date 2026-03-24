"use client"

import { useState } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Badge, Button, Container, Heading, Text, Tooltip } from "@medusajs/ui"

// ─── Icônes inline ────────────────────────────────────────────────────────────

const LabelIcon = (props: React.SVGAttributes<SVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path fillRule="evenodd" d="M5.25 2.25a3 3 0 00-3 3v4.318a3 3 0 00.879 2.121l9.58 9.581c.92.92 2.409.92 3.328 0l5.318-5.318a2.25 2.25 0 000-3.182l-9.58-9.58A3 3 0 0014.682 2.25H5.25zM11.25 8.25a1.125 1.125 0 11-2.25 0 1.125 1.125 0 012.25 0z" clipRule="evenodd" />
  </svg>
)

const DownloadIcon = (props: React.SVGAttributes<SVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
    <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
  </svg>
)

const TrackIcon = (props: React.SVGAttributes<SVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
    <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
  </svg>
)

const MailIcon = (props: React.SVGAttributes<SVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
    <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
  </svg>
)

const CheckIcon = (props: React.SVGAttributes<SVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
  </svg>
)

// ─── Icône maison ─────────────────────────────────────────────────────────────

const HomeIcon = (props: React.SVGAttributes<SVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
    <path fillRule="evenodd" d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z" clipRule="evenodd" />
  </svg>
)

const PinIcon = (props: React.SVGAttributes<SVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
    <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
  </svg>
)

const GlobeIcon = (props: React.SVGAttributes<SVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
  </svg>
)

// ─── Types ────────────────────────────────────────────────────────────────────

type GeneratedData = {
  trackingNumber: string
  labelUrl: string
  emailSent: boolean
}

// ─── Composant principal ───────────────────────────────────────────────────────

const BpostFulfillmentWidget = ({ data: order }: { data: any }) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailStatus, setEmailStatus] = useState<"idle" | "sent" | "error">("idle")
  const [generated, setGenerated] = useState<GeneratedData | null>(null)

  const shippingMethods = Array.isArray(order?.shipping_methods) ? order.shipping_methods : []
  const fulfillments = Array.isArray(order?.fulfillments) ? order.fulfillments : []
  const shippingAddress = order?.shipping_address

  // Détecter une livraison Bpost
  const hasBpostShipping =
    shippingMethods.some((m: any) =>
      (m?.shipping_option?.provider_id || m?.provider_id || "").toString().toLowerCase().includes("bpost")
    ) ||
    shippingMethods.some((m: any) => (m?.name || "").toLowerCase().includes("bpost")) ||
    !!(order?.metadata as any)?.bpost_pickup_point

  const bpostFulfillments = fulfillments.filter((f: any) =>
    (f.provider_id || "").toString().toLowerCase().includes("bpost")
  )

  // Point relais et type de livraison
  const pickupPoint = (order?.metadata as any)?.bpost_pickup_point
  const isPickup = !!pickupPoint
  const countryCode = (shippingAddress?.country_code || "BE").toUpperCase()
  const isBelgium = countryCode === "BE" || countryCode === "BEL"
  const deliveryType = isPickup ? "Point relais" : isBelgium ? "Domicile (Belgique)" : `International (${countryCode})`

  // Données déjà présentes dans les métadonnées de la commande
  const metaLabelUrl: string = (order?.metadata as any)?.bpost_label_url || ""
  const metaTracking: string = (order?.metadata as any)?.bpost_tracking || ""
  const metaShipmentId: string = (order?.metadata as any)?.bpost_shipment_id || ""

  const hasExistingLabel =
    bpostFulfillments.some((f: any) => f.data?.label_url) ||
    !!metaLabelUrl ||
    !!generated?.labelUrl

  const hasAnyBpost = hasBpostShipping || bpostFulfillments.length > 0 || !!metaLabelUrl || !!metaShipmentId

  if (!hasAnyBpost) return null

  // Données effectives (après génération ou depuis métadonnées)
  const effectiveTracking = generated?.trackingNumber || metaTracking
  const effectiveOrderId = order?.id

  // ─── Générer l'étiquette ─────────────────────────────────────────────────

  const handleGenerateLabel = async (forceEmail = false) => {
    if (!effectiveOrderId) return
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch("/admin/bpost/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          order_id: effectiveOrderId,
          send_email: true,
          force_email: forceEmail,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Erreur lors de la génération")
      }
      setGenerated({
        trackingNumber: data?.tracking_number || data?.shipment?.trackingNumber || "",
        labelUrl: data?.shipment?.labelUrl || "",
        emailSent: !!data?.email_sent,
      })
      setEmailStatus(data?.email_sent ? "sent" : "idle")
    } catch (e: any) {
      setError(e?.message || "Erreur inconnue")
    } finally {
      setIsGenerating(false)
    }
  }

  // ─── Renvoyer l'email de suivi ───────────────────────────────────────────

  const handleResendEmail = async () => {
    if (!effectiveOrderId) return
    setIsSendingEmail(true)
    setEmailStatus("idle")
    try {
      const res = await fetch("/admin/bpost/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        // send_email: true sans recréer le shipment — utilise le shipment existant
        body: JSON.stringify({
          order_id: effectiveOrderId,
          send_email: true,
          // forcer la réutilisation du shipment existant en passant les données en metadata
          resend_only: true,
        }),
      })
      const data = await res.json()
      if (!res.ok && !data?.email_sent) {
        setEmailStatus("error")
      } else {
        setEmailStatus("sent")
      }
    } catch {
      setEmailStatus("error")
    } finally {
      setIsSendingEmail(false)
    }
  }

  // ─── Télécharger l'étiquette via notre proxy ─────────────────────────────

  const downloadUrl = effectiveOrderId
    ? `/admin/bpost/download-label/${effectiveOrderId}`
    : null

  // ─── Rendu ───────────────────────────────────────────────────────────────

  return (
    <Container className="divide-y divide-ui-border-base p-0">
      {/* En-tête */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-2">
          <LabelIcon className="text-ui-fg-muted w-5 h-5" />
          <Heading level="h2" className="text-base-semi">
            Bpost — Étiquette d&apos;envoi
          </Heading>
        </div>
        {hasExistingLabel && (
          <Badge color="green" size="small">
            Étiquette générée
          </Badge>
        )}
      </div>

      {/* ── SECTION : Infos livraison (toujours visible) ── */}
      <div className="px-6 py-4 bg-ui-bg-subtle flex flex-col gap-3">

        {/* Type de livraison + adresse */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0">
            {isPickup
              ? <PinIcon className="w-4 h-4 text-amber-600" />
              : isBelgium
                ? <HomeIcon className="w-4 h-4 text-blue-600" />
                : <GlobeIcon className="w-4 h-4 text-purple-600" />
            }
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Text className="text-sm font-semibold text-ui-fg-base">{deliveryType}</Text>
              {shippingMethods[0]?.name && (
                <Badge color="grey" size="small">{shippingMethods[0].name}</Badge>
              )}
            </div>

            {/* Adresse domicile */}
            {!isPickup && shippingAddress && (
              <div className="text-xs text-ui-fg-subtle leading-relaxed mt-1">
                <span className="font-medium text-ui-fg-base">
                  {shippingAddress.first_name} {shippingAddress.last_name}
                </span>
                {shippingAddress.company && <span> — {shippingAddress.company}</span>}
                <br />
                {shippingAddress.address_1}
                {shippingAddress.address_2 && <>, {shippingAddress.address_2}</>}
                <br />
                {shippingAddress.postal_code} {shippingAddress.city}
                {shippingAddress.province && `, ${shippingAddress.province}`}
                {" "}— {countryCode}
                {shippingAddress.phone && (
                  <><br /><span className="text-ui-fg-muted">📞 {shippingAddress.phone}</span></>
                )}
              </div>
            )}

            {/* Point relais */}
            {isPickup && (
              <div className="mt-1 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-2 text-xs text-amber-800 leading-relaxed">
                <div className="font-semibold">{pickupPoint?.Name || pickupPoint?.name || "Point relais"}</div>
                {(pickupPoint?.Address || pickupPoint?.address) && (
                  <div>{pickupPoint.Address || pickupPoint.address}</div>
                )}
                {(pickupPoint?.ZipCode || pickupPoint?.PostalCode) && (
                  <div>{pickupPoint.ZipCode || pickupPoint.PostalCode} {pickupPoint.City || pickupPoint.city}</div>
                )}
                {shippingAddress && (
                  <div className="mt-1 pt-1 border-t border-amber-200 text-amber-700">
                    Destinataire : {shippingAddress.first_name} {shippingAddress.last_name}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Email client */}
        {order?.email && (
          <div className="flex items-center gap-2 text-xs text-ui-fg-subtle">
            <MailIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{order.email}</span>
          </div>
        )}
      </div>

      <div className="px-6 py-5 flex flex-col gap-4">

        {/* ── SECTION : Pas encore d'étiquette ── */}
        {!hasExistingLabel && hasBpostShipping && !generated && (
          <div className="flex flex-col gap-3">
            <Text className="text-ui-fg-subtle text-sm">
              Cliquez sur le bouton ci-dessous pour créer l&apos;expédition Bpost, télécharger l&apos;étiquette et envoyer
              automatiquement le numéro de suivi au client par email.
            </Text>
            <Button
              variant="primary"
              size="base"
              onClick={() => handleGenerateLabel(false)}
              disabled={isGenerating}
              className="self-start"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Génération en cours…
                </span>
              ) : (
                "Générer l'étiquette Bpost"
              )}
            </Button>
            {error && (
              <div className="bg-ui-bg-base-pressed border border-ui-border-error rounded-lg px-4 py-3">
                <Text className="text-ui-fg-error text-sm">{error}</Text>
              </div>
            )}
          </div>
        )}

        {/* ── SECTION : Étiquette venant d'être générée (succès) ── */}
        {generated && (
          <div className="bg-ui-bg-base-pressed border border-ui-border-base rounded-lg p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-ui-fg-positive">
              <CheckIcon className="w-5 h-5 flex-shrink-0" />
              <Text className="font-semibold text-sm">Étiquette générée avec succès !</Text>
            </div>

            {generated.trackingNumber && (
              <div className="flex flex-col gap-1">
                <Text className="text-ui-fg-subtle text-xs uppercase tracking-wider font-medium">
                  Numéro de suivi
                </Text>
                <Text className="font-mono text-sm font-semibold">{generated.trackingNumber}</Text>
              </div>
            )}

            {generated.emailSent ? (
              <div className="flex items-center gap-2 text-ui-fg-positive">
                <MailIcon className="w-4 h-4 flex-shrink-0" />
                <Text className="text-sm">Email de suivi envoyé au client</Text>
              </div>
            ) : generated.trackingNumber ? (
              <Text className="text-ui-fg-subtle text-sm">Email non envoyé (erreur).</Text>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 flex flex-col gap-2">
                <Text className="text-amber-800 text-xs">
                  ⚠️ Aucun numéro de suivi reçu — le compte Bpost n&apos;a pas de plages de codes-barres activées.
                  Contactez Bpost pour les activer, ou envoyez l&apos;email sans lien de suivi.
                </Text>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => handleGenerateLabel(true)}
                  disabled={isGenerating}
                  className="self-start"
                >
                  <MailIcon className="w-3.5 h-3.5 mr-1" />
                  Envoyer l&apos;email sans tracking
                </Button>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {downloadUrl && (
                <a href={downloadUrl} target="_blank" rel="noreferrer" download>
                  <Button variant="primary" size="small">
                    <DownloadIcon className="w-4 h-4 mr-1" />
                    Télécharger l&apos;étiquette PDF
                  </Button>
                </a>
              )}
              {generated.trackingNumber && (
                <a
                  href={`https://track.bpost.cloud/btr/web/#/search?itemCode=${generated.trackingNumber}&lang=fr`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="secondary" size="small">
                    <TrackIcon className="w-4 h-4 mr-1" />
                    Suivre le colis
                  </Button>
                </a>
              )}
            </div>
          </div>
        )}

        {/* ── SECTION : Étiquette déjà présente en métadonnées (commande rechargée) ── */}
        {!generated && metaLabelUrl && (
          <div className="border border-ui-border-base rounded-lg p-4 flex flex-col gap-3 bg-ui-bg-subtle">
            {effectiveTracking && (
              <div className="flex flex-col gap-1">
                <Text className="text-ui-fg-subtle text-xs uppercase tracking-wider font-medium">
                  Numéro de suivi
                </Text>
                <Text className="font-mono text-sm font-semibold">{effectiveTracking}</Text>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {downloadUrl && (
                <a href={downloadUrl} target="_blank" rel="noreferrer" download>
                  <Button variant="primary" size="small">
                    <DownloadIcon className="w-4 h-4 mr-1" />
                    Télécharger l&apos;étiquette PDF
                  </Button>
                </a>
              )}
              {effectiveTracking && (
                <a
                  href={`https://track.bpost.cloud/btr/web/#/search?itemCode=${effectiveTracking}&lang=fr`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="secondary" size="small">
                    <TrackIcon className="w-4 h-4 mr-1" />
                    Suivre le colis
                  </Button>
                </a>
              )}
            </div>
          </div>
        )}

        {/* ── SECTION : Fulfillments Bpost créés via Medusa ── */}
        {bpostFulfillments.map((fulfillment: any) => {
          const labelUrl = fulfillment.data?.label_url
          const trackingUrl = fulfillment.data?.public_tracking_url
          const trackingNumber = fulfillment.data?.trackingNumber || fulfillment.tracking_numbers?.[0]
          const fulfillmentId = fulfillment.id ?? "unknown"

          return (
            <div
              key={fulfillmentId}
              className="border border-ui-border-base rounded-lg p-4 flex flex-col gap-3 bg-ui-bg-subtle"
            >
              <div className="flex items-center justify-between">
                <Text className="font-medium text-sm">
                  Expédition #{(fulfillmentId || "----").toString().slice(-6)}
                </Text>
                <Badge color="blue" size="small">Via Medusa</Badge>
              </div>
              {trackingNumber && (
                <div className="flex flex-col gap-1">
                  <Text className="text-ui-fg-subtle text-xs uppercase tracking-wider font-medium">
                    Numéro de suivi
                  </Text>
                  <Text className="font-mono text-sm font-semibold">{trackingNumber}</Text>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {labelUrl ? (
                  <a href={`/admin/bpost/download-label/${effectiveOrderId}`} target="_blank" rel="noreferrer" download>
                    <Button variant="primary" size="small">
                      <DownloadIcon className="w-4 h-4 mr-1" />
                      Télécharger l&apos;étiquette PDF
                    </Button>
                  </a>
                ) : (
                  <Button disabled size="small" variant="secondary">
                    Pas d&apos;étiquette
                  </Button>
                )}
                {trackingUrl && (
                  <a href={trackingUrl} target="_blank" rel="noreferrer">
                    <Button variant="secondary" size="small">
                      <TrackIcon className="w-4 h-4 mr-1" />
                      Suivre le colis
                    </Button>
                  </a>
                )}
              </div>
            </div>
          )
        })}

        {/* ── SECTION : Bouton renvoyer l'email ── */}
        {(hasExistingLabel || generated) && effectiveTracking && (
          <div className="pt-1 border-t border-ui-border-base flex items-center justify-between gap-3">
            <Text className="text-ui-fg-subtle text-sm">
              Renvoyer l&apos;email de suivi au client
            </Text>
            <div className="flex items-center gap-2">
              {emailStatus === "sent" && (
                <span className="flex items-center gap-1 text-ui-fg-positive text-sm">
                  <CheckIcon className="w-4 h-4" />
                  Envoyé
                </span>
              )}
              {emailStatus === "error" && (
                <Text className="text-ui-fg-error text-sm">Échec d&apos;envoi</Text>
              )}
              <Button
                variant="secondary"
                size="small"
                onClick={handleResendEmail}
                disabled={isSendingEmail}
              >
                <MailIcon className="w-4 h-4 mr-1" />
                {isSendingEmail ? "Envoi…" : "Renvoyer"}
              </Button>
            </div>
          </div>
        )}

        {/* ── SECTION : Régénérer si l'étiquette existe déjà ── */}
        {hasExistingLabel && !generated && (
          <div className="pt-1 border-t border-ui-border-base flex items-center justify-between gap-3">
            <Text className="text-ui-fg-subtle text-sm">
              Regénérer une nouvelle étiquette pour cette commande
            </Text>
            <Button
              variant="secondary"
              size="small"
          onClick={() => handleGenerateLabel(false)}
          disabled={isGenerating}
        >
          {isGenerating ? "Génération…" : "Regénérer"}
            </Button>
          </div>
        )}

        {error && !isGenerating && (
          <div className="bg-ui-bg-base-pressed border border-ui-border-error rounded-lg px-4 py-3">
            <Text className="text-ui-fg-error text-sm">{error}</Text>
          </div>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.after",
})

export default BpostFulfillmentWidget

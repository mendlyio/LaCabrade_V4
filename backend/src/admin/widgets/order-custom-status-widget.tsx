import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect, useState } from "react"
import { Badge, Button, Container, Heading, Text, Select, Textarea, Switch, Label } from "@medusajs/ui"

type StatusOption = {
  id: string
  label: string
  description: string
  color: string
  emailEnabledByDefault: boolean
}

type HistoryEntry = {
  status: string
  label?: string
  at: string
  email_sent?: boolean
  actor_id?: string | null
  custom_message?: string | null
}

const OrderCustomStatusWidget = ({ data: order }: { data: any }) => {
  const orderId = order?.id
  const [options, setOptions] = useState<StatusOption[]>([])
  const [current, setCurrent] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [selected, setSelected] = useState<string>("")
  const [sendEmail, setSendEmail] = useState<boolean>(true)
  const [customMessage, setCustomMessage] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const load = async () => {
    if (!orderId) return
    setLoading(true)
    try {
      const res = await fetch(`/admin/orders/${orderId}/custom-status`, {
        credentials: "include",
      })
      const data = await res.json()
      if (Array.isArray(data?.available)) {
        setOptions(data.available)
        setCurrent(data.current || null)
        setHistory(Array.isArray(data.history) ? data.history : [])
        // Présélection : statut courant, sinon premier
        const next = data.current || data.available[0]?.id || ""
        setSelected(next)
        const def = data.available.find((s: StatusOption) => s.id === next)
        if (def) setSendEmail(def.emailEnabledByDefault)
      }
    } catch (e) {
      // silencieux : on n'a pas l'état, on peut quand même afficher un message
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [orderId])

  // Quand on change le statut dans le select, on aligne par défaut le toggle email
  // sur la valeur recommandée pour ce statut.
  const handleStatusChange = (value: string) => {
    setSelected(value)
    setFeedback(null)
    const def = options.find((s) => s.id === value)
    if (def) setSendEmail(def.emailEnabledByDefault)
  }

  const handleSubmit = async () => {
    if (!selected || !orderId) return
    setSaving(true)
    setFeedback(null)
    try {
      const res = await fetch(`/admin/orders/${orderId}/custom-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: selected,
          send_email: sendEmail,
          custom_message: customMessage || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFeedback({ type: "error", text: data?.error || "Erreur lors de la mise à jour" })
        return
      }
      setCustomMessage("")
      if (data.email_error) {
        setFeedback({
          type: "error",
          text: `État changé mais email non envoyé : ${data.email_error}`,
        })
      } else {
        setFeedback({
          type: "success",
          text: data.email_sent
            ? `État "${data.label}" appliqué et email envoyé au client.`
            : `État "${data.label}" appliqué (sans email).`,
        })
      }
      // Recharger l'état + l'historique
      await load()
    } catch (e: any) {
      setFeedback({ type: "error", text: e?.message || "Erreur réseau" })
    } finally {
      setSaving(false)
    }
  }

  const currentDef = options.find((s) => s.id === current)
  const selectedDef = options.find((s) => s.id === selected)

  if (!orderId) return null

  return (
    <Container className="divide-y divide-ui-border-base p-0">
      {/* En-tête */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex flex-col gap-0.5">
          <Heading level="h2" className="text-base-semi">
            État d&apos;avancement
          </Heading>
          <Text className="text-ui-fg-muted text-xs">
            Mise à jour manuelle envoyée au client par email
          </Text>
        </div>
        {currentDef ? (
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide uppercase"
            style={{ backgroundColor: `${currentDef.color}1a`, color: currentDef.color, border: `1px solid ${currentDef.color}55` }}
          >
            {currentDef.label}
          </span>
        ) : current ? (
          <Badge size="small" color="grey">{current}</Badge>
        ) : (
          <Badge size="small" color="grey">Aucun état défini</Badge>
        )}
      </div>

      {/* Form */}
      <div className="px-6 py-5 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="custom-status-select" className="text-sm font-medium">
            Nouvel état
          </Label>
          <Select value={selected} onValueChange={handleStatusChange}>
            <Select.Trigger id="custom-status-select">
              <Select.Value placeholder="Choisir un état…" />
            </Select.Trigger>
            <Select.Content>
              {options.map((o) => (
                <Select.Item key={o.id} value={o.id}>
                  {o.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          {selectedDef && (
            <Text className="text-ui-fg-muted text-xs mt-1">{selectedDef.description}</Text>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="custom-status-message" className="text-sm font-medium">
            Note pour le client <span className="text-ui-fg-muted font-normal">(optionnelle)</span>
          </Label>
          <Textarea
            id="custom-status-message"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Ex : Disponible jusqu'à vendredi 18h, ensuite votre commande sera renvoyée à Bpost."
            rows={2}
          />
        </div>

        <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-ui-bg-subtle border border-ui-border-base">
          <div className="flex flex-col gap-0.5">
            <Text className="text-sm font-medium">Envoyer un email au client</Text>
            <Text className="text-xs text-ui-fg-muted">
              {sendEmail
                ? `Un email sera envoyé à ${order?.email || "ce client"}.`
                : "Aucun email ne sera envoyé."}
            </Text>
          </div>
          <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div>
            {feedback && (
              <Text
                className={`text-sm ${
                  feedback.type === "success" ? "text-ui-fg-positive" : "text-ui-fg-error"
                }`}
              >
                {feedback.text}
              </Text>
            )}
          </div>
          <Button
            variant="primary"
            size="base"
            onClick={handleSubmit}
            disabled={saving || loading || !selected}
          >
            {saving ? "Mise à jour…" : "Mettre à jour"}
          </Button>
        </div>
      </div>

      {/* Historique */}
      {history.length > 0 && (
        <div className="px-6 py-4">
          <Heading level="h3" className="text-sm font-semibold mb-3 text-ui-fg-base">
            Historique des changements
          </Heading>
          <div className="flex flex-col gap-2">
            {[...history].reverse().slice(0, 10).map((h, idx) => {
              const def = options.find((s) => s.id === h.status)
              const color = def?.color || "#6b7280"
              const date = new Date(h.at)
              const dateLabel = isNaN(date.getTime())
                ? h.at
                : date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
              return (
                <div
                  key={`${h.at}-${idx}`}
                  className="flex items-start gap-3 py-1.5 border-l-2 pl-3"
                  style={{ borderColor: color }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Text className="text-sm font-medium" style={{ color }}>
                        {def?.label || h.label || h.status}
                      </Text>
                      {h.email_sent && (
                        <span className="text-[10px] font-semibold text-ui-fg-positive bg-emerald-50 px-1.5 py-0.5 rounded">
                          📧 Email envoyé
                        </span>
                      )}
                    </div>
                    {h.custom_message && (
                      <Text className="text-xs text-ui-fg-subtle italic mt-0.5">
                        « {h.custom_message} »
                      </Text>
                    )}
                  </div>
                  <Text className="text-xs text-ui-fg-muted whitespace-nowrap">{dateLabel}</Text>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.before",
})

export default OrderCustomStatusWidget

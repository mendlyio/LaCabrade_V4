"use client"

import { useId, useState } from "react"
import { useTranslate } from "@lib/context/language-context"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://backend-production-7bbb.up.railway.app"

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

const NewsletterBanner = () => {
  const t = useTranslate()
  const emailInputId = useId()
  const birthdayInputId = useId()
  const [email, setEmail] = useState("")
  const [birthday, setBirthday] = useState("")
  const [honeypot, setHoneypot] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (honeypot) {
      setStatus("success")
      setMessage(t("newsletter.success" as any))
      return
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("error")
      setMessage(t("newsletter.invalid_email" as any))
      return
    }
    if (!birthday) {
      setStatus("error")
      setMessage(t("newsletter.birthday_required_msg" as any))
      return
    }

    setStatus("loading")
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (PUBLISHABLE_KEY) {
        headers["x-publishable-api-key"] = PUBLISHABLE_KEY
      }
      const res = await fetch(`${BACKEND_URL}/store/newsletter`, {
        method: "POST",
        headers,
        body: JSON.stringify({ email, birthday, website: honeypot }),
      })
      const data = await res.json()

      if (res.ok || res.status === 200) {
        setStatus("success")
        setMessage(
          data.already_subscribed
            ? t("newsletter.already_subscribed" as any)
            : t("newsletter.success" as any)
        )
        setEmail("")
        setBirthday("")
        setTimeout(() => {
          setStatus("idle")
          setMessage("")
        }, 8000)
      } else {
        throw new Error(data.message || t("newsletter.error" as any))
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ""
      setStatus("error")
      setMessage(msg || t("newsletter.error" as any))
      setTimeout(() => { setStatus("idle"); setMessage("") }, 6000)
    }
  }

  const disabled = status === "loading" || status === "success"

  return (
    <div className="bg-[#9e354a] py-12">
      <div className="content-container">
        <div className="max-w-xl mx-auto text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
            {t("newsletter.title" as any)}
          </h3>
          <p className="text-white/90 text-lg mb-6">
            {t("newsletter.subtitle" as any).split("10%")[0]}
            <strong className="text-white">10%</strong>
            {t("newsletter.subtitle" as any).split("10%")[1]}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {/* Honeypot */}
            <input
              type="text"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0, height: 0, width: 0 }}
            />

            {/* Email */}
            <label htmlFor={emailInputId} className="sr-only">
              {t("newsletter.email_placeholder" as any)}
            </label>
            <input
              id={emailInputId}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("newsletter.email_placeholder" as any)}
              required
              disabled={disabled}
              className="w-full px-5 py-4 rounded-lg text-gray-900 placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-white
                         disabled:opacity-50 disabled:cursor-not-allowed"
            />

            {/* Anniversaire */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor={birthdayInputId}
                className="text-white/80 text-xs font-medium text-left ml-1 flex items-center gap-1"
              >
                🎂 {t("newsletter.birthday_label" as any)}
                <span className="text-white/50 font-normal">({t("newsletter.birthday_required" as any)})</span>
              </label>
              <input
                id={birthdayInputId}
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                required
                disabled={disabled}
                className={`w-auto px-4 py-3 rounded-lg text-gray-900
                           focus:outline-none focus:ring-2 focus:ring-white
                           disabled:opacity-50 text-sm ${
                  status === "error" && !birthday
                    ? "ring-2 ring-red-300"
                    : ""
                }`}
                style={{ colorScheme: "light" }}
              />
            </div>

            {/* Bouton */}
            <button
              type="submit"
              disabled={disabled}
              className="w-full px-8 py-4 bg-white text-amber-600 font-semibold rounded-lg
                         hover:bg-amber-50 transition-all duration-300 shadow-lg hover:shadow-xl
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "loading"
                ? t("newsletter.subscribing" as any)
                : status === "success"
                ? t("newsletter.subscribed" as any)
                : t("newsletter.subscribe_btn" as any)}
            </button>
          </form>

          {message && (
            <div className={`mt-4 text-sm font-medium ${status === "success" ? "text-white" : "text-red-100"}`}>
              {message}
            </div>
          )}

          <p className="text-white/60 text-xs mt-4">
            {t("newsletter.footer_text" as any)}
          </p>
        </div>
      </div>
    </div>
  )
}

export default NewsletterBanner

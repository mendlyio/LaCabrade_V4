"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "https://backend-production-7bbb.up.railway.app"

const IMG = "https://ik.imagekit.io/kodt9cn6f/popup.webp"
const STORAGE_KEY = "lc_newsletter_popup_dismissed"
const DELAY_MS = 3000

export default function NewsletterPopup() {
  const [visible, setVisible] = useState(false)
  const [email, setEmail] = useState("")
  const [birthday, setBirthday] = useState("")
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle")
  const [errors, setErrors] = useState<{
    email?: string
    birthday?: string
  }>({})
  const [promoCode, setPromoCode] = useState<string | null>(null)

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return
    const t = setTimeout(() => setVisible(true), DELAY_MS)
    return () => clearTimeout(t)
  }, [])

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "1")
    setVisible(false)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: { email?: string; birthday?: string } = {}
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "Email invalide"
    if (!birthday) errs.birthday = "Date d'anniversaire requise"
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setErrors({})
    setStatus("loading")
    try {
      const res = await fetch(`${BACKEND_URL}/store/newsletter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, birthday }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus("success")
        setPromoCode(data.promo_code ?? null)
        localStorage.setItem(STORAGE_KEY, "1")
        setTimeout(() => setVisible(false), 6000)
      } else {
        throw new Error()
      }
    } catch {
      setStatus("error")
      setTimeout(() => setStatus("idle"), 4000)
    }
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss()
      }}
    >
      <div
        className="relative w-full max-w-[420px] sm:max-w-[560px] bg-white rounded-2xl
                   shadow-2xl animate-popup-in flex flex-col sm:flex-row
                   overflow-hidden max-h-[calc(100dvh-2rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={dismiss}
          aria-label="Fermer"
          className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center
                     rounded-full bg-white/80 backdrop-blur hover:bg-white text-gray-400
                     hover:text-gray-700 shadow-sm transition-all"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>

        {/* ── MOBILE : image carrée centrée, entière ── */}
        <div className="sm:hidden flex justify-center flex-shrink-0 pt-6 pb-2">
          <div className="relative w-[140px] h-[140px] rounded-2xl overflow-hidden shadow-lg">
            <Image
              src={IMG}
              alt="La Cabrade"
              fill
              className="object-contain"
              sizes="140px"
              priority
            />
          </div>
        </div>

        {/* ── DESKTOP : colonne gauche avec image carrée centrée ── */}
        <div className="hidden sm:flex flex-shrink-0 w-[220px] bg-[#faf6f2] items-center justify-center self-stretch">
          <Image
            src={IMG}
            alt="La Cabrade"
            width={220}
            height={220}
            className="object-contain"
            priority
          />
        </div>

        {/* ── FORMULAIRE ── */}
        <div className="flex flex-col px-5 py-4 sm:px-6 sm:py-5 flex-1 min-w-0 overflow-y-auto">
          <p className="text-[10px] font-bold tracking-widest text-[#9e354a] uppercase mb-1 text-center sm:text-left">
            La Cabrade
          </p>
          <h2 className="text-lg font-bold text-gray-900 leading-tight mb-1 text-center sm:text-left">
            Un petit bonus pour toi&nbsp;!
          </h2>
          <p className="text-gray-500 text-xs mb-4 leading-relaxed text-center sm:text-left">
            Rejoins-nous et économise{" "}
            <span className="text-[#9e354a] font-bold">10&nbsp;%</span> sur ta
            prochaine commande.
          </p>

          {status === "success" ? (
            <div className="text-center py-2">
              <p className="text-2xl mb-2">🎉</p>
              <p className="text-gray-800 font-semibold text-sm mb-3">
                Ton code -10&nbsp;% t&apos;a été envoyé&nbsp;!
              </p>
              {promoCode && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                    Ton code
                  </p>
                  <code className="text-lg font-bold tracking-widest text-amber-700">
                    {promoCode}
                  </code>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Usage unique · Vérifie tes emails
                  </p>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <Field label="Adresse email" error={errors.email}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setErrors((p) => ({ ...p, email: undefined }))
                  }}
                  placeholder="ton@email.com"
                  disabled={status === "loading"}
                  className={inputClass(!!errors.email)}
                />
              </Field>

              <Field
                label="Date d'anniversaire"
                error={errors.birthday}
                hint={
                  !errors.birthday
                    ? "🎂 -10 % offert chaque année pour ton anniversaire"
                    : undefined
                }
              >
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => {
                    setBirthday(e.target.value)
                    setErrors((p) => ({ ...p, birthday: undefined }))
                  }}
                  disabled={status === "loading"}
                  className={inputClass(!!errors.birthday)}
                  style={{ colorScheme: "light" }}
                />
              </Field>

              {status === "error" && (
                <p className="text-xs text-red-500 text-center">
                  Une erreur s&apos;est produite. Réessaie.
                </p>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full py-3 bg-[#9e354a] hover:bg-[#8a2d3f] text-white font-bold
                           rounded-xl transition-all shadow-md hover:shadow-lg
                           disabled:opacity-60 text-sm tracking-wide mt-1"
              >
                {status === "loading" ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Inscription…
                  </span>
                ) : (
                  "Je veux mon -10 % →"
                )}
              </button>

              <p className="text-center text-[10px] text-gray-400">
                Code à usage unique · Pas de spam · Désinscription en 1 clic
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function inputClass(hasError: boolean) {
  return [
    "w-full px-3.5 py-2.5 rounded-lg border text-sm bg-gray-50 text-gray-900",
    "placeholder-gray-400 focus:outline-none focus:ring-2 transition-all disabled:opacity-50",
    hasError
      ? "border-red-300 ring-1 ring-red-200 focus:ring-red-200"
      : "border-gray-200 focus:border-[#9e354a] focus:ring-[#9e354a]/10",
  ].join(" ")
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
        {label}
        <span className="text-[#9e354a]">*</span>
      </label>
      {children}
      {error ? (
        <p className="text-[11px] text-red-500 leading-tight">{error}</p>
      ) : hint ? (
        <p className="text-[10px] text-gray-400 leading-tight">{hint}</p>
      ) : null}
    </div>
  )
}

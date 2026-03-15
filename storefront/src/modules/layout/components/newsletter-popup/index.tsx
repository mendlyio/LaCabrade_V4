"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "https://backend-production-7bbb.up.railway.app"

const STORAGE_KEY = "lc_newsletter_popup_dismissed"
const DELAY_MS = 3000

export default function NewsletterPopup() {
  const [visible, setVisible] = useState(false)
  const [email, setEmail] = useState("")
  const [birthday, setBirthday] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errors, setErrors] = useState<{ email?: string; birthday?: string }>({})
  const [promoCode, setPromoCode] = useState<string | null>(null)

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (dismissed) return
    const timer = setTimeout(() => setVisible(true), DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "1")
    setVisible(false)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: { email?: string; birthday?: string } = {}
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = "Email invalide"
    if (!birthday)
      newErrors.birthday = "Requis pour recevoir ton cadeau anniversaire"
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    setErrors({})
    setStatus("loading")
    try {
      const res = await fetch(`${BACKEND_URL}/store/newsletter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, birthday }),
      })
      const data = await res.json()
      if (res.ok || res.status === 200) {
        setStatus("success")
        setPromoCode(data.promo_code || null)
        localStorage.setItem(STORAGE_KEY, "1")
        setTimeout(() => setVisible(false), 6000)
      } else throw new Error(data.message || "Erreur")
    } catch {
      setStatus("error")
      setTimeout(() => setStatus("idle"), 4000)
    }
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.60)" }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss() }}
    >
      {/* Carte popup — flex-col mobile, flex-row ≥sm */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl overflow-hidden animate-popup-in w-full max-w-[580px] flex flex-col sm:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Bouton fermer ── */}
        <button
          onClick={dismiss}
          aria-label="Fermer"
          className="absolute top-2.5 right-2.5 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white/95 hover:bg-gray-100 text-gray-400 hover:text-gray-700 shadow transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>

        {/* ── Image carrée — visible uniquement ≥sm ── */}
        <div
          className="hidden sm:block relative flex-shrink-0"
          style={{ width: "240px", height: "240px", alignSelf: "flex-start" }}
        >
          <Image
            src="https://ik.imagekit.io/kodt9cn6f/popup.webp"
            alt="La Cabrade"
            fill
            className="object-cover"
            priority
            sizes="240px"
          />
        </div>

        {/* ── Image bannière mobile — hauteur fixe contrôlée ── */}
        <div className="sm:hidden relative w-full h-36 flex-shrink-0">
          <Image
            src="https://ik.imagekit.io/kodt9cn6f/popup.webp"
            alt="La Cabrade"
            fill
            className="object-cover object-center"
            priority
            sizes="100vw"
          />
          {/* dégradé bas pour transition douce vers le blanc */}
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
        </div>

        {/* ── Contenu formulaire ── */}
        <div className="flex flex-col justify-center px-6 py-5 flex-1 min-w-0">
          <p className="text-[10px] font-bold tracking-widest text-amber-600 uppercase mb-1">
            La Cabrade
          </p>
          <h2 className="text-xl font-bold text-gray-900 leading-snug mb-1">
            Un petit bonus pour toi !
          </h2>
          <p className="text-gray-500 text-xs mb-4 leading-relaxed">
            Inscris-toi et profite de{" "}
            <span className="text-[#9e354a] font-bold">-10%</span>{" "}
            sur ta prochaine commande.
          </p>

          {status === "success" ? (
            <div className="text-center py-2">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-gray-800 font-semibold text-sm mb-3">
                Ton code -10% t&apos;a été envoyé !
              </p>
              {promoCode && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-3">
                  <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wider">Ton code</p>
                  <code className="text-lg font-bold tracking-widest text-amber-700">{promoCode}</code>
                  <p className="text-[10px] text-gray-400 mt-1">Valable une seule fois · Vérifie tes emails</p>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">

              {/* Email */}
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })) }}
                  placeholder="ton@email.com"
                  disabled={status === "loading"}
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-sm bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 ${
                    errors.email
                      ? "border-red-300 focus:ring-red-100"
                      : "border-gray-200 focus:border-amber-400 focus:ring-amber-100"
                  }`}
                />
                {errors.email && (
                  <p className="text-[11px] text-red-500 mt-1 ml-0.5">{errors.email}</p>
                )}
              </div>

              {/* Anniversaire — encadré */}
              <div className={`rounded-xl border p-3 transition-all ${
                errors.birthday ? "border-red-300 bg-red-50" : "border-amber-200 bg-amber-50/60"
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-amber-800">🎂 Ton anniversaire</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                    errors.birthday ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"
                  }`}>
                    obligatoire
                  </span>
                </div>
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => { setBirthday(e.target.value); setErrors((p) => ({ ...p, birthday: undefined })) }}
                  disabled={status === "loading"}
                  className={`w-full px-3 py-2 rounded-lg border text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 transition-all disabled:opacity-50 ${
                    errors.birthday
                      ? "border-red-300 focus:ring-red-100"
                      : "border-amber-200 focus:border-amber-400 focus:ring-amber-100"
                  }`}
                />
                {errors.birthday ? (
                  <p className="text-[11px] text-red-500 mt-1.5">{errors.birthday}</p>
                ) : (
                  <p className="text-[10px] text-amber-700/70 mt-1.5">
                    Un code -10% t&apos;attend chaque année pour ton anniversaire
                  </p>
                )}
              </div>

              {status === "error" && (
                <p className="text-xs text-red-500 text-center">Une erreur s&apos;est produite. Réessaie.</p>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full py-3 bg-[#9e354a] hover:bg-[#8a2d3f] text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-60 text-sm tracking-wide"
              >
                {status === "loading" ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Inscription…
                  </span>
                ) : "Je veux mon -10% →"}
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

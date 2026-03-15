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
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errors, setErrors] = useState<{ email?: string; birthday?: string }>({})
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
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Email invalide"
    if (!birthday) errs.birthday = "Date d'anniversaire requise"
    if (Object.keys(errs).length) { setErrors(errs); return }
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
        setPromoCode(data.promo_code ?? null)
        localStorage.setItem(STORAGE_KEY, "1")
        setTimeout(() => setVisible(false), 6000)
      } else throw new Error()
    } catch {
      setStatus("error")
      setTimeout(() => setStatus("idle"), 4000)
    }
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss() }}
    >
      {/*
        ─── CARTE ───────────────────────────────────────────────────────────
        Mobile  : colonne — image CSS bg carrée en haut, formulaire en bas
        Desktop : rangée — image Next/Image carrée à gauche, formulaire à droite
      */}
      <div
        className="relative w-full sm:w-auto sm:max-w-[560px] bg-white
                   rounded-t-2xl sm:rounded-2xl shadow-2xl animate-popup-in
                   flex flex-col sm:flex-row overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── Bouton fermer ── */}
        <button
          onClick={dismiss}
          aria-label="Fermer"
          className="absolute top-3 right-3 z-20 w-7 h-7 flex items-center justify-center
                     rounded-full bg-white/90 hover:bg-gray-100 text-gray-400 hover:text-gray-700
                     shadow transition-all"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
          </svg>
        </button>

        {/*
          ── IMAGE MOBILE ──────────────────────────────────────────────────
          background-image CSS → hauteur fixe, aucun problème de ratio
        */}
        <div
          className="sm:hidden w-full flex-shrink-0"
          style={{
            height: "180px",
            backgroundImage: `url(${IMG})`,
            backgroundSize: "cover",
            backgroundPosition: "center center",
          }}
        >
          {/* dégradé bas pour transition douce */}
          <div className="w-full h-full" style={{
            background: "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(255,255,255,0) 60%, rgba(255,255,255,1) 100%)"
          }} />
        </div>

        {/*
          ── IMAGE DESKTOP ─────────────────────────────────────────────────
          Carré strict 240 × 240, alignSelf:flex-start → ne s'étire pas
        */}
        <div
          className="hidden sm:block relative flex-shrink-0"
          style={{ width: 240, height: 240, alignSelf: "flex-start" }}
        >
          <Image
            src={IMG}
            alt="La Cabrade"
            fill
            className="object-cover"
            priority
            sizes="240px"
          />
        </div>

        {/* ── FORMULAIRE ── */}
        <div className="flex flex-col justify-center px-6 py-5 flex-1 min-w-0 overflow-y-auto">
          <p className="text-[10px] font-bold tracking-widest text-[#9e354a] uppercase mb-1">
            La Cabrade
          </p>
          <h2 className="text-[1.2rem] font-bold text-gray-900 leading-tight mb-1">
            Un petit bonus pour toi !
          </h2>
          <p className="text-gray-500 text-xs mb-4 leading-relaxed">
            Rejoins-nous et économise{" "}
            <span className="text-[#9e354a] font-bold">10%</span>{" "}
            sur ta prochaine commande.
          </p>

          {status === "success" ? (
            <div className="text-center py-2">
              <p className="text-2xl mb-2">🎉</p>
              <p className="text-gray-800 font-semibold text-sm mb-3">
                Ton code -10% t&apos;a été envoyé !
              </p>
              {promoCode && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Ton code</p>
                  <code className="text-lg font-bold tracking-widest text-amber-700">{promoCode}</code>
                  <p className="text-[10px] text-gray-400 mt-1">Usage unique · Vérifie tes emails</p>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">

              {/* ── Champ email ── */}
              <Field
                label="Adresse email"
                error={errors.email}
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })) }}
                  placeholder="ton@email.com"
                  disabled={status === "loading"}
                  className={inputClass(!!errors.email)}
                />
              </Field>

              {/* ── Champ anniversaire ── */}
              <Field
                label="🎂 Date d'anniversaire"
                hint={!errors.birthday ? "Cadeau -10% offert chaque année pour ton anniversaire" : undefined}
                error={errors.birthday}
              >
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => { setBirthday(e.target.value); setErrors((p) => ({ ...p, birthday: undefined })) }}
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
                           disabled:opacity-60 text-sm tracking-wide"
              >
                {status === "loading" ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
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

/* ── Composants helpers ─────────────────────────────────────────────────── */

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

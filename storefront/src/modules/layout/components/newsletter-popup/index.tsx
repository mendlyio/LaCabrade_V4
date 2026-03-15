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
  const [message, setMessage] = useState("")
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

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("error")
      setMessage("Adresse email invalide")
      return
    }
    if (!birthday) {
      setStatus("error")
      setMessage("Ta date d'anniversaire est requise pour valider l'inscription 🎂")
      return
    }

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
        setMessage(
          data.already_subscribed
            ? "Vous êtes déjà inscrit(e) 🎉"
            : "Votre code -10% vous a été envoyé ! 🎉"
        )
        localStorage.setItem(STORAGE_KEY, "1")
        setTimeout(() => setVisible(false), 5500)
      } else {
        throw new Error(data.message || "Erreur")
      }
    } catch {
      setStatus("error")
      setMessage("Une erreur s'est produite. Réessayez.")
      setTimeout(() => { setStatus("idle"); setMessage("") }, 4000)
    }
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss() }}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row w-full max-w-3xl max-h-[90vh] md:max-h-[620px] animate-popup-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bouton fermer */}
        <button
          onClick={dismiss}
          aria-label="Fermer"
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 hover:bg-gray-100 text-gray-500 hover:text-gray-800 shadow transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>

        {/* Image gauche */}
        <div className="relative w-full md:w-[45%] h-52 md:h-auto flex-shrink-0">
          <Image
            src="https://ik.imagekit.io/kodt9cn6f/popup.webp"
            alt="La Cabrade — Sellerie équestre"
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 45vw"
          />
          <div className="absolute bottom-0 left-0 right-0 h-16 md:hidden bg-gradient-to-t from-white to-transparent" />
        </div>

        {/* Contenu droite */}
        <div className="flex flex-col justify-center px-7 py-8 flex-1 overflow-y-auto">
          <p className="text-xs font-semibold tracking-widest text-amber-600 uppercase mb-2">
            La Cabrade — Sellerie équestre
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-2">
            Un petit bonus<br className="hidden md:block" /> pour toi !
          </h2>
          <p className="text-gray-500 text-sm mb-5 leading-relaxed">
            Rejoins-nous et économise{" "}
            <span className="text-amber-600 font-bold text-base">10%</span>{" "}
            sur ta prochaine commande. Et reçois un cadeau chaque année le jour de ton anniversaire 🎂
          </p>

          {status === "success" ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">🎉</div>
              <p className="text-gray-800 font-semibold text-sm mb-2">{message}</p>
              {promoCode && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-500 mb-1">Ton code -10% :</p>
                  <code className="text-xl font-bold tracking-widest text-amber-700">{promoCode}</code>
                  <p className="text-xs text-gray-400 mt-1">Valable une seule fois · Vérifie tes emails</p>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {/* Email */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">
                  Adresse email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ton@email.com"
                  required
                  disabled={status === "loading"}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all text-sm disabled:opacity-50"
                />
              </div>

              {/* Anniversaire — obligatoire */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                  🎂 Date d'anniversaire <span className="text-red-400">*</span>
                  <span className="text-gray-400 font-normal">(pour recevoir un cadeau chaque année)</span>
                </label>
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  required
                  disabled={status === "loading"}
                  className={`w-full px-4 py-3 rounded-xl border bg-gray-50 text-gray-900 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all text-sm disabled:opacity-50 ${
                    status === "error" && !birthday
                      ? "border-red-300 ring-2 ring-red-100"
                      : "border-gray-200"
                  }`}
                />
              </div>

              {/* Message erreur */}
              {status === "error" && message && (
                <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  {message}
                </p>
              )}

              {/* Bouton */}
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full py-3.5 bg-[#9e354a] hover:bg-[#8a2d3f] text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed text-sm tracking-wide mt-1"
              >
                {status === "loading" ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Inscription en cours...
                  </span>
                ) : (
                  "Je veux mon -10% →"
                )}
              </button>

              <p className="text-center text-xs text-gray-400">
                Code à usage unique · Pas de spam · Désinscription en 1 clic
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://backend-production-7bbb.up.railway.app"

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

const NewsletterForm = () => {
  const [email, setEmail] = useState("")
  const [birthday, setBirthday] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [promoCode, setPromoCode] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("error")
      setMessage("Veuillez entrer une adresse email valide")
      return
    }
    if (!birthday) {
      setStatus("error")
      setMessage("Votre date d'anniversaire est requise pour valider l'inscription 🎂")
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
        body: JSON.stringify({ email, birthday }),
      })
      const data = await res.json()

      if (res.ok || res.status === 200) {
        setStatus("success")
        setPromoCode(data.promo_code || null)
        setMessage(
          data.already_subscribed
            ? "Vous êtes déjà inscrit(e) 🎉 Vérifiez vos emails pour votre code."
            : "Merci ! Votre code -10% vous a été envoyé par email 🎉"
        )
        setEmail("")
        setBirthday("")
        setTimeout(() => {
          setStatus("idle")
          setMessage("")
          setPromoCode(null)
        }, 8000)
      } else {
        throw new Error(data.message || "Erreur inconnue")
      }
    } catch {
      setStatus("error")
      setMessage("Une erreur s'est produite. Veuillez réessayer.")
      setTimeout(() => { setStatus("idle"); setMessage("") }, 5000)
    }
  }

  const disabled = status === "loading" || status === "success"

  return (
    <div className="max-w-xl mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* 1. Email */}
        <div className="relative">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            required
            disabled={disabled}
            className="w-full px-6 py-4 rounded-lg border-2 border-white/20 bg-white/10
                       backdrop-blur-sm text-white placeholder-amber-200
                       focus:outline-none focus:border-white focus:bg-white/20
                       transition-all disabled:opacity-60 box-border"
          />
          {status === "loading" && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* 2. Anniversaire */}
        <div className="flex flex-col gap-1">
          <label className="text-white/80 text-xs font-medium ml-1 flex items-center gap-1">
            🎂 Date d&apos;anniversaire
            <span className="text-white/50 font-normal">(obligatoire — cadeau le jour J)</span>
          </label>
          <input
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            required
            disabled={disabled}
            className={`w-full px-4 py-3 rounded-lg border-2 bg-white/10 backdrop-blur-sm
                       text-white focus:outline-none focus:bg-white/20
                       transition-all disabled:opacity-60 text-sm box-border ${
              status === "error" && !birthday
                ? "border-red-300"
                : "border-white/20 focus:border-white"
            }`}
            style={{ colorScheme: "dark" }}
          />
        </div>

        {/* 3. Bouton */}
        <button
          type="submit"
          disabled={disabled}
          className="w-full px-8 py-4 bg-white text-amber-600 font-bold rounded-lg
                     hover:bg-amber-50 transition-all disabled:opacity-60
                     disabled:cursor-not-allowed hover:scale-[1.02] transform
                     shadow-lg hover:shadow-xl"
        >
          {status === "loading" ? "Inscription..." : status === "success" ? "✓ Inscrit !" : "S'inscrire"}
        </button>
      </form>

      {message && (
        <div
          className={`mt-4 p-4 rounded-lg text-sm font-medium text-center animate-fade-in ${
            status === "success"
              ? "bg-green-500/20 border border-green-300 text-white"
              : "bg-red-500/20 border border-red-300 text-white"
          }`}
        >
          {message}
          {promoCode && status === "success" && (
            <div className="mt-2">
              <span className="text-white/80 text-xs">Votre code : </span>
              <code className="bg-white/20 text-white font-mono font-bold text-base px-3 py-1 rounded ml-1 tracking-widest">
                {promoCode}
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NewsletterForm

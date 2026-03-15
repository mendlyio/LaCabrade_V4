"use client"

import { useState } from "react"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://backend-production-7bbb.up.railway.app"

const NewsletterBanner = () => {
  const [email, setEmail] = useState("")
  const [birthday, setBirthday] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [promoCode, setPromoCode] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("error")
      setMessage("Adresse email invalide")
      return
    }
    if (!birthday) {
      setStatus("error")
      setMessage("Ta date d'anniversaire est requise 🎂")
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
            : "Merci ! Ton code -10% t'a été envoyé 🎉"
        )
        setEmail("")
        setBirthday("")
        setTimeout(() => {
          setStatus("idle")
          setMessage("")
          setPromoCode(null)
        }, 8000)
      } else {
        throw new Error(data.message || "Erreur")
      }
    } catch {
      setStatus("error")
      setMessage("Une erreur s'est produite. Réessayez.")
      setTimeout(() => { setStatus("idle"); setMessage("") }, 4000)
    }
  }

  return (
    <div className="bg-[#9e354a] py-12">
      <div className="content-container">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Un petit bonus pour toi !
          </h3>
          <p className="text-white/90 text-lg mb-6">
            Rejoins-nous et économise <strong className="text-white">10%</strong> dès ton inscription
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-xl mx-auto">
            {/* Ligne email + bouton */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ton adresse email"
                required
                disabled={status === "loading" || status === "success"}
                className="flex-1 px-5 py-4 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={status === "loading" || status === "success"}
                className="px-8 py-4 bg-white text-amber-600 font-semibold rounded-lg hover:bg-amber-50 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {status === "loading" ? "Inscription..." : status === "success" ? "✓ Inscrit(e)" : "S'inscrire"}
              </button>
            </div>

            {/* Anniversaire — toujours visible, obligatoire */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <label className="text-white/90 text-sm whitespace-nowrap font-medium flex items-center gap-1.5">
                🎂 Date d'anniversaire
                <span className="text-white/60 font-normal text-xs">(obligatoire)</span>
              </label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                required
                disabled={status === "loading" || status === "success"}
                className={`flex-1 px-4 py-2.5 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50 text-sm transition-all ${
                  status === "error" && !birthday
                    ? "ring-2 ring-red-300 border-red-300"
                    : ""
                }`}
              />
            </div>
          </form>

          {/* Messages */}
          {message && (
            <div className={`mt-4 text-sm font-medium ${status === "success" ? "text-white" : "text-red-100"}`}>
              {message}
              {promoCode && status === "success" && (
                <div className="mt-2">
                  <span className="text-white/80">Ton code : </span>
                  <code className="bg-white/20 text-white font-mono font-bold text-base px-3 py-1 rounded ml-1 tracking-widest">
                    {promoCode}
                  </code>
                </div>
              )}
            </div>
          )}

          <p className="text-white/60 text-xs mt-4">
            En t'inscrivant tu acceptes nos offres exclusives · Code à usage unique · Désinscription en 1 clic
          </p>
        </div>
      </div>
    </div>
  )
}

export default NewsletterBanner

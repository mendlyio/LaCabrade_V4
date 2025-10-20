"use client"

import { useState } from "react"

const NewsletterForm = () => {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !email.includes("@")) {
      setStatus("error")
      setMessage("Veuillez entrer une adresse email valide")
      return
    }

    setStatus("loading")
    
    // Simuler l'envoi (à remplacer par votre vraie API)
    setTimeout(() => {
      setStatus("success")
      setMessage("Merci ! Vous êtes inscrit à notre newsletter 🎉")
      setEmail("")
      
      // Réinitialiser après 5 secondes
      setTimeout(() => {
        setStatus("idle")
        setMessage("")
      }, 5000)
    }, 1000)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            disabled={status === "loading" || status === "success"}
            className="w-full px-6 py-4 rounded-lg border-2 border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder-amber-200 focus:outline-none focus:border-white focus:bg-white/20 transition-all disabled:opacity-60"
          />
          {status === "loading" && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={status === "loading" || status === "success"}
          className="px-8 py-4 bg-white text-amber-600 font-bold rounded-lg hover:bg-amber-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:scale-105 transform shadow-lg hover:shadow-xl"
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
        </div>
      )}
    </div>
  )
}

export default NewsletterForm





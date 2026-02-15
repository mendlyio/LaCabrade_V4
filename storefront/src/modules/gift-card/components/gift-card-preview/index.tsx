"use client"

import { motion, AnimatePresence } from "framer-motion"

interface GiftCardPreviewProps {
  amount: number
  recipientName: string
  message: string
}

export default function GiftCardPreview({
  amount,
  recipientName,
  message,
}: GiftCardPreviewProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider text-center lg:text-left">
        Aperçu du bon cadeau
      </p>

      {/* Card */}
      <motion.div
        layout
        className="relative overflow-hidden rounded-2xl shadow-2xl bg-gradient-to-br from-amber-50 via-white to-rose-50 border border-amber-100"
        style={{ aspectRatio: "1.6 / 1", minHeight: 280 }}
      >
        {/* Decorative top bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-600 via-amber-500 to-rose-400" />

        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <svg width="100%" height="100%">
            <pattern
              id="gift-pattern"
              x="0"
              y="0"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="20" cy="20" r="1.5" fill="currentColor" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#gift-pattern)" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative flex flex-col items-center justify-between h-full p-6 sm:p-8">
          {/* Header */}
          <div className="text-center">
            <motion.p
              layout="position"
              className="text-xs sm:text-sm font-bold tracking-[0.3em] text-amber-700/80 uppercase"
            >
              La Cabrade
            </motion.p>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 tracking-wider">
              Bon Cadeau
            </p>
          </div>

          {/* Amount */}
          <div className="text-center my-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={amount}
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="text-5xl sm:text-6xl font-bold text-amber-600"
              >
                {amount > 0 ? `${amount}€` : "—€"}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Recipient & Message */}
          <div className="text-center w-full space-y-1.5 min-h-[60px]">
            <AnimatePresence mode="wait">
              {recipientName && (
                <motion.p
                  key={`name-${recipientName}`}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm sm:text-base font-semibold text-gray-800"
                >
                  Pour : {recipientName}
                </motion.p>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {message && (
                <motion.p
                  key={`msg-${message.slice(0, 20)}`}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2, delay: 0.05 }}
                  className="text-xs sm:text-sm text-gray-500 italic line-clamp-2 max-w-[90%] mx-auto"
                >
                  &ldquo;{message}&rdquo;
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Footer: code placeholder */}
          <div className="w-full flex items-center justify-center">
            <div className="bg-amber-600/10 rounded-lg px-4 py-1.5">
              <p className="text-xs font-mono text-amber-700 tracking-wider">
                LC-XXXX-XXXX-XXXX
              </p>
            </div>
          </div>
        </div>

        {/* Decorative bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-500 to-rose-400" />

        {/* Corner decorations */}
        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-amber-300/40 rounded-tl-sm" />
        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-amber-300/40 rounded-tr-sm" />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-amber-300/40 rounded-bl-sm" />
        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-amber-300/40 rounded-br-sm" />
      </motion.div>

      {/* Info badges */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full">
          <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          Valable 1 an
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full">
          <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          En ligne &amp; en magasin
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full">
          <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          Envoi instantané par email
        </span>
      </div>
    </div>
  )
}

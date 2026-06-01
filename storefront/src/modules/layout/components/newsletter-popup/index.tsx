"use client"

import {
  useState,
  useEffect,
  useCallback,
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
} from "react"
import Image from "next/image"
import { useTranslate } from "@lib/context/language-context"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "https://backend-production-7bbb.up.railway.app"

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

// Image Pâques (réutilisable plus tard) :
// const IMG = "https://ik.imagekit.io/kodt9cn6f/Cabrade_Pa%CC%82ques.png"
const IMG = "https://ik.imagekit.io/kodt9cn6f/pop%20up.webp"
const STORAGE_KEY = "lc_newsletter_popup_dismissed"
const DELAY_MS = 3000

export default function NewsletterPopup() {
  const t = useTranslate()
  const [visible, setVisible] = useState(false)
  const [email, setEmail] = useState("")
  const [birthday, setBirthday] = useState("")
  const [honeypot, setHoneypot] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errors, setErrors] = useState<{ email?: string; birthday?: string }>({})

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return
    const timer = setTimeout(() => setVisible(true), DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "1")
    setVisible(false)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (honeypot) {
      setStatus("success")
      localStorage.setItem(STORAGE_KEY, "1")
      setTimeout(() => setVisible(false), 6000)
      return
    }

    const errs: { email?: string; birthday?: string } = {}
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = t("popup.invalid_email" as any)
    if (!birthday) errs.birthday = t("popup.birthday_required" as any)
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setErrors({})
    setStatus("loading")
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (PUBLISHABLE_KEY) headers["x-publishable-api-key"] = PUBLISHABLE_KEY
      const res = await fetch(`${BACKEND_URL}/store/newsletter`, {
        method: "POST",
        headers,
        body: JSON.stringify({ email, birthday, website: honeypot }),
      })
      await res.json()
      if (res.ok) {
        setStatus("success")
        localStorage.setItem(STORAGE_KEY, "1")
        setTimeout(() => setVisible(false), 6000)
      } else {
        throw new Error(t("popup.error_generic" as any))
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ""
      setStatus("error")
      setErrors({ email: msg || t("popup.error_generic" as any) })
      setTimeout(() => { setStatus("idle"); setErrors({}) }, 6000)
    }
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss() }}
    >
      <div
        className="relative w-full max-w-[400px] bg-white rounded-2xl
                   shadow-2xl animate-popup-in flex flex-col
                   overflow-hidden max-h-[calc(100dvh-2rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={dismiss}
          aria-label={t("popup.close" as any)}
          className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center
                     rounded-full bg-white/80 backdrop-blur hover:bg-white text-gray-500
                     hover:text-gray-800 shadow-sm transition-all"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>

        {/* Bannière image — identique sur tous les écrans */}
        <div className="relative w-full flex-shrink-0 bg-[#faf6f2] flex items-center justify-center h-[150px] sm:h-[170px]">
          <Image
            src={IMG}
            alt="La Cabrade"
            fill
            unoptimized
            priority
            className="object-contain p-3"
            sizes="400px"
          />
        </div>

        {/* Formulaire */}
        <div className="flex flex-col px-5 py-4 sm:px-6 sm:py-5 flex-1 min-w-0 overflow-y-auto">
          <p className="text-[10px] font-bold tracking-widest text-[#9e354a] uppercase mb-1 text-center">
            La Cabrade
          </p>
          <h2 className="text-lg font-bold text-gray-900 leading-tight mb-1 text-center">
            {t("popup.title" as any)}
          </h2>
          <p className="text-gray-500 text-xs mb-4 leading-relaxed text-center">
            {t("popup.subtitle" as any).split("10%")[0]}
            <span className="text-[#9e354a] font-bold">10&nbsp;%</span>
            {t("popup.subtitle" as any).split("10%")[1] ?? ""}
          </p>

          {status === "success" ? (
            <div className="text-center py-2">
              <p className="text-2xl mb-2">🎉</p>
              <p className="text-gray-800 font-semibold text-sm mb-3">
                {t("popup.success_title" as any)}
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-sm text-gray-700">
                  {t("popup.success_code" as any).replace("-10%", "")}
                  <strong>-10&nbsp;%</strong>
                  {t("popup.success_code" as any).includes("-10%")
                    ? t("popup.success_code" as any).split("-10%")[1]
                    : ""}
                </p>
                <p className="text-[11px] text-gray-400 mt-2">
                  {t("popup.success_spam" as any)}
                </p>
              </div>
            </div>
          ) : (
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

              <Field label={t("popup.email_label" as any)} error={errors.email}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })) }}
                  placeholder={t("popup.email_placeholder" as any)}
                  disabled={status === "loading"}
                  className={inputClass(!!errors.email)}
                />
              </Field>

              <Field
                label={t("popup.birthday_label" as any)}
                error={errors.birthday}
                hint={!errors.birthday ? t("popup.birthday_hint" as any) : undefined}
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
                  {t("popup.error_generic" as any)}
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
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    {t("popup.subscribing" as any)}
                  </span>
                ) : (
                  t("popup.cta" as any)
                )}
              </button>

              <p className="text-center text-[10px] text-gray-400">
                {t("popup.footer" as any)}
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
  const fieldId = useId()
  const hintId = `${fieldId}-hint`
  const errorId = `${fieldId}-error`

  const describedBy = error ? errorId : hint ? hintId : undefined

  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id: fieldId,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })
    : children

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className="text-xs font-semibold text-gray-700 flex items-center gap-1">
        {label}
        <span className="text-[#9e354a]">*</span>
      </label>
      {control}
      {error ? (
        <p id={errorId} role="alert" className="text-[11px] text-red-500 leading-tight">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-[10px] text-gray-400 leading-tight">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

"use client"

import { createContext, useContext, ReactNode } from "react"

// Traductions françaises pour le site La Cabrade
const translations: Record<string, string> = {
  // Navigation
  "nav.menu": "Menu",
  "nav.accueil": "Accueil",
  "nav.nouveautes": "Nouveautés",
  "nav.outlet": "Outlet",
  "nav.bon_cadeau": "Bon cadeau",
  "nav.a_propos": "À propos",
  "nav.boutique": "Boutique",
  "nav.marques": "Marques",
  "nav.contact": "Contact",
  
  // Produits
  "product.add_to_cart": "Ajouter au panier",
  "product.out_of_stock": "Rupture de stock",
  "product.in_stock": "En stock",
  "product.select_options": "Sélectionnez les options",
  
  // Panier
  "cart.title": "Panier",
  "cart.empty": "Votre panier est vide",
  "cart.checkout": "Commander",
  
  // Compte
  "account.login": "Connexion",
  "account.register": "Créer un compte",
  "account.logout": "Déconnexion",
  "account.my_account": "Mon compte",
}

type TranslationKey = keyof typeof translations

type LanguageContextType = {
  locale: string
  t: (key: TranslationKey | string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

/**
 * Provider pour le contexte de langue
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const contextValue: LanguageContextType = {
    locale: "fr",
    t: (key: TranslationKey | string): string => {
      return translations[key] || key
    }
  }

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  )
}

/**
 * Hook pour utiliser le contexte de langue
 */
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    // Fallback si utilisé hors du Provider
    return {
      locale: "fr",
      t: (key: string) => translations[key] || key
    }
  }
  return context
}

/**
 * Hook pour obtenir une fonction de traduction
 * Retourne la traduction française ou la clé si non trouvée
 */
export function useTranslate() {
  const { t } = useLanguage()
  return t
}

/**
 * Fonction utilitaire pour traduire directement (côté serveur)
 */
export function t(key: TranslationKey | string): string {
  return translations[key] || key
}


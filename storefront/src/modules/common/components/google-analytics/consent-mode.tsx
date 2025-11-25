"use client"

import Script from "next/script"

export const GoogleConsentMode = () => {
  return (
    <>
      <Script id="google-consent-mode" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          
          // 1. Définir le consentement par défaut sur REFUSÉ (Obligation RGPD)
          gtag('consent', 'default', {
            'ad_storage': 'denied',
            'analytics_storage': 'denied',
            'ad_user_data': 'denied',
            'ad_personalization': 'denied',
            'wait_for_update': 500
          });
          
          // 2. Charger le script de base
          gtag('js', new Date());
          gtag('config', 'GA_MEASUREMENT_ID', {
             page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  )
}


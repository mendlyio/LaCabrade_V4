"use client"

import Script from "next/script"

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID

export const GoogleConsentMode = () => {
  const hasGA = !!GA_MEASUREMENT_ID
  const hasMeta = !!META_PIXEL_ID
  const hasAds = !!GOOGLE_ADS_ID

  if (!hasGA && !hasMeta) return null

  return (
    <>
      {/* 1. Consent Mode v2 — défini AVANT le chargement de gtag.js (beforeInteractive)
          Pour les visiteurs récurrents, on restaure immédiatement l'état depuis localStorage
          afin d'éviter tout flashback "denied" entre le chargement de la page et l'hydratation React */}
      <Script id="consent-default" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}

          var _storedConsent = null;
          try { _storedConsent = localStorage.getItem('cookie_consent'); } catch(e) {}

          if (_storedConsent === 'true') {
            gtag('consent', 'default', {
              'ad_storage': 'granted',
              'analytics_storage': 'granted',
              'ad_user_data': 'granted',
              'ad_personalization': 'granted',
              'functionality_storage': 'granted',
              'security_storage': 'granted'
            });
          } else {
            gtag('consent', 'default', {
              'ad_storage': 'denied',
              'analytics_storage': 'denied',
              'ad_user_data': 'denied',
              'ad_personalization': 'denied',
              'functionality_storage': 'granted',
              'security_storage': 'granted',
              'wait_for_update': 500,
              'url_passthrough': true,
              'ads_data_redaction': true
            });
          }
        `}
      </Script>

      {/* 2. GA4 */}
      {hasGA && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-ga-config" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', {
                page_path: window.location.pathname,
                anonymize_ip: true
              });
              ${hasAds ? `gtag('config', '${GOOGLE_ADS_ID}');` : ""}
            `}
          </Script>
        </>
      )}

      {/* 3. Meta Pixel */}
      {hasMeta && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('consent', 'revoke');
            fbq('init', '${META_PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}
    </>
  )
}

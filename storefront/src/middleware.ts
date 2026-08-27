import { HttpTypes } from "@medusajs/types"
import { NextRequest, NextResponse } from "next/server"
import { LACABRADE_REDIRECTS } from "@lib/lacabrade-redirects"
import {
  REGION_ERROR_BACKOFF_MS,
  shouldRefreshRegionMap,
} from "@lib/util/region-map-refresh"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION || "fr"

/**
 * Le middleware s'exécute sur toutes les navigations.
 * Il doit rester "fail-fast" pour ne pas dégrader le TTFB global.
 */
const FETCH_TIMEOUT_MS = 4000

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = FETCH_TIMEOUT_MS, ...fetchOptions } = options
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    })
    clearTimeout(id)
    return res
  } catch (e) {
    clearTimeout(id)
    throw e
  }
}

const regionMapCache = {
  regionMap: new Map<string, HttpTypes.StoreRegion>(),
  regionMapUpdated: Date.now(),
  backoffUntil: 0,
}

async function getRegionMap() {
  const { regionMap, regionMapUpdated, backoffUntil } = regionMapCache
  const hasCache = !!regionMap.keys().next().value

  if (
    shouldRefreshRegionMap({
      hasCache,
      cacheUpdatedAt: regionMapUpdated,
      now: Date.now(),
      backoffUntil,
    })
  ) {
    try {
      // Vérifier que les variables d'environnement sont définies
      if (!BACKEND_URL || !PUBLISHABLE_API_KEY) {
        console.warn('⚠️  Backend URL or Publishable API Key not configured. Using default region.')
        const defaultRegion: HttpTypes.StoreRegion = {
          id: 'reg_default',
          name: 'France',
          currency_code: 'eur',
          countries: [{ iso_2: 'fr', name: 'France' }] as any,
        } as any
        regionMapCache.regionMap.set('fr', defaultRegion)
        regionMapCache.regionMapUpdated = Date.now()
        regionMapCache.backoffUntil = 0
        return regionMapCache.regionMap
      }

      // Fetch regions from Medusa. We can't use the JS client here because middleware is running on Edge and the client needs a Node environment.
      const response = await fetchWithTimeout(`${BACKEND_URL}/store/regions`, {
        headers: {
          "x-publishable-api-key": PUBLISHABLE_API_KEY,
        },
        next: {
          revalidate: 3600,
          tags: ["regions"],
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch regions: ${response.status}`)
      }

      const { regions } = await response.json()

      if (!regions?.length) {
        // Créer une région par défaut si aucune n'existe
        const defaultRegion: HttpTypes.StoreRegion = {
          id: 'reg_default',
          name: 'France',
          currency_code: 'eur',
          countries: [{ iso_2: 'fr', name: 'France' }] as any,
        } as any
        regionMapCache.regionMap.set('fr', defaultRegion)
        regionMapCache.regionMapUpdated = Date.now()
        regionMapCache.backoffUntil = 0
        return regionMapCache.regionMap
      }

      // Create a map of country codes to regions.
      regions.forEach((region: HttpTypes.StoreRegion) => {
        region.countries?.forEach((c) => {
          regionMapCache.regionMap.set(c.iso_2 ?? "", region)
        })
      })

      regionMapCache.regionMapUpdated = Date.now()
      regionMapCache.backoffUntil = 0
    } catch (error) {
      console.error('⚠️  Error fetching regions from backend:', error)
      // Garder le dernier cache valide et ne pas relancer un fetch à chaque hit.
      regionMapCache.backoffUntil = Date.now() + REGION_ERROR_BACKOFF_MS
      // Utiliser une région par défaut en cas d'erreur
      if (!regionMapCache.regionMap.has('fr')) {
        const defaultRegion: HttpTypes.StoreRegion = {
          id: 'reg_default',
          name: 'France',
          currency_code: 'eur',
          countries: [{ iso_2: 'fr', name: 'France' }] as any,
        } as any
        regionMapCache.regionMap.set('fr', defaultRegion)
        regionMapCache.regionMapUpdated = Date.now()
      }
    }
  }

  return regionMapCache.regionMap
}

/**
 * Fetches regions from Medusa and sets the region cookie.
 * @param request
 * @param response
 */
async function getCountryCode(
  request: NextRequest,
  regionMap: Map<string, HttpTypes.StoreRegion | number>
) {
  try {
    let countryCode

    const vercelCountryCode = request.headers
      .get("x-vercel-ip-country")
      ?.toLowerCase()

    const urlCountryCode = request.nextUrl.pathname.split("/")[1]?.toLowerCase()

    if (urlCountryCode && regionMap.has(urlCountryCode)) {
      countryCode = urlCountryCode
    } else if (vercelCountryCode && regionMap.has(vercelCountryCode)) {
      countryCode = vercelCountryCode
    } else if (regionMap.has(DEFAULT_REGION)) {
      countryCode = DEFAULT_REGION
    } else if (regionMap.keys().next().value) {
      countryCode = regionMap.keys().next().value
    }

    return countryCode
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "Middleware.ts: Error getting the country code. Did you set up regions in your Medusa Admin and define a NEXT_PUBLIC_MEDUSA_BACKEND_URL environment variable?"
      )
    }
  }
}

/**
 * Middleware to handle region selection and onboarding status.
 */
export async function middleware(request: NextRequest) {
  // IMPORTANT: Ne jamais rediriger les routes internes Next.js (ex: /_next/image)
  // sinon l'optimiseur d'images et les assets Next cassent (404).
  const pathname = request.nextUrl.pathname
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next()
  }

  // Redirection des URLs venant de l'ancien domaine la-cabrade.be
  const host = request.headers.get("host") || ""
  const isOldDomain =
    host === "la-cabrade.be" ||
    host === "www.la-cabrade.be" ||
    host.endsWith(".la-cabrade.be")
  if (isOldDomain) {
    const destination =
      LACABRADE_REDIRECTS[pathname] ??
      LACABRADE_REDIRECTS[pathname.replace(/\/?$/, "/")] ??
      "https://www.sellerie-lacabrade.be/be"
    return NextResponse.redirect(destination, { status: 301 })
  }

  const searchParams = request.nextUrl.searchParams
  const isOnboarding = searchParams.get("onboarding") === "true"
  const cartId = searchParams.get("cart_id")
  const checkoutStep = searchParams.get("step")
  const onboardingCookie = request.cookies.get("_medusa_onboarding")
  const cartIdCookie = request.cookies.get("_medusa_cart_id")

  const regionMap = await getRegionMap()

  const countryCode = regionMap && (await getCountryCode(request, regionMap))

  const urlHasCountryCode =
    countryCode && request.nextUrl.pathname.split("/")[1].includes(countryCode)

  // check if one of the country codes is in the url
  if (urlHasCountryCode && (!isOnboarding || onboardingCookie)) {
    if (!cartId || cartIdCookie) {
      return NextResponse.next()
    }

    const response = NextResponse.next()
    response.cookies.set("_medusa_cart_id", cartId, { maxAge: 60 * 60 * 24 })
    return response
  }

  const redirectPath =
    request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname

  const queryString = request.nextUrl.search ? request.nextUrl.search : ""

  let redirectUrl = request.nextUrl.href

  let response = NextResponse.redirect(redirectUrl, 307)

  // If no country code is set, we redirect to the relevant region.
  if (!urlHasCountryCode && countryCode) {
    redirectUrl = `${request.nextUrl.origin}/${countryCode}${redirectPath}${queryString}`
    response = NextResponse.redirect(`${redirectUrl}`, 307)
  }

  // If a cart_id is in the params, always restore the cart cookie.
  // This is critical after external payment redirects (Stripe/3DS),
  // where we can return directly to a checkout step without the cookie.
  if (cartId && !cartIdCookie) {
    if (!checkoutStep) {
      redirectUrl = `${redirectUrl}&step=address`
      response = NextResponse.redirect(`${redirectUrl}`, 307)
    }
    response.cookies.set("_medusa_cart_id", cartId, { maxAge: 60 * 60 * 24 })
  }

  // Set a cookie to indicate that we're onboarding. This is used to show the onboarding flow.
  if (isOnboarding) {
    response.cookies.set("_medusa_onboarding", "true", { maxAge: 60 * 60 * 24 })
  }

  return response
}

export const config = {
  // Exclure toutes les routes internes Next.js (/ _next /...), et l'API
  // Sinon /_next/image est redirigé vers /{country}/_next/image et renvoie 404.
  matcher: ["/((?!api|_next|favicon.ico|sitemap.xml|robots.txt).*)"],
}

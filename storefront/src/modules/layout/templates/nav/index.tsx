import { Suspense } from "react"
import { listRegions } from "@lib/data/regions"
import { listCategories } from "@lib/data/categories"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import WishlistButton from "@modules/layout/components/wishlist-button"
import SideMenu from "@modules/layout/components/side-menu"
import SearchBar from "@modules/layout/components/search-bar"
import NavLink from "@modules/layout/components/nav-link"
import TopBar from "@modules/layout/components/top-bar"
import BrandsMenu from "@modules/layout/components/brands-menu"
import {
  MagnifyingGlass,
  User,
  ShoppingBag,
} from "@medusajs/icons"

export default async function Nav() {
  const regions = await listRegions().then((regions: StoreRegion[]) => regions)
  const categories = await listCategories()

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      {/* Annonce promotionnelle */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white text-center py-2 text-sm font-medium">
        <p className="animate-fade-in">
          -10% pour les nouveaux clients avec le code BIENVENUE10 | Livraison gratuite dès 100€
        </p>
      </div>

      {/* Header principal */}
      <header className="relative bg-white border-b border-ui-border-base shadow-sm transition-all duration-300 hover:shadow-md">
        {/* Top Bar - Simplifié avec langue, téléphone et aide */}
        <TopBar regions={regions} />

        {/* Main Navigation */}
        <nav className="content-container">
          <div className="flex items-center justify-between h-20 gap-8">
            {/* Mobile Menu + Logo */}
            <div className="flex items-center gap-4 lg:flex-1">
              <div className="lg:hidden">
                <SideMenu regions={regions} categories={categories} />
              </div>

              {/* Logo */}
              <LocalizedClientLink
                href="/"
                className="flex items-center gap-3 group/logo"
                data-testid="nav-store-link"
              >
                <div className="hidden sm:block">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-700 to-amber-900 bg-clip-text text-transparent">
                    La Cabrade
                  </h1>
                  <p className="text-xs text-gray-500 -mt-1">LC•EQUESTRIAN</p>
                </div>
                <div className="sm:hidden">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-amber-700 to-amber-900 bg-clip-text text-transparent">
                    LC•EQUESTRIAN
                  </h1>
                </div>
              </LocalizedClientLink>
            </div>

            {/* Desktop Navigation - Nouveau menu restructuré */}
            <div className="hidden lg:flex items-center gap-1 justify-center">
              <NavLink
                href="/nouveautes"
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 transition-all duration-200"
                activeClassName="bg-amber-100 text-amber-700 shadow-sm"
              >
                Nouveautés
              </NavLink>

              <NavLink
                href="/categories/lc-equestrian"
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 transition-all duration-200"
                activeClassName="bg-amber-100 text-amber-700 shadow-sm"
              >
                LC Equestrian
              </NavLink>

              <NavLink
                href="/categories/cavalier"
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 transition-all duration-200"
                activeClassName="bg-amber-100 text-amber-700 shadow-sm"
              >
                Cavalier
              </NavLink>

              <NavLink
                href="/categories/cheval"
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 transition-all duration-200"
                activeClassName="bg-amber-100 text-amber-700 shadow-sm"
              >
                Cheval
              </NavLink>

              <NavLink
                href="/categories/ecurie"
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 transition-all duration-200"
                activeClassName="bg-amber-100 text-amber-700 shadow-sm"
              >
                Ecurie
              </NavLink>

              <NavLink
                href="/categories/soins-alimentation"
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 transition-all duration-200"
                activeClassName="bg-amber-100 text-amber-700 shadow-sm"
              >
                Soins et alimentation
              </NavLink>

              <NavLink
                href="/outlet"
                className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200"
                activeClassName="bg-red-100 text-red-800 shadow-sm"
              >
                Outlet
              </NavLink>

              <NavLink
                href="/produits/bon-cadeau"
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 transition-all duration-200"
                activeClassName="bg-amber-100 text-amber-700 shadow-sm"
              >
                Bon cadeau
              </NavLink>

              {/* Menu déroulant Marques */}
              <BrandsMenu />

              <NavLink
                href="/a-propos"
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 transition-all duration-200"
                activeClassName="bg-amber-100 text-amber-700 shadow-sm"
              >
                À Propos
              </NavLink>
            </div>

            {/* Actions de droite */}
            <div className="flex items-center gap-3 flex-[2] justify-end">
              {/* Recherche Desktop - Ultra visible */}
              <div className="hidden xl:block w-full max-w-xl">
                <div className="relative">
                  <SearchBar />
                </div>
              </div>

              {/* Icône recherche mobile */}
              {process.env.NEXT_PUBLIC_FEATURE_SEARCH_ENABLED && (
                <LocalizedClientLink
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  href="/search"
                  scroll={false}
                  data-testid="nav-search-link"
                  aria-label="Recherche"
                >
                  <MagnifyingGlass className="w-5 h-5 text-gray-600" />
                </LocalizedClientLink>
              )}

              {/* Wishlist */}
              <WishlistButton />

              {/* Compte */}
              <LocalizedClientLink
                href="/account"
                className="hidden sm:flex p-2 rounded-lg hover:bg-gray-100 transition-colors group"
                data-testid="nav-account-link"
                aria-label="Mon compte"
              >
                <User className="w-5 h-5 text-gray-600 group-hover:text-amber-600 transition-colors" />
              </LocalizedClientLink>

              {/* Panier */}
              <Suspense
                fallback={
                  <LocalizedClientLink
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-medium"
                    href="/cart"
                    data-testid="nav-cart-link"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    <span className="hidden sm:inline">Panier</span>
                    <span className="bg-white text-amber-600 text-xs px-2 py-0.5 rounded-full font-bold">
                      0
                    </span>
                  </LocalizedClientLink>
                }
              >
                <CartButton />
              </Suspense>
            </div>
          </div>

          {/* Barre de recherche mobile sous le header */}
          <div className="xl:hidden pb-4">
            <SearchBar />
          </div>
        </nav>
      </header>
    </div>
  )
}

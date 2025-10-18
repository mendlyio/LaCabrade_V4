import { Suspense } from "react"
import { listRegions } from "@lib/data/regions"
import { listCategories } from "@lib/data/categories"
import { getCollectionsList } from "@lib/data/collections"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import WishlistButton from "@modules/layout/components/wishlist-button"
import SideMenu from "@modules/layout/components/side-menu"
import MegaMenu from "@modules/layout/components/mega-menu"
import SearchBar from "@modules/layout/components/search-bar"
import NavLink from "@modules/layout/components/nav-link"
import {
  MagnifyingGlass,
  User,
  ShoppingBag,
} from "@medusajs/icons"

export default async function Nav() {
  const regions = await listRegions().then((regions: StoreRegion[]) => regions)
  const categories = await listCategories()
  const { collections } = await getCollectionsList(0, 20)

  // Debug: Afficher les catégories et leurs enfants
  if (process.env.NODE_ENV === 'development') {
    console.log('📦 Catégories récupérées:', categories?.length)
    categories?.forEach((cat: any) => {
      console.log(`  - ${cat.name} (${cat.id})`, {
        hasChildren: !!cat.category_children,
        childrenCount: cat.category_children?.length || 0,
        children: cat.category_children?.map((c: any) => c.name)
      })
    })
  }

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
        {/* Top Bar - Infos & Liens rapides */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="content-container">
            <div className="flex items-center justify-between h-10 text-xs">
              <div className="hidden md:flex items-center gap-4 text-gray-600">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  Conseils experts équestres
                </span>
                <span className="text-gray-300">|</span>
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  Paiement sécurisé
                </span>
              </div>
              <div className="flex items-center gap-4 text-gray-600">
                <a href="tel:+3243586099" className="hover:text-amber-600 transition-colors flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/></svg>
                  +32 (0)4/358.60.99
                </a>
                <span className="text-gray-300">|</span>
                <a href="/aide" className="hover:text-amber-600 transition-colors">
                  Aide
                </a>
              </div>
            </div>
          </div>
        </div>

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

            {/* Desktop Navigation avec Mega Menu */}
            <div className="hidden lg:flex items-center gap-1 justify-center">
              <NavLink
                href="/store"
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 transition-all duration-200"
                activeClassName="bg-amber-100 text-amber-700 shadow-sm"
              >
                Boutique
              </NavLink>

              <MegaMenu categories={categories} collections={collections} />

              <NavLink
                href="/nouveautes"
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 transition-all duration-200"
                activeClassName="bg-amber-100 text-amber-700 shadow-sm"
              >
                Nouveautés
              </NavLink>

              <NavLink
                href="/promotions"
                className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200"
                activeClassName="bg-red-100 text-red-800 shadow-sm"
              >
                Outlet
              </NavLink>

              <NavLink
                href="/marques"
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 transition-all duration-200"
                activeClassName="bg-amber-100 text-amber-700 shadow-sm"
              >
                Marques
              </NavLink>
            </div>

            {/* Actions de droite */}
            <div className="flex items-center gap-3 flex-[2] justify-end">
              {/* Recherche Desktop */}
              <div className="hidden xl:block w-full max-w-4xl">
                <SearchBar />
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

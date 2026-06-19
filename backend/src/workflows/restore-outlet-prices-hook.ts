/**
 * Hook synchrone sur refreshCartItemsWorkflow.
 *
 * ─── Problème fondamental ───────────────────────────────────────────────────
 *
 * refreshCartItemsWorkflow appelle updateCartPromotionsWorkflow avec
 * PromotionActions.REPLACE à chaque mise à jour du panier (adresse,
 * livraison, promo…). Ce REPLACE :
 *   1. Supprime TOUS les adjustments existants
 *   2. Recalcule et recrée les adjustments via le moteur Medusa
 *   3. Medusa réapplique automatiquement OUTLET_50 sur les articles outlet
 *      (qui ont déjà leur remise dans unit_price → double déduction)
 *   4. Le moteur PO crée PO_GLOBAL_10 à -10% sur tous les items, y compris
 *      les articles Cavalier/LC Equestrian qui devraient être à -20%
 *
 * Nos subscribers cart.updated corrigeaient ça — de façon ASYNCHRONE.
 * Le storefront re-rendait AVANT qu'ils aient terminé → prix incorrects.
 *
 * ─── Solution ──────────────────────────────────────────────────────────────
 *
 * Ce hook s'exécute SYNCHRONEMENT dans le workflow, juste après
 * updateCartPromotionsWorkflow et avant que la réponse soit renvoyée
 * au storefront. Il consolide toute la logique métier de correction :
 *
 *   A. Outlet : supprime les adjustments + restaure unit_price si reseté
 *   B. Portes Ouvertes : retire PO des articles outlet/exclus, upgrade
 *      PO_GLOBAL_10 → -20% pour Cavalier/LC Equestrian
 *   C. Braderie : -15% sur sélections Cavalier/LC, puis -25% sur LC dès 3 articles LC
 *   D. Livraison gratuite : retire FREE_SHIPPING_75 si sous-total < 75€
 *   E. Bon cadeau : supprime les méthodes de livraison physiques si panier
 *      100% bons cadeau
 *
 * Les subscribers asynchrones restent en place comme filet de sécurité
 * pour les edge-cases déclenchés hors de refreshCartItemsWorkflow.
 */

import { refreshCartItemsWorkflow } from "@medusajs/medusa/core-flows"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import type { ICartModuleService } from "@medusajs/framework/types"

// ─── Constantes PO ──────────────────────────────────────────────────────────
const PO_CODE = "PO_GLOBAL_10"
const PO_CAVALIER_CODE = "PO_CAVALIER_20"
const PO_LC_CODE = "PO_LC_20"
const ALL_PO_CODES = new Set([PO_CODE, PO_CAVALIER_CODE, PO_LC_CODE])
const KNOWN_AUTO_CODES = new Set([
  PO_CODE, PO_CAVALIER_CODE, PO_LC_CODE,
  "BRADERIE_15", "BRADERIE_LC_25",
  "OUTLET_50", "FREE_SHIPPING_75", "PAQUES_10",
])
const PO_START = new Date("2026-04-30T22:00:00.000Z")
const PO_END   = new Date("2026-05-09T21:59:59.000Z")
const CAVALIER_HANDLES = new Set(["cavalier"])
const LC_HANDLES = new Set(["lc-equestrian", "lc_equestrian", "la-cabrade"])
const EXCLUDED_HANDLES = new Set([
  "tondeuses-et-peignes",
  "complements-alimentaires", "compléments-alimentaires",
  "systeme-renal", "systeme-circulatoire", "systeme-lymphatique",
  "immunite", "systeme-locomoteur", "systeme-hepatique", "système-hépatique",
  "systeme-digestif", "système-digestif",
  "vitamines-et-mineraux", "vitamines-et-minéraux",
  "muscles-et-recuperation", "muscles,-récupérations-et-performance",
  "metabolisme", "métabolisme",
  "sabots", "sabots-et-crins", "sabots,-robe-et-crins",
  "systeme-respiratoire", "système-respiratoire",
  "nervosite-et-comportement", "nervosité-et-comportement",
  "criniere", "soins-robe-et-criniere",
  "selles", "selles-sur-mesure",
])

// ─── Constantes Braderie ────────────────────────────────────────────────────
const BRADERIE_CODE = "BRADERIE_15"
const BRADERIE_LC_25_CODE = "BRADERIE_LC_25"
const ALL_BRADERIE_CODES = new Set([BRADERIE_CODE, BRADERIE_LC_25_CODE])
const BRADERIE_START = new Date("2026-06-18T22:00:00.000Z")
const BRADERIE_END = new Date("2026-06-21T07:00:00.000Z")
const BRADERIE_CAVALIER_HANDLES = new Set([
  "concours",
  "pantalons",
  "sweats-et-pulls",
  "t-shirts-et-polos",
  "vestes",
])
const BRADERIE_LC_HANDLES = new Set(["lc-equestrian"])
const BRADERIE_LC_COLLECTION_HANDLES = new Set(["lc-equestrian"])

const FREE_SHIPPING_THRESHOLD = 75
const FREE_SHIPPING_PROMO_CODE = "FREE_SHIPPING_75"

function isPortesOuvertesPeriod(): boolean {
  const now = new Date()
  return now >= PO_START && now <= PO_END
}

function isBraderiePeriod(): boolean {
  const now = new Date()
  return now >= BRADERIE_START && now <= BRADERIE_END
}

/**
 * Montant d'une remise de line item adjustment.
 *
 * ⚠️  Pour les articles tax-inclusive (cas de cette boutique), Medusa soustrait
 * le montant de l'adjustment DIRECTEMENT du prix TTC (item_total = original_total
 * − Σ amounts). Le montant doit donc être exprimé en TTC : prix_TTC × % × qty.
 * (Vérifié en prod : un -15% natif Medusa sur 54,90€ = 8,235 = 54,90 × 0,15.)
 */
function computeDiscountAmount(unitPriceTTC: number, qty: number, pct: number): number {
  return unitPriceTTC * pct * qty
}

function collectSubtreeIds(
  rootId: string,
  allCats: Array<{ id: string; parent_category_id?: string | null }>
): string[] {
  const ids: string[] = [rootId]
  for (const cat of allCats) {
    if (cat.parent_category_id === rootId) {
      ids.push(...collectSubtreeIds(cat.id, allCats))
    }
  }
  return ids
}

function isGiftCardItem(item: any): boolean {
  return !!(
    item.metadata?.is_gift_card ||
    String(item.product_title || item.title || "").toLowerCase().includes("bon cadeau") ||
    (item.variant_sku || "").startsWith("GC-")
  )
}

function isDigitalShippingMethod(sm: any): boolean {
  const name = (sm.name ?? "").toLowerCase()
  return name.includes("numérique") || name.includes("digital") || sm.data?.mode === "digital"
}

// ─── Hook ───────────────────────────────────────────────────────────────────

refreshCartItemsWorkflow.hooks.beforeRefreshingPaymentCollection(
  async ({ input }, { container }) => {
    const cartId = input.cart_id
    if (!cartId) return new StepResponse(undefined)

    let cartModuleService: ICartModuleService
    let productModule: any
    try {
      cartModuleService = container.resolve(Modules.CART) as ICartModuleService
      productModule    = container.resolve(Modules.PRODUCT)
    } catch {
      return new StepResponse(undefined)
    }

    try {
      // Charger le panier avec items + shipping_methods
      const cart = await cartModuleService.retrieveCart(cartId, {
        relations: ["items", "shipping_methods"],
      })

      const items = (cart.items ?? []) as any[]
      if (items.length === 0) return new StepResponse(undefined)

      const allItemIds = items.map((i: any) => i.id)

      // ── A. OUTLET ────────────────────────────────────────────────────────

      const outletItems = items.filter((i: any) => i.metadata?.outlet_discount === true)

      if (outletItems.length > 0) {
        const outletItemIds = outletItems.map((i: any) => i.id)

        // Supprimer les adjustments sur les articles outlet
        const outletAdjs = await (cartModuleService as any)
          .listLineItemAdjustments({ item_id: outletItemIds }, { take: 200 })
          .catch(() => [])

        if (outletAdjs?.length > 0) {
          await (cartModuleService as any).deleteLineItemAdjustments(
            outletAdjs.map((a: any) => a.id)
          )
          console.log(
            `[CartHook] Panier ${cartId} — outlet: supprimé ${outletAdjs.length} adjustment(s)`
          )
        }

        // Restaurer unit_price / compare_at si resetés par Medusa
        const toRestore = outletItems.filter((item: any) => {
          const md = item.metadata as any
          if (!md?.outlet_original_price || !md?.outlet_discount_percent) return false
          const currentPrice = Number(item.unit_price ?? 0)
          const currentCmpAt = Number(item.compare_at_unit_price ?? 0)
          const priceReset = Math.abs(currentPrice - md.outlet_original_price) < 0.01
          const cmpAtMissing =
            currentCmpAt === 0 ||
            Math.abs(currentCmpAt - md.outlet_original_price) > 0.01
          return priceReset || cmpAtMissing
        })

        if (toRestore.length > 0) {
          await Promise.all(
            toRestore.map((item: any) => {
              const md = item.metadata as any
              const discounted = Math.round(
                md.outlet_original_price * (1 - md.outlet_discount_percent / 100) * 100
              ) / 100
              return cartModuleService.updateLineItems(item.id, {
                unit_price: discounted,
                compare_at_unit_price: md.outlet_original_price,
              })
            })
          )
          console.log(
            `[CartHook] Panier ${cartId} — outlet: restauré le prix pour ${toRestore.length} article(s)`
          )
        }
      }

      // ── B. PORTES OUVERTES ───────────────────────────────────────────────

      const allAdjs: any[] = await (cartModuleService as any)
        .listLineItemAdjustments({ item_id: allItemIds }, { take: 500 })
        .catch(() => [])

      const poAdjs = allAdjs.filter((a: any) => a.code && ALL_PO_CODES.has(a.code))

      if (poAdjs.length > 0) {
        const adjIdsToRemove: string[] = []
        const adjsToCreate: any[] = []
        const adjsToUpdate: any[] = []

        if (!isPortesOuvertesPeriod()) {
          // Hors période → tout supprimer
          await (cartModuleService as any).deleteLineItemAdjustments(
            poAdjs.map((a: any) => a.id)
          )
          console.log(
            `[CartHook] Panier ${cartId} — PO hors période: supprimé ${poAdjs.length} adjustment(s)`
          )
        } else {
          // En période : vérifier non-cumul avec code manuel
          const hasManualCode = allAdjs.some(
            (a: any) => a.code && !KNOWN_AUTO_CODES.has(a.code)
          )
          if (hasManualCode) {
            await (cartModuleService as any).deleteLineItemAdjustments(
              poAdjs.map((a: any) => a.id)
            )
            console.log(
              `[CartHook] Panier ${cartId} — PO: code manuel détecté, supprimé ${poAdjs.length} adjustment(s)`
            )
          } else {
            // Charger les catégories des produits qui ont des adjustments PO
            const poAdjsByItem = new Map<string, any[]>()
            for (const adj of poAdjs) {
              if (!adj.item_id) continue
              const list = poAdjsByItem.get(adj.item_id) ?? []
              list.push(adj)
              poAdjsByItem.set(adj.item_id, list)
            }

            const productIds = [
              ...new Set(
                items
                  .filter((i: any) => poAdjsByItem.has(i.id) && i.product_id)
                  .map((i: any) => i.product_id)
              ),
            ] as string[]

            const productCategoryHandles = new Map<string, string[]>()
            if (productIds.length > 0) {
              const products: any[] = await productModule
                .listProducts({ id: productIds }, { relations: ["categories"], select: ["id"] })
                .catch(() => [])
              for (const p of products) {
                productCategoryHandles.set(
                  p.id,
                  (p.categories ?? []).map((c: any) => (c.handle ?? "").toLowerCase())
                )
              }
            }

            for (const item of items) {
              const itemAdjs = poAdjsByItem.get(item.id)
              if (!itemAdjs?.length) continue

              const isOutlet =
                item.metadata?.outlet_discount === true ||
                (item.compare_at_unit_price != null &&
                  Number(item.compare_at_unit_price) > Number(item.unit_price ?? 0) + 0.01)

              const handles = item.product_id
                ? (productCategoryHandles.get(item.product_id) ?? [])
                : []

              const isExcluded  = handles.some((h: string) => EXCLUDED_HANDLES.has(h))
              const isCavalier  = handles.some((h: string) => CAVALIER_HANDLES.has(h))
              const isLC        = handles.some((h: string) => LC_HANDLES.has(h))

              const globalAdjs   = itemAdjs.filter((a: any) => a.code === PO_CODE)
              const cavalierAdjs = itemAdjs.filter((a: any) => a.code === PO_CAVALIER_CODE)
              const lcAdjs       = itemAdjs.filter((a: any) => a.code === PO_LC_CODE)

              const unitPrice = Number(item.unit_price ?? 0)
              const qty = item.quantity ?? 1

              if (isOutlet || isExcluded) {
                for (const a of itemAdjs) adjIdsToRemove.push(a.id)
                continue
              }

              if (isCavalier || isLC) {
                const targetCode = isCavalier ? PO_CAVALIER_CODE : PO_LC_CODE
                const targetDesc = isCavalier
                  ? "Portes Ouvertes 2026 − −20% Cavalier"
                  : "Portes Ouvertes 2026 − −20% LC Equestrian"
                const expectedHT = computeDiscountAmount(unitPrice, qty, 0.20)
                const eps = 0.001

                const wrongAdjs = isCavalier ? lcAdjs : cavalierAdjs
                for (const a of wrongAdjs) adjIdsToRemove.push(a.id)
                const correctAdjs = isCavalier ? cavalierAdjs : lcAdjs
                for (const a of correctAdjs) adjIdsToRemove.push(a.id)

                if (globalAdjs.length > 0) {
                  const adj = globalAdjs[0]
                  const current = Number(adj.amount ?? 0)
                  if (Math.abs(current - expectedHT) > eps || adj.code !== targetCode) {
                    adjsToUpdate.push({
                      id: adj.id,
                      amount: Math.abs(current - expectedHT) > eps ? expectedHT : undefined,
                      code: targetCode,
                      description: targetDesc,
                    })
                  }
                  for (let i = 1; i < globalAdjs.length; i++) {
                    adjIdsToRemove.push(globalAdjs[i].id)
                  }
                } else {
                  adjsToCreate.push({
                    item_id: item.id,
                    amount: expectedHT,
                    code: targetCode,
                    description: targetDesc,
                  })
                }
                continue
              }

              // Article normal: garantir PO_GLOBAL_10 au bon montant HT
              for (const a of cavalierAdjs) adjIdsToRemove.push(a.id)
              for (const a of lcAdjs) adjIdsToRemove.push(a.id)

              const expectedGlobalHT = computeDiscountAmount(unitPrice, qty, 0.10)
              let globalKept = false
              for (const adj of globalAdjs) {
                const current = Number(adj.amount ?? 0)
                if (!globalKept && Math.abs(current - expectedGlobalHT) < 0.001) {
                  globalKept = true
                } else {
                  adjIdsToRemove.push(adj.id)
                }
              }
              if (!globalKept && unitPrice > 0) {
                adjsToCreate.push({
                  item_id: item.id,
                  amount: expectedGlobalHT,
                  code: PO_CODE,
                  description: "Portes Ouvertes 2026 − −10%",
                })
              }
            }

            if (adjIdsToRemove.length > 0) {
              await (cartModuleService as any).deleteLineItemAdjustments(adjIdsToRemove)
            }
            if (adjsToUpdate.length > 0) {
              await (cartModuleService as any).updateLineItemAdjustments(adjsToUpdate)
            }
            if (adjsToCreate.length > 0) {
              await (cartModuleService as any).addLineItemAdjustments(adjsToCreate)
            }
            if (adjIdsToRemove.length + adjsToUpdate.length + adjsToCreate.length > 0) {
              console.log(
                `[CartHook] Panier ${cartId} — PO: -${adjIdsToRemove.length} / upd ${adjsToUpdate.length} / +${adjsToCreate.length}`
              )
            }
          }
        }
      }

      // ── C. BRADERIE ──────────────────────────────────────────────────────

      const braderieAdjs = allAdjs.filter(
        (a: any) => a.code && ALL_BRADERIE_CODES.has(a.code)
      )

      if (braderieAdjs.length > 0) {
        const adjIdsToRemove: string[] = []
        const adjsToCreate: any[] = []
        const adjsToUpdate: any[] = []

        if (!isBraderiePeriod()) {
          await (cartModuleService as any).deleteLineItemAdjustments(
            braderieAdjs.map((a: any) => a.id)
          )
          console.log(
            `[CartHook] Panier ${cartId} — Braderie hors période: supprimé ${braderieAdjs.length} adjustment(s)`
          )
        } else {
          const hasManualCode = allAdjs.some(
            (a: any) => a.code && !KNOWN_AUTO_CODES.has(a.code)
          )

          if (hasManualCode) {
            await (cartModuleService as any).deleteLineItemAdjustments(
              braderieAdjs.map((a: any) => a.id)
            )
            console.log(
              `[CartHook] Panier ${cartId} — Braderie: code manuel détecté, supprimé ${braderieAdjs.length} adjustment(s)`
            )
          } else {
            const braderieAdjsByItem = new Map<string, any[]>()
            for (const adj of braderieAdjs) {
              if (!adj.item_id) continue
              const list = braderieAdjsByItem.get(adj.item_id) ?? []
              list.push(adj)
              braderieAdjsByItem.set(adj.item_id, list)
            }

            const productIds = [
              ...new Set(
                items
                  .filter((i: any) => braderieAdjsByItem.has(i.id) && i.product_id)
                  .map((i: any) => i.product_id)
              ),
            ] as string[]

            const allCategories: Array<{
              id: string
              handle?: string | null
              parent_category_id?: string | null
            }> = await productModule
              .listProductCategories(
                {},
                { select: ["id", "handle", "parent_category_id"], take: 500 }
              )
              .catch(() => [])

            const braderieCategoryIds = new Set<string>()
            const braderieLcCategoryIds = new Set<string>()
            for (const category of allCategories) {
              const handle = (category.handle ?? "").toLowerCase()
              if (BRADERIE_CAVALIER_HANDLES.has(handle)) {
                collectSubtreeIds(category.id, allCategories).forEach((id) =>
                  braderieCategoryIds.add(id)
                )
              }
              if (BRADERIE_LC_HANDLES.has(handle)) {
                collectSubtreeIds(category.id, allCategories).forEach((id) => {
                  braderieCategoryIds.add(id)
                  braderieLcCategoryIds.add(id)
                })
              }
            }

            const productEligibility = new Map<
              string,
              { eligible: boolean; lc: boolean }
            >()
            if (productIds.length > 0) {
              const products: any[] = await productModule
                .listProducts(
                  { id: productIds },
                  { relations: ["categories", "collection"], select: ["id"] }
                )
                .catch(() => [])

              for (const product of products) {
                const categoryIds = (product.categories ?? []).map((c: any) => c.id)
                const collectionHandle = (product.collection?.handle ?? "").toLowerCase()
                const isLcByCollection = BRADERIE_LC_COLLECTION_HANDLES.has(collectionHandle)
                const isLcByCategory = categoryIds.some((id: string) =>
                  braderieLcCategoryIds.has(id)
                )
                const isEligibleByCategory = categoryIds.some((id: string) =>
                  braderieCategoryIds.has(id)
                )

                productEligibility.set(product.id, {
                  eligible: isEligibleByCategory || isLcByCollection,
                  lc: isLcByCategory || isLcByCollection,
                })
              }
            }

            const lcQuantity = items.reduce((sum: number, item: any) => {
              if (!item.product_id) return sum
              if (!productEligibility.get(item.product_id)?.lc) return sum
              return sum + (item.quantity ?? 1)
            }, 0)
            const lcTierActive = lcQuantity >= 3

            for (const item of items) {
              const itemAdjs = braderieAdjsByItem.get(item.id)
              if (!itemAdjs?.length) continue

              const isOutlet =
                item.metadata?.outlet_discount === true ||
                (item.compare_at_unit_price != null &&
                  Number(item.compare_at_unit_price) > Number(item.unit_price ?? 0) + 0.01)

              const eligibility = item.product_id
                ? productEligibility.get(item.product_id)
                : undefined

              if (isOutlet || !eligibility?.eligible) {
                for (const adj of itemAdjs) adjIdsToRemove.push(adj.id)
                continue
              }

              const unitPrice = Number(item.unit_price ?? 0)
              const qty = item.quantity ?? 1
              const targetPercent = eligibility.lc && lcTierActive ? 0.25 : 0.15
              const targetCode = eligibility.lc && lcTierActive
                ? BRADERIE_LC_25_CODE
                : BRADERIE_CODE
              const targetDesc = eligibility.lc && lcTierActive
                ? "Braderie 2026 -25% LC dès 3 articles"
                : "Braderie 2026 -15%"
              const expectedHT = computeDiscountAmount(unitPrice, qty, targetPercent)
              const eps = 0.001

              const firstAdj = itemAdjs[0]
              const current = Number(firstAdj.amount ?? 0)
              if (
                Math.abs(current - expectedHT) > eps ||
                firstAdj.code !== targetCode ||
                firstAdj.description !== targetDesc
              ) {
                adjsToUpdate.push({
                  id: firstAdj.id,
                  amount: expectedHT,
                  code: targetCode,
                  description: targetDesc,
                })
              }
              for (let i = 1; i < itemAdjs.length; i++) {
                adjIdsToRemove.push(itemAdjs[i].id)
              }
            }

            if (adjIdsToRemove.length > 0) {
              await (cartModuleService as any).deleteLineItemAdjustments(adjIdsToRemove)
            }
            if (adjsToUpdate.length > 0) {
              await (cartModuleService as any).updateLineItemAdjustments(adjsToUpdate)
            }
            if (adjsToCreate.length > 0) {
              await (cartModuleService as any).addLineItemAdjustments(adjsToCreate)
            }
            if (adjIdsToRemove.length + adjsToUpdate.length + adjsToCreate.length > 0) {
              console.log(
                `[CartHook] Panier ${cartId} — Braderie: -${adjIdsToRemove.length} / upd ${adjsToUpdate.length} / +${adjsToCreate.length} (LC qty ${lcQuantity})`
              )
            }
          }
        }
      }

      // ── D. LIVRAISON GRATUITE ────────────────────────────────────────────

      const subtotalEuros = items.reduce(
        (sum: number, i: any) => sum + Number(i.unit_price ?? 0) * (i.quantity ?? 1),
        0
      )

      if (subtotalEuros < FREE_SHIPPING_THRESHOLD) {
        const shippingMethods = (cart as any).shipping_methods ?? []
        const smIds = shippingMethods.map((sm: any) => sm.id)
        if (smIds.length > 0) {
          const smAdjs: any[] = await (cartModuleService as any)
            .listShippingMethodAdjustments({ shipping_method_id: smIds }, { take: 50 })
            .catch(() => [])
          const freeShipAdjIds = smAdjs
            .filter((a: any) => a.code === FREE_SHIPPING_PROMO_CODE)
            .map((a: any) => a.id)
          if (freeShipAdjIds.length > 0) {
            await (cartModuleService as any).deleteShippingMethodAdjustments(freeShipAdjIds)
            console.log(
              `[CartHook] Panier ${cartId} — livraison gratuite retirée (sous-total ${subtotalEuros.toFixed(2)}€ < ${FREE_SHIPPING_THRESHOLD}€)`
            )
          }
        }
      }

      // ── E. BON CADEAU : suppression livraison physique ───────────────────

      const giftCardOnly = items.length > 0 && items.every((i: any) => isGiftCardItem(i))
      if (giftCardOnly) {
        const shippingMethods = (cart as any).shipping_methods ?? []
        const physicalSmIds = shippingMethods
          .filter((sm: any) => !isDigitalShippingMethod(sm))
          .map((sm: any) => sm.id)
        if (physicalSmIds.length > 0) {
          await (cartModuleService as any).softDeleteShippingMethods(physicalSmIds)
          console.log(
            `[CartHook] Panier ${cartId} — 100% bons cadeau: supprimé ${physicalSmIds.length} méthode(s) physique(s)`
          )
        }
      }
    } catch (error: any) {
      console.error("[CartHook] Erreur:", error?.message)
    }

    return new StepResponse(undefined)
  }
)

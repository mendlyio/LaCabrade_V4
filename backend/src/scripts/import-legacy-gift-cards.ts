/**
 * Importe les bons cadeaux de l'ancien site vers le nouveau système.
 * Crée une promotion Medusa + un enregistrement gift_card_tracking pour chaque code.
 *
 * Usage : npx medusa exec src/scripts/import-legacy-gift-cards.ts
 */

import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createPromotionsWorkflow } from "@medusajs/medusa/core-flows"
import { GIFT_CARD_TRACKING_MODULE } from "../modules/gift-card-tracking/constants"

// Données issues de l'export CSV de l'ancien site
// Champs : code, référence commande, montant (€), email destinataire, date d'envoi
const LEGACY_GIFT_CARDS = [
  { code: "60FB-57DE-4351-97DD", ref: "#64641",  amount: 25,    email: "chris.lem@hotmail.fr",                  date: "2026-03-14" },
  { code: "E50B-2939-E614-2173", ref: "#64641",  amount: 25,    email: "chris.lem@hotmail.fr",                  date: "2026-03-14" },
  { code: "10F9-AD68-18BD-4C68", ref: "#64389",  amount: 75,    email: "mewipatr@gmail.com",                    date: "2026-02-08" },
  { code: "0A48-86AC-BA70-8814", ref: "#64227",  amount: 50,    email: "alexandre.collienne@gmail.com",         date: "2025-12-26" },
  { code: "3431-C757-4BB8-D479", ref: "#64221",  amount: 200,   email: "alinehurtgen@hotmail.com",              date: "2025-12-24" },
  { code: "3DCC-5BC7-9B3B-5623", ref: "#64213",  amount: 100,   email: "dr.lacaeyse@skynet.be",                 date: "2025-12-22" },
  { code: "2BD8-E8DC-1415-ABAF", ref: "#64209",  amount: 100,   email: "patriciacrem@gmail.com",                date: "2025-12-22" },
  { code: "C0E9-2C60-F79B-CA9C", ref: "#64205",  amount: 50,    email: "s.maricq@hotmail.com",                  date: "2025-12-21" },
  { code: "CA4E-E790-F9DB-3CBD", ref: "#64195",  amount: 25,    email: "maude.thibaut@outlook.com",             date: "2025-12-18" },
  { code: "1568-BB9F-DD22-4866", ref: "#64195",  amount: 25,    email: "maude.thibaut@outlook.com",             date: "2025-12-18" },
  { code: "80A9-31DF-C864-8202", ref: "#64179",  amount: 50,    email: "astrid.messeman@hotmail.fr",            date: "2025-12-14" },
  { code: "C4C8-3BC7-A2BA-9955", ref: "#64171",  amount: 50,    email: "Emmelienchen@gmail.com",                date: "2025-12-11" },
  { code: "D4EC-6135-9A0C-A21D", ref: "#64169",  amount: 50,    email: "aucoqetfagnes@gmail.com",               date: "2025-12-11" },
  { code: "35B1-3133-69C2-6DA5", ref: "#64167",  amount: 50,    email: "claude.hervelle@gmail.com",             date: "2025-12-11" },
  { code: "0761-05E4-F1C2-CBD1", ref: "#64146",  amount: 50,    email: "stephane.hoyoux@skynet.be",             date: "2025-12-06" },
  { code: "71BE-49C7-1F00-38C9", ref: "#64146",  amount: 50,    email: "stephane.hoyoux@skynet.be",             date: "2025-12-06" },
  { code: "D3A9-DC00-9136-4D7B", ref: "#63716",  amount: 75,    email: "amandine.derivaux@icloud.com",          date: "2025-11-17" },
  { code: "9D3C-98C8-C390-89BC", ref: "#63669",  amount: 50,    email: "christineesselen@gmail.com",            date: "2025-10-24" },
  { code: "F09B-9932-4904-2AE3", ref: "#63622",  amount: 50,    email: "francoise.delentree@live.be",           date: "2025-10-10" },
  { code: "9FD4-DD82-BD93-FB59", ref: "#63617",  amount: 50,    email: "loulou.marchese@gmail.com",             date: "2025-10-07" },
  { code: "4D1C-966E-F677-BC28", ref: "#63617",  amount: 20,    email: "loulou.marchese@gmail.com",             date: "2025-10-07" },
  { code: "287B-00F5-1217-63BF", ref: "#60958",  amount: 75,    email: "chrisgui75@hotmail.com",                date: "2025-08-17" },
  { code: "85B1-61C5-47D2-343F", ref: "#59783",  amount: 50,    email: "wrld.jeanne2000@gmail.com",             date: "2025-08-04" },
  { code: "F321-646B-B508-D3F3", ref: "#59650",  amount: 50,    email: "equiservices@proximus.be",              date: "2025-07-20" },
  { code: "2BDB-2F14-D371-9EB5", ref: "#58992",  amount: 75,    email: "florencewarnier@outlook.com",           date: "2025-07-05" },
  { code: "A1CD-11D0-8831-6A6D", ref: "#58992",  amount: 75,    email: "florencewarnier@outlook.com",           date: "2025-07-05" },
  { code: "FF2C-F6A3-2123-1730", ref: "#57436",  amount: 75,    email: "ciara.hellebrandt@outlook.de",          date: "2025-06-05" },
  { code: "A1EE-910D-A54C-30F9", ref: "#57419",  amount: 50,    email: "janosch.humartus@hotmail.com",          date: "2025-05-23" },
  { code: "629C-AAAF-4F73-B111", ref: "#57297",  amount: 75,    email: "milevahennuy@hotmail.com",              date: "2025-05-17" },
  { code: "0ACA-6582-B8D2-2523", ref: "#57293",  amount: 50,    email: "ysaline.neuville@gmail.com",            date: "2025-05-15" },
  { code: "0201-935A-4B6A-B4AF", ref: "#57102",  amount: 4.01,  email: "zoe.thil@hotmail.fr",                   date: "2025-04-29" },
  { code: "D2B4-EF1D-7501-2387", ref: "#57073",  amount: 50,    email: "juliettewarnier10@gmail.com",           date: "2025-04-28" },
  { code: "6C27-3639-3D1B-BD36", ref: "#56735",  amount: 50,    email: "direction@hendrichs.be",                date: "2025-04-23" },
  { code: "F887-D511-C4AB-B9DB", ref: "#56038",  amount: 50,    email: "aurelie.charlier@gmail.com",            date: "2025-04-15" },
  { code: "41D1-DA91-1252-9E7C", ref: "#51719",  amount: 64,    email: "flo.peremans@gmail.com",                date: "2024-12-17" },
  { code: "66A7-E840-6E33-F1CF", ref: "#51344",  amount: 75,    email: "hanossetives@gmail.com",                date: "2024-12-04" },
  { code: "AE28-965A-315A-3315", ref: "#51086",  amount: 50,    email: "jessica_pauels@yahoo.de",               date: "2024-12-04" },
  { code: "2721-B0AF-0A40-251D", ref: "#48267",  amount: 25,    email: "fannykevers@gmail.com",                 date: "2024-09-29" },
  { code: "8C11-E4D4-3628-1677", ref: "#46740",  amount: 50,    email: "ludivine.adam@hotmail.com",             date: "2024-06-22" },
  { code: "5FD0-6F5D-D8D3-15A1", ref: "#46212",  amount: 50,    email: "marie.debrus@icloud.com",               date: "2024-06-06" },
  { code: "A32D-08A7-E0A8-4561", ref: "#45609",  amount: 50,    email: "marion_sottiaux2@hotmail.com",          date: "2024-05-07" },
  { code: "6D68-7E7B-6242-ACA3", ref: "#44857",  amount: 0.22,  email: "emilie.lellig@gmail.com",               date: "2024-04-03" },
  { code: "ED65-8A2C-0B49-5A44", ref: "#40844",  amount: 50,    email: "meladenys@gmail.com",                   date: "2023-12-24" },
  { code: "858C-216C-E77E-4FC0", ref: "#40842",  amount: 100,   email: "antoine.dubois@hotmail.be",             date: "2023-12-24" },
  { code: "7044-A645-4FDB-31AE", ref: "#40799",  amount: 50,    email: "carolfraymann@hotmail.fr",              date: "2023-12-19" },
  { code: "07BA-696C-123D-5A1C", ref: "#40672",  amount: 25,    email: "beuken.julie@hotmail.com",              date: "2023-12-15" },
  { code: "5DD2-8942-AA0F-90D0", ref: "#40670",  amount: 25,    email: "julien@elu-d.be",                       date: "2023-12-14" },
  { code: "6984-4B2D-D66E-CA21", ref: "#40655",  amount: 75,    email: "dr.lacaeyse@skynet.be",                 date: "2023-12-11" },
  { code: "94E3-E5C5-193C-3245", ref: "#40618",  amount: 100,   email: "calo-13@hotmail.com",                   date: "2023-12-04" },
  { code: "3735-7D37-03BF-7922", ref: "#40610",  amount: 100,   email: "cd.gerard.debrassine@gmail.com",        date: "2023-11-27" },
  // Bon cadeau physique (pas d'email destinataire connu)
  { code: "8099-1DB1-E9FF-9254", ref: "#21727",  amount: 50,    email: "contact@sellerie-lacabrade.be",         date: "N/A" },
]

export default async function importLegacyGiftCards({ container }: ExecArgs) {
  const logger = container.resolve("logger") as any

  const giftCardTrackingService = container.resolve(GIFT_CARD_TRACKING_MODULE) as any

  const promotionModule = container.resolve(Modules.PROMOTION) as any

  logger.info(`🎁 Début de l'import de ${LEGACY_GIFT_CARDS.length} bons cadeaux legacy...`)

  // Récupère les codes déjà présents pour éviter les doublons
  const existing = await giftCardTrackingService.listGiftCards({}, { take: 1000 })
  const existingCodes = new Set(existing.map((gc: any) => gc.code))
  logger.info(`   ${existingCodes.size} bon(s) déjà présent(s) dans la base.`)

  // Récupère également les promotions existantes pour éviter les doublons
  const existingPromotions = await promotionModule.listPromotions({}, { take: 2000 })
  const existingPromoCodes = new Set(existingPromotions.map((p: any) => p.code))

  let created = 0
  let skipped = 0
  let errors = 0

  for (const gc of LEGACY_GIFT_CARDS) {
    if (existingCodes.has(gc.code)) {
      logger.info(`   ⏭️  ${gc.code} — déjà présent, ignoré.`)
      skipped++
      continue
    }

    logger.info(`\n   ➕ Import de ${gc.code} (${gc.amount}€ → ${gc.email})`)

    // 1. Créer la promotion Medusa (sauf si elle existe déjà)
    let promotionId: string | null = null

    if (existingPromoCodes.has(gc.code)) {
      const existingPromo = existingPromotions.find((p: any) => p.code === gc.code)
      promotionId = existingPromo?.id ?? null
      logger.info(`      Promotion déjà existante (ID: ${promotionId})`)
    } else {
      try {
        const createPromotions = createPromotionsWorkflow(container)
        const result = await createPromotions.run({
          input: {
            promotionsData: [
              {
                code: gc.code,
                type: "standard",
                status: "active",
                is_automatic: false,
                campaign: {
                  name: `Bon Cadeau ${gc.code}`,
                  campaign_identifier: gc.code,
                  budget: {
                    type: "spend",
                    limit: gc.amount,
                    currency_code: "eur",
                  },
                },
                application_method: {
                  type: "fixed",
                  target_type: "order",
                  value: gc.amount,
                  currency_code: "eur",
                },
              },
            ],
          },
        })
        promotionId = result?.result?.[0]?.id ?? null
        logger.info(`      ✅ Promotion créée (ID: ${promotionId})`)
      } catch (e: any) {
        logger.error(`      ❌ Erreur création promotion: ${e.message}`)
        errors++
        continue
      }
    }

    // 2. Créer l'entrée dans gift_card_tracking
    try {
      await giftCardTrackingService.createGiftCards({
        code: gc.code,
        original_amount: gc.amount,
        balance: gc.amount,
        recipient_email: gc.email,
        recipient_name: gc.email,
        sender_name: "La Cabrade (import legacy)",
        message: `Bon cadeau issu de l'ancien site — commande ${gc.ref} du ${gc.date}`,
        order_id: `legacy-${gc.ref}`,
        promotion_id: promotionId,
        status: "active",
      })
      logger.info(`      ✅ Tracking créé`)
      created++
    } catch (e: any) {
      logger.error(`      ❌ Erreur création tracking: ${e.message}`)
      // Si le tracking échoue mais la promo a été créée, on la désactive pour éviter un code orphelin
      if (promotionId) {
        try {
          await promotionModule.updatePromotions([{ id: promotionId, status: "inactive" }])
          logger.warn(`      ⚠️  Promotion ${promotionId} désactivée suite à l'échec du tracking.`)
        } catch (_) {}
      }
      errors++
    }
  }

  logger.info(`\n🎉 Import terminé.`)
  logger.info(`   ✅ Créés   : ${created}`)
  logger.info(`   ⏭️  Ignorés : ${skipped}`)
  logger.info(`   ❌ Erreurs : ${errors}`)
}

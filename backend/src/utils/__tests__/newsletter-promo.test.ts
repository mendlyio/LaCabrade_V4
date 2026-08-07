/**
 * Tests unitaires — helpers newsletter promo
 * Run: cd backend && npx jest src/utils/__tests__/newsletter-promo --no-coverage
 */
import {
  generatePromoCode,
  buildNewsletterPromotionPayload,
} from "../newsletter-promo"

describe("newsletter-promo helpers", () => {
  it("génère NL-XXXXXX", () => {
    expect(generatePromoCode("NL")).toMatch(/^NL-[A-Z0-9]{6}$/)
  })

  it("génère ANNIV-XXXXXX", () => {
    expect(generatePromoCode("ANNIV")).toMatch(/^ANNIV-[A-Z0-9]{6}$/)
  })

  it("payload items avec allocation each (requis Medusa v2)", () => {
    const payload = buildNewsletterPromotionPayload("NL-TEST01")
    expect(payload.code).toBe("NL-TEST01")
    expect(payload.usage_limit).toBe(1)
    expect(payload.is_automatic).toBe(false)
    expect(payload.application_method).toEqual({
      type: "percentage",
      target_type: "items",
      allocation: "each",
      value: 10,
      max_quantity: 100,
      apply_to_quantity: 1,
    })
  })
})

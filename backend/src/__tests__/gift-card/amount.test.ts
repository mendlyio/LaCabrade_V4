import {
  GIFT_CARD_MAX_EUROS,
  parseGiftCardAmount,
  resolveGiftCardFaceValueEuros,
  validateCustomGiftCardAmount,
  normalizeStoredGiftCardAmounts,
} from "../../utils/gift-card-amount"

describe("parseGiftCardAmount", () => {
  it("accepte un nombre", () => {
    expect(parseGiftCardAmount(50)).toBe(50)
    expect(parseGiftCardAmount(50.5)).toBe(50.5)
  })

  it("accepte une chaîne y compris envoyée par un client qui contourne le formulaire", () => {
    expect(parseGiftCardAmount("5000")).toBe(5000)
    expect(parseGiftCardAmount(" 80 ")).toBe(80)
    expect(parseGiftCardAmount("12,5")).toBe(12.5)
  })

  it("refuse les valeurs non numériques", () => {
    expect(parseGiftCardAmount("")).toBeNull()
    expect(parseGiftCardAmount("abc")).toBeNull()
    expect(parseGiftCardAmount(undefined)).toBeNull()
    expect(parseGiftCardAmount(null)).toBeNull()
    expect(parseGiftCardAmount(NaN)).toBeNull()
  })
})

describe("validateCustomGiftCardAmount — saisie client en euros", () => {
  it("accepte 10, 50, 500", () => {
    expect(validateCustomGiftCardAmount(10).ok).toBe(true)
    expect(validateCustomGiftCardAmount(10).amount).toBe(10)
    expect(validateCustomGiftCardAmount(50).amount).toBe(50)
    expect(validateCustomGiftCardAmount(500).amount).toBe(500)
    expect(validateCustomGiftCardAmount("80").amount).toBe(80)
  })

  it("rejette 5000 au lieu de le convertir en 50 €", () => {
    const result = validateCustomGiftCardAmount(5000)
    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.message).toContain(String(GIFT_CARD_MAX_EUROS))
    }
    expect(validateCustomGiftCardAmount("5000").ok).toBe(false)
    expect(validateCustomGiftCardAmount(5000.0).ok).toBe(false)
  })

  it("rejette en dessous de 10 € et au-dessus de 500 €", () => {
    expect(validateCustomGiftCardAmount(9.99).ok).toBe(false)
    expect(validateCustomGiftCardAmount(501).ok).toBe(false)
    expect(validateCustomGiftCardAmount(0).ok).toBe(false)
    expect(validateCustomGiftCardAmount(-50).ok).toBe(false)
  })
})

describe("resolveGiftCardFaceValueEuros — catalogue centimes vs euros", () => {
  it("force GC-050 à 50 € même si unit_price = 5000 centimes", () => {
    expect(
      resolveGiftCardFaceValueEuros({ sku: "GC-050", unitPrice: 5000 })
    ).toBe(50)
    expect(
      resolveGiftCardFaceValueEuros({ sku: "GC-025", unitPrice: 2500 })
    ).toBe(25)
    expect(
      resolveGiftCardFaceValueEuros({ sku: "GC-100", unitPrice: 10000 })
    ).toBe(100)
  })

  it("conserve 50 € si le line item est déjà en euros", () => {
    expect(
      resolveGiftCardFaceValueEuros({ sku: "GC-050", unitPrice: 50 })
    ).toBe(50)
  })

  it("préfère metadata.face_value_euros", () => {
    expect(
      resolveGiftCardFaceValueEuros({
        sku: "GC-050",
        unitPrice: 5000,
        metadataFaceValue: 50,
      })
    ).toBe(50)
  })

  it("convertit 5000 centimes orphelins en 50 € (filet anti-émission 5000 €)", () => {
    expect(resolveGiftCardFaceValueEuros({ unitPrice: 5000 })).toBe(50)
    expect(resolveGiftCardFaceValueEuros({ unitPrice: 2500 })).toBe(25)
    expect(resolveGiftCardFaceValueEuros({ unitPrice: 10000 })).toBe(100)
  })

  it("lit le montant dans le titre ou le SKU custom", () => {
    expect(
      resolveGiftCardFaceValueEuros({
        sku: "GC-CUSTOM-80",
        title: "Bon Cadeau 80€",
        unitPrice: 80,
      })
    ).toBe(80)
    expect(
      resolveGiftCardFaceValueEuros({ title: "Bon Cadeau 120€", unitPrice: 0 })
    ).toBe(120)
  })

  it("si metadata 5000 est hors plafond, retombe sur la conversion centimes du unit_price", () => {
    expect(
      resolveGiftCardFaceValueEuros({
        unitPrice: 5000,
        metadataFaceValue: 5000,
      })
    ).toBe(50)
  })

  it("refuse un unit_price incohérent", () => {
    expect(resolveGiftCardFaceValueEuros({ unitPrice: 0 })).toBeNull()
    expect(resolveGiftCardFaceValueEuros({ unitPrice: 600000 })).toBeNull()
    expect(resolveGiftCardFaceValueEuros({})).toBeNull()
  })
})

describe("normalizeStoredGiftCardAmounts", () => {
  it("convertit un bon 5000 centimes en 50 € y compris le solde restant", () => {
    expect(normalizeStoredGiftCardAmounts(5000, 5000)).toEqual({
      original: 50,
      balance: 50,
      renormalized: true,
    })
    expect(normalizeStoredGiftCardAmounts(5000, 2500)).toEqual({
      original: 50,
      balance: 25,
      renormalized: true,
    })
  })

  it("laisse un bon déjà en euros inchangé", () => {
    expect(normalizeStoredGiftCardAmounts(50, 29.27)).toEqual({
      original: 50,
      balance: 29.27,
      renormalized: false,
    })
  })
})

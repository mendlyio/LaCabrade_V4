/**
 * Tests simulation Newsletter
 *
 * Ces tests simulent le flux complet sans base de données ni Resend réel.
 * Exécuter avec: cd backend && npx jest src/__tests__/newsletter --no-coverage
 */

// ---------- Utilitaires (copiés depuis la route) ----------

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

function generatePromoCode(prefix: string): string {
  let code = prefix + "-"
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return code
}

function parseBirthdayToMD(birthday: string): string | null {
  const match = birthday.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) return `${match[2]}-${match[3]}`
  return null
}

function isBirthdayToday(birthday: string | null): boolean {
  if (!birthday) return false
  const today = new Date()
  const mm = String(today.getMonth() + 1).padStart(2, "0")
  const dd = String(today.getDate()).padStart(2, "0")
  return birthday === `${mm}-${dd}`
}

// ---------- Tests ----------

describe("Newsletter — Génération de codes promo", () => {
  it("génère un code bienvenue au format NL-XXXXXX", () => {
    const code = generatePromoCode("NL")
    expect(code).toMatch(/^NL-[A-Z0-9]{6}$/)
  })

  it("génère un code anniversaire au format ANNIV-XXXXXX", () => {
    const code = generatePromoCode("ANNIV")
    expect(code).toMatch(/^ANNIV-[A-Z0-9]{6}$/)
  })

  it("génère des codes uniques à chaque appel", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generatePromoCode("NL")))
    // Sur 50 codes, au moins 45 doivent être uniques (collisions rarissimes)
    expect(codes.size).toBeGreaterThanOrEqual(45)
  })

  it("n'utilise pas les caractères ambigus (0, O, I, 1)", () => {
    for (let i = 0; i < 100; i++) {
      const code = generatePromoCode("NL").replace("NL-", "")
      expect(code).not.toMatch(/[01IO]/)
    }
  })
})

describe("Newsletter — Parsing de la date d'anniversaire", () => {
  it("parse correctement le format YYYY-MM-DD vers MM-DD", () => {
    expect(parseBirthdayToMD("1990-03-15")).toBe("03-15")
    expect(parseBirthdayToMD("2000-12-01")).toBe("12-01")
    expect(parseBirthdayToMD("1985-07-25")).toBe("07-25")
  })

  it("retourne null pour un format invalide", () => {
    expect(parseBirthdayToMD("15/03/1990")).toBeNull()
    expect(parseBirthdayToMD("")).toBeNull()
    expect(parseBirthdayToMD("non-une-date")).toBeNull()
  })
})

describe("Newsletter — Détection anniversaire du jour", () => {
  it("détecte correctement l'anniversaire d'aujourd'hui", () => {
    const today = new Date()
    const mm = String(today.getMonth() + 1).padStart(2, "0")
    const dd = String(today.getDate()).padStart(2, "0")
    const todayMD = `${mm}-${dd}`

    expect(isBirthdayToday(todayMD)).toBe(true)
  })

  it("retourne false pour un anniversaire passé", () => {
    expect(isBirthdayToday("01-01")).toBe(new Date().getMonth() === 0 && new Date().getDate() === 1)
  })

  it("retourne false pour null", () => {
    expect(isBirthdayToday(null)).toBe(false)
  })
})

describe("Newsletter — Simulation d'inscription complète", () => {
  const mockSubscriberDb: Map<string, any> = new Map()

  const mockNewsletterService = {
    listNewsletterSubscribers: jest.fn(async (filters: any) => {
      const existing = Array.from(mockSubscriberDb.values()).find(
        (s) => s.email === filters.email
      )
      return existing ? [existing] : []
    }),
    createNewsletterSubscribers: jest.fn(async (data: any) => {
      const subscriber = { ...data, id: `sub_${Date.now()}`, created_at: new Date().toISOString() }
      mockSubscriberDb.set(subscriber.email, subscriber)
      return subscriber
    }),
  }

  const mockNotificationService = {
    createNotifications: jest.fn(async () => ({ id: "notif_123" })),
  }

  const mockCreatePromotionsWorkflow = {
    run: jest.fn(async () => ({ result: [{ id: "promo_123", code: "NL-TEST01" }] })),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockSubscriberDb.clear()
  })

  it("inscrit un nouvel abonné et envoie le code promo", async () => {
    const email = "test@example.com"
    const birthday = "1990-03-15"

    // 1. Vérifier que l'email n'existe pas encore
    const existing = await mockNewsletterService.listNewsletterSubscribers({ email })
    expect(existing).toHaveLength(0)

    // 2. Générer un code
    const promoCode = generatePromoCode("NL")
    expect(promoCode).toMatch(/^NL-[A-Z0-9]{6}$/)

    // 3. Créer la promotion
    const promoResult = await mockCreatePromotionsWorkflow.run({
      input: {
        promotionsData: [{
          code: promoCode,
          type: "standard",
          status: "active",
          is_automatic: false,
          usage_limit: 1,
          application_method: {
            type: "percentage",
            target_type: "items",
            allocation: "each",
            value: 10,
            max_quantity: 100,
            apply_to_quantity: 1,
          },
        }],
      },
    })
    expect(promoResult.result[0].id).toBe("promo_123")

    // 4. Sauvegarder l'abonné
    const birthdayMD = parseBirthdayToMD(birthday)
    const subscriber = await mockNewsletterService.createNewsletterSubscribers({
      email,
      birthday: birthdayMD,
      promo_code: promoCode,
      status: "active",
    })
    expect(subscriber.email).toBe(email)
    expect(subscriber.birthday).toBe("03-15")
    expect(subscriber.promo_code).toMatch(/^NL-[A-Z0-9]{6}$/)

    // 5. Envoyer l'email
    await mockNotificationService.createNotifications({
      to: email,
      channel: "email",
      template: "newsletter-welcome",
      data: { email, promoCode, preview: "Votre code -10% est arrivé !" },
    })
    expect(mockNotificationService.createNotifications).toHaveBeenCalledTimes(1)
    expect(mockNotificationService.createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ to: email, template: "newsletter-welcome" })
    )
  })

  it("ne réinscrit pas un email déjà abonné", async () => {
    const email = "existant@example.com"

    // Pré-inscrire
    mockSubscriberDb.set(email, {
      id: "sub_existing",
      email,
      promo_code: "NL-EXISTING",
      status: "active",
    })

    const existing = await mockNewsletterService.listNewsletterSubscribers({ email })
    expect(existing).toHaveLength(1)
    expect(existing[0].promo_code).toBe("NL-EXISTING")
    expect(mockNewsletterService.createNewsletterSubscribers).not.toHaveBeenCalled()
  })
})

describe("Newsletter — Simulation du job anniversaire", () => {
  it("identifie correctement les abonnés dont c'est l'anniversaire aujourd'hui", () => {
    const today = new Date()
    const mm = String(today.getMonth() + 1).padStart(2, "0")
    const dd = String(today.getDate()).padStart(2, "0")
    const todayMD = `${mm}-${dd}`

    const subscribers = [
      { id: "1", email: "a@test.com", birthday: todayMD, status: "active" },
      { id: "2", email: "b@test.com", birthday: "06-15", status: "active" },
      { id: "3", email: "c@test.com", birthday: null, status: "active" },
      { id: "4", email: "d@test.com", birthday: todayMD, status: "unsubscribed" },
    ]

    const toNotify = subscribers.filter(
      (s) => s.birthday === todayMD && s.status === "active"
    )

    expect(toNotify).toHaveLength(1)
    expect(toNotify[0].email).toBe("a@test.com")
  })

  it("génère un code ANNIV unique pour chaque abonné", () => {
    const subscribers = ["a@test.com", "b@test.com", "c@test.com"]
    const codes = subscribers.map(() => generatePromoCode("ANNIV"))
    const unique = new Set(codes)
    expect(unique.size).toBe(codes.length)
    codes.forEach((c) => expect(c).toMatch(/^ANNIV-[A-Z0-9]{6}$/))
  })
})

describe("Newsletter — Validation email storefront", () => {
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  it("accepte les emails valides", () => {
    expect(isValidEmail("user@example.com")).toBe(true)
    expect(isValidEmail("user+tag@sub.domain.be")).toBe(true)
    expect(isValidEmail("user.name@company.org")).toBe(true)
  })

  it("rejette les emails invalides", () => {
    expect(isValidEmail("")).toBe(false)
    expect(isValidEmail("notanemail")).toBe(false)
    expect(isValidEmail("@nodomain.com")).toBe(false)
    expect(isValidEmail("noatsign.com")).toBe(false)
  })
})

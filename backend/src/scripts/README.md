# Custom CLI Scripts

A custom CLI script is a function to execute through Medusa's CLI tool. This is useful when creating custom Medusa tooling to run as a CLI tool.

---

## Scripts disponibles

### 🚚 seed-bpost.ts - Configuration des options de livraison Bpost

Ce script configure automatiquement les options de livraison Bpost avec les zones de service et les règles de pricing.

**Prérequis:**
- Variables d'environnement `BPOST_PUBLIC_KEY` et `BPOST_PRIVATE_KEY` configurées

**Exécution:**
```bash
npx medusa exec src/scripts/seed-bpost.ts
```

**Ce que fait le script:**
1. ✅ Vérifie que le provider Bpost est disponible
2. 📍 Crée ou utilise le stock location existant
3. 🌍 Crée les zones de service:
   - **Belgique** (BE)
   - **Europe** (FR, NL, DE, LU)
4. 📦 Crée les options de livraison:
   - **Bpost - Livraison à domicile (Belgique)** : 5.95€ - 9.95€
   - **Bpost - Point relais (Belgique)** : 3.95€
   - **Bpost - Livraison internationale (Europe)** : 8.95€ - 21.95€

**Modifier les prix:**
Les prix sont définis dans les métadonnées `bpost_pricing_rules` de chaque option.
Vous pouvez les modifier:
- Via l'admin Medusa → Paramètres → Bpost
- Directement dans le script avant exécution

---

### ⚡ seed-express.ts - Ajout de la livraison express (12,90 €)

Si les options Bpost existent déjà mais **sans** la livraison express, exécutez ce script pour l'ajouter :

```bash
npx medusa exec src/scripts/seed-express.ts
```

**Ce que fait le script:**
- Ajoute **Bpost - Livraison express (Belgique)** — 12,90 €
- Ajoute **Bpost - Livraison express (Europe)** — 12,90 € (si la zone Europe existe)

**Note:** Si vous avez lancé `seed-bpost` avant l'ajout des options express, celui-ci détecte les options existantes et s'arrête sans rien créer. Utilisez `seed-express` pour ajouter uniquement l'express.

---

## How to Create a Custom CLI Script?

To create a custom CLI script, create a TypeScript or JavaScript file under the `src/scripts` directory. The file must default export a function.

For example, create the file `src/scripts/my-script.ts` with the following content:

```ts title="src/scripts/my-script.ts"
import { 
  ExecArgs,
  IProductModuleService
} from "@medusajs/types"
import { ModuleRegistrationName } from "@medusajs/utils"

export default async function myScript ({
  container
}: ExecArgs) {
  const productModuleService: IProductModuleService = 
    container.resolve(ModuleRegistrationName.PRODUCT)

  const [, count] = await productModuleService.listAndCount()

  console.log(`You have ${count} product(s)`)
}
```

The function receives as a parameter an object having a `container` property, which is an instance of the Medusa Container. Use it to resolve resources in your Medusa application.

---

## How to Run Custom CLI Script?

To run the custom CLI script, run the `exec` command:

```bash
npx medusa exec ./src/scripts/my-script.ts
```

---

## Custom CLI Script Arguments

Your script can accept arguments from the command line. Arguments are passed to the function's object parameter in the `args` property.

For example:

```ts
import { ExecArgs } from "@medusajs/types"

export default async function myScript ({
  args
}: ExecArgs) {
  console.log(`The arguments you passed: ${args}`)
}
```

Then, pass the arguments in the `exec` command after the file path:

```bash
npx medusa exec ./src/scripts/my-script.ts arg1 arg2
```
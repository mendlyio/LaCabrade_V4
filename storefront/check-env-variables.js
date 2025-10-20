const c = require("ansi-colors")

const requiredEnvs = [
  {
    key: "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
    // TODO: we need a good doc to point this to
    description:
      "Learn how to create a publishable key: https://docs.medusajs.com/v2/resources/storefront-development/publishable-api-keys",
  },
]

function checkEnvVariables() {
  // Skip environment variable checks during build phase (Railway, CI/CD, etc.)
  if (process.env.NODE_ENV === 'production' && process.argv.includes('build')) {
    console.log(c.yellow("\n⚠️  Skipping environment variable checks during build phase\n"))
    return
  }

  const missingEnvs = requiredEnvs.filter(function (env) {
    return !process.env[env.key]
  })

  if (missingEnvs.length > 0) {
    console.error(
      c.red.bold("\n🚫 Error: Missing required environment variables\n")
    )

    missingEnvs.forEach(function (env) {
      console.error(c.yellow(`  ${c.bold(env.key)}`))
      if (env.description) {
        console.error(c.dim(`    ${env.description}\n`))
      }
    })

    console.error(
      c.yellow(
        "\nPlease set these variables in your .env file or environment before starting the application.\n"
      )
    )

    // Only exit during runtime, not during build
    if (!process.argv.includes('build')) {
      process.exit(1)
    } else {
      console.log(c.yellow("⚠️  Continuing build without environment variables (they should be set at runtime)\n"))
    }
  }
}

module.exports = checkEnvVariables

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
  const missingEnvs = requiredEnvs.filter(function (env) {
    return !process.env[env.key]
  })

  if (missingEnvs.length > 0) {
    // During build phase, only show warnings, don't exit
    // Check if we're in a build context by looking at the npm lifecycle event
    const isBuildPhase = process.env.npm_lifecycle_event === 'build' || 
                         process.env.npm_lifecycle_event === 'build:next' ||
                         process.env.NEXT_PHASE === 'phase-production-build'

    if (isBuildPhase) {
      console.log(
        c.yellow("\n⚠️  Warning: Missing required environment variables during build\n")
      )
      missingEnvs.forEach(function (env) {
        console.log(c.yellow(`  ${c.bold(env.key)}`))
        if (env.description) {
          console.log(c.dim(`    ${env.description}\n`))
        }
      })
      console.log(
        c.yellow(
          "⚠️  Continuing build. These variables MUST be set at runtime for the application to work.\n"
        )
      )
      return // Don't exit during build
    }

    // During runtime, show errors and exit
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

    process.exit(1)
  }
}

module.exports = checkEnvVariables

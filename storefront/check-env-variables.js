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
    // Check if we're in a build context
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

    // During runtime, show warning but continue
    // The application will fail when trying to use the API anyway
    console.warn(
      c.yellow("\n⚠️  Warning: Missing required environment variables at runtime\n")
    )

    missingEnvs.forEach(function (env) {
      console.warn(c.yellow(`  ${c.bold(env.key)}`))
      if (env.description) {
        console.warn(c.dim(`    ${env.description}\n`))
      }
    })

    console.warn(
      c.yellow(
        "⚠️  Application is starting but API calls may fail without these variables.\n"
      )
    )
    
    // Don't exit - let the application start and fail gracefully when needed
  }
}

module.exports = checkEnvVariables

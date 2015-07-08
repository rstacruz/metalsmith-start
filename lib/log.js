var chalk = require('chalk')

/**
 * Log an error and then exit the process.
 *
 * @param {String} msg
 * @param {String} [stack]  Optional stack trace to print.
 */

function fatal (msg, stack) {
  console.error()
  console.error(chalk.red('  Metalsmith') + chalk.gray(' · ') + msg)
  if (stack) {
    console.error()
    console.error(chalk.gray(stack))
  }
  console.error()
  process.exit(1)
}

/**
 * Log a `message`.
 *
 * @param {String} message
 */

function log (message) {
  console.log()
  console.log(chalk.gray('  Metalsmith · ') + message)
  console.log()
}

module.exports = {
  fatal: fatal,
  log: log
}

var chalk = require('chalk')
var prefix = 'ms'

/**
 * Log an error and then exit the process.
 *
 * @param {String} msg
 * @param {String} [stack]  Optional stack trace to print.
 */

function fatal (msg, stack) {
  console.error()
  console.error(chalk.red('  ' + prefix) + chalk.gray(' · ') + msg)
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

function log (message, klass) {
  message = message.replace(/^([a-z]+):/, function (_, msg) {
    return Array(12 - msg.length).join(' ') + chalk.blue(msg)
  })
  var pref = '  ' + prefix + ' · '
  if (klass === 'err') pref = chalk.red(pref)
  else pref = chalk.gray(pref)
  console.log(pref + message)
}

module.exports = {
  fatal: fatal,
  log: log
}

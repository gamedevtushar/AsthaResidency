// Builds firestore.generated.rules from firestore.rules, filling in the Main Admin email
// from the local .env file. The generated file is git-ignored, so the email never goes to GitHub.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const env = existsSync('.env') ? readFileSync('.env', 'utf8') : ''
const email = (env.match(/^SUPER_ADMIN_EMAIL=(.*)$/m)?.[1] || '').trim().toLowerCase()

if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('✖ Set SUPER_ADMIN_EMAIL=<main admin login email> in your .env file first.')
  process.exit(1)
}

const rules = readFileSync('firestore.rules', 'utf8')
if (!rules.includes('__SUPER_ADMIN_EMAIL__')) {
  console.error('✖ firestore.rules is missing the __SUPER_ADMIN_EMAIL__ placeholder.')
  process.exit(1)
}
writeFileSync('firestore.generated.rules', rules.replaceAll('__SUPER_ADMIN_EMAIL__', email))
console.log('✔ firestore.generated.rules ready')

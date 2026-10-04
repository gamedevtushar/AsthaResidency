import { createContext, useContext, useState } from 'react'
import { motion } from 'motion/react'

/**
 * Simple 2-language support. Add a new language by adding a dictionary below
 * and an entry in LANGUAGES. Missing keys fall back to English.
 *
 * Values stored in the database (categories, payment modes) stay in English;
 * they are translated for display with tv().
 */
export const LANGUAGES = [
  { code: 'gu', label: 'ગુજરાતી', short: 'ગુ', locale: 'gu-IN' },
  { code: 'en', label: 'English', short: 'EN', locale: 'en-IN' },
]
const DEFAULT_LANG = 'gu'

const en = {
  // common
  appName: 'Astha Residency', appSub: 'Maintenance', save: 'Save', cancel: 'Cancel', delete: 'Delete', all: 'All',
  signOut: 'Sign out', changePassword: 'Change password',
  errPermission: "You don't have permission to do this.", errGeneric: 'Something went wrong',
  flat: 'Flat', shop: 'Shop', flats: 'Flats', shops: 'Shops', wing: 'Wing', allWings: 'All wings',
  common: 'Common', unknownWing: 'Unknown wing',
  amount: 'Amount (₹)', date: 'Date', paymentMode: 'Payment mode', perMonth: ' /month',
  income: 'Income', expense: 'Expense', paid: 'Paid', unpaid: 'Unpaid',
  saved: 'Saved', deleted: 'Deleted', noOwner: 'No owner name', type: 'Type',
  errNetwork: 'No internet connection. Please try again.', errNotFound: 'This record no longer exists.',
  offline: 'You are offline. Changes will sync when you reconnect.', backOnline: 'Back online',
  'confirm.title': 'Are you sure?', 'confirm.yes': 'Yes, continue', 'confirm.signOut': 'Do you want to sign out of this device?',
  undo: 'Undo', close: 'Close',
  'us.createdTitle': 'User created', 'us.copy': 'Copy login details', 'us.copied': 'Login details copied',
  'us.shareHint': 'Share these login details with the user.', 'us.generate': 'Generate password',
  'demo.badge': 'Demo mode · sample data', 'demo.hint': 'Demo logins (password {pw}):',
  select: 'Select…', searchPh: 'Search…', noMatches: 'No matches', today: 'Today', yesterday: 'Yesterday', more: 'More',
  language: 'Language', required: 'This is required', optional: 'optional', quickAdd: 'Quick add', share: 'Share',
  'login.needUsername': 'Please enter your username', 'login.needPassword': 'Please enter your password',
  'qa.title': 'What do you want to add?', 'qa.subtitle': 'Pick one to get started',
  'qa.payment': 'Record payment', 'qa.paymentHint': 'Maintenance received from a flat or shop',
  'qa.expenseHint': 'Electricity, salary, repairs…', 'qa.incomeHint': 'Parking, rent, late fee…',
  'qa.unitHint': 'One new flat or shop', 'qa.wingHint': 'A whole wing with all its flats', 'qa.userHint': 'Give someone a login',
  'collect.title': 'Collect · {month}', 'collect.subtitle': '{n} still to pay — tap a flat to record payment',
  'collect.short': 'Collect', 'collect.allPaid': 'Everyone has paid 🎉',
  'm.paidVia': 'Paid on {date} · {mode}',
  'u.setupFirst': 'Set up first wing', 'u.addUnitsShort': 'Add flats / shops', 'u.editWingMaint': 'Edit wing & maintenance',
  'u.deleteWing': 'Delete wing', 'u.duplicate': '{n} already exists in this wing', 'u.prefix': 'Prefix',
  'u.floors': 'Floors', 'u.perFloor': 'Flats / floor', 'u.startFloor': 'First floor no.', 'u.shopCount': 'Shops',
  'u.flatAmount': 'Flat ₹ / month', 'u.shopAmount': 'Shop ₹ / month', 'u.preview': 'Preview',
  'u.planSummary': '{f} flats + {s} shops · {amt}/month', 'u.createWing': 'Create wing',
  'u.wingCreated': '{name}: {n} units added', 'u.addUnitsTitle': 'Add units to {name}', 'u.newWingTitle': 'New wing',
  'u.wizardSub': 'Set floors and flats — unit numbers are created for you',
  'u.maintFlats': 'Maintenance for every flat', 'u.maintShops': 'Maintenance for every shop',
  'u.maintHint': 'New amounts apply to bills created from now on. Existing bills stay the same.',
  'u.wingUpdated': '{name} updated', 'u.nothingToAdd': 'All these units already exist', 'u.pickUnit': 'Choose a flat or shop',
  'us.linkUnit': 'Link to a flat', 'us.linkHint': 'Fills in name and username for you', 'us.usernameShortHint': 'Letters and numbers, e.g. a101',
  'us.roleViewerHint': 'Can only view', 'us.roleWingHint': 'Manages one wing', 'us.roleSuperHint': 'Full control', 'us.roleDisabledHint': 'No access',
  'us.resetShort': 'Reset password', 'us.search': 'Search name or username', 'us.tapToEdit': 'Tap a user to change role, wing or remove',
  'pw.short': 'Password',
  'pwa.install': 'Install app', 'pwa.installHint': 'Open it from your home screen like any app',
  'pwa.installed': 'App installed on this device', 'pwa.updateReady': 'A new version is ready', 'pwa.update': 'Update',
  'pwa.howTitle': 'Install on your phone', 'pwa.appNote': 'Free · no app store needed · always up to date',
  'pwa.ios1': 'Open this page in Safari', 'pwa.ios2': 'Tap the Share button (square with an arrow)',
  'pwa.ios3': 'Choose "Add to Home Screen"', 'pwa.ios4': 'Tap "Add" — the Astha icon appears',
  'pwa.and1': 'Open the browser menu (⋮ at the top right)', 'pwa.and2': 'Tap "Install app" or "Add to Home screen"',
  'pwa.and3': 'Confirm — the Astha icon appears',
  'pwa.iconNote': 'Added it before and still see the old logo? Remove the old icon from your home screen and add it again.',
  'setup.title': 'App not connected yet', 'setup.text': 'The Firebase settings are missing. Add the FIREBASE_CONFIG secret on GitHub and deploy again (see README).',
  'role.public': 'Visitor · view only', 'public.viewing': 'You are viewing only', 'public.login': 'Admin login',
  menu: 'Menu', theme: 'Theme', textSize: 'Text size', palette: 'Colour theme', feedback: 'Vibration on tap',
  'rem.title': 'Maintenance reminders', 'rem.ask': 'Get a reminder on this phone when maintenance is due?', 'rem.turnOn': 'Turn on', 'rem.on': 'Reminders are on',
  'rem.state.default': 'Get a reminder on this phone', 'rem.state.granted': 'On for this phone',
  'rem.state.denied': 'Blocked — allow notifications in phone settings', 'rem.state.install': 'Install the app to get reminders',
  'rem.settings': 'Reminder settings', 'rem.sub': 'Monthly maintenance reminders',
  'rem.note': 'Sent only to phones where the app is installed and reminders are on. Times are India time.',
  'rem.phones': '{n} phones will get them', 'rem.enabled': 'Send reminders', 'rem.days': 'Days of the month',
  'rem.messages': 'Time and message', 'rem.preview': 'Preview', 'rem.addTime': 'Add another time',
  'rem.titlePh': 'Title', 'rem.bodyPh': 'Message', add: 'Add', 'login.back': 'View without login',
  'u.tapToRemove': 'Tap a unit to remove it (tap again to bring it back). Add extra numbers below.',
  'u.addExtraPh': 'Extra unit, e.g. A-105', 'u.maintUsualHint': 'Usual amount. You can change it any month with "Monthly amount" in Monthly accounts.',
  'u.phoneHint': 'Only visible to logged-in admins',
  'bills.button': 'Monthly amount', 'bills.title': 'Maintenance · {month}', 'bills.sub': "Set this month's amount",
  'bills.hint': 'Maintenance can be different every month. Change the amounts below — payments already recorded are never changed.',
  'bills.allFlats': 'All flats (every wing)', 'bills.allShops': 'All shops (every wing)', 'bills.count': '{n} flats & shops',
  'bills.save': 'Save amounts', 'bills.saved': 'Amounts saved', 'bills.paidKept': '{n} paid (kept)',
  'bills.mixed': 'different amounts', 'bills.each': 'as before',
  // nav
  'nav.month': 'Monthly accounts', 'nav.monthShort': 'Accounts',
  'nav.units': 'Wings & Units', 'nav.unitsShort': 'Units',
  'nav.reports': 'Reports', 'nav.reportsShort': 'Reports',
  'nav.users': 'Users',
  // roles
  'role.super_admin': 'Main Admin', 'role.wing_admin': 'Wing Admin', 'role.viewer': 'Viewer', 'role.disabled': 'Disabled',
  // login
  'login.hero': 'Building maintenance, clear and simple.',
  'login.heroSub': 'Track monthly maintenance, bills and balances for every wing — transparent for all residents.',
  'login.f1': 'Admins manage, residents view', 'login.f2': 'Wing-wise reports & dashboard', 'login.f3': 'Works great on mobile',
  'login.welcome': 'Welcome back', 'login.sub': 'Sign in to {app} maintenance',
  'login.username': 'Username', 'login.password': 'Password', 'login.signIn': 'Sign in',
  'login.help': "Don't have an account or forgot password? Contact the building admin.",
  'login.wrong': 'Wrong username or password', 'login.tooMany': 'Too many attempts. Please try again later.',
  // no access
  // password
  'pw.current': 'Current password', 'pw.new': 'New password', 'pw.confirm': 'Confirm new password', 'pw.change': 'Change',
  'pw.min': 'New password must be at least 6 characters', 'pw.mismatch': 'New passwords do not match',
  'pw.done': 'Password changed', 'pw.wrong': 'Current password is wrong',
  // dashboard
  'dash.collected': 'Maintenance collected',
  // monthly accounts
  'mo.pending': 'Pending',
  'mo.entries': 'Income & expenses',
  'mo.noUnits': 'No flats or shops added yet',
  'mo.collectedShort': 'Collected', 'mo.maintenance': 'Maintenance',
  'img.save': 'Save as image', 'img.generated': 'Made on {d}', 'img.monthBalance': 'Month balance', 'img.more': '+ {n} more', 'mo.viewMap': 'Building', 'mo.viewList': 'List',
  'a.forMonth': 'For which month', 'a.dateNote': 'Date (only for the record)', 'm.paidOnNote': 'Paid on (only for the record)',
  // maintenance
  'm.units': '{n} units',
  'm.search': 'Search unit or owner',
  'm.note': 'Note (receipt no., cheque no.…)', 'm.markPaid': 'Mark paid', 'm.markUnpaid': 'Mark unpaid',
  'm.update': 'Update', 'm.deleteBill': 'Delete bill', 'm.confirmDelete': 'Delete this bill?',
  'm.markedPaid': '{unit} marked paid', 'm.markedUnpaid': 'Marked unpaid', 'm.deleted': 'Bill deleted',
  // accounts
  'a.empty': 'No entries',
  'a.addIncome': 'Add income', 'a.addExpense': 'Add expense', 'a.editIncome': 'Edit income', 'a.editExpense': 'Edit expense',
  'a.enterAmount': 'Enter an amount', 'a.confirmDelete': 'Delete this entry?',
  'a.category': 'Category', 'a.description': 'Description', 'a.descPh': 'e.g. Electricity bill Sept, vendor name',
  // units
  'u.subtitle': '{w} wings · {f} flats · {s} shops', 'u.addWing': 'Add wing', 'u.addUnit': 'Add unit',
  'u.noWings': 'No wings yet', 'u.noWingsAdmin': 'Start by adding the wings of your building (e.g. A Wing, B Wing).',
  'u.noWingsViewer': 'The admin has not added any wings yet.',
  'u.wingCount': '{f} flats · {s} shops', 'u.search': 'Search unit, owner, phone',
  'u.noUnits': 'No units found', 'u.noUnitsText': 'Add flats and shops with their monthly maintenance amount.',
  'u.confirmDelete': 'Delete unit {n}? Past maintenance records are kept.', 'u.deleted': 'Unit deleted',
  'u.confirmDeleteWing': 'Delete {n} and all its {c} flats / shops? Payments already recorded stay in reports.', 'u.wingDeleted': 'Wing deleted',
  'u.wingName': 'Wing name', 'u.wingPh': 'e.g. A Wing',
  'u.editUnit': 'Edit {n}', 'u.unitSaved': 'Unit saved',
  'u.number': 'Unit number', 'u.numberPh': 'e.g. A-101', 'u.maint': 'Usual monthly maintenance (₹)',
  'u.owner': 'Owner / resident name', 'u.phone': 'Phone',
  'u.bulkBtn': 'Add {n} units',
  // reports
  'r.year': 'Year {y}', 'r.in': 'In', 'r.out': 'Out', 'r.balance': 'Balance', 'r.broughtForward': 'Brought forward',
  'r.month': 'Month', 'r.total': 'Total',
  // users
  'us.count': '{n} users', 'us.add': 'Add user', 'us.none': 'No users yet', 'us.you': '(you)',
  'us.remove': 'Remove',
  'us.confirmRemove': 'Remove {n}? They will no longer be able to see anything.', 'us.removed': 'User removed',
  'us.resetSent': 'Reset link sent to {e}',
  'us.forgotNote': 'Users can change their own password from the profile menu. If someone with a username (not an email) forgets their password, delete their login in Firebase Console → Authentication, then add them again here.',
  'us.edit': 'Edit {n}', 'us.nameReq': 'Enter a name', 'us.wingReq': 'Select a wing',
  'us.badUsername': 'Username can only have letters, numbers, dot, dash and underscore',
  'us.pwMin': 'Password must be at least 6 characters', 'us.added': '{n} added', 'us.updated': 'User updated',
  'us.exists': 'This username already exists. Choose another (or delete it in Firebase Console → Authentication).',
  'us.create': 'Create user', 'us.fullName': 'Full name', 'us.namePh': 'e.g. Ramesh Patel (A-101)',
  'us.role': 'Role', 'us.wingManage': 'Wing they manage', 'us.addWingFirst': 'Add a wing first (Wings & Units).',
}

const gu = {
  appName: 'આસ્થા રેસિડેન્સી', appSub: 'મેન્ટેનન્સ', save: 'સેવ કરો', cancel: 'રદ કરો', delete: 'ડિલીટ કરો', all: 'બધા',
  signOut: 'લૉગ આઉટ', changePassword: 'પાસવર્ડ બદલો',
  errPermission: 'તમને આ કરવાની પરવાનગી નથી.', errGeneric: 'કંઈક ખોટું થયું',
  flat: 'ફ્લેટ', shop: 'દુકાન', flats: 'ફ્લેટ', shops: 'દુકાનો', wing: 'વિંગ', allWings: 'બધી વિંગ',
  common: 'કોમન', unknownWing: 'અજાણી વિંગ',
  amount: 'રકમ (₹)', date: 'તારીખ', paymentMode: 'ચુકવણીની રીત', perMonth: ' /મહિને',
  income: 'આવક', expense: 'ખર્ચ', paid: 'ભર્યું', unpaid: 'બાકી',
  saved: 'સેવ થયું', deleted: 'ડિલીટ થયું', noOwner: 'માલિકનું નામ નથી', type: 'પ્રકાર',
  errNetwork: 'ઇન્ટરનેટ કનેક્શન નથી. ફરી પ્રયાસ કરો.', errNotFound: 'આ રેકોર્ડ હવે અસ્તિત્વમાં નથી.',
  offline: 'તમે ઓફલાઇન છો. કનેક્શન પાછું આવતાં ફેરફારો સેવ થશે.', backOnline: 'ફરી ઓનલાઇન',
  'confirm.title': 'શું તમને ખાતરી છે?', 'confirm.yes': 'હા, આગળ વધો', 'confirm.signOut': 'શું તમે આ ડિવાઇસમાંથી લૉગ આઉટ કરવા માંગો છો?',
  undo: 'પાછું કરો', close: 'બંધ કરો',
  'us.createdTitle': 'યુઝર બન્યા', 'us.copy': 'લૉગિન વિગત કૉપી કરો', 'us.copied': 'લૉગિન વિગત કૉપી થઈ',
  'us.shareHint': 'આ લૉગિન વિગત યુઝરને મોકલો.', 'us.generate': 'પાસવર્ડ બનાવો',
  'demo.badge': 'ડેમો મોડ · નમૂના ડેટા', 'demo.hint': 'ડેમો લૉગિન (પાસવર્ડ {pw}):',
  select: 'પસંદ કરો…', searchPh: 'શોધો…', noMatches: 'કંઈ મળ્યું નહીં', today: 'આજે', yesterday: 'ગઈકાલે', more: 'વધુ',
  language: 'ભાષા', required: 'આ જરૂરી છે', optional: 'વૈકલ્પિક', quickAdd: 'ઝડપી ઉમેરો', share: 'શેર કરો',
  'login.needUsername': 'કૃપા કરી યુઝરનેમ લખો', 'login.needPassword': 'કૃપા કરી પાસવર્ડ લખો',
  'qa.title': 'શું ઉમેરવું છે?', 'qa.subtitle': 'શરૂ કરવા એક પસંદ કરો',
  'qa.payment': 'ચુકવણી નોંધો', 'qa.paymentHint': 'ફ્લેટ કે દુકાનથી મળેલું મેન્ટેનન્સ',
  'qa.expenseHint': 'લાઇટ બિલ, પગાર, રિપેરિંગ…', 'qa.incomeHint': 'પાર્કિંગ, ભાડું, લેટ ફી…',
  'qa.unitHint': 'એક નવો ફ્લેટ કે દુકાન', 'qa.wingHint': 'બધા ફ્લેટ સાથે આખી વિંગ', 'qa.userHint': 'કોઈને લૉગિન આપો',
  'collect.title': 'ઉઘરાણી · {month}', 'collect.subtitle': '{n} બાકી — ચુકવણી નોંધવા ફ્લેટ પર ટૅપ કરો',
  'collect.short': 'જમા લો', 'collect.allPaid': 'બધાએ ભરી દીધું 🎉',
  'm.paidVia': '{date} ના રોજ ભર્યું · {mode}',
  'u.setupFirst': 'પહેલી વિંગ બનાવો', 'u.addUnitsShort': 'ફ્લેટ / દુકાન ઉમેરો', 'u.editWingMaint': 'વિંગ અને મેન્ટેનન્સ બદલો',
  'u.deleteWing': 'વિંગ ડિલીટ કરો', 'u.duplicate': '{n} આ વિંગમાં પહેલેથી છે', 'u.prefix': 'પ્રીફિક્સ',
  'u.floors': 'માળ', 'u.perFloor': 'ફ્લેટ / માળ', 'u.startFloor': 'પહેલા માળનો નં.', 'u.shopCount': 'દુકાનો',
  'u.flatAmount': 'ફ્લેટ ₹ / મહિને', 'u.shopAmount': 'દુકાન ₹ / મહિને', 'u.preview': 'પૂર્વાવલોકન',
  'u.planSummary': '{f} ફ્લેટ + {s} દુકાન · {amt}/મહિને', 'u.createWing': 'વિંગ બનાવો',
  'u.wingCreated': '{name}: {n} યુનિટ ઉમેરાયા', 'u.addUnitsTitle': '{name} માં યુનિટ ઉમેરો', 'u.newWingTitle': 'નવી વિંગ',
  'u.wizardSub': 'માળ અને ફ્લેટ સેટ કરો — યુનિટ નંબર આપમેળે બનશે',
  'u.maintFlats': 'દરેક ફ્લેટનું મેન્ટેનન્સ', 'u.maintShops': 'દરેક દુકાનનું મેન્ટેનન્સ',
  'u.maintHint': 'નવી રકમ હવે પછી બનતા બિલ પર લાગુ થશે. જૂના બિલ બદલાશે નહીં.',
  'u.wingUpdated': '{name} અપડેટ થઈ', 'u.nothingToAdd': 'આ બધા યુનિટ પહેલેથી છે', 'u.pickUnit': 'ફ્લેટ કે દુકાન પસંદ કરો',
  'us.linkUnit': 'ફ્લેટ સાથે જોડો', 'us.linkHint': 'નામ અને યુઝરનેમ આપમેળે ભરાશે', 'us.usernameShortHint': 'અંગ્રેજી અક્ષર અને આંકડા, દા.ત. a101',
  'us.roleViewerHint': 'ફક્ત જોઈ શકે', 'us.roleWingHint': 'એક વિંગ સંભાળે', 'us.roleSuperHint': 'સંપૂર્ણ નિયંત્રણ', 'us.roleDisabledHint': 'ઍક્સેસ નથી',
  'us.resetShort': 'પાસવર્ડ રીસેટ', 'us.search': 'નામ અથવા યુઝરનેમ શોધો', 'us.tapToEdit': 'ભૂમિકા, વિંગ બદલવા કે દૂર કરવા યુઝર પર ટૅપ કરો',
  'pw.short': 'પાસવર્ડ',
  'pwa.install': 'એપ ઇન્સ્ટોલ કરો', 'pwa.installHint': 'હોમ સ્ક્રીન પરથી સામાન્ય એપની જેમ ખોલો',
  'pwa.installed': 'એપ આ ડિવાઇસમાં ઇન્સ્ટોલ થઈ ગઈ', 'pwa.updateReady': 'નવું વર્ઝન તૈયાર છે', 'pwa.update': 'અપડેટ કરો',
  'pwa.howTitle': 'ફોનમાં ઇન્સ્ટોલ કરો', 'pwa.appNote': 'મફત · એપ સ્ટોરની જરૂર નથી · હંમેશા અપડેટ',
  'pwa.ios1': 'આ પેજ Safari માં ખોલો', 'pwa.ios2': 'શેર બટન દબાવો (તીરવાળું ચોરસ)',
  'pwa.ios3': '"Add to Home Screen" પસંદ કરો', 'pwa.ios4': '"Add" દબાવો — Astha આઇકન આવી જશે',
  'pwa.and1': 'બ્રાઉઝર મેનુ ખોલો (ઉપર જમણે ⋮)', 'pwa.and2': '"Install app" અથવા "Add to Home screen" દબાવો',
  'pwa.and3': 'કન્ફર્મ કરો — Astha આઇકન આવી જશે',
  'pwa.iconNote': 'પહેલાં ઉમેરેલું હોય અને જૂનો લોગો દેખાય? હોમ સ્ક્રીન પરથી જૂનો આઇકન કાઢી ફરી ઉમેરો.',
  'setup.title': 'એપ હજુ જોડાયેલી નથી', 'setup.text': 'Firebase સેટિંગ્સ નથી. GitHub માં FIREBASE_CONFIG secret ઉમેરી ફરી deploy કરો (README જુઓ).',
  'role.public': 'મુલાકાતી · ફક્ત જોવા', 'public.viewing': 'તમે ફક્ત જોઈ રહ્યા છો', 'public.login': 'એડમિન લૉગિન',
  menu: 'મેનુ', theme: 'થીમ', textSize: 'અક્ષરનું કદ', palette: 'રંગ થીમ', feedback: 'ટૅપ પર વાઇબ્રેશન',
  'rem.title': 'મેન્ટેનન્સ રિમાઇન્ડર', 'rem.ask': 'મેન્ટેનન્સ ભરવાનો સમય થાય ત્યારે આ ફોન પર યાદ અપાવીએ?', 'rem.turnOn': 'ચાલુ કરો', 'rem.on': 'રિમાઇન્ડર ચાલુ થયા',
  'rem.state.default': 'આ ફોન પર યાદ અપાવવા', 'rem.state.granted': 'આ ફોન પર ચાલુ છે',
  'rem.state.denied': 'બંધ છે — ફોનના સેટિંગમાં નોટિફિકેશનની મંજૂરી આપો', 'rem.state.install': 'રિમાઇન્ડર માટે એપ ઇન્સ્ટોલ કરો',
  'rem.settings': 'રિમાઇન્ડર સેટિંગ', 'rem.sub': 'દર મહિને મેન્ટેનન્સની યાદ',
  'rem.note': 'ફક્ત એપ ઇન્સ્ટોલ કરેલા અને રિમાઇન્ડર ચાલુ કરેલા ફોન પર જ મોકલાશે. સમય ભારતીય સમય મુજબ.',
  'rem.phones': '{n} ફોન પર મોકલાશે', 'rem.enabled': 'રિમાઇન્ડર મોકલો', 'rem.days': 'મહિનાની તારીખો',
  'rem.messages': 'સમય અને સંદેશ', 'rem.preview': 'જુઓ', 'rem.addTime': 'બીજો સમય ઉમેરો',
  'rem.titlePh': 'શીર્ષક', 'rem.bodyPh': 'સંદેશ', add: 'ઉમેરો', 'login.back': 'લૉગિન વગર જુઓ',
  'u.tapToRemove': 'યુનિટ દૂર કરવા તેના પર ટૅપ કરો (ફરી ટૅપ કરવાથી પાછું આવશે). વધારાના નંબર નીચે ઉમેરો.',
  'u.addExtraPh': 'વધારાનું યુનિટ, દા.ત. A-105', 'u.maintUsualHint': 'સામાન્ય રકમ. "માસિક હિસાબ" માં "મહિનાની રકમ" થી કોઈ પણ મહિને બદલી શકાય.',
  'u.phoneHint': 'ફક્ત લૉગિન થયેલા એડમિન જ જોઈ શકે',
  'bills.button': 'મહિનાની રકમ', 'bills.title': 'મેન્ટેનન્સ · {month}', 'bills.sub': 'આ મહિનાની રકમ નક્કી કરો',
  'bills.hint': 'દર મહિને મેન્ટેનન્સ અલગ હોઈ શકે. નીચે રકમ બદલો — નોંધાયેલી ચુકવણી ક્યારેય બદલાશે નહીં.',
  'bills.allFlats': 'બધા ફ્લેટ (દરેક વિંગ)', 'bills.allShops': 'બધી દુકાનો (દરેક વિંગ)', 'bills.count': '{n} ફ્લેટ અને દુકાનો',
  'bills.save': 'રકમ સેવ કરો', 'bills.saved': 'રકમ સેવ થઈ', 'bills.paidKept': '{n} ભરેલા (યથાવત્)',
  'bills.mixed': 'અલગ અલગ રકમ', 'bills.each': 'પહેલાં મુજબ',
  'nav.month': 'માસિક હિસાબ', 'nav.monthShort': 'હિસાબ',
  'nav.units': 'વિંગ અને યુનિટ', 'nav.unitsShort': 'યુનિટ',
  'nav.reports': 'રિપોર્ટ', 'nav.reportsShort': 'રિપોર્ટ',
  'nav.users': 'યુઝર્સ',
  'role.super_admin': 'મુખ્ય એડમિન', 'role.wing_admin': 'વિંગ એડમિન', 'role.viewer': 'વ્યૂઅર', 'role.disabled': 'બંધ',
  'login.hero': 'બિલ્ડિંગ મેન્ટેનન્સ, સરળ અને સ્પષ્ટ.',
  'login.heroSub': 'દરેક વિંગનું માસિક મેન્ટેનન્સ, બિલ અને બેલેન્સ — બધા રહેવાસીઓ માટે પારદર્શક.',
  'login.f1': 'એડમિન સંભાળે, રહેવાસીઓ જુએ', 'login.f2': 'વિંગ મુજબ રિપોર્ટ અને ડેશબોર્ડ', 'login.f3': 'મોબાઇલ પર સરસ ચાલે',
  'login.welcome': 'સ્વાગત છે', 'login.sub': '{app} મેન્ટેનન્સમાં લૉગિન કરો',
  'login.username': 'યુઝરનેમ', 'login.password': 'પાસવર્ડ', 'login.signIn': 'લૉગિન',
  'login.help': 'એકાઉન્ટ નથી કે પાસવર્ડ ભૂલી ગયા? બિલ્ડિંગ એડમિનનો સંપર્ક કરો.',
  'login.wrong': 'યુઝરનેમ અથવા પાસવર્ડ ખોટો છે', 'login.tooMany': 'ઘણા પ્રયાસો થયા. થોડી વાર પછી ફરી પ્રયાસ કરો.',
  'pw.current': 'હાલનો પાસવર્ડ', 'pw.new': 'નવો પાસવર્ડ', 'pw.confirm': 'નવો પાસવર્ડ ફરીથી', 'pw.change': 'બદલો',
  'pw.min': 'નવો પાસવર્ડ ઓછામાં ઓછા 6 અક્ષરનો હોવો જોઈએ', 'pw.mismatch': 'નવા પાસવર્ડ મેળ ખાતા નથી',
  'pw.done': 'પાસવર્ડ બદલાઈ ગયો', 'pw.wrong': 'હાલનો પાસવર્ડ ખોટો છે',
  'dash.collected': 'મેન્ટેનન્સ જમા',
  'mo.pending': 'બાકી',
  'mo.entries': 'આવક અને ખર્ચ',
  'mo.noUnits': 'હજુ કોઈ ફ્લેટ કે દુકાન ઉમેરી નથી',
  'mo.collectedShort': 'જમા', 'mo.maintenance': 'મેન્ટેનન્સ',
  'img.save': 'ફોટો સેવ કરો', 'img.generated': 'બનાવ્યા તારીખ {d}', 'img.monthBalance': 'મહિનાનું બેલેન્સ', 'img.more': '+ બીજી {n}', 'mo.viewMap': 'બિલ્ડિંગ', 'mo.viewList': 'યાદી',
  'a.forMonth': 'કયા મહિનાનું', 'a.dateNote': 'તારીખ (ફક્ત નોંધ માટે)', 'm.paidOnNote': 'ભર્યાની તારીખ (ફક્ત નોંધ માટે)',
  'm.units': '{n} યુનિટ',
  'm.search': 'યુનિટ અથવા માલિક શોધો',
  'm.note': 'નોંધ (રસીદ નં., ચેક નં.…)', 'm.markPaid': 'ભર્યું ગણો', 'm.markUnpaid': 'બાકી ગણો',
  'm.update': 'અપડેટ કરો', 'm.deleteBill': 'બિલ ડિલીટ કરો', 'm.confirmDelete': 'આ બિલ ડિલીટ કરવું છે?',
  'm.markedPaid': '{unit} ભર્યું ગણાયું', 'm.markedUnpaid': 'બાકી ગણાયું', 'm.deleted': 'બિલ ડિલીટ થયું',
  'a.empty': 'કોઈ એન્ટ્રી નથી',
  'a.addIncome': 'આવક ઉમેરો', 'a.addExpense': 'ખર્ચ ઉમેરો', 'a.editIncome': 'આવકમાં ફેરફાર', 'a.editExpense': 'ખર્ચમાં ફેરફાર',
  'a.enterAmount': 'રકમ લખો', 'a.confirmDelete': 'આ એન્ટ્રી ડિલીટ કરવી છે?',
  'a.category': 'પ્રકાર', 'a.description': 'વિગત', 'a.descPh': 'દા.ત. સપ્ટેમ્બર લાઇટ બિલ, વેપારીનું નામ',
  'u.subtitle': '{w} વિંગ · {f} ફ્લેટ · {s} દુકાનો', 'u.addWing': 'વિંગ ઉમેરો', 'u.addUnit': 'યુનિટ ઉમેરો',
  'u.noWings': 'હજુ કોઈ વિંગ નથી', 'u.noWingsAdmin': 'તમારા બિલ્ડિંગની વિંગ ઉમેરીને શરૂઆત કરો (દા.ત. A વિંગ, B વિંગ).',
  'u.noWingsViewer': 'એડમિને હજુ કોઈ વિંગ ઉમેરી નથી.',
  'u.wingCount': '{f} ફ્લેટ · {s} દુકાનો', 'u.search': 'યુનિટ, માલિક, ફોન શોધો',
  'u.noUnits': 'કોઈ યુનિટ મળ્યું નહીં', 'u.noUnitsText': 'ફ્લેટ અને દુકાનો તેમના માસિક મેન્ટેનન્સ સાથે ઉમેરો.',
  'u.confirmDelete': 'યુનિટ {n} ડિલીટ કરવું છે? જૂના મેન્ટેનન્સ રેકોર્ડ રહેશે.', 'u.deleted': 'યુનિટ ડિલીટ થયું',
  'u.confirmDeleteWing': '{n} અને તેના બધા {c} ફ્લેટ / દુકાનો ડિલીટ કરવા છે? નોંધાયેલી ચુકવણી રિપોર્ટમાં રહેશે.', 'u.wingDeleted': 'વિંગ ડિલીટ થઈ',
  'u.wingName': 'વિંગનું નામ', 'u.wingPh': 'દા.ત. A વિંગ',
  'u.editUnit': '{n} માં ફેરફાર', 'u.unitSaved': 'યુનિટ સેવ થયું',
  'u.number': 'યુનિટ નંબર', 'u.numberPh': 'દા.ત. A-101', 'u.maint': 'સામાન્ય માસિક મેન્ટેનન્સ (₹)',
  'u.owner': 'માલિક / રહેવાસીનું નામ', 'u.phone': 'ફોન',
  'u.bulkBtn': '{n} યુનિટ ઉમેરો',
  'r.year': 'વર્ષ {y}', 'r.in': 'આવક', 'r.out': 'ખર્ચ', 'r.balance': 'બેલેન્સ', 'r.broughtForward': 'આગળથી લાવેલ',
  'r.month': 'મહિનો', 'r.total': 'કુલ',
  'us.count': '{n} યુઝર્સ', 'us.add': 'યુઝર ઉમેરો', 'us.none': 'હજુ કોઈ યુઝર નથી', 'us.you': '(તમે)',
  'us.remove': 'દૂર કરો',
  'us.confirmRemove': '{n} ને દૂર કરવા છે? પછી તેઓ કંઈ જોઈ શકશે નહીં.', 'us.removed': 'યુઝર દૂર કર્યા',
  'us.resetSent': '{e} પર રીસેટ લિંક મોકલી',
  'us.forgotNote': 'યુઝર્સ પ્રોફાઇલ મેનુમાંથી પોતાનો પાસવર્ડ બદલી શકે છે. જો યુઝરનેમવાળા (ઇમેઇલ વગરના) યુઝર પાસવર્ડ ભૂલી જાય, તો Firebase Console → Authentication માંથી તેમનું લૉગિન ડિલીટ કરી અહીં ફરીથી ઉમેરો.',
  'us.edit': '{n} માં ફેરફાર', 'us.nameReq': 'નામ લખો', 'us.wingReq': 'વિંગ પસંદ કરો',
  'us.badUsername': 'યુઝરનેમમાં ફક્ત અંગ્રેજી અક્ષરો, આંકડા, ટપકું (.), ડેશ (-) અને અંડરસ્કોર (_) ચાલે',
  'us.pwMin': 'પાસવર્ડ ઓછામાં ઓછા 6 અક્ષરનો હોવો જોઈએ', 'us.added': '{n} ઉમેરાયા', 'us.updated': 'યુઝર અપડેટ થયા',
  'us.exists': 'આ યુઝરનેમ પહેલેથી છે. બીજું પસંદ કરો (અથવા Firebase Console → Authentication માંથી ડિલીટ કરો).',
  'us.create': 'યુઝર બનાવો', 'us.fullName': 'પૂરું નામ', 'us.namePh': 'દા.ત. રમેશ પટેલ (A-101)',
  'us.role': 'ભૂમિકા', 'us.wingManage': 'સંભાળવાની વિંગ', 'us.addWingFirst': 'પહેલા વિંગ ઉમેરો (વિંગ અને યુનિટ).',
  // database values (categories, payment modes)
  'v.Electricity': 'લાઇટ બિલ', 'v.Water': 'પાણી', 'v.Security': 'સિક્યુરિટી', 'v.Housekeeping': 'સફાઈ',
  'v.Lift Maintenance': 'લિફ્ટ મેન્ટેનન્સ', 'v.Repairs': 'રિપેરિંગ', 'v.Garden': 'બગીચો', 'v.Salary': 'પગાર',
  'v.Plumbing': 'પ્લમ્બિંગ', 'v.Painting': 'કલરકામ', 'v.Stationery': 'સ્ટેશનરી', 'v.Other': 'અન્ય',
  'v.Late Fee / Penalty': 'લેટ ફી / દંડ', 'v.Parking': 'પાર્કિંગ', 'v.Rent': 'ભાડું', 'v.Donation': 'દાન', 'v.Interest': 'વ્યાજ', 'v.Opening Balance': 'શરૂઆતનું બેલેન્સ',
  'v.Cash': 'રોકડ', 'v.UPI': 'UPI', 'v.Bank Transfer': 'બેંક ટ્રાન્સફર', 'v.Cheque': 'ચેક',
}

const DICTS = { en, gu }

const readLang = () => {
  try { const l = localStorage.getItem('lang'); if (DICTS[l]) return l } catch { /* storage unavailable */ }
  return DEFAULT_LANG
}

let current = readLang()

/** Translate a key, replacing {placeholders} with vars */
export function t(key, vars) {
  let s = DICTS[current][key] ?? en[key] ?? key
  if (vars) for (const k in vars) s = s.replaceAll(`{${k}}`, vars[k])
  return s
}

/** Wing name with the wing word in the current language: "A Wing", "A" or "Wing A" → "A Wing" / "A વિંગ" */
export function wingTitle(name) {
  const base = String(name || '').replace(/^\s*(wing|વિંગ)\s+/i, '').replace(/\s+(wing|વિંગ)\s*$/i, '').trim()
  return base ? `${base} ${t('wing')}` : t('wing')
}

/** Translate a value stored in English in the database (category, payment mode) */
export const tv = (value) => (value ? DICTS[current][`v.${value}`] ?? value : value)

export const locale = () => LANGUAGES.find((l) => l.code === current).locale

const LangContext = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(current)
  document.documentElement.lang = lang
  const setLang = (l) => {
    current = l
    try { localStorage.setItem('lang', l) } catch { /* ignore */ }
    setLangState(l)
  }
  // `key` remounts the app so every screen re-renders in the new language
  return <LangContext.Provider value={{ lang, setLang }}><div key={lang} className="contents">{children}</div></LangContext.Provider>
}

export const useLang = () => useContext(LangContext)

/** Compact EN / ગુ switch */
export function LangSwitch({ className = '' }) {
  const { lang, setLang } = useLang()
  return (
    <div role="radiogroup" aria-label="Language" className={`inline-flex rounded-xl border border-fg/10 bg-fg/[0.04] p-0.5 ${className}`}>
      {LANGUAGES.map((l) => (
        <button key={l.code} type="button" role="radio" aria-checked={lang === l.code} onClick={() => setLang(l.code)} aria-label={l.label}
          className={`relative h-8 min-w-9 rounded-lg px-2.5 text-xs font-semibold transition-colors cursor-pointer ${lang === l.code ? 'text-fg' : 'text-subtle hover:text-fg'}`}>
          {lang === l.code && <motion.span layoutId="lang-pill" className="absolute inset-0 rounded-lg bg-surface shadow-sm ring-1 ring-fg/10" />}
          <span className="relative">{l.short}</span>
        </button>
      ))}
    </div>
  )
}

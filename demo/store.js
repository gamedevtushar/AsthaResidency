// DEMO MODE ONLY — in-memory sample data used by `npm run demo` instead of Firebase.
// Everything resets when the page is reloaded.

const pad = (n) => String(n).padStart(2, '0')
const now = new Date()
const period = (monthsAgo) => {
  const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

let seed = 7
const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280

const owners = ['Ramesh Patel', 'Suresh Shah', 'Meena Desai', 'Kiran Joshi', 'Hetal Mehta', 'Nirav Trivedi', 'Pooja Bhatt', 'Amit Parikh', 'Jignesh Modi']

export const DB = {
  wings: [{ id: 'A', name: 'A Wing' }, { id: 'B', name: 'B Wing' }, { id: 'C', name: 'C Wing' }],
  units: [],
  unitContacts: [], // phone numbers (private in the real app)
  dues: [],
  transactions: [],
  users: [
    { id: 'u1', name: 'Main Admin', email: 'admin@astharesidency.app', role: 'super_admin', wingId: '' },
    { id: 'u2', name: 'Ramesh Patel', email: 'a101@astharesidency.app', role: 'wing_admin', wingId: 'A' },
    { id: 'u3', name: 'Meena Desai', email: 'viewer@astharesidency.app', role: 'viewer', wingId: '' },
    { id: 'u4', name: 'Old Tenant', email: 'c104@astharesidency.app', role: 'disabled', wingId: '' },
  ],
}

/** Login accounts: email → { uid, password } */
export const ACCOUNTS = {
  'admin@astharesidency.app': { uid: 'u1', password: 'demo123' },
  'a101@astharesidency.app': { uid: 'u2', password: 'demo123' },
  'viewer@astharesidency.app': { uid: 'u3', password: 'demo123' },
  'c104@astharesidency.app': { uid: 'u4', password: 'demo123' },
}

for (const w of ['A', 'B', 'C']) {
  for (let floor = 1; floor <= 3; floor++) {
    for (let n = 1; n <= 3; n++) {
      const shop = w === 'C' && floor === 1
      DB.units.push({
        id: `${w}${floor}0${n}`, wingId: w, number: shop ? `Shop ${n}` : `${w}-${floor}0${n}`,
        type: shop ? 'shop' : 'flat', ownerName: owners[(floor * 3 + n) % owners.length],
        maintenance: shop ? 2500 : 1500, createdAt: new Date(now.getFullYear(), now.getMonth() - 5, 1),
      })
      DB.unitContacts.push({ id: `${w}${floor}0${n}`, wingId: w, phone: `98250${10000 + floor * 100 + n}` })
    }
  }
}

// Maintenance for the last 6 months. Only payments are stored; flats with no record are simply pending.
// Many people pay a month late, so paidOn is often in the following month.
for (let k = 0; k < 6; k++) {
  for (const u of DB.units) {
    if (rnd() > (k === 0 ? 0.55 : 0.9)) continue
    const late = k > 0 && rnd() < 0.4
    DB.dues.push({
      id: `${period(k)}_${u.id}`, period: period(k), unitId: u.id, wingId: u.wingId, number: u.number, type: u.type,
      ownerName: u.ownerName, amount: u.maintenance, status: 'paid',
      paidOn: `${period(late ? k - 1 : k)}-0${1 + Math.floor(rnd() * 9)}`,
      mode: ['UPI', 'Cash', 'Bank Transfer'][Math.floor(rnd() * 3)], note: '',
    })
  }
}

const expenses = [['Electricity', 6200, '', 'DGVCL bill'], ['Security', 9000, '', 'Guard salary'], ['Housekeeping', 4500, '', ''],
  ['Lift Maintenance', 3500, 'A', 'AMC'], ['Water', 1800, 'B', 'Tanker'], ['Repairs', 2400, 'C', 'Plumbing work']]
for (let k = 0; k < 6; k++) {
  expenses.forEach(([category, base, wingId, description], i) => DB.transactions.push({
    id: `t${k}${i}`, type: 'expense', category, amount: Math.round(base * (0.8 + rnd() * 0.4)), wingId, period: period(k),
    date: `${period(k)}-${pad(3 + i * 3)}`, mode: i % 2 ? 'UPI' : 'Bank Transfer', description,
  }))
}
DB.transactions.push({ id: 'ti0', type: 'income', category: 'Opening Balance', amount: 85000, wingId: '', period: period(5), date: `${period(5)}-01`, mode: 'Bank Transfer', description: 'Bank balance when we started' })
DB.transactions.push({ id: 'ti1', type: 'income', category: 'Parking', amount: 1200, wingId: '', period: period(0), date: `${period(0)}-02`, mode: 'Cash', description: 'Visitor parking' })
DB.transactions.push({ id: 'ti2', type: 'income', category: 'Late Fee / Penalty', amount: 500, wingId: 'A', period: period(1), date: `${period(0)}-04`, mode: 'UPI', description: '' })

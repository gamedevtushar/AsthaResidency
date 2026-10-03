# Astha Residency – Maintenance App Plan

## Goal
A simple, mobile-friendly web app to track building maintenance (income) and bills (expenses), wing by wing.

## Tech (kept simple)
| Part | Choice |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Login | Firebase Auth – **username + password**, accounts created by the Main Admin |
| Database | Cloud Firestore |
| Hosting | Firebase Hosting |

## Roles
| Role | Can do |
|---|---|
| **Main Admin** (`super_admin`) | Everything: wings, units, maintenance, income/expenses (wing + common), users & roles |
| **Wing Admin** (`wing_admin`) | Manage units, maintenance and income/expenses of **their own wing only**. View everything else |
| **Everyone (no login)** | View dashboard, maintenance status, expenses and reports. Login is only for admins (Menu → Admin login) |
| **Disabled** | Account exists but has no access |

The first Main Admin is created once in Firebase Console with the email set in `.env` (`VITE_SUPER_ADMIN_EMAIL`) and `firestore.rules`.
The Main Admin then creates every other user (username, password, role, wing) from the **Users** screen. Users can change their own password.

## Data (Firestore collections)
- `wings` – name (e.g. "A Wing")
- `units` – wingId, number, type (`flat` / `shop`), ownerName, usual monthly maintenance (₹)
- `unitContacts` – phone numbers, kept separate so only logged-in admins can read them
- `dues` – one record per unit per month: period (`2026-10`), amount, status (`paid`/`unpaid`), paidOn, mode
- `transactions` – type (`income` / `expense`), wingId (empty = common building), category, amount, date, mode, description
- `users` – name, email, role, wingId

## Look & language
Light, Dark or Auto theme and Gujarati / English, switchable from the menu (remembered on each device).

## Colour themes
Menu → **રંગ થીમ**: 10 ready-made themes (saffron, indigo, ocean, peacock, forest, violet, rose, gold, berry, graphite), each with light and dark mode. The logo, browser icon and app icon follow the theme. Themes live in `src/palettes.js`; after changing them run `node scripts/make-icons.mjs` to redraw the icons.

## Language
Gujarati (default) and English. Switch with the **ગુ / EN** button (login page, top bar, sidebar); the choice is remembered on each device.
All text lives in `src/i18n.jsx` – edit wording there or add another language.

## Screens
1. **Accounts** (main screen) – wing tabs on top, total balance, then one month (last month first): every flat and shop in a building view (top floor first, shops at the bottom) or as a list, paid or pending, plus that month's other income and expenses
2. **Reports** – one calendar year on one screen: money in, money out and balance brought forward, month by month (year switcher at the bottom)
3. **Wings & Units** (admins only) – add wings, flats and shops with monthly maintenance amount
4. **Users** (Main Admin) – create users with username + password and assign roles

## Month-wise, not date-wise
Every amount belongs to the month it is **for**. October's maintenance paid on 3 November counts in October.
The actual date is kept only for the record. The image button saves an A4 picture of a month or a year (white background, current language). Each flat owes maintenance every month
from the month it was added; nothing needs to be "generated".

## Monthly workflow
1. Only if this month's amount is different: **Accounts → 📅 (Monthly amount)** (payments already recorded never change)
2. Tap **+** → **Record payment** (or tap a flat): choose Cash / UPI / Bank / Cheque and the month it is for, done
3. Tap **+** → **Add expense** for bills (electricity, security, lift…) and pick the month it is for
4. When you start, add the society's bank balance once as income → **Opening Balance**
5. Everyone can see Accounts & Reports

## Setting up a wing
**Wings & Units → Add wing**: enter the name, floors, flats per floor, shops and monthly amounts. All unit numbers (A-101 … A-404, Shop 1 …) are created at once.

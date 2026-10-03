import {
  Zap, Droplets, ShieldCheck, Sparkles, ArrowUpDown, Wrench, Trees, Users, ShowerHead, Paintbrush, FileText,
  MoreHorizontal, Clock, Car, Home, HeartHandshake, Percent, Banknote, Smartphone, Landmark, FileCheck, PiggyBank,
} from 'lucide-react'

/** Icons for the (English) category / payment-mode values stored in the database */
export const CATEGORY_ICONS = {
  Electricity: Zap, Water: Droplets, Security: ShieldCheck, Housekeeping: Sparkles, 'Lift Maintenance': ArrowUpDown,
  Repairs: Wrench, Garden: Trees, Salary: Users, Plumbing: ShowerHead, Painting: Paintbrush, Stationery: FileText,
  Other: MoreHorizontal, 'Late Fee / Penalty': Clock, Parking: Car, Rent: Home, Donation: HeartHandshake, Interest: Percent,
  'Opening Balance': PiggyBank,
}

export const MODE_ICONS = { Cash: Banknote, UPI: Smartphone, 'Bank Transfer': Landmark, Cheque: FileCheck }

export const categoryIcon = (c) => CATEGORY_ICONS[c] || MoreHorizontal

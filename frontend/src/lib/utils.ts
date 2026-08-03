import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function getInitials(name: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

export function getRoleLabel(role: string): string {
  switch (role) {
    case 'admin':
      return 'Admin'
    case 'officer':
      return 'Verifier'
    case 'surveyor':
      return 'Surveyor'
    default:
      return 'Public'
  }
}

const HIERARCHY: Record<string, number> = {
  public: 0,
  surveyor: 1,
  officer: 2,
  admin: 3,
}

export function hasRole(userRole: string, minimumRole: string): boolean {
  return (HIERARCHY[userRole] || 0) >= (HIERARCHY[minimumRole] || 0)
}

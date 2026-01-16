import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Parseia data evitando problema de fuso horário
// Datas no formato YYYY-MM-DD são tratadas como UTC pelo JavaScript
// Adicionamos T12:00:00 para garantir que a data fique correta em qualquer fuso
export function parseLocalDate(date: string | Date): Date {
  if (date instanceof Date) return date
  // Se já tem 'T', é uma data ISO completa
  if (date.includes('T')) {
    return new Date(date)
  }
  // Se é só YYYY-MM-DD, adiciona meio-dia para evitar problema de fuso
  return new Date(date + 'T12:00:00')
}

export function formatDate(date: string | Date): string {
  const d = parseLocalDate(date)
  return new Intl.DateTimeFormat('pt-BR').format(d)
}

export function formatDateRelative(date: string | Date): string {
  const d = parseLocalDate(date)
  const hoje = new Date()
  hoje.setHours(12, 0, 0, 0) // Normaliza para meio-dia
  const diffTime = d.getTime() - hoje.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Amanhã'
  if (diffDays === -1) return 'Ontem'
  if (diffDays > 0 && diffDays <= 7) return `Em ${diffDays} dias`
  if (diffDays < 0 && diffDays >= -7) return `Há ${Math.abs(diffDays)} dias`

  return formatDate(d)
}

export function getStatusColor(status: string): string {
  const colors = {
    pendente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    ativa: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    pago: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    quitada: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    atrasado: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    cancelado: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    cancelada: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  }
  return colors[status as keyof typeof colors] || colors.pendente
}

export function getStatusLabel(status: string): string {
  const labels = {
    pendente: 'Pendente',
    ativa: 'Em Aberto',
    pago: 'Pago',
    quitada: 'Quitada',
    atrasado: 'Atrasado',
    cancelado: 'Cancelado',
    cancelada: 'Cancelada',
  }
  return labels[status as keyof typeof labels] || status
}

// Retorna o nome do ícone Lucide para cada status (para acessibilidade - daltônicos)
export function getStatusIcon(status: string): 'CheckCircle2' | 'Clock' | 'AlertTriangle' | 'XCircle' {
  const icons = {
    pendente: 'Clock',
    ativa: 'Clock',
    pago: 'CheckCircle2',
    quitada: 'CheckCircle2',
    atrasado: 'AlertTriangle',
    cancelado: 'XCircle',
    cancelada: 'XCircle',
  } as const
  return icons[status as keyof typeof icons] || 'Clock'
}

export function getTipoPagamentoLabel(tipo: string): string {
  const labels = {
    dinheiro: 'Dinheiro',
    pix: 'PIX',
    cartao_credito: 'Cartão de Crédito',
    cartao_debito: 'Cartão de Débito',
    transferencia: 'Transferência',
  }
  return labels[tipo as keyof typeof labels] || tipo
}

export function isVencido(dataVencimento: string): boolean {
  const hoje = new Date()
  hoje.setHours(12, 0, 0, 0)
  const vencimento = parseLocalDate(dataVencimento)
  vencimento.setHours(12, 0, 0, 0)
  return vencimento < hoje
}

// Alias em inglês
export const isOverdue = isVencido


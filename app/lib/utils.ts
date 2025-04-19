export function formatTimeLeft(timestamp: number): string {
  const now = Date.now()
  const diff = timestamp - now

  if (diff < 0) {
    return 'Expired'
  }

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days} day${days === 1 ? '' : 's'}`
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes}m`
}

export function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}d ago`
  }

  if (hours > 0) {
    return `${hours}h ago`
  }

  if (minutes > 0) {
    return `${minutes}m ago`
  }

  return 'Just now'
} 
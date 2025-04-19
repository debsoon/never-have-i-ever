import { useState, useEffect } from 'react'

export function useCountdown(targetTimestamp: number) {
  const [timeRemaining, setTimeRemaining] = useState('')

  useEffect(() => {
    function updateTime() {
      const now = Date.now()
      const diff = targetTimestamp - now

      if (diff <= 0) {
        setTimeRemaining('00:00:00')
        return
      }

      // Convert to hours, minutes, seconds
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      // Format with leading zeros
      const formattedHours = hours.toString().padStart(2, '0')
      const formattedMinutes = minutes.toString().padStart(2, '0')
      const formattedSeconds = seconds.toString().padStart(2, '0')

      setTimeRemaining(`${formattedHours}:${formattedMinutes}:${formattedSeconds}`)
    }

    // Update immediately and then every second
    updateTime()
    const interval = setInterval(updateTime, 1000)

    return () => clearInterval(interval)
  }, [targetTimestamp])

  return timeRemaining
} 
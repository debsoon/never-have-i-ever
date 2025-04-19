'use client'

import { Dispatch, SetStateAction } from 'react'

interface StateDebuggerProps {
  hasPaid: boolean
  setHasPaid: Dispatch<SetStateAction<boolean>>
  totalPaid: number
  setTotalPaid: Dispatch<SetStateAction<number>>
  isExpired: boolean
  setIsExpired: Dispatch<SetStateAction<boolean>>
}

export function StateDebugger({
  hasPaid,
  setHasPaid,
  totalPaid,
  setTotalPaid,
  isExpired,
  setIsExpired
}: StateDebuggerProps) {
  if (process.env.NODE_ENV !== 'development') return null

  return (
    <div className="fixed bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg z-[9999]">
      <h3 className="font-bold mb-4">Debug States</h3>
      <div className="space-y-4">
        <div>
          <label className="block mb-1">Has Paid:</label>
          <input 
            type="checkbox" 
            checked={hasPaid} 
            onChange={e => setHasPaid(e.target.checked)}
            className="w-4 h-4"
          />
        </div>
        <div>
          <label className="block mb-1">Total Paid:</label>
          <input 
            type="number" 
            value={totalPaid} 
            onChange={e => setTotalPaid(Number(e.target.value))}
            className="border rounded px-2 py-1 w-20"
            min="0"
          />
        </div>
        <div>
          <label className="block mb-1">Is Expired:</label>
          <input 
            type="checkbox" 
            checked={isExpired} 
            onChange={e => setIsExpired(e.target.checked)}
            className="w-4 h-4"
          />
        </div>
      </div>
    </div>
  )
} 
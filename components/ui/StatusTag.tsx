'use client'

import type { Status } from '@/types/concert'
import { tagColor } from '@/lib/utils'

interface StatusTagProps {
  status: Status
  label: string
}

export function StatusTag({ status, label }: StatusTagProps) {
  return (
    <span
      className="px-3 py-1 rounded-full text-xs font-medium"
      style={{
        backgroundColor: tagColor(status) + '22',
        color: tagColor(status),
        border: `1px solid ${tagColor(status)}44`,
      }}
    >
      {label}
    </span>
  )
}

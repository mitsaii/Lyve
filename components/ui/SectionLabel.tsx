import { ReactNode } from 'react'

export interface SectionLabelProps {
  icon: ReactNode
  text: string
}

export function SectionLabel({ icon, text }: SectionLabelProps) {
  return (
    <div className="text-base font-bold flex items-center gap-2 mb-4" style={{ color: 'var(--text)' }}>
      <span className="flex items-center" style={{ color: 'var(--accent)' }}>{icon}</span>
      <span>{text}</span>
    </div>
  )
}

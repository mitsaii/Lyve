'use client'

import type { Genre } from '@/types/concert'
import { useLang } from '@/contexts/LangContext'
import { genreLabel } from '@/lib/utils'

interface GenreChipsProps {
  selected: Genre
  onSelect: (genre: Genre) => void
}

export function GenreChips({ selected, onSelect }: GenreChipsProps) {
  const { lang } = useLang()
  const genres: Genre[] = ['all', 'cpop', 'rock', 'kpop', 'jpop', 'western', 'festival']

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {genres.map((genre) => {
        const isActive = selected === genre
        return (
          <button
            key={genre}
            onClick={() => onSelect(genre)}
            className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all"
            style={{
              background: isActive ? 'var(--accent)' : 'var(--faint)',
              color: isActive ? '#fff' : 'var(--text)',
            }}
          >
            {genreLabel(genre, lang)}
          </button>
        )
      })}
    </div>
  )
}

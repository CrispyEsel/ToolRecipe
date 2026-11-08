import { useState } from 'react'

/**
 * Photo slot. Drop a photo at public/photos/{id}.jpg and it shows up here;
 * until then a plain tile shows (the file name is never shown to visitors).
 * Use photos you took yourself (with permission) or licensed ones.
 */
export function ImageSlot({ id, label, alt, className = '', dark = false }: { id: string; label: string; alt?: string; className?: string; dark?: boolean }) {
  const [missing, setMissing] = useState(false)
  if (!missing) {
    return (
      <img
        src={`/photos/${id}.jpg`}
        alt={alt ?? label.replace(/^Photo:\s*/i, '')}
        onError={() => setMissing(true)}
        className={`h-full w-full object-cover ${className}`}
      />
    )
  }
  // No photo yet: a quiet decorative tile. Never show file names to visitors.
  return (
    <div
      aria-hidden
      className={`h-full w-full ${className}`}
      style={{
        backgroundColor: dark ? 'rgb(255 255 255 / 0.06)' : '#e4eaf4',
        backgroundImage: `radial-gradient(circle at 30% 30%, ${dark ? 'rgb(255 255 255 / 0.08)' : 'rgb(255 255 255 / 0.7)'}, transparent 60%)`,
      }}
    />
  )
}

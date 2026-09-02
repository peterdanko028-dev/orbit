export function SectionPlaceholder({
  label,
  accent,
  tint,
  description,
}: {
  label: string
  accent: string
  tint: string
  description: string
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>
        {label}
      </h1>
      <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--line)', background: tint }}>
        <div className="text-sm font-medium" style={{ color: accent }}>
          Coming soon
        </div>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-dim)' }}>
          {description}
        </p>
      </div>
    </div>
  )
}

import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const base =
  'inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2'

const variants: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'border',
  ghost: 'bg-transparent',
  danger: 'text-white',
}

export function Button({
  variant = 'primary',
  className = '',
  style,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const accentStyle =
    variant === 'primary'
      ? { background: 'var(--accent)', ...style }
      : variant === 'danger'
        ? { background: 'var(--danger)', ...style }
        : variant === 'secondary'
          ? { borderColor: 'var(--line)', color: 'var(--text)', ...style }
          : { color: 'var(--text-dim)', ...style }

  return <button className={`${base} ${variants[variant]} ${className}`} style={accentStyle} {...props} />
}

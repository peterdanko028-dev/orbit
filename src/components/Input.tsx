import { forwardRef, type InputHTMLAttributes } from 'react'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full rounded-xl border bg-transparent px-3 py-2.5 text-sm outline-none transition-colors duration-150 ${className}`}
      style={{ borderColor: 'var(--line)', color: 'var(--text)' }}
      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
      onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--line)')}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

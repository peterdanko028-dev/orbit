/** Shown when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing, so a
 * misconfigured deploy shows instructions instead of a blank crash. */
export function SetupScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6" style={{ background: 'var(--bg)' }}>
      <div className="max-w-md text-sm" style={{ color: 'var(--text-dim)' }}>
        <h1 className="mb-3 text-xl font-semibold" style={{ color: 'var(--text)' }}>
          Orbit needs Supabase
        </h1>
        <p className="mb-2">
          Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in a{' '}
          <code>.env.local</code> file (see <code>.env.example</code>), then restart the dev server.
        </p>
        <p>On Vercel, add the same two variables under Project Settings → Environment Variables.</p>
      </div>
    </div>
  )
}

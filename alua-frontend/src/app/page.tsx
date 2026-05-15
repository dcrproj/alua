import Link from 'next/link'
import SearchBar from '@/components/SearchBar'

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">Alua</h1>
      <p className="text-muted-foreground text-center max-w-md">
        Explorez les données immobilières françaises : parcelles cadastrales, transactions DVF, diagnostics DPE.
      </p>
      <SearchBar className="w-full max-w-md" />
      <Link
        href="/carte"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Ouvrir la carte →
      </Link>
    </main>
  )
}

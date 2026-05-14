import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">Alua</h1>
      <p className="text-muted-foreground text-center max-w-md">
        Explorez les données immobilières françaises : parcelles cadastrales, transactions DVF, diagnostics DPE.
      </p>
      <Link
        href="/carte"
        className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-md font-medium transition-colors"
      >
        Ouvrir la carte
      </Link>
    </main>
  )
}

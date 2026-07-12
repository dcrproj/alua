import type { Metadata } from 'next'
import Link from 'next/link'
import GeocopiaHeader from '@/components/GeocopiaHeader'

export const metadata: Metadata = {
  title: 'À propos de Geocopia',
  description: 'Geocopia rassemble les données publiques sur l\'immobilier français : prix DVF, diagnostics DPE, parcelles cadastrales. Projet indépendant, sans affiliation commerciale.',
  alternates: { canonical: '/a-propos' },
}

export default function AProposPage() {
  return (
    <>
      <GeocopiaHeader />

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

        {/* Hero */}
        <div className="relative overflow-hidden" style={{ background: 'var(--slate-900)' }}>
          <svg className="absolute right-0 top-0 pointer-events-none" style={{ opacity: 0.4 }}
            width="720" height="200" viewBox="0 0 720 200" aria-hidden="true">
            <defs>
              <pattern id="hero-cad" width="80" height="80" patternUnits="userSpaceOnUse">
                <path d="M80 0 H0 V80" fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="720" height="200" fill="url(#hero-cad)" />
          </svg>

          <div className="parcelle-breadcrumb">
            <Link href="/carte" className="hover:text-white/80 transition-colors">Carte</Link>
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
            <span style={{ color: 'rgba(255,255,255,0.9)' }}>À propos</span>
          </div>

          <div style={{ padding: '28px 40px 36px', maxWidth: 860, margin: '0 auto' }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--amber-500)' }}>
                Le projet
              </span>
              <span className="w-6 h-px" style={{ background: 'var(--amber-500)' }} />
            </div>
            <h1
              className="text-[34px] font-semibold leading-tight text-white"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.025em' }}
            >
              À propos de Geocopia
            </h1>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 40px 0' }}>
          <div className="space-y-10" style={{ color: 'var(--slate-700)', fontSize: 15, lineHeight: 1.75 }}>

            <section>
              <p>
                Geocopia rassemble les données publiques sur l&apos;immobilier et le territoire français.
                Prix de vente, diagnostics énergétiques, parcelles cadastrales : des informations officielles,
                gratuites, mais dispersées entre une dizaine de sources différentes. Notre travail est de les
                rassembler, les croiser et les présenter clairement.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--slate-900)', fontFamily: 'var(--font-display)' }}>
                Pourquoi ce projet ?
              </h2>
              <p>
                Les données sur l&apos;immobilier français existent. La DVF (transactions de vente), les DPE
                (diagnostics énergétiques), le cadastre PCI sont des fichiers publics, produits par des
                administrations françaises. Mais les accéder directement demande du temps et des compétences
                techniques.
              </p>
              <p className="mt-4">
                Geocopia est né de ce constat : ces données méritent d&apos;être visibles pour tous, pas
                seulement pour les professionnels ou les développeurs.
              </p>
              <p className="mt-4">
                Ce projet est indépendant, sans lien avec des agences immobilières ou des promoteurs.
                Il n&apos;y a pas de modèle d&apos;abonnement ni de données personnelles collectées à des fins
                commerciales.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--slate-900)', fontFamily: 'var(--font-display)' }}>
                Les données utilisées
              </h2>
              <p>
                Geocopia s&apos;appuie sur des sources officielles en open data : DGFiP, ADEME, IGN, BAN,
                CSTB, BRGM et d&apos;autres organismes publics. Toutes ces données sont publiées sous licences
                ouvertes (Licence Ouverte Etalab ou équivalent).
              </p>
              <p className="mt-4">
                La liste complète des sources, leurs licences et leur fréquence de mise à jour sont disponibles
                sur la{' '}
                <Link href="/open-data" className="hover:underline" style={{ color: 'var(--amber-600)' }}>
                  page open data
                </Link>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--slate-900)', fontFamily: 'var(--font-display)' }}>
                Contact
              </h2>
              <p>
                Pour toute question, signalement d&apos;erreur ou demande de partenariat :{' '}
                <a href="mailto:contact@geocopia.fr" className="hover:underline" style={{ color: 'var(--amber-600)' }}>
                  contact@geocopia.fr
                </a>
              </p>
              <p className="mt-4">
                Geocopia est hébergé en France, sur des serveurs OVH.
              </p>
            </section>

          </div>
        </div>

        {/* Footer */}
        <div className="parcelle-footer" style={{ marginTop: 56 }}>
          <span>Geocopia — données immobilières France</span>
          <span className="font-mono shrink-0 ml-4">geocopia.fr</span>
        </div>

      </div>
    </>
  )
}

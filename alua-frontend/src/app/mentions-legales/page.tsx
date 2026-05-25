import type { Metadata } from 'next'
import Link from 'next/link'
import GeocopiaHeader from '@/components/GeocopiaHeader'

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: 'Mentions légales du site Geocopia — éditeur, hébergement, données personnelles et sources de données.',
  alternates: { canonical: '/mentions-legales' },
  robots: { index: true, follow: true },
}

export default function MentionsLegalesPage() {
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
            <span style={{ color: 'rgba(255,255,255,0.9)' }}>Mentions légales</span>
          </div>

          <div style={{ padding: '28px 40px 36px', maxWidth: 860, margin: '0 auto' }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--amber-500)' }}>
                Légal
              </span>
              <span className="w-6 h-px" style={{ background: 'var(--amber-500)' }} />
            </div>
            <h1
              className="text-[34px] font-semibold leading-tight text-white"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.025em' }}
            >
              Mentions légales
            </h1>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 40px 0' }}>
          <div className="space-y-10" style={{ color: 'var(--slate-700)', fontSize: 15, lineHeight: 1.75 }}>

            {/* Éditeur */}
            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--slate-900)', fontFamily: 'var(--font-display)' }}>
                Éditeur du site
              </h2>
              <p>
                Le site <strong>Geocopia</strong> (accessible à l&apos;adresse <code className="font-mono text-sm px-1 py-0.5 rounded" style={{ background: 'var(--slate-100)', color: 'var(--slate-700)' }}>geocopia.fr</code>) est édité à titre personnel par :
              </p>
              <div className="mt-3 p-4 rounded-lg" style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)' }}>
                <p className="font-medium" style={{ color: 'var(--slate-900)' }}>David Bernard</p>
                <p className="text-sm mt-1" style={{ color: 'var(--slate-600)' }}>
                  Contact : <a href="mailto:contact@geocopia.fr" className="hover:underline" style={{ color: 'var(--amber-600)' }}>contact@geocopia.fr</a>
                </p>
                <p className="text-sm" style={{ color: 'var(--slate-600)' }}>
                  Directeur de la publication : David Bernard
                </p>
              </div>
            </section>

            {/* Hébergement */}
            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--slate-900)', fontFamily: 'var(--font-display)' }}>
                Hébergement
              </h2>
              <div className="p-4 rounded-lg" style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)' }}>
                <p className="font-medium" style={{ color: 'var(--slate-900)' }}>OVHcloud SAS</p>
                <p className="text-sm mt-1" style={{ color: 'var(--slate-600)' }}>2 Rue Kellermann, 59100 Roubaix, France</p>
                <p className="text-sm" style={{ color: 'var(--slate-600)' }}>Tél. : +33 9 72 10 10 07</p>
                <p className="text-sm" style={{ color: 'var(--slate-600)' }}>
                  Site : <a href="https://www.ovhcloud.com" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: 'var(--amber-600)' }}>www.ovhcloud.com</a>
                </p>
              </div>
              <p className="text-sm mt-3" style={{ color: 'var(--slate-500)' }}>
                La distribution du contenu est assurée par <strong>Cloudflare, Inc.</strong> (réseau CDN).
              </p>
            </section>

            {/* Données personnelles */}
            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--slate-900)', fontFamily: 'var(--font-display)' }}>
                Données personnelles
              </h2>
              <p>
                Geocopia ne collecte aucune donnée personnelle identifiante. Le site ne propose pas de formulaire d&apos;inscription ni de création de compte.
              </p>
              <p className="mt-3">
                Des cookies peuvent être déposés par des services tiers (Google AdSense) à des fins publicitaires et de mesure d&apos;audience. Vous pouvez configurer votre navigateur pour refuser ces cookies ou utiliser un bloqueur de publicités.
              </p>
              <p className="mt-3">
                Conformément au Règlement Général sur la Protection des Données (RGPD — Règlement UE 2016/679), vous disposez d&apos;un droit d&apos;accès, de rectification et d&apos;opposition aux données vous concernant. Pour l&apos;exercer, contactez : <a href="mailto:contact@geocopia.fr" className="hover:underline" style={{ color: 'var(--amber-600)' }}>contact@geocopia.fr</a>.
              </p>
            </section>

            {/* Sources de données */}
            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--slate-900)', fontFamily: 'var(--font-display)' }}>
                Sources de données
              </h2>
              <p className="mb-4">
                Geocopia agrège des données publiques issues de sources officielles françaises. Ces données sont redistribuées conformément à leurs licences respectives (Licence Ouverte / Open Licence Etalab 2.0, sauf mention contraire).{' '}
                <Link href="/open-data" className="hover:underline" style={{ color: 'var(--amber-600)' }}>
                  Voir le détail des sources →
                </Link>
              </p>
              <div className="space-y-3">
                {[
                  {
                    source: 'Base Adresse Nationale (BAN)',
                    publisher: 'IGN / La Poste / DINUM',
                    url: 'https://adresse.data.gouv.fr',
                    license: 'Licence Ouverte 2.0',
                  },
                  {
                    source: 'Plan Cadastral Informatisé (PCI)',
                    publisher: 'DGFiP / IGN',
                    url: 'https://cadastre.data.gouv.fr',
                    license: 'Licence Ouverte 2.0',
                  },
                  {
                    source: 'Demandes de valeurs foncières (DVF)',
                    publisher: 'DGFiP',
                    url: 'https://app.dvf.etalab.gouv.fr',
                    license: 'Licence Ouverte 2.0',
                  },
                  {
                    source: 'Diagnostics de Performance Énergétique (DPE)',
                    publisher: 'ADEME',
                    url: 'https://data.ademe.fr',
                    license: 'Licence Ouverte 2.0',
                  },
                  {
                    source: 'Géorisques (risques naturels et technologiques)',
                    publisher: 'BRGM / MTES',
                    url: 'https://www.georisques.gouv.fr',
                    license: 'Licence Ouverte 2.0',
                  },
                  {
                    source: 'Base Nationale des Bâtiments (BDNB)',
                    publisher: 'CSTB / ADEME',
                    url: 'https://bdnb.io',
                    license: 'Licence Ouverte 2.0',
                  },
                  {
                    source: 'Registre National des Copropriétés (RNIC)',
                    publisher: 'Agence Nationale de l\'Habitat (ANAH)',
                    url: 'https://www.registre-coproprietes.gouv.fr',
                    license: 'Licence Ouverte 2.0',
                  },
                  {
                    source: 'SIRENE (entreprises et établissements)',
                    publisher: 'INSEE',
                    url: 'https://www.sirene.fr',
                    license: 'Licence Ouverte 2.0',
                  },
                  {
                    source: 'Sitadel (permis de construire)',
                    publisher: 'SDES / Ministère de la Transition Écologique',
                    url: 'https://www.statistiques.developpement-durable.gouv.fr',
                    license: 'Licence Ouverte 2.0',
                  },
                  {
                    source: 'Fonds de carte (tuiles vectorielles cadastrales)',
                    publisher: 'IGN',
                    url: 'https://geoservices.ign.fr',
                    license: 'Géoportail – conditions d\'utilisation IGN',
                  },
                ].map(s => (
                  <div key={s.source} className="flex gap-4 py-3 border-t" style={{ borderColor: 'var(--slate-200)' }}>
                    <div className="flex-1">
                      <div className="font-medium text-sm" style={{ color: 'var(--slate-900)' }}>{s.source}</div>
                      <div className="text-sm mt-0.5" style={{ color: 'var(--slate-500)' }}>{s.publisher}</div>
                    </div>
                    <div className="text-right text-xs shrink-0" style={{ color: 'var(--slate-400)' }}>
                      <div>{s.license}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Propriété intellectuelle */}
            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--slate-900)', fontFamily: 'var(--font-display)' }}>
                Propriété intellectuelle
              </h2>
              <p>
                Le code source de Geocopia, l&apos;identité visuelle (logo, charte graphique) et les contenus éditoriaux produits par l&apos;éditeur sont protégés par le droit d&apos;auteur. Toute reproduction, même partielle, sans autorisation écrite préalable est interdite.
              </p>
              <p className="mt-3">
                Les données présentées sur le site proviennent de sources publiques soumises à leurs propres licences, mentionnées ci-dessus.
              </p>
            </section>

            {/* Responsabilité */}
            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--slate-900)', fontFamily: 'var(--font-display)' }}>
                Limitation de responsabilité
              </h2>
              <p>
                Les informations présentées sur Geocopia sont issues de bases de données publiques et sont fournies à titre indicatif. L&apos;éditeur s&apos;efforce de maintenir ces informations à jour mais ne garantit pas leur exactitude, exhaustivité ou actualité.
              </p>
              <p className="mt-3">
                Geocopia ne saurait être tenu responsable de toute décision prise sur la base des informations consultées sur le site. Pour toute décision immobilière, consultez un professionnel agréé (notaire, agent immobilier, diagnostiqueur certifié).
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

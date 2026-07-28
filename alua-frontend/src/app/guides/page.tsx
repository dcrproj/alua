import type { Metadata } from 'next'
import Link from 'next/link'
import GeocopiaHeader from '@/components/GeocopiaHeader'

export const metadata: Metadata = {
  title: 'Comprendre les données immobilières françaises',
  description: 'Guide pratique pour lire le DVF, le DPE, le cadastre et la BAN : ce que ces données contiennent, ce qu\'elles permettent de savoir, et comment les utiliser sur Geocopia.',
  alternates: { canonical: '/guides' },
}

export default function GuidesPage() {
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
            <Link href="/" className="hover:text-white/80 transition-colors">Accueil</Link>
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
            <span style={{ color: 'rgba(255,255,255,0.9)' }}>Guides</span>
          </div>

          <div style={{ padding: '28px 40px 36px', maxWidth: 860, margin: '0 auto' }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--amber-500)' }}>
                Comprendre les données
              </span>
              <span className="w-6 h-px" style={{ background: 'var(--amber-500)' }} />
            </div>
            <h1
              className="text-[34px] font-semibold leading-tight text-white"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.025em' }}
            >
              Les données immobilières françaises expliquées
            </h1>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)', maxWidth: 580 }}>
              DVF, DPE, cadastre, BAN : quatre sources officielles qui, combinées, donnent une image complète d&apos;un bien, d&apos;une adresse ou d&apos;un quartier.
            </p>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 40px 0' }}>
          <div className="space-y-12" style={{ color: 'var(--slate-700)', fontSize: 15, lineHeight: 1.8 }}>

            <section>
              <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--slate-900)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
                Le DVF : les prix de vente officiels
              </h2>
              <p>
                La base DVF (Demandes de Valeurs Foncières) est publiée par la Direction Générale des Finances Publiques (DGFiP). Elle recense toutes les transactions immobilières réalisées en France depuis 2014 : ventes d&apos;appartements, de maisons, de terrains, de locaux commerciaux.
              </p>
              <p className="mt-4">
                Pour chaque vente, le DVF indique le prix payé, la date de la mutation, la surface du bien, l&apos;adresse et la parcelle cadastrale concernée. Ces données permettent de connaître le prix réel auquel un bien a été vendu, et non une estimation. C&apos;est la source la plus fiable pour suivre l&apos;évolution des prix au m² dans une commune ou un quartier.
              </p>
              <p className="mt-4">
                <strong style={{ color: 'var(--slate-800)' }}>Ce que le DVF ne contient pas :</strong> les donations, les successions et les ventes de biens en zone agricole ou forestière en dehors des mutations imposables. Les données sont mises à jour deux fois par an environ.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--slate-900)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
                Le DPE : l&apos;étiquette énergétique du logement
              </h2>
              <p>
                Le Diagnostic de Performance Énergétique (DPE) classe un logement de A (très économe) à G (très énergivore), selon sa consommation d&apos;énergie primaire et ses émissions de gaz à effet de serre. Il est obligatoire lors de toute vente ou location d&apos;un logement depuis 2006, et sa méthode de calcul a été renforcée en juillet 2021.
              </p>
              <p className="mt-4">
                Les DPE sont collectés par l&apos;ADEME (Agence de la transition écologique), qui publie l&apos;ensemble de ces diagnostics en open data. Sur Geocopia, la distribution DPE d&apos;une commune ou d&apos;un département vous indique quelle proportion de logements est classée A, B, C, etc. Cela permet de comparer le patrimoine bâti d&apos;un territoire et d&apos;anticiper les contraintes liées aux passoires thermiques (F et G), dont la location sera progressivement interdite.
              </p>
              <p className="mt-4">
                <strong style={{ color: 'var(--slate-800)' }}>À noter :</strong> un DPE est valable 10 ans. Les diagnostics réalisés avant juillet 2021 ont une méthode différente et sont considérés comme moins fiables par les professionnels du secteur.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--slate-900)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
                Le cadastre : identifier les parcelles
              </h2>
              <p>
                Le Plan Cadastral Informatisé (PCI) est le référentiel officiel des 62 millions de parcelles de terrain en France. Chaque parcelle est identifiée par un code unique au format <span className="font-mono text-sm px-1.5 py-0.5 rounded" style={{ background: 'var(--slate-100)', color: 'var(--slate-700)' }}>département + commune + section + numéro</span>, par exemple <span className="font-mono text-sm px-1.5 py-0.5 rounded" style={{ background: 'var(--slate-100)', color: 'var(--slate-700)' }}>75056000AX0012</span> pour une parcelle à Paris.
              </p>
              <p className="mt-4">
                Le cadastre permet de délimiter précisément un terrain, de connaître sa superficie et de le relier aux transactions DVF ou aux diagnostics DPE qui y sont associés. Sur Geocopia, la carte affiche les parcelles cadastrales, et chaque fiche parcelle regroupe toutes les données disponibles sur ce terrain : transactions, DPE, bâtiments, risques naturels, entreprises.
              </p>
              <p className="mt-4">
                Le PCI est produit conjointement par la DGFiP et l&apos;IGN. Il est mis à jour environ deux fois par an.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--slate-900)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
                La BAN : les adresses officielles de France
              </h2>
              <p>
                La Base Adresse Nationale (BAN) est le référentiel officiel des adresses françaises. Elle recense plus de 25 millions de points d&apos;adresse avec leurs coordonnées géographiques précises. Elle est produite par l&apos;IGN, l&apos;ANCT et La Poste, et utilisée par les services de secours, les opérateurs de livraison et les administrations.
              </p>
              <p className="mt-4">
                Sur Geocopia, la BAN est utilisée pour la barre de recherche (autocomplétion d&apos;adresses) et pour les fiches adresse. Chaque adresse possède un identifiant BAN unique qui permet de relier l&apos;adresse aux transactions DVF, aux diagnostics DPE et aux entreprises SIRENE présentes à cette adresse.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--slate-900)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
                Comment utiliser ces données sur Geocopia
              </h2>
              <p>
                Ces quatre sources s&apos;utilisent à différents niveaux selon votre besoin :
              </p>
              <ul className="mt-4 space-y-3 pl-4" style={{ listStyleType: 'disc' }}>
                <li>
                  <strong style={{ color: 'var(--slate-800)' }}>Vous cherchez à acheter dans une ville :</strong> consultez la fiche commune pour voir l&apos;évolution des prix DVF sur 10 ans, la distribution DPE des logements, et les dernières ventes enregistrées.
                </li>
                <li>
                  <strong style={{ color: 'var(--slate-800)' }}>Vous voulez connaître les prix d&apos;une rue précise :</strong> recherchez l&apos;adresse dans la barre de recherche pour accéder aux transactions DVF à cette adresse et aux diagnostics DPE associés.
                </li>
                <li>
                  <strong style={{ color: 'var(--slate-800)' }}>Vous avez identifié une parcelle sur la carte :</strong> cliquez dessus pour accéder à sa fiche complète, incluant les ventes historiques, les caractéristiques du bâti, les risques naturels et les entreprises présentes.
                </li>
                <li>
                  <strong style={{ color: 'var(--slate-800)' }}>Vous comparez des communes :</strong> naviguez par région ou département pour comparer les prix médians, les volumes de transactions et la part de logements énergétiquement performants.
                </li>
              </ul>
              <p className="mt-6">
                Pour accéder directement aux sources brutes et télécharger les données,{' '}
                <Link href="/open-data" className="hover:underline" style={{ color: 'var(--amber-600)' }}>
                  consultez la page open data
                </Link>.
              </p>
            </section>

          </div>
        </div>

        {/* Footer */}
        <div className="parcelle-footer" style={{ marginTop: 56 }}>
          <span>Sources : DVF DGFiP · DPE ADEME · PCI DGFiP/IGN · BAN IGN/ANCT</span>
          <span className="shrink-0 flex items-center gap-4 ml-4">
            <Link href="/a-propos" prefetch={false} className="hover:text-slate-600 transition-colors">À propos</Link>
            <Link href="/mentions-legales" prefetch={false} className="hover:text-slate-600 transition-colors">Mentions légales</Link>
            <span className="font-mono">Geocopia</span>
          </span>
        </div>

      </div>
    </>
  )
}

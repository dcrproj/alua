import type { Metadata } from 'next'
import Link from 'next/link'
import GeocopiaHeader from '@/components/GeocopiaHeader'

export const metadata: Metadata = {
  title: 'Geocopia — Données immobilières France : parcelles, DVF, DPE',
  description: 'Consultez les données immobilières françaises : 62 millions de parcelles cadastrales, transactions DVF depuis 2014, diagnostics DPE. Fiches détaillées pour chaque commune, parcelle et adresse.',
  alternates: { canonical: '/' },
}

const GRANDES_VILLES = [
  { nom: 'Paris', slug: 'paris', dept: '75' },
  { nom: 'Lyon', slug: 'lyon', dept: '69' },
  { nom: 'Marseille', slug: 'marseille', dept: '13' },
  { nom: 'Toulouse', slug: 'toulouse', dept: '31' },
  { nom: 'Nice', slug: 'nice', dept: '06' },
  { nom: 'Nantes', slug: 'nantes', dept: '44' },
  { nom: 'Bordeaux', slug: 'bordeaux', dept: '33' },
  { nom: 'Strasbourg', slug: 'strasbourg', dept: '67' },
  { nom: 'Lille', slug: 'lille', dept: '59' },
  { nom: 'Rennes', slug: 'rennes', dept: '35' },
  { nom: 'Grenoble', slug: 'grenoble', dept: '38' },
  { nom: 'Montpellier', slug: 'montpellier', dept: '34' },
  { nom: 'Saint-Étienne', slug: 'saint-etienne', dept: '42' },
  { nom: 'Dijon', slug: 'dijon', dept: '21' },
  { nom: 'Angers', slug: 'angers', dept: '49' },
  { nom: 'Nîmes', slug: 'nimes', dept: '30' },
  { nom: 'Aix-en-Provence', slug: 'aix-en-provence', dept: '13' },
  { nom: 'Le Havre', slug: 'le-havre', dept: '76' },
  { nom: 'Reims', slug: 'reims', dept: '51' },
  { nom: 'Toulon', slug: 'toulon', dept: '83' },
  { nom: 'Brest', slug: 'brest', dept: '29' },
  { nom: 'Clermont-Ferrand', slug: 'clermont-ferrand', dept: '63' },
  { nom: 'Amiens', slug: 'amiens', dept: '80' },
  { nom: 'Metz', slug: 'metz', dept: '57' },
]

const REGIONS = [
  { nom: 'Île-de-France', slug: 'ile-de-france' },
  { nom: 'Auvergne-Rhône-Alpes', slug: 'auvergne-rhone-alpes' },
  { nom: 'Nouvelle-Aquitaine', slug: 'nouvelle-aquitaine' },
  { nom: 'Occitanie', slug: 'occitanie' },
  { nom: 'Hauts-de-France', slug: 'hauts-de-france' },
  { nom: 'Grand Est', slug: 'grand-est' },
  { nom: 'Provence-Alpes-Côte d\'Azur', slug: 'provence-alpes-cote-d-azur' },
  { nom: 'Pays de la Loire', slug: 'pays-de-la-loire' },
  { nom: 'Bretagne', slug: 'bretagne' },
  { nom: 'Normandie', slug: 'normandie' },
  { nom: 'Bourgogne-Franche-Comté', slug: 'bourgogne-franche-comte' },
  { nom: 'Centre-Val de Loire', slug: 'centre-val-de-loire' },
]

const DEPARTEMENTS = [
  { nom: 'Paris (75)', slug: 'paris' },
  { nom: 'Rhône (69)', slug: 'rhone' },
  { nom: 'Bouches-du-Rhône (13)', slug: 'bouches-du-rhone' },
  { nom: 'Nord (59)', slug: 'nord' },
  { nom: 'Gironde (33)', slug: 'gironde' },
  { nom: 'Haute-Garonne (31)', slug: 'haute-garonne' },
  { nom: 'Hérault (34)', slug: 'herault' },
  { nom: 'Alpes-Maritimes (06)', slug: 'alpes-maritimes' },
  { nom: 'Loire-Atlantique (44)', slug: 'loire-atlantique' },
  { nom: 'Isère (38)', slug: 'isere' },
  { nom: 'Ille-et-Vilaine (35)', slug: 'ille-et-vilaine' },
  { nom: 'Bas-Rhin (67)', slug: 'bas-rhin' },
]

export default function HomePage() {
  return (
    <div className="flex flex-col" style={{ minHeight: '100%' }}>
      <GeocopiaHeader />

      <main style={{ flex: 1, background: 'var(--slate-50)' }}>

        {/* Hero */}
        <section style={{ background: 'var(--slate-900)', padding: '64px 24px 56px', textAlign: 'center' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 'clamp(28px, 5vw, 48px)', letterSpacing: '-0.02em',
            color: 'white', marginBottom: 16, lineHeight: 1.15,
          }}>
            Données immobilières françaises<br />
            <span style={{ color: 'var(--amber-500)' }}>en accès libre</span>
          </h1>
          <p style={{
            color: 'var(--slate-400)', fontSize: 18, maxWidth: 560,
            margin: '0 auto 32px', lineHeight: 1.6,
          }}>
            Parcelles cadastrales, transactions DVF, diagnostics DPE, risques naturels :
            toutes les données officielles réunies sur une seule plateforme.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/carte" prefetch={false} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              height: 44, padding: '0 24px', borderRadius: 8,
              background: 'var(--amber-500)', color: 'var(--slate-900)',
              fontWeight: 600, fontSize: 15, textDecoration: 'none',
            }}>
              Ouvrir la carte interactive
            </Link>
            <Link href="/regions" prefetch={false} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              height: 44, padding: '0 24px', borderRadius: 8,
              background: 'rgba(255,255,255,0.08)', color: 'white',
              fontWeight: 500, fontSize: 15, textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.15)',
            }}>
              Explorer par région
            </Link>
          </div>

          {/* Stats */}
          <div style={{
            display: 'flex', gap: 40, justifyContent: 'center', flexWrap: 'wrap',
            marginTop: 48, paddingTop: 40, borderTop: '1px solid rgba(255,255,255,0.08)',
          }}>
            {[
              { val: '62 M', label: 'parcelles cadastrales' },
              { val: '25 M', label: 'adresses BAN' },
              { val: '10 ans', label: 'd\'historique DVF' },
              { val: '35 000', label: 'communes' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: 'var(--amber-500)' }}>{s.val}</div>
                <div style={{ fontSize: 13, color: 'var(--slate-500)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>

          {/* Grandes villes */}
          <section style={{ marginTop: 60 }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22,
              color: 'var(--slate-900)', marginBottom: 6, letterSpacing: '-0.01em',
            }}>
              Grandes villes
            </h2>
            <p style={{ color: 'var(--slate-500)', fontSize: 14, marginBottom: 20 }}>
              Prix immobiliers, transactions DVF et diagnostics DPE par commune
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 10,
            }}>
              {GRANDES_VILLES.map(v => (
                <Link
                  key={v.slug}
                  href={`/commune/${v.slug}`}
                  prefetch={false}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 8, textDecoration: 'none',
                    background: 'white', border: '1px solid var(--slate-200)',
                    transition: 'border-color .15s',
                  }}
                  className="hover:border-amber-400"
                >
                  <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--slate-900)' }}>{v.nom}</span>
                  <span style={{ fontSize: 12, color: 'var(--slate-400)', marginLeft: 8 }}>{v.dept}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Régions */}
          <section style={{ marginTop: 56 }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22,
              color: 'var(--slate-900)', marginBottom: 6, letterSpacing: '-0.01em',
            }}>
              Régions
            </h2>
            <p style={{ color: 'var(--slate-500)', fontSize: 14, marginBottom: 20 }}>
              Statistiques agrégées et carte par région administrative
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 10,
            }}>
              {REGIONS.map(r => (
                <Link
                  key={r.slug}
                  href={`/region/${r.slug}`}
                  prefetch={false}
                  style={{
                    display: 'block', padding: '12px 16px', borderRadius: 8,
                    textDecoration: 'none', background: 'white',
                    border: '1px solid var(--slate-200)', transition: 'border-color .15s',
                  }}
                  className="hover:border-amber-400"
                >
                  <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--slate-900)' }}>{r.nom}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Départements */}
          <section style={{ marginTop: 56 }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22,
              color: 'var(--slate-900)', marginBottom: 6, letterSpacing: '-0.01em',
            }}>
              Départements
            </h2>
            <p style={{ color: 'var(--slate-500)', fontSize: 14, marginBottom: 20 }}>
              Données immobilières consolidées par département
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 10,
            }}>
              {DEPARTEMENTS.map(d => (
                <Link
                  key={d.slug}
                  href={`/departement/${d.slug}`}
                  prefetch={false}
                  style={{
                    display: 'block', padding: '12px 16px', borderRadius: 8,
                    textDecoration: 'none', background: 'white',
                    border: '1px solid var(--slate-200)', transition: 'border-color .15s',
                  }}
                  className="hover:border-amber-400"
                >
                  <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--slate-900)' }}>{d.nom}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* À qui s'adresse Geocopia */}
          <section style={{ marginTop: 56 }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22,
              color: 'var(--slate-900)', marginBottom: 6, letterSpacing: '-0.01em',
            }}>
              À qui s&apos;adresse Geocopia ?
            </h2>
            <p style={{ color: 'var(--slate-500)', fontSize: 14, marginBottom: 20 }}>
              Des données publiques utiles dans de nombreuses situations
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {[
                {
                  who: 'Acheteurs et vendeurs',
                  desc: 'Vérifiez le prix réel auquel des biens similaires ont été vendus dans le quartier. Les données DVF sont les mêmes que celles utilisées par les notaires.',
                },
                {
                  who: 'Locataires et propriétaires',
                  desc: 'Consultez le DPE d\'un logement pour anticiper la facture énergétique, et vérifiez si le bien est concerné par les futures interdictions de location des passoires thermiques.',
                },
                {
                  who: 'Professionnels de l\'immobilier',
                  desc: 'Agents, notaires, gestionnaires : accédez rapidement aux transactions DVF, au cadastre et aux risques naturels pour préparer un dossier ou conseiller un client.',
                },
                {
                  who: 'Journalistes et chercheurs',
                  desc: 'Explorez les tendances du marché immobilier par commune, département ou région. Les données sources sont accessibles en open data via la page dédiée.',
                },
              ].map(item => (
                <div key={item.who} style={{
                  padding: '20px 22px', borderRadius: 10, background: 'white',
                  border: '1px solid var(--slate-200)',
                }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--slate-900)', marginBottom: 8 }}>{item.who}</div>
                  <div style={{ fontSize: 13, color: 'var(--slate-500)', lineHeight: 1.65 }}>{item.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <Link href="/guides" prefetch={false} style={{
                fontSize: 14, color: 'var(--amber-600)', textDecoration: 'none', fontWeight: 500,
              }}>
                Comprendre les données DVF, DPE et cadastre →
              </Link>
            </div>
          </section>

          {/* Ce que contient Geocopia */}
          <section style={{
            marginTop: 56, padding: 32, borderRadius: 12,
            background: 'white', border: '1px solid var(--slate-200)',
          }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20,
              color: 'var(--slate-900)', marginBottom: 20, letterSpacing: '-0.01em',
            }}>
              Des données officielles, directement accessibles
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
              {[
                {
                  title: 'Transactions DVF',
                  desc: 'Toutes les ventes immobilières enregistrées depuis 2014 par la DGFiP : prix, surface, type de bien, date de mutation.',
                },
                {
                  title: 'Parcelles cadastrales (PCI)',
                  desc: '62 millions de parcelles issues du Plan Cadastral Informatisé, avec leur surface et leur localisation précise.',
                },
                {
                  title: 'Diagnostics DPE',
                  desc: 'Les diagnostics de performance énergétique (étiquettes A–G) des logements, fournis par l\'ADEME.',
                },
                {
                  title: 'Risques naturels',
                  desc: 'Zones d\'aléa inondation, sismicité, retrait-gonflement des argiles et autres risques issus de Géorisques.',
                },
                {
                  title: 'Adresses BAN',
                  desc: '25 millions d\'adresses géolocalisées de la Base Adresse Nationale, référentiel officiel de l\'État.',
                },
                {
                  title: 'Entreprises SIRENE',
                  desc: 'Les établissements professionnels à chaque adresse, issus du répertoire SIRENE de l\'INSEE.',
                },
              ].map(item => (
                <div key={item.title}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--slate-900)', marginBottom: 6 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--slate-500)', lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24 }}>
              <Link href="/open-data" prefetch={false} style={{
                fontSize: 14, color: 'var(--amber-600)', textDecoration: 'none', fontWeight: 500,
              }}>
                En savoir plus sur nos sources de données →
              </Link>
            </div>
          </section>

        </div>
      </main>

      <div className="parcelle-footer">
        <span>Sources : Cadastre IGN · DVF DGFiP · DPE ADEME · BAN · SIRENE INSEE</span>
        <span className="shrink-0 flex items-center gap-4 ml-4">
          <Link href="/a-propos" prefetch={false} style={{ color: 'inherit', textDecoration: 'none' }} className="hover:text-slate-600 transition-colors">À propos</Link>
          <Link href="/mentions-legales" prefetch={false} style={{ color: 'inherit', textDecoration: 'none' }} className="hover:text-slate-600 transition-colors">Mentions légales</Link>
          <span style={{ fontFamily: 'var(--font-mono)' }}>Geocopia</span>
        </span>
      </div>

    </div>
  )
}

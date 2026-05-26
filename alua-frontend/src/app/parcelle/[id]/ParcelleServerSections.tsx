import Link from 'next/link'
import { AlertTriangle, Briefcase, MapPin } from 'lucide-react'
import { formatDate } from '@/components/fiche'
import type {
  ParcelleRisques, RisqueDisplay, SectionData, Copropriete,
  SitadelPermis, SireneEtablissement, ParcellePoi, PoiCategory,
} from '@/types/api'

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL!

// ─── Layout helpers ───────────────────────────────────────────────────────────

function SectionIcon({ kind, children }: { kind: string; children: React.ReactNode }) {
  return (
    <div className={`gc-icon-${kind} w-9 h-9 rounded-lg flex items-center justify-center shrink-0`}>
      {children}
    </div>
  )
}

function SectionHeader({ kind, icon, title, count, source }: {
  kind: string; icon: React.ReactNode; title: string
  count?: number | null; source?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3.5 mb-5">
      <SectionIcon kind={kind}>{icon}</SectionIcon>
      <h2 className="flex-1 text-xl font-semibold tracking-tight" style={{ color: 'var(--slate-900)', letterSpacing: '-0.005em' }}>
        {title}
        {count != null && <span className="ml-2.5 text-base font-normal" style={{ color: 'var(--slate-500)' }}>{count}</span>}
      </h2>
      {source && <span className="text-sm" style={{ color: 'var(--slate-500)' }}>{source}</span>}
    </div>
  )
}

// ─── Risques ─────────────────────────────────────────────────────────────────

const NIVEAU_COLORS: Record<string, string> = {
  'Existant': 'text-orange-700 font-semibold',
  'Faible': 'text-yellow-700',
  'Moyen': 'text-orange-600 font-semibold',
  'Modéré': 'text-orange-600 font-semibold',
  'Significatif': 'text-red-700 font-semibold',
  'Important': 'text-red-700 font-semibold',
  'Très important': 'text-red-800 font-bold',
  'Fort': 'text-red-700 font-semibold',
  'Pas de risque connu': 'text-green-700',
  'Non renseigné': 'text-muted-foreground/50',
}
function niveauColor(n: string) { return NIVEAU_COLORS[n] ?? 'text-muted-foreground' }

function RisqueTableRow({ r }: { r: RisqueDisplay }) {
  return (
    <tr className="border-b last:border-0" style={{ borderColor: 'var(--slate-100)' }}>
      <td className="py-3 pr-4 text-sm" style={{ color: 'var(--slate-700)' }}>{r.libelle}</td>
      <td className={`py-3 pr-4 text-sm text-left ${niveauColor(r.adresse)}`}>{r.adresse}</td>
      <td className={`py-3 text-sm text-left ${niveauColor(r.commune)}`}>{r.commune}</td>
    </tr>
  )
}

export async function RisquesServerSection({ idParcelle }: { idParcelle: string }) {
  let risques: ParcelleRisques | null = null
  try {
    const res = await fetch(`${API_URL}/api/parcelles/${idParcelle}/risques`, { next: { revalidate: 86400, tags: ['parcelles', 'risques', `parcelle-${idParcelle}`] } })
    if (res.ok) risques = await res.json()
  } catch { /* réseau indisponible → section absente */ }

  if (!risques?.risques?.length) return null

  return (
    <section id="section-risques" style={{ marginBottom: 56 }}>
      <SectionHeader
        kind="risques"
        icon={<AlertTriangle size={18} />}
        title="Risques"
        source={
          <a href="https://www.georisques.gouv.fr" target="_blank" rel="noopener noreferrer"
            className="hover:underline" style={{ textDecorationColor: 'var(--slate-300)' }}>
            georisques.gouv.fr
          </a>
        }
      />
      <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr>
            <th />
            <th className="pb-3 text-left text-sm font-medium" style={{ color: 'var(--slate-500)', width: 180 }}>À l&apos;adresse</th>
            <th className="pb-3 text-left text-sm font-medium" style={{ color: 'var(--slate-500)', width: 180 }}>Sur la commune</th>
          </tr>
          <tr>
            <td colSpan={3}>
              <div className="pt-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: 'var(--slate-500)', borderTop: '1px solid var(--slate-200)' }}>
                Risques naturels
              </div>
            </td>
          </tr>
        </thead>
        <tbody>
          {risques.risques.filter(r => r.type === 'naturel').map(r => <RisqueTableRow key={r.id} r={r} />)}
          <tr>
            <td colSpan={3} className="pt-5 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: 'var(--slate-500)' }}>
              Risques technologiques
            </td>
          </tr>
          {risques.risques.filter(r => r.type === 'technologique').map(r => <RisqueTableRow key={r.id} r={r} />)}
        </tbody>
      </table>
    </section>
  )
}

// ─── Entreprises ─────────────────────────────────────────────────────────────

const NAF_DIVISIONS: Record<string, string> = {
  '01': 'Agriculture', '02': 'Sylviculture', '03': 'Pêche',
  '10': 'Alimentation', '11': 'Boissons', '13': 'Textile', '14': 'Habillement',
  '16': 'Bois/papier', '17': 'Papier', '18': 'Imprimerie', '20': 'Chimie',
  '21': 'Pharma', '22': 'Plastique', '23': 'Matériaux', '24': 'Métallurgie',
  '25': 'Prod. métalliques', '26': 'Électronique', '27': 'Équip. électrique',
  '28': 'Machines', '29': 'Automobile', '31': 'Meubles', '32': 'Industries div.',
  '33': 'Réparation', '35': 'Énergie', '36': 'Eau', '38': 'Déchets',
  '41': 'Construction', '42': 'Génie civil', '43': 'Travaux spéciaux',
  '45': 'Commerce auto', '46': 'Commerce gros', '47': 'Commerce détail',
  '49': 'Transport', '52': 'Logistique', '53': 'Courrier/colis',
  '55': 'Hébergement', '56': 'Restauration',
  '58': 'Édition', '62': 'Informatique', '64': 'Finance', '65': 'Assurance',
  '68': 'Immobilier', '69': 'Juridique/compta', '71': 'Architecture/ingé',
  '72': 'R&D', '73': 'Publicité', '77': 'Location', '78': 'Intérim/RH',
  '84': 'Administration publique', '85': 'Enseignement',
  '86': 'Santé', '87': 'Médico-social', '88': 'Action sociale',
  '90': 'Arts/spectacles', '93': 'Sports/loisirs', '94': 'Associations',
  '96': 'Services personnels',
}
const nafLibelle = (code: string | null) =>
  code ? (NAF_DIVISIONS[code.slice(0, 2)] ?? null) : null

export async function EntreprisesServerSection({ idParcelle }: { idParcelle: string }) {
  let data: SectionData<SireneEtablissement> = { items: [], updatedAt: null }
  try {
    const res = await fetch(`${API_URL}/api/parcelles/${idParcelle}/entreprises`, { next: { revalidate: 86400, tags: ['parcelles', 'sirene', `parcelle-${idParcelle}`] } })
    if (res.ok) data = await res.json()
  } catch { /* section absente */ }

  if (!data.items.length) return null

  return (
    <section id="section-entreprises" style={{ marginBottom: 56 }}>
      <SectionHeader
        kind="entreprises"
        icon={<Briefcase size={18} />}
        title="Établissements à proximité"
        count={data.items.length}
        source="SIRENE · INSEE · rayon 50 m"
      />
      <div>
        {data.items.map(e => (
          <a key={e.siret}
            href={`https://annuaire-entreprises.data.gouv.fr/etablissement/${e.siret}`}
            target="_blank" rel="noopener noreferrer"
            className="block py-3 border-t hover:opacity-75 transition-opacity"
            style={{ borderColor: 'var(--slate-100)', display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16, alignItems: 'center' }}>
            <div>
              <span className="text-sm font-medium" style={{ color: 'var(--slate-900)' }}>{e.nom ?? '—'}</span>
              <span className="text-sm ml-2.5" style={{ color: 'var(--slate-500)' }}>
                {nafLibelle(e.nafCode) ?? e.nafCode}
                {e.nafCode && <span className="font-mono text-xs ml-1.5">{e.nafCode}</span>}
              </span>
            </div>
            <div className="text-xs" style={{ color: 'var(--slate-500)' }}>{e.estSiege ? 'Siège' : '—'}</div>
            <div className="text-sm text-right" style={{ color: 'var(--slate-600)', width: 90 }}>
              {e.dateCreation && new Date(e.dateCreation).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}

// ─── POI ─────────────────────────────────────────────────────────────────────

export async function PoiServerSection({ idParcelle }: { idParcelle: string }) {
  let data: ParcellePoi = { categories: [], fetchedAt: null }
  try {
    const res = await fetch(`${API_URL}/api/parcelles/${idParcelle}/poi`, { next: { revalidate: 86400, tags: ['parcelles', 'poi', `parcelle-${idParcelle}`] } })
    if (res.ok) data = await res.json()
  } catch { /* section absente */ }

  if (!data.categories.length) return null

  return (
    <section id="section-proximite" style={{ marginBottom: 56 }}>
      <SectionHeader kind="proximite" icon={<MapPin size={18} />} title="À proximité" source="OpenStreetMap" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
        {data.categories.map((cat: PoiCategory) => (
          <div key={cat.label}>
            <h4 className="text-[11px] font-semibold uppercase tracking-widest pb-2 mb-1"
              style={{ color: 'var(--slate-500)', borderBottom: '1px solid var(--slate-200)' }}>
              {cat.label}
            </h4>
            {cat.items.map((item, i) => (
              <div key={i} className="flex justify-between py-2 text-sm"
                style={{ borderTop: i ? `1px solid var(--slate-100)` : 'none' }}>
                <span style={{ color: 'var(--slate-700)' }}>{item.name ?? item.type}</span>
                <span className="tabular-nums" style={{ color: 'var(--slate-600)' }}>{item.distM} m</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Copropriété (sidebar) ────────────────────────────────────────────────────

export async function CoproprieteServerSection({ idParcelle }: { idParcelle: string }) {
  let data: SectionData<Copropriete> = { items: [], updatedAt: null }
  try {
    const res = await fetch(`${API_URL}/api/parcelles/${idParcelle}/coproprietes`, { next: { revalidate: 86400, tags: ['parcelles', 'rnic', `parcelle-${idParcelle}`] } })
    if (res.ok) data = await res.json()
  } catch { /* section absente */ }

  if (!data.items.length) return null

  return (
    <div className="pt-5" style={{ borderTop: '1px solid var(--slate-200)' }}>
      <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--slate-900)', fontFamily: 'var(--font-body)' }}>
        Copropriété{data.items.length > 1 ? 's' : ''}{' '}
        <span className="font-normal text-xs" style={{ color: 'var(--slate-500)' }}>RNIC</span>
      </h4>
      {data.items.map(c => (
        <div key={c.noImmatriculation} className="space-y-2 mb-4 last:mb-0">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--slate-900)' }}>{c.nom ?? c.noImmatriculation}</p>
            <p className="font-mono text-[11px]" style={{ color: 'var(--slate-500)' }}>{c.noImmatriculation}</p>
          </div>
          <dl className="space-y-1 text-sm">
            {c.representantLegal && (
              <div className="flex justify-between gap-3">
                <dt style={{ color: 'var(--slate-500)' }}>Syndic</dt>
                <dd className="text-right" style={{ color: 'var(--slate-800)' }}>{c.representantLegal}{c.typeSyndic ? ` · ${c.typeSyndic}` : ''}</dd>
              </div>
            )}
            {c.nbLotsTotal != null && (
              <div className="flex justify-between gap-3">
                <dt style={{ color: 'var(--slate-500)' }}>Lots total</dt>
                <dd style={{ color: 'var(--slate-800)' }}>{c.nbLotsTotal}</dd>
              </div>
            )}
            {c.nbLotsHabitation != null && (
              <div className="flex justify-between gap-3">
                <dt style={{ color: 'var(--slate-500)' }}>Habitation</dt>
                <dd style={{ color: 'var(--slate-800)' }}>{c.nbLotsHabitation}</dd>
              </div>
            )}
            {c.nbLotsStationnement != null && (
              <div className="flex justify-between gap-3">
                <dt style={{ color: 'var(--slate-500)' }}>Stationnement</dt>
                <dd style={{ color: 'var(--slate-800)' }}>{c.nbLotsStationnement}</dd>
              </div>
            )}
            {c.dateReglement && (
              <div className="flex justify-between gap-3">
                <dt style={{ color: 'var(--slate-500)' }}>Règlement</dt>
                <dd style={{ color: 'var(--slate-800)' }}>{formatDate(c.dateReglement)}</dd>
              </div>
            )}
          </dl>
        </div>
      ))}
      <p className="text-[11px] mt-2" style={{ color: 'var(--slate-400)' }}>Source : RNIC — data.gouv.fr</p>
    </div>
  )
}

// ─── Permis (sidebar) ────────────────────────────────────────────────────────

const ETAT_COLORS: Record<string, string> = {
  'Autorisé': 'bg-blue-50 text-blue-700', 'Commencé': 'bg-orange-50 text-orange-700',
  'Achevé': 'bg-green-50 text-green-700', 'Caduc': 'bg-gray-100 text-gray-500',
  'Annulé': 'bg-gray-100 text-gray-500', 'Refusé': 'bg-red-50 text-red-700',
}

export async function PermisServerSection({ idParcelle }: { idParcelle: string }) {
  let data: SectionData<SitadelPermis> = { items: [], updatedAt: null }
  try {
    const res = await fetch(`${API_URL}/api/parcelles/${idParcelle}/permis`, { next: { revalidate: 86400, tags: ['parcelles', 'sitadel', `parcelle-${idParcelle}`] } })
    if (res.ok) data = await res.json()
  } catch { /* section absente */ }

  if (!data.items.length) return null

  return (
    <div className="pt-5" style={{ borderTop: '1px solid var(--slate-200)' }}>
      <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--slate-900)', fontFamily: 'var(--font-body)' }}>
        Autorisations <span className="font-normal text-xs" style={{ color: 'var(--slate-500)' }}>Sitadel</span>
      </h4>
      <div className="space-y-3">
        {data.items.map(p => (
          <div key={p.numDau}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm" style={{ color: 'var(--slate-800)' }}>{p.natureProjetLibelle ?? p.typeDauLibelle}</p>
              {p.etatDauLibelle && (
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0 ${ETAT_COLORS[p.etatDauLibelle] ?? 'bg-gray-100 text-gray-600'}`}>
                  {p.etatDauLibelle}
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--slate-500)' }}>
              {formatDate(p.dateAutorisation ?? p.dateDaact)}
              {(p.nbLogementsCrees ?? 0) > 0 && ` · ${p.nbLogementsCrees} lgmt`}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

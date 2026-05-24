'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { X, ChevronDown, ChevronRight, ArrowRight } from 'lucide-react'
import type {
  Parcelle, ParcelleTransaction, ParcelleTransactionLot, ParcelleDpe,
  SectionData, ParcelleRisques, RisqueDisplay, ParcellePatrimoine,
  BatimentBdnb, Copropriete, SitadelPermis, SireneEtablissement, ParcellePoi,
} from '@/types/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

// ─── DPE ─────────────────────────────────────────────────────────────────────

const DPE_BG: Record<string, string> = {
  A: '#319834', B: '#41a93c', C: '#aac638',
  D: '#f0e72e', E: '#f1bb31', F: '#ec7c2f', G: '#db342b',
}
const DPE_FG: Record<string, string> = {
  C: '#1a3500', D: '#4a3a00', E: '#4a2900',
}

function DpeBadge({ label, size = 28 }: { label: string; size?: number }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: 3,
      background: DPE_BG[label] ?? '#888',
      color: DPE_FG[label] ?? 'white',
      fontWeight: 700, fontSize: size * 0.5,
    }}>{label}</span>
  )
}

/** Vertical DPE scale A→G with the active grade highlighted */
function DpeScale({ value }: { value: string }) {
  const grades = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {grades.map(g => (
        <div
          key={g}
          style={{
            height: 22, padding: '0 8px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderRadius: 3,
            background: DPE_BG[g] ?? '#888',
            color: DPE_FG[g] ?? 'white',
            fontWeight: 700, fontSize: 11,
            opacity: g === value ? 1 : 0.3,
            transform: g === value ? 'scaleX(1)' : 'scaleX(0.78)',
            transformOrigin: 'left',
            transition: 'all .2s',
          }}
        >
          {g}
        </div>
      ))}
    </div>
  )
}

// ─── Formatters ─────────────────────────���────────────────────���────────────────

function formatPrice(v: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}

function formatDateShort(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
}

// ─── Transaction row ────────────────────────��────────────────────────���────────

function TransactionRow({ t }: { t: ParcelleTransaction }) {
  const [open, setOpen] = useState(false)
  const mainLot = t.lots?.find(
    (l) => l.typeLocal && l.typeLocal !== 'Dépendance' && (l.surfaceBati ?? l.surfaceCarrez)
  ) ?? t.lots?.[0]
  const surface = mainLot?.surfaceBati ?? mainLot?.surfaceCarrez ?? mainLot?.surfaceTerrain
  const prixM2 = surface && surface > 0 && t.valeurFonciere
    ? Math.round(t.valeurFonciere / surface) : null
  const nbLots = t.lots?.length ?? 0

  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--slate-100)' }}>
      <button
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          background: 'transparent', border: 0, padding: 0, cursor: nbLots > 1 ? 'pointer' : 'default',
          fontFamily: 'inherit', textAlign: 'left',
        }}
        onClick={() => nbLots > 1 && setOpen(!open)}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--slate-900)', fontVariantNumeric: 'tabular-nums' }}>
            {t.valeurFonciere ? formatPrice(t.valeurFonciere) : '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--slate-500)', marginTop: 2 }}>
            {[mainLot?.typeLocal, surface ? `${surface} m²` : null, prixM2 ? `${formatPrice(prixM2)}/m²` : null]
              .filter(Boolean).join(' · ')}
            {nbLots > 1 && !open && (
              <span style={{ color: 'var(--slate-400)', marginLeft: 4 }}>+{nbLots - 1} lot{nbLots > 2 ? 's' : ''}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--slate-500)', fontVariantNumeric: 'tabular-nums' }}>
            {formatDateShort(t.date)}
          </span>
          {nbLots > 1 && (
            <ChevronDown
              size={12}
              style={{
                color: 'var(--slate-400)',
                transform: open ? 'rotate(180deg)' : 'none',
                transition: 'transform .15s',
              }}
            />
          )}
        </div>
      </button>

      {open && t.lots && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--slate-100)' }}>
          {t.lots.map((lot: ParcelleTransactionLot, i: number) => {
            const surf = lot.surfaceBati ?? lot.surfaceCarrez ?? lot.surfaceTerrain
            return (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 11, color: 'var(--slate-500)', padding: '2px 0',
              }}>
                <span>{lot.typeLocal ?? 'Lot'}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {[surf ? `${surf} m²` : null, lot.nombrePieces ? `${lot.nombrePieces} p.` : null].filter(Boolean).join(' · ')}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── DPE row ────────────────────────────────────��──────────────────��──────────

function DpeRow({ d }: { d: ParcelleDpe }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--slate-100)' }}>
      <button
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
          fontFamily: 'inherit', textAlign: 'left',
        }}
        onClick={() => setOpen(!open)}
      >
        {d.etiquetteDpe && <DpeBadge label={d.etiquetteDpe} size={24} />}
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 13, color: 'var(--slate-700)' }}>
            {[d.typeBatiment, d.surface ? `${d.surface} m²` : null].filter(Boolean).join(' · ')}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--slate-500)' }}>{formatDateShort(d.date)}</span>
          <ChevronDown size={12} style={{ color: 'var(--slate-400)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
        </div>
      </button>
      {open && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--slate-100)', fontSize: 12, color: 'var(--slate-500)' }}>
          {d.periodeConstruction && <KV label="Construction" value={d.periodeConstruction} />}
          {d.energieChauffage && <KV label="Chauffage" value={d.energieChauffage} />}
          {d.consoPrimaire != null && <KV label="Conso primaire" value={`${Math.round(d.consoPrimaire)} kWhEP/m²/an`} />}
          {d.emissionGes != null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span>Émissions GES</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--slate-700)' }}>{Math.round(d.emissionGes)} kgCO₂/m²/an</span>
                {d.etiquetteGes && <DpeBadge label={d.etiquetteGes} size={18} />}
              </div>
            </div>
          )}
          {d.dateFinValidite && <KV label="Valide jusqu'au" value={formatDateShort(d.dateFinValidite)} />}
        </div>
      )}
    </div>
  )
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
      <span>{label}</span>
      <span style={{ color: 'var(--slate-700)' }}>{value}</span>
    </div>
  )
}

// ─── Risques ─────────────────────────────────────────────────────���────────────

const NIVEAU_FG: Record<string, string> = {
  'Existant':           '#c2410c',
  'Important':          '#b91c1c',
  'Très important':     '#7f1d1d',
  'Fort':               '#b91c1c',
  'Moyen':              '#c2410c',
  'Modéré':             '#c2410c',
  'Significatif':       '#b91c1c',
  'Faible':             '#92400e',
  'Très faible':        '#92400e',
  'Pas de risque connu':'#166534',
  'Non renseigné':      '#94a3b8',
}
function niveauStyle(v: string): React.CSSProperties {
  return { color: NIVEAU_FG[v] ?? 'var(--slate-500)', fontWeight: ['Existant','Important','Très important','Fort','Significatif'].includes(v) ? 500 : 400 }
}

type RisquesState = { status: 'idle' } | { status: 'loading' } | { status: 'done'; data: ParcelleRisques } | { status: 'error' }

function RisquesSection({ state, onOpen }: { state: RisquesState; onOpen: () => void }) {
  const [open, setOpen] = useState(false)
  const sigCount = state.status === 'done'
    ? state.data.risques.filter(r => r.adresse !== 'Pas de risque connu' && r.adresse !== 'Non renseigné').length
    : 0
  const toggle = () => { const next = !open; setOpen(next); if (next && state.status === 'idle') onOpen() }
  return (
    <CollapsibleSection
      label="Risques"
      badge={state.status === 'done' ? `${sigCount} à l'adresse` : undefined}
      loading={state.status === 'loading'}
      open={open}
      onToggle={toggle}
    >
      {state.status === 'done' && (
        <>
          {['naturel', 'technologique'].map(type => (
            <div key={type}>
              <div style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'var(--slate-400)', padding: '8px 0 4px',
              }}>
                {type === 'naturel' ? 'Naturels' : 'Technologiques'}
              </div>
              {state.data.risques.filter(r => r.type === type).map(r => (
                <RisqueRow key={r.id} r={r} />
              ))}
            </div>
          ))}
          <p style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 8 }}>
            Source :{' '}
            <a href="https://www.georisques.gouv.fr" target="_blank" rel="noopener noreferrer"
              style={{ textDecoration: 'underline' }}>georisques.gouv.fr</a>
          </p>
        </>
      )}
    </CollapsibleSection>
  )
}

function RisqueRow({ r }: { r: RisqueDisplay }) {
  return (
    <div style={{ padding: '5px 0', borderBottom: '1px solid var(--slate-100)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--slate-700)' }}>{r.libelle}</span>
        <span style={{ fontSize: 12, flexShrink: 0, ...niveauStyle(r.adresse) }}>{r.adresse}</span>
      </div>
      {r.commune !== r.adresse && (
        <p style={{ fontSize: 11, color: 'var(--slate-400)', textAlign: 'right', marginTop: 1 }}>
          commune : <span style={niveauStyle(r.commune)}>{r.commune}</span>
        </p>
      )}
    </div>
  )
}

// ─── Patrimoine ─────────────────────��─────────────────────────────��───────────

type PatrimoineState = { status: 'idle' } | { status: 'loading' } | { status: 'done'; data: ParcellePatrimoine } | { status: 'error' }

function PatrimoineSection({ state, onOpen }: { state: PatrimoineState; onOpen: () => void }) {
  const [open, setOpen] = useState(false)
  const badge = state.status === 'done'
    ? (state.data.enPerimetreAbf ? 'Périmètre ABF' : 'Hors périmètre')
    : undefined
  const badgeColor = state.status === 'done' && state.data.enPerimetreAbf ? '#c2410c' : '#166534'
  const toggle = () => { const next = !open; setOpen(next); if (next && state.status === 'idle') onOpen() }
  return (
    <CollapsibleSection
      label="Patrimoine ABF"
      badge={badge}
      badgeColor={badgeColor}
      loading={state.status === 'loading'}
      open={open}
      onToggle={toggle}
    >
      {state.status === 'done' && !state.data.importRequired && !state.data.enPerimetreAbf && (
        <p style={{ fontSize: 12, color: '#166534' }}>Aucun monument historique dans un rayon de 500 m.</p>
      )}
      {state.status === 'done' && state.data.importRequired && (
        <p style={{ fontSize: 12, color: 'var(--slate-500)', fontStyle: 'italic' }}>Import non effectué.</p>
      )}
      {state.status === 'done' && state.data.enPerimetreAbf && state.data.monuments.map(m => (
        <div key={m.reference} style={{
          padding: '8px 10px', marginBottom: 6,
          background: '#fff7ed', borderRadius: 4,
          border: '1px solid #fed7aa',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: '#7c2d12', lineHeight: 1.4 }}>
              {m.titre || m.denomination || m.reference}
            </p>
            <span style={{ fontSize: 11, color: '#c2410c', flexShrink: 0 }}>{m.distanceM} m</span>
          </div>
          <p style={{ fontSize: 11, color: '#c2410c', marginTop: 2 }}>
            {m.protection === 'classé' ? 'Classé MH' : 'Inscrit MH'}
          </p>
        </div>
      ))}
    </CollapsibleSection>
  )
}

// ─── Generic collapsible section ─────────────────────────────────────────────

type SectionState<T> = { status: 'idle' } | { status: 'loading' } | { status: 'done'; data: SectionData<T> } | { status: 'error' }

function CollapsibleSection({
  label, badge, badgeColor = 'var(--slate-500)', loading, open, onToggle, children,
}: {
  label: string
  badge?: string
  badgeColor?: string
  loading?: boolean
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div style={{ borderTop: '1px solid var(--slate-200)' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '11px 20px', background: 'transparent', border: 0,
          fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          color: 'var(--slate-800)',
        }}
      >
        <ChevronRight
          size={14}
          style={{
            color: 'var(--slate-400)',
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform .15s',
            flexShrink: 0,
          }}
        />
        <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
        {badge && <span style={{ fontSize: 12, fontWeight: 400, color: badgeColor }}>{badge}</span>}
        {loading && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--slate-400)' }}>…</span>}
      </button>
      {open && (
        <div style={{ padding: '0 20px 12px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0 4px', color: 'var(--slate-400)', fontSize: 12 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
                <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="22" strokeDashoffset="8">
                  <animateTransform attributeName="transform" type="rotate" from="0 7 7" to="360 7 7" dur="0.8s" repeatCount="indefinite" />
                </circle>
              </svg>
              Chargement…
            </div>
          ) : children}
        </div>
      )}
    </div>
  )
}

function Section<T>({
  title, state, onOpen, children,
}: {
  title: string
  state: SectionState<T>
  onOpen: () => void
  children: (data: SectionData<T>) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const toggle = () => { const next = !open; setOpen(next); if (next && state.status === 'idle') onOpen() }
  const badge = state.status === 'done' ? `${state.data.items.length}` : undefined
  return (
    <CollapsibleSection
      label={title}
      badge={badge}
      loading={state.status === 'loading'}
      open={open}
      onToggle={toggle}
    >
      {state.status === 'done' && state.data.items.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>Aucune donnée disponible.</p>
      )}
      {state.status === 'done' && state.data.items.length > 0 && children(state.data)}
      {state.status === 'error' && (
        <p style={{ fontSize: 12, color: '#b91c1c' }}>Erreur de chargement.</p>
      )}
    </CollapsibleSection>
  )
}

// ─── Specific section renderers ────────────────────��──────────────────────────

function BatimentCard({ b }: { b: BatimentBdnb }) {
  return (
    <div style={{ padding: '6px 0', borderBottom: '1px solid var(--slate-100)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--slate-800)' }}>{b.usageNiveau1 ?? 'Usage inconnu'}</span>
        {b.anneeConstruction && <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>{b.anneeConstruction}</span>}
      </div>
      {b.nbLogements != null && (
        <p style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 2 }}>{b.nbLogements} logement{b.nbLogements > 1 ? 's' : ''}</p>
      )}
    </div>
  )
}

const ETAT_FG: Record<string, string> = {
  'Autorisé': '#1d4ed8', 'Commencé': '#b45309', 'Achevé': '#166534',
  'Caduc': '#94a3b8', 'Annulé': '#94a3b8', 'Refusé': '#b91c1c',
}

function PermisCard({ p }: { p: SitadelPermis }) {
  return (
    <div style={{ padding: '6px 0', borderBottom: '1px solid var(--slate-100)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--slate-800)', lineHeight: 1.3 }}>
          {p.natureProjetLibelle ?? p.typeDauLibelle ?? p.typeDau}
        </span>
        {p.etatDauLibelle && (
          <span style={{ fontSize: 11, flexShrink: 0, color: ETAT_FG[p.etatDauLibelle] ?? 'var(--slate-500)' }}>
            {p.etatDauLibelle}
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 2, display: 'flex', gap: 8 }}>
        {p.dateAutorisation && <span>{formatDateShort(p.dateAutorisation)}</span>}
        {(p.nbLogementsCrees ?? 0) > 0 && <span>{p.nbLogementsCrees} lgmt</span>}
        {(p.surfHabCreee ?? 0) > 0 && <span>{p.surfHabCreee} m²</span>}
      </div>
    </div>
  )
}

function EtablissementRow({ e }: { e: SireneEtablissement }) {
  return (
    <a
      href={`https://annuaire-entreprises.data.gouv.fr/etablissement/${e.siret}`}
      target="_blank" rel="noopener noreferrer"
      style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--slate-100)', textDecoration: 'none' }}
    >
      <div>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--slate-900)' }}>{e.nom ?? '—'}</span>
        <span style={{ fontSize: 12, color: 'var(--slate-500)', marginLeft: 8 }}>{e.nafLibelle ?? e.nafCode}</span>
      </div>
      {e.estSiege && <span style={{ fontSize: 11, color: '#1d4ed8' }}>Siège</span>}
      <span style={{ fontSize: 12, color: 'var(--slate-600)' }}>{e.dateCreation ? formatDateShort(e.dateCreation) : ''}</span>
    </a>
  )
}

type PoiState = { status: 'idle' } | { status: 'loading' } | { status: 'done'; data: ParcellePoi } | { status: 'error' }

function PoiSection({ state, onOpen }: { state: PoiState; onOpen: () => void }) {
  const [open, setOpen] = useState(false)
  const total = state.status === 'done' ? state.data.categories.reduce((s, c) => s + c.items.length, 0) : 0
  const toggle = () => { const next = !open; setOpen(next); if (next && state.status === 'idle') onOpen() }
  return (
    <CollapsibleSection
      label="À proximité (OSM)"
      badge={state.status === 'done' && total > 0 ? `${total}` : undefined}
      loading={state.status === 'loading'}
      open={open}
      onToggle={toggle}
    >
      {state.status === 'done' && state.data.categories.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>Aucun POI trouvé.</p>
      )}
      {state.status === 'done' && state.data.categories.map(cat => (
        <div key={cat.label} style={{ marginBottom: 10 }}>
          <p style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--slate-400)', marginBottom: 4,
          }}>{cat.label}</p>
          {cat.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', color: 'var(--slate-700)' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingRight: 8 }}>{item.name ?? item.type}</span>
              <span style={{ flexShrink: 0, color: 'var(--slate-500)', fontVariantNumeric: 'tabular-nums' }}>{item.distM} m</span>
            </div>
          ))}
        </div>
      ))}
    </CollapsibleSection>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface Props {
  parcelle: Parcelle | null
  loading: boolean
  onClose: () => void
}

export default function InfoPanel({ parcelle, loading, onClose }: Props) {
  const [transactions, setTransactions] = useState<SectionState<ParcelleTransaction>>({ status: 'idle' })
  const [dpes, setDpes] = useState<SectionState<ParcelleDpe>>({ status: 'idle' })
  const [risques, setRisques] = useState<RisquesState>({ status: 'idle' })
  const [patrimoine, setPatrimoine] = useState<PatrimoineState>({ status: 'idle' })
  const [batiments, setBatiments] = useState<SectionState<BatimentBdnb>>({ status: 'idle' })
  const [coproprietes, setCoproprietes] = useState<SectionState<Copropriete>>({ status: 'idle' })
  const [permis, setPermis] = useState<SectionState<SitadelPermis>>({ status: 'idle' })
  const [etablissements, setEtablissements] = useState<SectionState<SireneEtablissement>>({ status: 'idle' })
  const [poi, setPoi] = useState<PoiState>({ status: 'idle' })

  const fetchSection = useCallback(async <T,>(url: string, set: (s: SectionState<T>) => void) => {
    set({ status: 'loading' })
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error()
      const data: SectionData<T> = await res.json()
      set({ status: 'done', data })
    } catch {
      set({ status: 'error' })
    }
  }, [])

  // Reset sections when parcelle changes
  const [lastId, setLastId] = useState<string | undefined>()
  if (parcelle?.idParcelle !== lastId) {
    setLastId(parcelle?.idParcelle)
    setTransactions({ status: 'idle' })
    setDpes({ status: 'idle' })
    setRisques({ status: 'idle' })
    setPatrimoine({ status: 'idle' })
    setBatiments({ status: 'idle' })
    setCoproprietes({ status: 'idle' })
    setPermis({ status: 'idle' })
    setEtablissements({ status: 'idle' })
    setPoi({ status: 'idle' })
  }

  const addr = parcelle?.address
  const adresseLabel = addr ? [addr.numero, addr.voie].filter(Boolean).join(' ') : null
  const communeLabel = addr ? [addr.codePostal, addr.commune].filter(Boolean).join(' ') : null

  return (
    <div
      className="absolute top-0 right-0 h-full z-20 flex flex-col overflow-hidden bg-white"
      style={{ width: 380, borderLeft: '1px solid var(--slate-200)' }}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--slate-200)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            height: 22, padding: '0 8px', borderRadius: 11,
            background: 'var(--slate-900)', color: 'white',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
            fontVariant: 'all-small-caps',
          }}>
            PARCELLE
          </span>
          {parcelle && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--slate-500)' }}>
              {parcelle.idParcelle}
            </span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
            <button
              onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 6, background: 'transparent', border: 0,
                cursor: 'pointer', color: 'var(--slate-500)',
              }}
              title="Fermer"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {loading ? (
          <p style={{ fontSize: 14, color: 'var(--slate-500)' }}>Chargement…</p>
        ) : parcelle ? (
          <>
            <h2 style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.2, marginBottom: 2, color: 'var(--slate-900)' }}>
              {adresseLabel ?? `Parcelle ${parcelle.section} n°${parcelle.numero}`}
            </h2>
            <div style={{ fontSize: 13, color: 'var(--slate-500)' }}>
              {communeLabel ?? parcelle.communeCode}
            </div>
          </>
        ) : (
          <p style={{ fontSize: 14, color: 'var(--slate-500)' }}>Cliquez sur une parcelle</p>
        )}
      </div>

      {/* ── Scrollable body ─────���────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!loading && parcelle && (
          <>
            {/* Stats 2×2 */}
            <div style={{
              padding: '14px 20px', display: 'grid',
              gridTemplateColumns: '1fr 1fr', gap: '14px 24px',
              borderBottom: '1px solid var(--slate-200)',
            }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--slate-500)', letterSpacing: '0.02em', marginBottom: 3 }}>
                  Contenance
                </div>
                <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--slate-900)', fontVariantNumeric: 'tabular-nums' }}>
                  {parcelle.contenance ? parcelle.contenance.toLocaleString('fr-FR') : '—'}
                  {parcelle.contenance && <span style={{ fontSize: 13, color: 'var(--slate-500)', marginLeft: 3 }}>m²</span>}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--slate-500)', letterSpacing: '0.02em', marginBottom: 3 }}>
                  Section
                </div>
                <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--slate-900)', fontFamily: 'var(--font-mono)' }}>
                  {parcelle.section} <span style={{ fontSize: 15 }}>n°{parcelle.numero}</span>
                </div>
              </div>
            </div>

            {/* ── Transactions DVF ────────���─────────────────────── */}
            <Section
              title="Transactions DVF"
              state={transactions}
              onOpen={() => fetchSection<ParcelleTransaction>(
                `${API_URL}/api/parcelles/${parcelle.idParcelle}/transactions`,
                setTransactions
              )}
            >
              {(data) => (
                <div>
                  {data.items.map((t) => <TransactionRow key={t.idMutation} t={t} />)}
                </div>
              )}
            </Section>

            {/* ── DPE ─────��────────────────────────────────────── */}
            <Section
              title="Diagnostics DPE"
              state={dpes}
              onOpen={() => fetchSection<ParcelleDpe>(
                `${API_URL}/api/parcelles/${parcelle.idParcelle}/dpes`,
                setDpes
              )}
            >
              {(data) => {
                const best = data.items.find(d => d.etiquetteDpe)
                return (
                  <div>
                    {best?.etiquetteDpe && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, color: 'var(--slate-500)', marginBottom: 6 }}>
                          Performance énergétique
                        </div>
                        <DpeScale value={best.etiquetteDpe} />
                      </div>
                    )}
                    {data.items.map((d) => <DpeRow key={d.numeroDpe} d={d} />)}
                  </div>
                )
              }}
            </Section>

            {/* ── Risques ──��─────────────────────────────────────── */}
            <RisquesSection
              state={risques}
              onOpen={async () => {
                setRisques({ status: 'loading' })
                try {
                  const res = await fetch(`${API_URL}/api/parcelles/${parcelle.idParcelle}/risques`)
                  if (!res.ok) throw new Error()
                  const data: ParcelleRisques = await res.json()
                  setRisques({ status: 'done', data })
                } catch { setRisques({ status: 'error' }) }
              }}
            />

            {/* ── Patrimoine ABF ──────────────────────────────────── */}
            <PatrimoineSection
              state={patrimoine}
              onOpen={async () => {
                setPatrimoine({ status: 'loading' })
                try {
                  const res = await fetch(`${API_URL}/api/parcelles/${parcelle.idParcelle}/patrimoine`)
                  if (!res.ok) throw new Error()
                  const data: ParcellePatrimoine = await res.json()
                  setPatrimoine({ status: 'done', data })
                } catch { setPatrimoine({ status: 'error' }) }
              }}
            />

            {/* ── Bâtiments BDNB ──────────────────────────────────── */}
            <Section
              title="Bâtiments (BDNB)"
              state={batiments}
              onOpen={() => fetchSection<BatimentBdnb>(
                `${API_URL}/api/parcelles/${parcelle.idParcelle}/batiment`,
                setBatiments
              )}
            >
              {(data) => (
                <div>{data.items.map((b) => <BatimentCard key={b.batimentGroupeId} b={b} />)}</div>
              )}
            </Section>

            {/* ── Copropriétés RNIC ───────────��───────────────────── */}
            <Section
              title="Copropriété(s) RNIC"
              state={coproprietes}
              onOpen={() => fetchSection<Copropriete>(
                `${API_URL}/api/parcelles/${parcelle.idParcelle}/coproprietes`,
                setCoproprietes
              )}
            >
              {(data) => (
                <div>
                  {data.items.length === 0
                    ? <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>Aucune copropriété enregistrée.</p>
                    : data.items.map((c) => (
                      <div key={c.noImmatriculation} style={{ padding: '7px 0', borderBottom: '1px solid var(--slate-100)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--slate-800)' }}>{c.nom ?? c.noImmatriculation}</span>
                          {c.nbLotsTotal != null && <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>{c.nbLotsTotal} lots</span>}
                        </div>
                        {c.representantLegal && (
                          <p style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 2 }}>
                            {c.representantLegal}{c.typeSyndic ? ` · ${c.typeSyndic}` : ''}
                          </p>
                        )}
                      </div>
                    ))
                  }
                </div>
              )}
            </Section>

            {/* ── Permis Sitadel ───────��───────────────────────────── */}
            <Section
              title="Permis (Sitadel)"
              state={permis}
              onOpen={() => fetchSection<SitadelPermis>(
                `${API_URL}/api/parcelles/${parcelle.idParcelle}/permis`,
                setPermis
              )}
            >
              {(data) => (
                <div>
                  {data.items.length === 0
                    ? <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>Aucun permis enregistré.</p>
                    : data.items.map((p) => <PermisCard key={p.numDau} p={p} />)
                  }
                </div>
              )}
            </Section>

            {/* ── Établissements SIRENE ────────────────────────────── */}
            <Section
              title="Établissements (SIRENE)"
              state={etablissements}
              onOpen={() => fetchSection<SireneEtablissement>(
                `${API_URL}/api/parcelles/${parcelle.idParcelle}/entreprises`,
                setEtablissements
              )}
            >
              {(data) => (
                <div>
                  {data.items.length === 0
                    ? <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>Aucun établissement enregistré.</p>
                    : data.items.map((e) => <EtablissementRow key={e.siret} e={e} />)
                  }
                </div>
              )}
            </Section>

            {/* ── POI OSM ─────────────────────────────────────────── */}
            <PoiSection
              state={poi}
              onOpen={async () => {
                setPoi({ status: 'loading' })
                try {
                  const res = await fetch(`${API_URL}/api/parcelles/${parcelle.idParcelle}/poi`)
                  if (!res.ok) throw new Error()
                  const data: ParcellePoi = await res.json()
                  setPoi({ status: 'done', data })
                } catch { setPoi({ status: 'error' }) }
              }}
            />
          </>
        )}
      </div>

      {/* ── CTA ───────────��─────────────────────────────────────── */}
      {!loading && parcelle && (
        <div style={{ padding: 16, borderTop: '1px solid var(--slate-200)', flexShrink: 0 }}>
          <Link
            href={`/parcelle/${parcelle.idParcelle}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              height: 36, borderRadius: 6, fontSize: 14, fontWeight: 500,
              background: 'var(--slate-900)', color: 'white',
              textDecoration: 'none', width: '100%',
              transition: 'opacity .15s',
            }}
            className="hover:opacity-90"
          >
            Voir la fiche complète
            <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </div>
  )
}

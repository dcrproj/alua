'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { X, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import type { Parcelle, ParcelleTransaction, ParcelleTransactionLot, ParcelleDpe, SectionData, ParcelleRisques, RisqueDisplay } from '@/types/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

const DPE_COLORS: Record<string, string> = {
  A: '#319834', B: '#33CC33', C: '#CACC32',
  D: '#FBCA01', E: '#FB9A00', F: '#FB6A01', G: '#E9161C',
}

function DpeBadge({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded font-bold text-white text-xs"
      style={{ backgroundColor: DPE_COLORS[label] ?? '#888' }}
    >
      {label}
    </span>
  )
}

function formatPrice(v: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}

function formatDate(iso: string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', opts ?? { day: 'numeric', month: 'short', year: 'numeric' })
}

function UpdatedAt({ date }: { date: string | null }) {
  if (!date) return null
  return (
    <span className="text-xs text-muted-foreground/60 ml-auto">
      màj {formatDate(date, { month: 'short', year: 'numeric' })}
    </span>
  )
}

// ---------- Transactions ----------

function LotRow({ lot }: { lot: ParcelleTransactionLot }) {
  const surface = lot.surfaceBati ?? lot.surfaceCarrez ?? lot.surfaceTerrain
  return (
    <div className="flex items-baseline justify-between text-xs text-muted-foreground py-0.5">
      <span>{lot.typeLocal ?? 'Lot'}</span>
      <span className="tabular-nums">
        {[surface ? `${surface} m²` : null, lot.nombrePieces ? `${lot.nombrePieces} p.` : null]
          .filter(Boolean).join(' · ')}
      </span>
    </div>
  )
}

function TransactionCard({ t }: { t: ParcelleTransaction }) {
  const [open, setOpen] = useState(false)
  const mainLot = t.lots?.find(
    (l) => l.typeLocal && l.typeLocal !== 'Dépendance' && (l.surfaceBati ?? l.surfaceCarrez)
  ) ?? t.lots?.[0]
  const surface = mainLot?.surfaceBati ?? mainLot?.surfaceCarrez ?? mainLot?.surfaceTerrain
  const prixM2 = surface && surface > 0 && t.valeurFonciere
    ? Math.round(t.valeurFonciere / surface) : null
  const nbLots = t.lots?.length ?? 0

  return (
    <div className="bg-muted/50 rounded-md text-sm overflow-hidden">
      <button className="w-full text-left px-3 py-2" onClick={() => nbLots > 1 && setOpen(!open)}>
        <div className="flex justify-between items-baseline">
          <span className="font-medium">{t.valeurFonciere ? formatPrice(t.valeurFonciere) : '—'}</span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{formatDate(t.date, { month: 'short', year: 'numeric' })}</span>
            {nbLots > 1 && <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {[mainLot?.typeLocal, surface ? `${surface} m²` : null, prixM2 ? `${formatPrice(prixM2)}/m²` : null]
            .filter(Boolean).join(' · ')}
          {nbLots > 1 && !open && <span className="ml-1 text-muted-foreground/60">+{nbLots - 1} lot{nbLots > 2 ? 's' : ''}</span>}
        </p>
      </button>
      {open && t.lots && (
        <div className="px-3 pb-2 border-t border-border/50 pt-2 space-y-0.5">
          {t.lots.map((lot, i) => <LotRow key={i} lot={lot} />)}
        </div>
      )}
    </div>
  )
}

// ---------- DPE ----------

function DpeCard({ d }: { d: ParcelleDpe }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-muted/50 rounded-md text-sm overflow-hidden">
      <button className="w-full text-left px-3 py-2" onClick={() => setOpen(!open)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {d.etiquetteDpe && <DpeBadge label={d.etiquetteDpe} />}
            <span className="text-muted-foreground text-xs">
              {[d.typeBatiment, d.surface ? `${d.surface} m²` : null].filter(Boolean).join(' · ')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{formatDate(d.date, { month: 'short', year: 'numeric' })}</span>
            <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-border/50 pt-2 space-y-1.5 text-xs text-muted-foreground">
          {d.adresse && <Row label="Adresse" value={d.adresse} />}
          {d.periodeConstruction && <Row label="Construction" value={d.periodeConstruction} />}
          {d.energieChauffage && <Row label="Chauffage" value={d.energieChauffage} />}
          {d.consoPrimaire !== null && <Row label="Conso primaire" value={`${Math.round(d.consoPrimaire)} kWhEP/m²/an`} />}
          {d.emissionGes !== null && (
            <div className="flex justify-between items-center">
              <span>Émissions GES</span>
              <div className="flex items-center gap-1.5">
                <span className="text-foreground">{Math.round(d.emissionGes)} kgCO₂/m²/an</span>
                {d.etiquetteGes && <DpeBadge label={d.etiquetteGes} />}
              </div>
            </div>
          )}
          {d.dateFinValidite && <Row label="Valide jusqu'au" value={formatDate(d.dateFinValidite)} />}
          <Row label="N° DPE" value={<span className="font-mono text-foreground/70">{d.numeroDpe}</span>} />
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  )
}

// ---------- Risques ----------

type RisquesState = { status: 'idle' } | { status: 'loading' } | { status: 'done'; data: ParcelleRisques } | { status: 'error' }

const NIVEAU_COLORS: Record<string, string> = {
  'Existant':           'text-orange-700 font-medium',
  'Faible':             'text-yellow-700',
  'Moyen':              'text-orange-600 font-medium',
  'Modéré':             'text-orange-600 font-medium',
  'Significatif':       'text-red-700 font-medium',
  'Important':          'text-red-700 font-medium',
  'Très important':     'text-red-800 font-bold',
  'Fort':               'text-red-700 font-medium',
  'Pas de risque connu':'text-green-700',
  'Non renseigné':      'text-muted-foreground/50',
}

function niveauColor(niveau: string) {
  return NIVEAU_COLORS[niveau] ?? 'text-muted-foreground'
}

function RisqueRow({ r }: { r: RisqueDisplay }) {
  return (
    <div className="py-1.5 border-b border-border/20 last:border-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-foreground/90 leading-tight">{r.libelle}</span>
        <span className={`text-xs shrink-0 ${niveauColor(r.adresse)}`}>{r.adresse}</span>
      </div>
      {r.commune !== r.adresse && (
        <p className="text-xs text-muted-foreground/60 mt-0.5 text-right">
          commune : <span className={niveauColor(r.commune)}>{r.commune}</span>
        </p>
      )}
    </div>
  )
}

function RisquesSection({ state, onOpen }: { state: RisquesState; onOpen: () => void }) {
  const [open, setOpen] = useState(false)

  const significantCount = state.status === 'done'
    ? state.data.risques.filter(r => r.adresse !== 'Pas de risque connu' && r.adresse !== 'Non renseigné').length
    : 0

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && state.status === 'idle') onOpen()
  }

  return (
    <div className="border-t border-border/50">
      <button
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/30 transition-colors text-sm font-medium"
        onClick={toggle}
      >
        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} />
        <span>Risques</span>
        {state.status === 'done' && (
          <span className="text-xs text-muted-foreground font-normal">
            ({significantCount} à l&apos;adresse)
          </span>
        )}
        {state.status === 'loading' && <span className="text-xs text-muted-foreground font-normal ml-1">…</span>}
      </button>

      {open && (
        <div className="px-4 pb-4">
          {state.status === 'loading' && <p className="text-xs text-muted-foreground">Chargement…</p>}
          {state.status === 'error' && <p className="text-xs text-destructive">Erreur de chargement.</p>}
          {state.status === 'done' && (
            <>
              <p className="text-xs text-muted-foreground/60 uppercase tracking-wide font-medium mb-1">Naturels</p>
              {state.data.risques.filter(r => r.type === 'naturel').map(r => (
                <RisqueRow key={r.id} r={r} />
              ))}
              <p className="text-xs text-muted-foreground/60 uppercase tracking-wide font-medium mt-3 mb-1">Technologiques</p>
              {state.data.risques.filter(r => r.type === 'technologique').map(r => (
                <RisqueRow key={r.id} r={r} />
              ))}
              <p className="text-xs text-muted-foreground/50 mt-3">
                Source :{' '}
                <a href="https://www.georisques.gouv.fr" target="_blank" rel="noopener noreferrer" className="hover:underline">
                  georisques.gouv.fr
                </a>
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ---------- Section générique ----------

type SectionState<T> = { status: 'idle' } | { status: 'loading' } | { status: 'done'; data: SectionData<T> } | { status: 'error' }

function Section<T>({
  title,
  state,
  onOpen,
  children,
}: {
  title: string
  state: SectionState<T>
  onOpen: () => void
  children: (data: SectionData<T>) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && state.status === 'idle') onOpen()
  }

  return (
    <div className="border-t border-border/50">
      <button
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/30 transition-colors text-sm font-medium"
        onClick={toggle}
      >
        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} />
        <span>{title}</span>
        {state.status === 'done' && (
          <>
            <span className="text-xs text-muted-foreground font-normal">({state.data.items.length})</span>
            <UpdatedAt date={state.data.updatedAt} />
          </>
        )}
        {state.status === 'loading' && <span className="text-xs text-muted-foreground font-normal ml-1">…</span>}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          {state.status === 'loading' && (
            <p className="text-xs text-muted-foreground">Chargement…</p>
          )}
          {state.status === 'error' && (
            <p className="text-xs text-destructive">Erreur de chargement.</p>
          )}
          {state.status === 'done' && state.data.items.length === 0 && (
            <p className="text-xs text-muted-foreground">Aucune donnée disponible.</p>
          )}
          {state.status === 'done' && state.data.items.length > 0 && children(state.data)}
        </div>
      )}
    </div>
  )
}

// ---------- Panel principal ----------

interface Props {
  parcelle: Parcelle | null
  loading: boolean
  onClose: () => void
}

export default function InfoPanel({ parcelle, loading, onClose }: Props) {
  const [transactions, setTransactions] = useState<SectionState<ParcelleTransaction>>({ status: 'idle' })
  const [dpes, setDpes] = useState<SectionState<ParcelleDpe>>({ status: 'idle' })
  const [risques, setRisques] = useState<RisquesState>({ status: 'idle' })

  const fetchSection = useCallback(async <T,>(
    url: string,
    set: (s: SectionState<T>) => void
  ) => {
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
  const prevId = parcelle?.idParcelle
  const [lastId, setLastId] = useState<string | undefined>()
  if (prevId !== lastId) {
    setLastId(prevId)
    setTransactions({ status: 'idle' })
    setDpes({ status: 'idle' })
    setRisques({ status: 'idle' })
  }

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-white shadow-xl z-20 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <h2 className="font-semibold text-sm">Parcelle</h2>
        <div className="flex items-center gap-1">
          {parcelle && (
            <Link
              href={`/parcelle/${parcelle.idParcelle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors border rounded px-2 py-1 mr-1"
            >
              Voir la fiche <ExternalLink className="w-3 h-3" />
            </Link>
          )}
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
            Chargement…
          </div>
        )}

        {!loading && parcelle && (
          <>
            {/* Info de base */}
            <div className="px-4 py-3">
              <p className="font-mono text-sm font-medium">{parcelle.idParcelle}</p>
              {parcelle.address && (
                <p className="text-sm text-muted-foreground mt-1">
                  {[parcelle.address.numero, parcelle.address.voie].filter(Boolean).join(' ')}
                  {parcelle.address.codePostal && `, ${parcelle.address.codePostal}`}
                  {parcelle.address.commune && ` ${parcelle.address.commune}`}
                </p>
              )}
              {parcelle.contenance && (
                <p className="text-xs text-muted-foreground mt-0.5">{parcelle.contenance} m² de contenance</p>
              )}
            </div>

            {/* Section Transactions */}
            <Section
              title="Transactions DVF"
              state={transactions}
              onOpen={() => fetchSection<ParcelleTransaction>(
                `${API_URL}/api/parcelles/${parcelle.idParcelle}/transactions`,
                setTransactions
              )}
            >
              {(data) => (
                <div className="space-y-2">
                  {data.items.map((t) => <TransactionCard key={t.idMutation} t={t} />)}
                </div>
              )}
            </Section>

            {/* Section DPE */}
            <Section
              title="DPE"
              state={dpes}
              onOpen={() => fetchSection<ParcelleDpe>(
                `${API_URL}/api/parcelles/${parcelle.idParcelle}/dpes`,
                setDpes
              )}
            >
              {(data) => (
                <div className="space-y-2">
                  {data.items.map((d) => <DpeCard key={d.numeroDpe} d={d} />)}
                </div>
              )}
            </Section>

            {/* Section Risques */}
            <RisquesSection
              state={risques}
              onOpen={async () => {
                setRisques({ status: 'loading' })
                try {
                  const res = await fetch(`${API_URL}/api/parcelles/${parcelle.idParcelle}/risques`)
                  if (!res.ok) throw new Error()
                  const data: ParcelleRisques = await res.json()
                  setRisques({ status: 'done', data })
                } catch {
                  setRisques({ status: 'error' })
                }
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}

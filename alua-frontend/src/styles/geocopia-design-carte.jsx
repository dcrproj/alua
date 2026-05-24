// Page Carte — 3 variantes d'InfoPanel partagent le même header + map
const { Icons, CadastreMap } = window;

// — Données de la parcelle sélectionnée
const PARCELLE = {
  id: 'AK 0124',
  address: '12 rue de la Roquette',
  postal: '75011 Paris',
  surface: 287,
  surfaceBatie: 1632,
  etages: 6,
  lots: 14,
  annee: 1885,
  dpe: 'D',
  ges: 'C',
  dpeVal: 180,
  prix: 4250000,
  prixDate: 'mars 2023',
  prixM2: 13180,
  prixMoyen: 11850,
};

// — Header (barre du haut)
const MapHeader = ({ logoStyle = 'wordmark' }) => (
  <div style={{
    height: 56, background: 'white', borderBottom: '1px solid var(--slate-200)',
    display: 'flex', alignItems: 'center', padding: '0 20px', gap: 20, position: 'relative', zIndex: 4,
  }}>
    {/* Logo */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 4 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 4, background: 'var(--slate-900)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--amber-500)',
        fontSize: 15, letterSpacing: '-0.04em',
      }}>G</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17,
        letterSpacing: '-0.02em', color: 'var(--slate-900)',
      }}>geocopia</div>
    </div>

    {/* Recherche */}
    <div className="gc-input" style={{ flex: 1, maxWidth: 560, height: 38 }}>
      <Icons.Search size={15} color="var(--slate-400)"/>
      <input placeholder="Adresse, parcelle, propriétaire, SIRET…" defaultValue="12 rue de la Roquette, 75011 Paris"/>
      <span className="gc-chip gc-mono" style={{ fontSize: 11 }}>⌘K</span>
    </div>

    {/* Nav links */}
    <nav style={{ display: 'flex', gap: 4, fontSize: 14, color: 'var(--slate-600)' }}>
      <button className="gc-btn gc-btn-ghost gc-btn-sm" style={{ background: 'var(--slate-100)', color: 'var(--slate-900)' }}>Carte</button>
      <button className="gc-btn gc-btn-ghost gc-btn-sm">Recherche</button>
      <button className="gc-btn gc-btn-ghost gc-btn-sm">Mes parcelles</button>
      <button className="gc-btn gc-btn-ghost gc-btn-sm">API</button>
    </nav>

    <div style={{ flex: '0 0 1px', height: 20, background: 'var(--slate-200)' }}/>

    <button className="gc-btn gc-btn-ghost gc-btn-sm" title="Notifications">
      <Icons.Bell size={16}/>
    </button>
    <div style={{ width: 30, height: 30, borderRadius: 15, background: 'var(--slate-900)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, color: 'white', fontWeight: 600 }}>JM</div>
  </div>
);

// — Sélecteur de couches (overlay sur la carte)
const LayerSwitcher = ({ position = 'top-left' }) => {
  const [open, setOpen] = React.useState(true);
  const layers = [
    { id: 'cadastre', label: 'Cadastre', on: true },
    { id: 'dvf', label: 'Mutations DVF', on: true },
    { id: 'dpe', label: 'Étiquettes DPE', on: false },
    { id: 'risques', label: 'Risques naturels', on: false },
    { id: 'plu', label: 'PLU / zonage', on: false },
    { id: 'entreprises', label: 'Entreprises', on: false },
  ];
  const pos = position === 'top-left'
    ? { top: 16, left: 16 } : { top: 16, right: 16 };
  return (
    <div style={{
      position: 'absolute', ...pos, zIndex: 3,
      background: 'white', border: '1px solid var(--slate-200)',
      borderRadius: 'var(--radius)', width: 220,
      boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
    }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: '100%', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8,
          background: 'transparent', border: 0, color: 'var(--slate-900)', fontWeight: 600, fontSize: 13 }}>
        <Icons.Layers size={14}/>
        <span style={{ flex: 1, textAlign: 'left' }}>Couches</span>
        {open ? <Icons.ChevronUp size={14}/> : <Icons.ChevronDown size={14}/>}
      </button>
      {open && (
        <>
          <div className="gc-divider"/>
          <div style={{ padding: 4 }}>
            {layers.map(l => (
              <label key={l.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px',
                fontSize: 13, color: 'var(--slate-700)', cursor: 'pointer', borderRadius: 4,
                background: l.on ? 'var(--slate-50)' : 'transparent',
              }}>
                <input type="checkbox" defaultChecked={l.on} style={{ accentColor: 'var(--slate-900)' }}/>
                {l.label}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const MapControls = () => (
  <div style={{ position: 'absolute', bottom: 20, right: 20, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 3 }}>
    <div style={{ background: 'white', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <button className="gc-btn gc-btn-ghost" style={{ width: 36, height: 36, borderRadius: 0, padding: 0 }}><Icons.Plus size={16}/></button>
      <div style={{ height: 1, background: 'var(--slate-200)' }}/>
      <button className="gc-btn gc-btn-ghost" style={{ width: 36, height: 36, borderRadius: 0, padding: 0 }}><Icons.Minus size={16}/></button>
    </div>
    <button className="gc-btn gc-btn-secondary" style={{ width: 36, height: 36, padding: 0, justifyContent: 'center' }}>
      <Icons.Compass size={16}/>
    </button>
  </div>
);

const Scalebar = () => (
  <div style={{ position: 'absolute', bottom: 20, left: 20, display: 'flex', flexDirection: 'column', gap: 4,
    background: 'rgba(255,255,255,0.85)', padding: '6px 10px', borderRadius: 4, fontSize: 11,
    fontFamily: 'var(--font-mono)', color: 'var(--slate-600)', backdropFilter: 'blur(6px)', zIndex: 3 }}>
    <div style={{ width: 80, height: 4, background: 'linear-gradient(to right, var(--slate-900) 0 50%, white 50% 100%)', border: '1px solid var(--slate-900)' }}/>
    <span>50 m · 1:2 500</span>
  </div>
);

// — Stat ligne (réutilisé)
const Stat = ({ label, value, unit, hint }) => (
  <div>
    <div className="gc-stat-label">{label}</div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
      <span className="gc-stat-val gc-tabular">{value}</span>
      {unit && <span style={{ color: 'var(--slate-500)', fontSize: 13 }}>{unit}</span>}
    </div>
    {hint && <div style={{ fontSize: 11, color: 'var(--slate-500)', marginTop: 2 }}>{hint}</div>}
  </div>
);

// — Échelle DPE
const DpeScale = ({ value = 'D', kwh = 180 }) => {
  const grades = ['A','B','C','D','E','F','G'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {grades.map(g => (
        <div key={g} className={`gc-dpe gc-dpe-${g}`} style={{
          width: 'auto', height: 22, padding: '0 8px', justifyContent: 'space-between',
          borderRadius: 3, opacity: g === value ? 1 : 0.35, transform: g === value ? 'scaleX(1)' : 'scaleX(0.75)',
          transformOrigin: 'left', transition: 'all .2s',
        }}>
          <span style={{ fontSize: 11 }}>{g}</span>
          {g === value && <span className="gc-mono" style={{ fontSize: 10, fontWeight: 600 }}>{kwh} kWh/m²·an</span>}
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// VARIANTE A — Sidebar latérale permanente (Linear-style)
// ─────────────────────────────────────────────────────────────
const InfoPanelLateral = ({ right }) => (
  <div style={{
    width: 380, background: 'white',
    borderLeft: right ? '1px solid var(--slate-200)' : 'none',
    borderRight: right ? 'none' : '1px solid var(--slate-200)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  }}>
    {/* Header */}
    <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--slate-200)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span className="gc-chip gc-chip-slate gc-mono">PARCELLE</span>
        <span className="gc-mono" style={{ fontSize: 12, color: 'var(--slate-500)' }}>{PARCELLE.id}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
          <button className="gc-btn gc-btn-ghost gc-btn-sm" style={{ padding: '0 6px' }}><Icons.Bookmark size={14}/></button>
          <button className="gc-btn gc-btn-ghost gc-btn-sm" style={{ padding: '0 6px' }}><Icons.Share size={14}/></button>
          <button className="gc-btn gc-btn-ghost gc-btn-sm" style={{ padding: '0 6px' }}><Icons.X size={14}/></button>
        </div>
      </div>
      <h2 style={{ fontSize: 19, marginBottom: 2 }}>{PARCELLE.address}</h2>
      <div style={{ color: 'var(--slate-500)', fontSize: 13 }}>{PARCELLE.postal} · 11ᵉ arrondissement</div>
    </div>

    {/* Stats key */}
    <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
      <Stat label="Surface parcelle" value="287" unit="m²"/>
      <Stat label="Surface bâtie" value="1 632" unit="m²"/>
      <Stat label="Bâti" value={PARCELLE.annee} hint={`${PARCELLE.etages} étages · ${PARCELLE.lots} lots`}/>
      <Stat label="Dernière transaction" value="4,25" unit="M€" hint={PARCELLE.prixDate}/>
    </div>

    <div className="gc-divider" style={{ margin: '0 20px' }}/>

    {/* DPE */}
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span className="gc-section-h">Performance énergétique</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--slate-500)', fontStyle: 'italic' }}>établi 2021</span>
      </div>
      <DpeScale value="D" kwh={180}/>
    </div>

    <div className="gc-divider" style={{ margin: '0 20px' }}/>

    {/* Dernières mutations */}
    <div style={{ padding: '16px 20px', flex: 1, overflow: 'auto' }} className="gc-noscroll">
      <div className="gc-section-h" style={{ marginBottom: 10 }}>Dernières mutations DVF</div>
      {[
        { date: 'Mars 2023', type: 'Appartement T3 · Lot 8', surf: '72 m²', prix: '948 000 €', m2: '13 167 €/m²' },
        { date: 'Sept. 2022', type: 'Appartement T2 · Lot 4', surf: '48 m²', prix: '612 000 €', m2: '12 750 €/m²' },
        { date: 'Juin 2021', type: 'Immeuble entier', surf: '1 632 m²', prix: '4 250 000 €', m2: '—' },
        { date: 'Jan. 2019', type: 'Appartement T4 · Lot 11', surf: '95 m²', prix: '1 045 000 €', m2: '11 000 €/m²' },
      ].map((m, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '10px 0',
          borderBottom: i < 3 ? '1px solid var(--slate-100)' : '0' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{m.type}</div>
            <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>{m.date} · {m.surf}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="gc-mono" style={{ fontSize: 13, fontWeight: 600 }}>{m.prix}</div>
            <div className="gc-mono" style={{ fontSize: 11, color: 'var(--slate-500)' }}>{m.m2}</div>
          </div>
        </div>
      ))}
    </div>

    {/* CTA */}
    <div style={{ padding: 16, borderTop: '1px solid var(--slate-200)', display: 'flex', gap: 8 }}>
      <button className="gc-btn gc-btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
        Voir la fiche complète
        <Icons.ArrowRight size={14}/>
      </button>
      <button className="gc-btn gc-btn-secondary"><Icons.Download size={14}/></button>
    </div>
  </div>
);

const CarteLateral = () => (
  <div className="gc-app" style={{ display: 'flex', flexDirection: 'column' }}>
    <MapHeader/>
    <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <CadastreMap width="100%" height="100%" selectedId="AK-124"/>
        <LayerSwitcher position="top-left"/>
        <MapControls/>
        <Scalebar/>
      </div>
      <div style={{ display: 'flex' }}>
        <InfoPanelLateral right/>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// VARIANTE B — Floating card (carte plein-écran)
// ─────────────────────────────────────────────────────────────
const InfoPanelFloating = () => (
  <div style={{
    position: 'absolute', top: 16, right: 16, width: 340, zIndex: 3,
    background: 'white', border: '1px solid var(--slate-200)',
    borderRadius: 'var(--radius)',
    boxShadow: '0 4px 16px rgba(15,23,42,0.08), 0 1px 3px rgba(15,23,42,0.04)',
    overflow: 'hidden', maxHeight: 'calc(100% - 32px)', display: 'flex', flexDirection: 'column',
  }}>
    <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 10,
      borderBottom: '1px solid var(--slate-100)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span className="gc-mono" style={{ fontSize: 11, color: 'var(--amber-700)', fontWeight: 600,
            background: 'var(--amber-50)', padding: '2px 6px', borderRadius: 3, border: '1px solid #fde68a' }}>
            {PARCELLE.id}
          </span>
        </div>
        <h2 style={{ fontSize: 17, marginBottom: 2 }}>{PARCELLE.address}</h2>
        <div style={{ color: 'var(--slate-500)', fontSize: 12 }}>{PARCELLE.postal}</div>
      </div>
      <button className="gc-btn gc-btn-ghost gc-btn-sm" style={{ padding: '0 6px', margin: '-4px -4px 0 0' }}>
        <Icons.X size={14}/>
      </button>
    </div>

    {/* Stats inline */}
    <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 12px' }}>
      <div>
        <div style={{ fontSize: 10, color: 'var(--slate-500)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Surface</div>
        <div className="gc-mono gc-tabular" style={{ fontWeight: 600, fontSize: 14 }}>287 m²</div>
      </div>
      <div>
        <div style={{ fontSize: 10, color: 'var(--slate-500)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Bâti</div>
        <div className="gc-mono gc-tabular" style={{ fontWeight: 600, fontSize: 14 }}>1885</div>
      </div>
      <div>
        <div style={{ fontSize: 10, color: 'var(--slate-500)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Lots</div>
        <div className="gc-mono gc-tabular" style={{ fontWeight: 600, fontSize: 14 }}>14</div>
      </div>
    </div>

    {/* DPE compact */}
    <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div className="gc-dpe gc-dpe-D" style={{ width: 36, height: 36, fontSize: 18 }}>D</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>DPE · établi 2021</div>
        <div className="gc-mono" style={{ fontSize: 12, fontWeight: 500 }}>180 kWh/m²·an</div>
      </div>
      <div className="gc-dpe gc-dpe-C" style={{ width: 28, height: 28, fontSize: 13 }}>C</div>
      <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>GES</div>
    </div>

    <div style={{ background: 'var(--slate-50)', padding: '12px 16px', borderTop: '1px solid var(--slate-100)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--slate-900)' }}>
          4,25 M€
        </span>
        <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>dernière vente</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--slate-600)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icons.TrendingUp size={11} color="var(--dpe-a)"/>
        <span><b style={{ color: 'var(--slate-900)' }}>13 180 €/m²</b> · +11% vs. quartier</span>
      </div>
    </div>

    {/* Sections collapsibles teasers */}
    <div style={{ padding: '4px 0' }}>
      {[
        { i: <Icons.History size={14}/>, label: '8 transactions DVF', n: '2014→2023' },
        { i: <Icons.AlertTriangle size={14}/>, label: '2 risques identifiés', n: 'argiles, sismique' },
        { i: <Icons.Briefcase size={14}/>, label: '3 entreprises domiciliées', n: 'SIREN' },
        { i: <Icons.MapPin size={14}/>, label: '12 POI à proximité', n: '< 500 m' },
      ].map((row, i) => (
        <button key={i} style={{
          width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
          background: 'transparent', border: 0, borderTop: i ? '1px solid var(--slate-100)' : '0',
          color: 'var(--slate-700)', fontSize: 13, textAlign: 'left',
        }}>
          <span style={{ color: 'var(--slate-500)' }}>{row.i}</span>
          <span style={{ flex: 1, fontWeight: 500, color: 'var(--slate-900)' }}>{row.label}</span>
          <span className="gc-mono" style={{ fontSize: 11, color: 'var(--slate-500)' }}>{row.n}</span>
          <Icons.ChevronRight size={14} color="var(--slate-400)"/>
        </button>
      ))}
    </div>

    <div style={{ padding: 12, borderTop: '1px solid var(--slate-200)' }}>
      <button className="gc-btn gc-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
        Fiche complète
        <Icons.ArrowRight size={14}/>
      </button>
    </div>
  </div>
);

const CarteFloating = () => (
  <div className="gc-app" style={{ display: 'flex', flexDirection: 'column' }}>
    <MapHeader/>
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <CadastreMap width="100%" height="100%" selectedId="AK-124" showPois={true}/>
      <LayerSwitcher position="top-left"/>
      <InfoPanelFloating/>
      <MapControls/>
      <Scalebar/>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// VARIANTE C — Bottom sheet (mobile-friendly desktop)
// ─────────────────────────────────────────────────────────────
const InfoPanelBottomSheet = () => (
  <div style={{
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 3,
    background: 'white', borderTop: '1px solid var(--slate-200)',
    boxShadow: '0 -4px 16px rgba(15,23,42,0.06)',
  }}>
    {/* drag handle */}
    <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 2px' }}>
      <div style={{ width: 36, height: 4, background: 'var(--slate-300)', borderRadius: 2 }}/>
    </div>

    <div style={{ padding: '6px 24px 18px', display: 'grid',
      gridTemplateColumns: '1.4fr 1px 1.2fr 1px 1fr 1px 1fr 1px 0.9fr',
      gap: 20, alignItems: 'center' }}>
      {/* identité */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span className="gc-mono" style={{ fontSize: 11, color: 'var(--amber-700)', fontWeight: 600 }}>
            {PARCELLE.id}
          </span>
          <span className="gc-chip" style={{ fontSize: 10, height: 18 }}>Copropriété</span>
        </div>
        <h2 style={{ fontSize: 18 }}>{PARCELLE.address}</h2>
        <div style={{ color: 'var(--slate-500)', fontSize: 12 }}>{PARCELLE.postal} · 11ᵉ</div>
      </div>

      <div style={{ height: 50, background: 'var(--slate-200)' }}/>

      {/* surface + bâti */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="gc-stat-label">Parcelle</span>
          <span className="gc-mono" style={{ fontWeight: 600, fontSize: 14 }}>287 m²</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="gc-stat-label">Bâti</span>
          <span className="gc-mono" style={{ fontWeight: 600, fontSize: 14 }}>1 632 m²</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="gc-stat-label">Lots</span>
          <span className="gc-mono" style={{ fontWeight: 600, fontSize: 14 }}>14 · 6 étages</span>
        </div>
      </div>

      <div style={{ height: 50, background: 'var(--slate-200)' }}/>

      {/* DPE / GES */}
      <div>
        <div className="gc-stat-label" style={{ marginBottom: 6 }}>DPE / GES</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="gc-dpe gc-dpe-D" style={{ width: 32, height: 32, fontSize: 15 }}>D</div>
          <div className="gc-dpe gc-dpe-C" style={{ width: 32, height: 32, fontSize: 15 }}>C</div>
          <div style={{ fontSize: 11, color: 'var(--slate-500)', marginLeft: 2 }}>
            180<br/>kWh/m²
          </div>
        </div>
      </div>

      <div style={{ height: 50, background: 'var(--slate-200)' }}/>

      {/* prix */}
      <div>
        <div className="gc-stat-label">Dernière mutation</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600 }}>4,25 M€</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--slate-500)' }}>
          <span className="gc-mono">13 180 €/m²</span>
          <Icons.TrendingUp size={11} color="var(--dpe-a)"/>
          <span style={{ color: 'var(--dpe-a)' }}>+11%</span>
        </div>
      </div>

      <div style={{ height: 50, background: 'var(--slate-200)' }}/>

      {/* CTA */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button className="gc-btn gc-btn-primary" style={{ justifyContent: 'center' }}>
          Fiche complète
          <Icons.ArrowRight size={14}/>
        </button>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="gc-btn gc-btn-secondary gc-btn-sm" style={{ flex: 1, padding: 0, justifyContent: 'center' }}>
            <Icons.Bookmark size={13}/>
          </button>
          <button className="gc-btn gc-btn-secondary gc-btn-sm" style={{ flex: 1, padding: 0, justifyContent: 'center' }}>
            <Icons.Share size={13}/>
          </button>
          <button className="gc-btn gc-btn-secondary gc-btn-sm" style={{ flex: 1, padding: 0, justifyContent: 'center' }}>
            <Icons.Download size={13}/>
          </button>
        </div>
      </div>
    </div>

    {/* Mini-tabs preview */}
    <div style={{ display: 'flex', gap: 0, padding: '0 24px', borderTop: '1px solid var(--slate-100)',
      background: 'var(--slate-50)' }}>
      {[
        { l: 'Mutations DVF', n: 8 },
        { l: 'Historique', n: 12 },
        { l: 'Risques', n: 2 },
        { l: 'Entreprises', n: 3 },
        { l: 'POI', n: 12 },
        { l: 'PLU', n: null },
      ].map((t, i) => (
        <button key={i} style={{
          padding: '10px 16px', background: 'transparent', border: 0, borderBottom: i === 0 ? '2px solid var(--slate-900)' : '2px solid transparent',
          fontWeight: i === 0 ? 600 : 400, fontSize: 13, color: i === 0 ? 'var(--slate-900)' : 'var(--slate-600)',
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: -1,
        }}>
          {t.l}
          {t.n != null && <span className="gc-mono" style={{ fontSize: 11, color: 'var(--slate-500)' }}>{t.n}</span>}
        </button>
      ))}
    </div>
  </div>
);

const CarteBottomSheet = () => (
  <div className="gc-app" style={{ display: 'flex', flexDirection: 'column' }}>
    <MapHeader/>
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <CadastreMap width="100%" height="100%" selectedId="AK-124" showPois={true}/>
      <LayerSwitcher position="top-left"/>
      <InfoPanelBottomSheet/>
      <MapControls/>
      <Scalebar/>
    </div>
  </div>
);

Object.assign(window, { CarteLateral, CarteFloating, CarteBottomSheet });

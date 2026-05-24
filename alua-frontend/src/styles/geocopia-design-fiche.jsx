// Fiche Parcelle — 2 variantes (dense + aérée)
const { Icons, CadastreMap } = window;

// — Mini map locator (réutilisé dans header)
const MiniMap = ({ width = 320, height = 180 }) => (
  <svg width={width} height={height} viewBox="0 0 320 180"
    style={{ display: 'block', background: '#f5f0e4', borderRadius: 4 }}>
    <pattern id="mm-grid" width="16" height="16" patternUnits="userSpaceOnUse">
      <path d="M16 0H0V16" fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="0.5"/>
    </pattern>
    <rect width="320" height="180" fill="url(#mm-grid)"/>
    <path d="M0 90 L320 80" stroke="#ece5d6" strokeWidth="16"/>
    <path d="M150 0 L160 180" stroke="#ece5d6" strokeWidth="14"/>
    <g fill="rgba(255,255,255,0.6)" stroke="#94a3b8" strokeWidth="0.5">
      <rect x="20" y="20" width="60" height="40"/>
      <rect x="85" y="20" width="60" height="40"/>
      <rect x="170" y="22" width="65" height="38"/>
      <rect x="240" y="22" width="60" height="38"/>
      <rect x="20" y="95" width="60" height="40"/>
      <rect x="85" y="95" width="60" height="40"/>
      <rect x="170" y="100" width="65" height="38"/>
      <rect x="240" y="100" width="60" height="38"/>
    </g>
    <rect x="170" y="100" width="65" height="38" fill="rgba(217,119,6,0.28)" stroke="#d97706" strokeWidth="1.4"/>
    <g fill="rgba(30,41,59,0.18)">
      <rect x="172" y="103" width="60" height="20"/>
    </g>
    <g transform="translate(202,119)">
      <circle r="18" fill="rgba(217,119,6,0.15)"/>
      <circle r="5" fill="#d97706" stroke="white" strokeWidth="2"/>
    </g>
  </svg>
);

// — Breadcrumb
const Breadcrumb = () => (
  <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--slate-500)' }}>
    <a style={{ cursor: 'pointer' }}>Carte</a>
    <span style={{ color: 'var(--slate-400)' }}>/</span>
    <a style={{ cursor: 'pointer' }}>Haute-Garonne (31)</a>
    <span style={{ color: 'var(--slate-400)' }}>/</span>
    <a style={{ cursor: 'pointer' }}>Saint-Orens-de-Gameville</a>
    <span style={{ color: 'var(--slate-400)' }}>/</span>
    <span className="gc-mono" style={{ color: 'var(--slate-700)' }}>31506000BI0004</span>
  </nav>
);

// — DPE bar (horizontale)
const DpeBarH = ({ value = 'D', kwh = 180 }) => {
  const grades = [
    { g:'A', max:50 }, { g:'B', max:90 }, { g:'C', max:150 }, { g:'D', max:230 },
    { g:'E', max:330 }, { g:'F', max:450 }, { g:'G', max:Infinity },
  ];
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 2, marginBottom: 8 }}>
        {grades.map(({g}) => (
          <div key={g} className={`gc-dpe gc-dpe-${g}`} style={{
            flex: 1, height: 36, fontSize: 16, opacity: g === value ? 1 : 0.32,
            transform: g === value ? 'scale(1.1)' : 'scale(1)', borderRadius: 4,
            transition: 'all .2s', position: 'relative', zIndex: g === value ? 2 : 1,
            boxShadow: g === value ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
          }}>{g}</div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10,
        fontFamily: 'var(--font-mono)', color: 'var(--slate-500)' }}>
        {grades.slice(0,6).map((s, i) => (
          <span key={i} style={{ flex: 1, textAlign: 'right' }}>≤{s.max}</span>
        ))}
        <span style={{ flex: 1, textAlign: 'right' }}>+</span>
      </div>
    </div>
  );
};

// — Sparkline (prix m²)
const Sparkline = ({ data, w = 220, h = 50, color = 'var(--amber-600)' }) => {
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const stepX = w / (data.length - 1);
  const points = data.map((v, i) => `${i * stepX},${h - ((v - min) / range) * (h - 6) - 3}`).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      <polyline fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" points={points}/>
      <circle cx={(data.length - 1) * stepX} cy={h - ((data[data.length-1] - min) / range) * (h - 6) - 3}
        r="3" fill={color}/>
    </svg>
  );
};

const PRICE_HISTORY = [9200, 9800, 10100, 10600, 11200, 11800, 12400, 12900, 13180];

// — Transactions DVF (données réelles Saint-Orens)
const TRANSACTIONS = [
  { date: '14 avr. 2023', dateShort: '04/2023', type: 'Appartement', surface: 47, prix: 154500, m2: 3287, lots: 3 },
  { date: '3 févr. 2023', dateShort: '02/2023', type: 'Appartement', surface: 65, prix: 238450, m2: 3668, lots: 4 },
  { date: '8 juil. 2022', dateShort: '07/2022', type: 'Appartement', surface: 47, prix: 150000, m2: 3191, lots: 4 },
  { date: '20 mai 2022', dateShort: '05/2022', type: 'Appartement', surface: 61, prix: 190000, m2: 3115, lots: 4 },
  { date: '3 juin 2021', dateShort: '06/2021', type: 'Appartement', surface: 67, prix: 205000, m2: 3060, lots: 4 },
];

// — Diagnostics DPE multiples
const DIAGNOSTICS = [
  { dpe: 'D', ges: 'B', date: '17 févr. 2026', chauf: 'Électricité', kwh: 231, validUntil: '16 févr. 2036' },
  { dpe: 'C', ges: 'C', date: '19 févr. 2025', chauf: 'Électricité', kwh: 96, validUntil: '18 févr. 2035' },
  { dpe: 'D', ges: 'B', date: '5 avr. 2024', chauf: 'Électricité', kwh: 189, validUntil: '4 avr. 2034' },
  { dpe: 'C', ges: 'B', date: '15 nov. 2023', chauf: 'Électricité', kwh: 159, validUntil: '14 nov. 2033' },
  { dpe: 'C', ges: 'C', date: '3 oct. 2023', chauf: 'Gaz naturel', kwh: 111, validUntil: '2 oct. 2033' },
  { dpe: 'C', ges: 'C', date: '25 sept. 2023', chauf: 'Gaz naturel', kwh: 101, validUntil: '24 sept. 2033' },
  { dpe: 'C', ges: 'C', date: '10 août 2023', chauf: 'Gaz naturel', kwh: 97, validUntil: '9 août 2033' },
  { dpe: 'C', ges: 'A', date: '13 oct. 2022', chauf: 'Électricité', kwh: 141, validUntil: '12 oct. 2032' },
];

// — Risques (deux colonnes : adresse / commune)
const RISQUES_NAT = [
  ['Inondation', 'Existant', 'Existant'],
  ['Remontée de nappe', 'Pas de risque connu', 'Pas de risque connu'],
  ['Séisme', 'Très faible', 'Très faible'],
  ['Mouvements de terrain', 'Pas de risque connu', 'Pas de risque connu'],
  ['Retrait-gonflement des argiles', 'Important', 'Non renseigné'],
  ['Radon', 'Faible', 'Faible'],
];
const RISQUES_TECH = [
  ['Pollution des sols', 'Non renseigné', 'Non renseigné'],
  ['Rupture de barrage', 'Existant', 'Existant'],
];

// — Etablissements
const SIRENE = [
  { name: 'MIL\'CREATIONS', act: 'Arts/spectacles', code: '90.01Z', siege: true, date: 'janv. 2026' },
  { name: 'LES PELOTES DE CARMEN', act: 'Commerce détail', code: '47.19B', siege: true, date: 'juin 2025' },
  { name: 'AU FUT DE CHENE', act: 'Commerce détail', code: '47.25Z', siege: true, date: 'sept. 2023' },
  { name: 'BERAERO31', act: 'Direction', code: '70.22Z', siege: true, date: 'févr. 2021' },
  { name: 'CLAIRE DEDIEU', act: 'Santé', code: '86.90E', siege: true, date: 'nov. 2015' },
  { name: 'A PIED D\'OEUVRE', act: 'Santé', code: '86.90E', siege: true, date: 'nov. 2015' },
  { name: 'SCI JRPM', act: 'Immobilier', code: '68.20B', siege: true, date: 'oct. 2011' },
  { name: 'COPROPRIETE INDIGO', act: 'Services bâtiment', code: '81.10Z', siege: true, date: 'déc. 1999' },
  { name: 'ASSO SYND CLOS LES OMBRAGES', act: 'Immobilier', code: '68.32A', siege: true, date: 'janv. 1993' },
];

// — POIs par catégorie
const POI_GROUPS = [
  { cat: 'Transports', items: [
    ['Poste de Saint-Orens', 85], ['Poste de Saint-Orens', 119], ['Mairie Saint-Orens', 144], ['Moulin', 211], ['Moulin', 240],
  ]},
  { cat: 'Éducation', items: [
    ['Baby Coccinelle', 864], ['Crèche Babilou Saint-Orens Négoce', 871],
  ]},
  { cat: 'Santé', items: [
    ['Centre Médical de la Poste', 95], ['Pharmacie Cha-Tayac', 273], ['Centre Médical', 398], ['Pharmacie Centrale', 405], ['Pharmacie des Arcades', 625],
  ]},
  { cat: 'Commerces', items: [
    ['Banque Courtois', 26], ['BNP Paribas', 84], ['CIC', 102], ['Léon et Marius', 240], ['Crédit Agricole', 255],
  ]},
];

const HISTO = [
  { y: 'févr. 2026', kind: 'DPE', label: 'DPE D', sub: 'appartement' },
  { y: 'févr. 2025', kind: 'DPE', label: 'DPE C', sub: 'appartement' },
  { y: 'avr. 2024', kind: 'DPE', label: 'DPE D', sub: 'appartement' },
  { y: 'nov. 2023', kind: 'DPE', label: 'DPE C', sub: 'appartement' },
  { y: 'oct. 2023', kind: 'DPE', label: 'DPE C', sub: 'appartement' },
  { y: 'sept. 2023', kind: 'DPE', label: 'DPE C', sub: 'appartement' },
  { y: 'août 2023', kind: 'DPE', label: 'DPE C', sub: 'appartement' },
  { y: 'avr. 2023', kind: 'VENTE', label: '154 500 €', sub: 'Appartement · 47 m² · 3 287 €/m²' },
  { y: 'févr. 2023', kind: 'VENTE', label: '238 450 €', sub: 'Appartement · 65 m² · 3 668 €/m²' },
  { y: 'oct. 2022', kind: 'DPE', label: 'DPE C', sub: 'appartement' },
  { y: 'juil. 2022', kind: 'VENTE', label: '150 000 €', sub: 'Appartement · 47 m² · 3 191 €/m²' },
  { y: 'juin 2022', kind: 'DPE', label: 'DPE C', sub: 'appartement' },
  { y: 'mai 2022', kind: 'VENTE', label: '190 000 €', sub: 'Appartement · 61 m² · 3 115 €/m²' },
  { y: 'févr. 2022', kind: 'DPE', label: 'DPE C', sub: 'appartement' },
  { y: 'juin 2021', kind: 'VENTE', label: '205 000 €', sub: 'Appartement · 67 m² · 3 060 €/m²' },
];

// — Helper : valeur de risque colorée
const riskColor = (v) => {
  if (v === 'Existant' || v === 'Important') return 'var(--amber-700)';
  if (v === 'Faible' || v === 'Très faible') return 'var(--slate-600)';
  if (v === 'Pas de risque connu') return 'var(--slate-500)';
  return 'var(--slate-500)';
};

// — App header (top nav, partagé avec la carte)
const AppHeader = ({ searchQuery = 'Saint-Orens-de-Gameville · 31506000BI0004' }) => (
  <div style={{
    height: 56, background: 'white', borderBottom: '1px solid var(--slate-200)',
    display: 'flex', alignItems: 'center', padding: '0 24px', gap: 20, flexShrink: 0,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

    <div className="gc-input" style={{ flex: 1, maxWidth: 520, height: 38, marginLeft: 8 }}>
      <Icons.Search size={15} color="var(--slate-400)"/>
      <input placeholder="Adresse, parcelle, propriétaire, SIRET…" defaultValue={searchQuery}/>
      <span className="gc-chip gc-mono" style={{ fontSize: 11 }}>⌘K</span>
    </div>

    <nav style={{ display: 'flex', gap: 4, fontSize: 14, color: 'var(--slate-600)' }}>
      <button className="gc-btn gc-btn-ghost gc-btn-sm">Carte</button>
      <button className="gc-btn gc-btn-ghost gc-btn-sm">Recherche</button>
      <button className="gc-btn gc-btn-ghost gc-btn-sm">Mes parcelles</button>
      <button className="gc-btn gc-btn-ghost gc-btn-sm">API</button>
    </nav>

    <div style={{ width: 1, height: 20, background: 'var(--slate-200)' }}/>
    <button className="gc-btn gc-btn-ghost gc-btn-sm" style={{ padding: '0 8px' }}><Icons.Bell size={16}/></button>
    <div style={{ width: 30, height: 30, borderRadius: 15, background: 'var(--slate-900)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, color: 'white', fontWeight: 600 }}>JM</div>
  </div>
);

// — Hero banner — fond slate-900, contenu posé directement (pas de carte flottante)
const HeroBanner = () => (
  <div style={{
    background: 'var(--slate-900)',
    position: 'relative', overflow: 'hidden',
    color: 'white',
  }}>
    {/* Pattern cadastre subtil sur le fond sombre */}
    <svg style={{ position: 'absolute', right: -40, top: -40, opacity: 0.4, pointerEvents: 'none' }}
      width="720" height="360" viewBox="0 0 720 360">
      <defs>
        <pattern id="hero-cad-dark" width="80" height="80" patternUnits="userSpaceOnUse">
          <path d="M80 0 H0 V80" fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width="720" height="360" fill="url(#hero-cad-dark)"/>
      <g fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1">
        <path d="M0 60 Q200 50, 320 65 T720 80"/>
        <path d="M0 180 Q160 175, 320 195 T720 200"/>
        <path d="M0 290 Q220 280, 380 290 T720 300"/>
        <path d="M120 0 Q140 80, 110 180 T140 360"/>
        <path d="M480 0 Q510 80, 470 180 T490 360"/>
      </g>
      {/* Petite parcelle stylisée en haut à droite */}
      <g fill="none" stroke="rgba(217,119,6,0.35)" strokeWidth="1.2">
        <path d="M540 90 L640 80 L660 160 L555 170 Z"/>
      </g>
    </svg>

    {/* Top thin row — breadcrumb + maj */}
    <div style={{ position: 'relative', padding: '14px 40px',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
      color: 'rgba(255,255,255,0.55)' }}>
      <a style={{ cursor: 'pointer' }}>Carte</a>
      <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
      <a style={{ cursor: 'pointer' }}>Haute-Garonne (31)</a>
      <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
      <a style={{ cursor: 'pointer' }}>Saint-Orens-de-Gameville</a>
      <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
      <span className="gc-mono" style={{ color: 'rgba(255,255,255,0.9)' }}>31506000BI0004</span>

      <div style={{ flex: 1 }}/>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span>Cadastre · <b className="gc-mono" style={{ color: 'rgba(255,255,255,0.92)', fontWeight: 500 }}>23/05/2026</b></span>
        <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
        <span>DVF · <b className="gc-mono" style={{ color: 'rgba(255,255,255,0.92)', fontWeight: 500 }}>23/05/2026</b></span>
        <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
        <span>DPE · <b className="gc-mono" style={{ color: 'rgba(255,255,255,0.92)', fontWeight: 500 }}>23/05/2026</b></span>
      </div>
    </div>

    {/* Hero body — tout sur le fond sombre */}
    <div style={{ position: 'relative', padding: '32px 40px 36px',
      display: 'grid', gridTemplateColumns: '1fr 220px auto', gap: 36, alignItems: 'center' }}>

      {/* Left — identité */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.16em',
            color: 'var(--amber-500)', textTransform: 'uppercase',
          }}>Parcelle</span>
          <span style={{ width: 24, height: 1, background: 'var(--amber-500)' }}/>
          <span className="gc-mono" style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            31506000BI0004
          </span>
        </div>

        <h1 style={{
          fontSize: 42, lineHeight: 1.04, letterSpacing: '-0.025em', marginBottom: 12,
          color: 'white',
        }}>11 Avenue de Gameville</h1>

        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 16 }}>
          31650 Saint-Orens-de-Gameville
          <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 8px' }}>·</span>
          Section BI n°4
          <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 8px' }}>·</span>
          <b style={{ color: 'white', fontWeight: 600 }}>3 156 m²</b> de contenance
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13,
            color: '#86efac', fontWeight: 500,
            padding: '4px 10px', background: 'rgba(134,239,172,0.10)',
            borderRadius: 14, border: '1px solid rgba(134,239,172,0.22)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: '#4ade80' }}/>
            Copropriété active
          </span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
            23 logements · construit en 2000
          </span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>·</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
            5 ventes depuis 2021
          </span>
        </div>
      </div>

      {/* Mid — mini-map (ressort naturellement sur fond sombre) */}
      <div style={{
        borderRadius: 6, overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 4px 12px rgba(0,0,0,0.25)',
      }}>
        <MiniMap width={220} height={138}/>
        <div style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.06)', fontSize: 11,
          color: 'rgba(255,255,255,0.6)', borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>1:1 250</span>
          <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
          <span className="gc-mono">43.546°N, 1.534°E</span>
        </div>
      </div>

      {/* Right — actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180 }}>
        <button style={{
          height: 36, padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'var(--amber-600)', color: 'white', border: 0, borderRadius: 6,
          fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
        }}>
          <Icons.Bell size={14}/> Suivre cette parcelle
        </button>
        <button style={{
          height: 36, padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.08)', color: 'white',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6,
          fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
        }}>
          <Icons.Download size={14}/> Exporter PDF
        </button>
        <button style={{
          height: 36, padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.08)', color: 'white',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6,
          fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
        }}>
          <Icons.MapPin size={14}/> Voir sur la carte
        </button>
      </div>
    </div>
  </div>
);

// — Système de pictogrammes par section (couleur identifiable au scan)
const SECTION_STYLES = {
  dvf:         { bg: 'rgba(30,41,59,0.07)',  fg: 'var(--slate-700)' },
  dpe:         { bg: 'rgba(65,169,60,0.13)', fg: '#2d7a2d' },
  risques:     { bg: 'var(--amber-50)',      fg: 'var(--amber-700)', accent: 'var(--amber-600)' },
  batiments:   { bg: 'rgba(30,41,59,0.07)',  fg: 'var(--slate-700)' },
  copro:       { bg: 'rgba(30,41,59,0.07)',  fg: 'var(--slate-700)' },
  entreprises: { bg: 'rgba(37,99,235,0.10)', fg: '#1e4ed8' },
  proximite:   { bg: 'rgba(217,119,6,0.10)', fg: 'var(--amber-700)' },
  historique:  { bg: 'rgba(30,41,59,0.07)',  fg: 'var(--slate-500)' },
};

const SectionTitle = ({ kind, icon, title, count, source }) => {
  const s = SECTION_STYLES[kind] || SECTION_STYLES.batiments;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: s.bg, color: s.fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 600,
        letterSpacing: '-0.005em', flex: 1 }}>
        {title}
        {count != null && <span style={{ marginLeft: 10, fontWeight: 400, color: 'var(--slate-500)', fontSize: 16 }}>{count}</span>}
      </h2>
      {source && <span style={{ fontSize: 13, color: 'var(--slate-500)' }}>{source}</span>}
    </div>
  );
};

// — Section heading (réutilisable)
const SectionHead = ({ icon, title, sub, action }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
    {icon && <span style={{ color: 'var(--slate-500)' }}>{icon}</span>}
    <div style={{ flex: 1 }}>
      <h3 style={{ fontSize: 17 }}>{title}</h3>
      {sub && <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>{sub}</div>}
    </div>
    {action}
  </div>
);

// — Header de fiche (commun)
const FicheHeader = ({ dense = false }) => (
  <div style={{
    background: 'white',
    borderBottom: dense ? '1px solid var(--slate-200)' : 0,
    padding: dense ? '20px 40px 22px' : '32px 40px 28px',
  }}>
    <div style={{ marginBottom: 14 }}>
      <Breadcrumb/>
    </div>

    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 32 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{
          fontSize: dense ? 30 : 36, lineHeight: 1.1, marginBottom: 8, letterSpacing: '-0.02em',
        }}>11 Avenue de Gameville</h1>
        <div style={{ color: 'var(--slate-600)', fontSize: 15 }}>
          31650 Saint-Orens-de-Gameville
          <span style={{ color: 'var(--slate-400)', margin: '0 8px' }}>·</span>
          Section BI n°4
          <span style={{ color: 'var(--slate-400)', margin: '0 8px' }}>·</span>
          <b style={{ fontWeight: 600 }}>3 156 m²</b> de contenance
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="gc-btn gc-btn-secondary gc-btn-sm">
          <Icons.Bookmark size={13}/>Sauvegarder
        </button>
        <button className="gc-btn gc-btn-secondary gc-btn-sm">
          <Icons.Share size={13}/>Partager
        </button>
        <button className="gc-btn gc-btn-secondary gc-btn-sm">
          <Icons.Download size={13}/>Exporter
        </button>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// VARIANTE — DENSE (éditorial, Pappers-style)
// Pas de cards. Sections séparées par fines règles, typo qui respire.
// ─────────────────────────────────────────────────────────────

// Petit composant titre de section éditorial — pas d'icône, ligne fine.
const EditorialH = ({ children, note, action }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 18,
    paddingBottom: 14, borderBottom: '1px solid var(--slate-200)' }}>
    <h3 style={{ fontSize: 20, letterSpacing: '-0.01em' }}>{children}</h3>
    {note && <span style={{ fontSize: 13, color: 'var(--slate-500)', fontWeight: 400 }}>{note}</span>}
    {action && <span style={{ marginLeft: 'auto' }}>{action}</span>}
  </div>
);

const FicheDense = () => (
  <div className="gc-app gc-noscroll" style={{ overflow: 'auto', background: 'white' }}>
    <AppHeader/>
    <HeroBanner/>

    {/* TOC sticky — avec icônes par section */}
    <div style={{ background: 'white', borderBottom: '1px solid var(--slate-200)',
      position: 'sticky', top: 0, zIndex: 2 }}>
      <div style={{ padding: '0 40px', display: 'flex', gap: 4, fontSize: 13, alignItems: 'center', overflowX: 'auto' }}>
        {[
          { i: <Icons.Activity size={13}/>, l: 'Synthèse', k: 'slate' },
          { i: <Icons.Euro size={13}/>, l: 'Transactions', k: 'dvf' },
          { i: <Icons.Flame size={13}/>, l: 'Diagnostics DPE', k: 'dpe' },
          { i: <Icons.AlertTriangle size={13}/>, l: 'Risques', k: 'risques' },
          { i: <Icons.Building size={13}/>, l: 'Bâtiments', k: 'batiments' },
          { i: <Icons.Home size={13}/>, l: 'Copropriété', k: 'copro' },
          { i: <Icons.Briefcase size={13}/>, l: 'Entreprises', k: 'entreprises' },
          { i: <Icons.MapPin size={13}/>, l: 'À proximité', k: 'proximite' },
          { i: <Icons.History size={13}/>, l: 'Historique', k: 'historique' },
        ].map((t, i) => {
          const active = i === 0;
          const s = SECTION_STYLES[t.k] || {};
          return (
            <button key={i} style={{
              padding: '12px 10px', background: 'transparent', border: 0,
              borderBottom: active ? '2px solid var(--slate-900)' : '2px solid transparent',
              color: active ? 'var(--slate-900)' : 'var(--slate-600)',
              fontWeight: active ? 500 : 400, marginBottom: -1,
              display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
            }}>
              <span style={{ color: s.fg || 'var(--slate-500)' }}>{t.i}</span>
              {t.l}
            </button>
          );
        })}
      </div>
    </div>

    {/* Layout : article principal + sidebar */}
    <div style={{ padding: '36px 40px 32px', display: 'grid', gridTemplateColumns: '1fr 280px', gap: 56 }}>
      <main>

        {/* Synthèse */}
        <p style={{ fontSize: 16, lineHeight: 1.65, color: 'var(--slate-700)', maxWidth: 720, marginBottom: 56 }}>
          Parcelle de <b>3 156 m²</b> située 11 Avenue de Gameville, Saint-Orens-de-Gameville.
          <b> 5 transactions</b> enregistrées depuis 2014. La dernière date d'avril 2023
          pour <b>154 500 €</b>. DPE le plus récent : étiquette
          <span className="gc-dpe gc-dpe-D" style={{ display: 'inline-flex', width: 18, height: 18, fontSize: 11, margin: '0 4px', verticalAlign: '-3px' }}>D</span>
          <b>(231 kWhEP/m²/an)</b>.
        </p>

        {/* TRANSACTIONS DVF */}
        <section style={{ marginBottom: 56 }}>
          <SectionTitle kind="dvf" icon={<Icons.Euro size={18}/>} title="Transactions DVF" source="màj mai 2026"/>

          <div>
            {TRANSACTIONS.map((t, i) => (
              <div key={i} style={{
                padding: '18px 0', borderTop: '1px solid var(--slate-200)',
                display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'baseline',
              }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 4, letterSpacing: '-0.01em' }} className="gc-tabular">
                    {t.prix.toLocaleString('fr-FR')} €
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--slate-600)' }}>
                    {t.type}
                    <span style={{ color: 'var(--slate-400)', margin: '0 6px' }}>·</span>
                    {t.surface} m²
                    <span style={{ color: 'var(--slate-400)', margin: '0 6px' }}>·</span>
                    <span className="gc-tabular">{t.m2.toLocaleString('fr')} €/m²</span>
                    <span style={{ color: 'var(--slate-400)', margin: '0 6px' }}>·</span>
                    {t.lots} lots
                  </div>
                </div>
                <div style={{ fontSize: 14, color: 'var(--slate-600)', whiteSpace: 'nowrap' }}>
                  {t.date}
                </div>
              </div>
            ))}
            <div style={{
              padding: '18px 0 0', borderTop: '1px solid var(--slate-200)',
              fontSize: 14, color: 'var(--slate-600)',
            }}>
              Prix médian sur cette parcelle : <b style={{ color: 'var(--slate-900)' }} className="gc-tabular">3 191 €/m²</b>
            </div>
          </div>
        </section>

        {/* DIAGNOSTICS DPE */}
        <section style={{ marginBottom: 56 }}>
          <SectionTitle kind="dpe" icon={<Icons.Flame size={18}/>} title="Diagnostics DPE" count={DIAGNOSTICS.length} source="ADEME · màj mai 2026"/>

          <div>
            {DIAGNOSTICS.map((d, i) => (
              <div key={i} style={{
                padding: '16px 0', borderTop: '1px solid var(--slate-200)',
                display: 'grid', gridTemplateColumns: 'auto auto 1fr auto', gap: 18, alignItems: 'center',
              }}>
                <div className={`gc-dpe gc-dpe-${d.dpe}`} style={{ width: 42, height: 42, fontSize: 22, borderRadius: 4 }}>{d.dpe}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--slate-600)' }}>
                  <span>GES</span>
                  <div className={`gc-dpe gc-dpe-${d.ges}`} style={{ width: 24, height: 24, fontSize: 13 }}>{d.ges}</div>
                </div>
                <div>
                  <div style={{ fontSize: 14 }}>
                    <span style={{ fontWeight: 500 }}>appartement</span>
                    <span style={{ color: 'var(--slate-400)', margin: '0 6px' }}>·</span>
                    <span style={{ color: 'var(--slate-600)' }}>Construit 1989–2000</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--slate-600)', marginTop: 2 }}>
                    Chauffage {d.chauf}
                    <span style={{ color: 'var(--slate-400)', margin: '0 6px' }}>·</span>
                    <span className="gc-tabular">{d.kwh} kWhEP/m²·an</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--slate-600)' }}>
                  <div>{d.date}</div>
                  <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 2 }}>
                    valide jusqu'au {d.validUntil}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* RISQUES */}
        <section style={{ marginBottom: 56 }}>
          <SectionTitle kind="risques" icon={<Icons.AlertTriangle size={18}/>} title="Risques" source={<a style={{ color: 'var(--slate-500)', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--slate-300)' }}>georisques.gouv.fr</a>}/>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                <th></th>
                <th style={{ textAlign: 'left', padding: '0 0 10px', fontWeight: 500, color: 'var(--slate-500)', fontSize: 13, width: 180 }}>À l'adresse</th>
                <th style={{ textAlign: 'left', padding: '0 0 10px', fontWeight: 500, color: 'var(--slate-500)', fontSize: 13, width: 180 }}>Sur la commune</th>
              </tr>
              <tr><td colSpan="3" style={{ padding: 0 }}>
                <div style={{ paddingTop: 4, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
                  color: 'var(--slate-500)', textTransform: 'uppercase', borderTop: '1px solid var(--slate-200)',
                  paddingBottom: 4, paddingTop: 12 }}>Risques naturels</div>
              </td></tr>
            </thead>
            <tbody>
              {RISQUES_NAT.map((r, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--slate-100)' }}>
                  <td style={{ padding: '12px 0' }}>{r[0]}</td>
                  <td style={{ padding: '12px 0', color: riskColor(r[1]), fontWeight: r[1] === 'Important' || r[1] === 'Existant' ? 500 : 400 }}>{r[1]}</td>
                  <td style={{ padding: '12px 0', color: riskColor(r[2]) }}>{r[2]}</td>
                </tr>
              ))}
              <tr><td colSpan="3" style={{ padding: '20px 0 4px', fontSize: 11, fontWeight: 600,
                letterSpacing: '0.08em', color: 'var(--slate-500)', textTransform: 'uppercase' }}>
                Risques technologiques
              </td></tr>
              {RISQUES_TECH.map((r, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--slate-100)' }}>
                  <td style={{ padding: '12px 0' }}>{r[0]}</td>
                  <td style={{ padding: '12px 0', color: riskColor(r[1]), fontWeight: r[1] === 'Existant' ? 500 : 400 }}>{r[1]}</td>
                  <td style={{ padding: '12px 0', color: riskColor(r[2]) }}>{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ÉTABLISSEMENTS SIRENE */}
        <section style={{ marginBottom: 56 }}>
          <SectionTitle kind="entreprises" icon={<Icons.Briefcase size={18}/>} title="Établissements à proximité" count={SIRENE.length} source="SIRENE · INSEE · rayon 50 m"/>

          <div>
            {SIRENE.map((s, i) => (
              <div key={i} style={{
                padding: '12px 0', borderTop: '1px solid var(--slate-100)',
                display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16, alignItems: 'center',
              }}>
                <div>
                  <a style={{ fontSize: 14, fontWeight: 500, color: 'var(--slate-900)', cursor: 'pointer' }}>{s.name}</a>
                  <span style={{ fontSize: 13, color: 'var(--slate-500)', marginLeft: 10 }}>
                    {s.act} · <span className="gc-mono" style={{ fontSize: 12 }}>{s.code}</span>
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>{s.siege ? 'Siège' : '—'}</div>
                <div style={{ fontSize: 13, color: 'var(--slate-600)', width: 90, textAlign: 'right' }}>{s.date}</div>
              </div>
            ))}
          </div>
        </section>

        {/* À PROXIMITÉ */}
        <section style={{ marginBottom: 56 }}>
          <SectionTitle kind="proximite" icon={<Icons.MapPin size={18}/>} title="À proximité" source="OpenStreetMap"/>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 48px' }}>
            {POI_GROUPS.map((g, i) => (
              <div key={i} style={{ marginBottom: 24 }}>
                <h4 style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600,
                  letterSpacing: '0.08em', color: 'var(--slate-500)', textTransform: 'uppercase',
                  paddingBottom: 8, borderBottom: '1px solid var(--slate-200)', marginBottom: 4 }}>
                  {g.cat}
                </h4>
                {g.items.map(([name, dist], j) => (
                  <div key={j} style={{
                    padding: '8px 0', borderTop: j ? '1px solid var(--slate-100)' : 'none',
                    display: 'flex', justifyContent: 'space-between', fontSize: 14,
                  }}>
                    <span>{name}</span>
                    <span style={{ color: 'var(--slate-600)' }} className="gc-tabular">{dist} m</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* HISTORIQUE */}
        <section style={{ marginBottom: 16 }}>
          <SectionTitle kind="historique" icon={<Icons.History size={18}/>} title="Historique"/>
          <div>
            {HISTO.map((e, i) => (
              <div key={i} style={{
                padding: '11px 0', borderTop: i ? '1px solid var(--slate-100)' : '1px solid var(--slate-200)',
                display: 'grid', gridTemplateColumns: '90px auto 1fr', gap: 16, alignItems: 'baseline',
              }}>
                <span style={{ fontSize: 13, color: 'var(--slate-500)' }}>{e.y}</span>
                {e.kind === 'VENTE' ? (
                  <span style={{ fontSize: 14, fontWeight: 500 }} className="gc-tabular">{e.label}</span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                    <span className={`gc-dpe gc-dpe-${e.label.slice(-1)}`} style={{ width: 18, height: 18, fontSize: 10 }}>
                      {e.label.slice(-1)}
                    </span>
                    <span>{e.label}</span>
                  </span>
                )}
                <span style={{ fontSize: 13, color: 'var(--slate-600)' }}>{e.sub}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* SIDEBAR */}
      <aside>
        {/* Mini-map */}
        <div style={{ marginBottom: 28 }}>
          <MiniMap width={280} height={170}/>
          <div style={{ paddingTop: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--slate-600)' }}>
            <span>Section BI · n°4</span>
            <a style={{ marginLeft: 'auto', color: 'var(--slate-700)', cursor: 'pointer',
              textDecoration: 'underline', textDecorationColor: 'var(--slate-300)' }}>
              Voir sur la carte
            </a>
          </div>
        </div>

        {/* Bâtiments BDNB */}
        <div style={{ marginBottom: 28, paddingTop: 18, borderTop: '1px solid var(--slate-200)' }}>
          <h4 style={{ fontSize: 14, marginBottom: 10, fontFamily: 'var(--font-body)', fontWeight: 600 }}>
            Bâtiments <span style={{ fontWeight: 400, color: 'var(--slate-500)', fontSize: 12 }}>BDNB</span>
          </h4>
          <div style={{ fontSize: 13 }}>
            <div style={{ fontWeight: 500 }}>Résidentiel collectif</div>
            <div style={{ color: 'var(--slate-600)', marginTop: 2 }}>Construit en 2000</div>
            <div style={{ color: 'var(--slate-600)' }}>23 logements</div>
            <div style={{ color: 'var(--slate-500)', fontSize: 11, marginTop: 8 }}>Source : BDNB 2025-07-a</div>
          </div>
        </div>

        {/* Copropriété RNIC */}
        <div style={{ marginBottom: 28, paddingTop: 18, borderTop: '1px solid var(--slate-200)' }}>
          <h4 style={{ fontSize: 14, marginBottom: 10, fontFamily: 'var(--font-body)', fontWeight: 600 }}>
            Copropriété <span style={{ fontWeight: 400, color: 'var(--slate-500)', fontSize: 12 }}>RNIC</span>
          </h4>
          <div style={{ fontSize: 13, marginBottom: 12 }}>
            <div style={{ fontWeight: 500 }}>SDC L'INDIGO SAINT ORENS</div>
            <div className="gc-mono" style={{ color: 'var(--slate-500)', fontSize: 11, marginTop: 2 }}>AA8877946</div>
          </div>
          <dl style={{ margin: 0, fontSize: 13 }}>
            {[
              ['Syndic', 'SYNDIA · professionnel'],
              ['Lots total', '97'],
              ['Lots habitation', '22'],
              ['Stationnement', '71'],
              ['Type', 'Principal'],
              ['Règlement', '8 mars 2000'],
              ['Immatriculation', '14 août 2017'],
            ].map(([k, v], i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12,
                padding: '6px 0', borderTop: '1px solid var(--slate-100)' }}>
                <dt style={{ color: 'var(--slate-500)' }}>{k}</dt>
                <dd style={{ margin: 0, textAlign: 'right' }}>{v}</dd>
              </div>
            ))}
          </dl>
          <div style={{ color: 'var(--slate-500)', fontSize: 11, marginTop: 10 }}>Source : RNIC — data.gouv.fr</div>
        </div>

        {/* Patrimoine ABF */}
        <div style={{ marginBottom: 28, paddingTop: 18, borderTop: '1px solid var(--slate-200)' }}>
          <h4 style={{ fontSize: 14, marginBottom: 10, fontFamily: 'var(--font-body)', fontWeight: 600 }}>
            Patrimoine ABF
          </h4>
          <div style={{ fontSize: 13, color: 'var(--slate-700)' }}>
            <b>Hors périmètre</b>
            <div style={{ color: 'var(--slate-600)', marginTop: 4, lineHeight: 1.5 }}>
              Aucun monument historique dans un rayon de 500 m.
            </div>
          </div>
        </div>

        {/* Comparaison commune */}
        <div style={{ marginBottom: 28, paddingTop: 18, borderTop: '1px solid var(--slate-200)' }}>
          <h4 style={{ fontSize: 14, marginBottom: 12, fontFamily: 'var(--font-body)', fontWeight: 600 }}>
            Sur la commune
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px', fontSize: 13 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600 }} className="gc-tabular">3 250 €</div>
              <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>€/m² médian</div>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--amber-700)' }} className="gc-tabular">3 191 €</div>
              <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>cette parcelle</div>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600 }} className="gc-tabular">1 082</div>
              <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>ventes</div>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600 }} className="gc-tabular">3 992</div>
              <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>DPE</div>
            </div>
          </div>

          {/* Mini chart prix médian */}
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 11, color: 'var(--slate-500)', marginBottom: 6 }}>Prix médian €/m² (commune)</div>
            <svg width="100%" height="60" viewBox="0 0 240 60" style={{ display: 'block' }}>
              <polyline fill="none" stroke="var(--slate-900)" strokeWidth="1.5"
                points="10,38 80,30 150,22 220,18"/>
              {[[10,38],[80,30],[150,22],[220,18]].map(([x,y],i) => (
                <circle key={i} cx={x} cy={y} r="2.5" fill="var(--slate-900)"/>
              ))}
              <text x="10" y="56" fontSize="10" fill="#94a3b8" fontFamily="Inter">2021</text>
              <text x="80" y="56" fontSize="10" fill="#94a3b8" fontFamily="Inter">2022</text>
              <text x="150" y="56" fontSize="10" fill="#94a3b8" fontFamily="Inter">2023</text>
              <text x="220" y="56" fontSize="10" fill="#94a3b8" fontFamily="Inter" textAnchor="end">2024</text>
            </svg>
          </div>

          {/* Distribution DPE */}
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 11, color: 'var(--slate-500)', marginBottom: 8 }}>Distribution DPE (commune)</div>
            {[
              ['A', 16], ['B', 18], ['C', 47], ['D', 14], ['E', 4], ['F', 1], ['G', 0],
            ].map(([g, pct]) => (
              <div key={g} style={{ display: 'grid', gridTemplateColumns: '20px 1fr 32px', gap: 8,
                alignItems: 'center', padding: '3px 0' }}>
                <div className={`gc-dpe gc-dpe-${g}`} style={{ width: 18, height: 18, fontSize: 10 }}>{g}</div>
                <div style={{ height: 6, background: 'var(--slate-100)', borderRadius: 1, overflow: 'hidden' }}>
                  <div style={{ width: pct + '%', height: '100%', background: 'var(--slate-700)' }}/>
                </div>
                <span style={{ fontSize: 12, color: 'var(--slate-600)', textAlign: 'right' }} className="gc-tabular">{pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Références */}
        <div style={{ paddingTop: 18, borderTop: '1px solid var(--slate-200)' }}>
          <h4 style={{ fontSize: 14, marginBottom: 10, fontFamily: 'var(--font-body)', fontWeight: 600 }}>Références</h4>
          <dl style={{ margin: 0, fontSize: 12 }}>
            {[
              ['Parcelle', '31506000BI0004'],
              ['Commune', '31506'],
              ['Section', 'BI · n°4'],
              ['Contenance', '3 156 m²'],
            ].map(([k, v], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', gap: 8 }}>
                <span style={{ color: 'var(--slate-500)' }}>{k}</span>
                <span className="gc-mono" style={{ color: 'var(--slate-700)' }}>{v}</span>
              </div>
            ))}
          </dl>
        </div>
      </aside>
    </div>

    {/* Footer */}
    <div style={{ padding: '20px 40px 32px', borderTop: '1px solid var(--slate-200)',
      fontSize: 12, color: 'var(--slate-500)', display: 'flex', justifyContent: 'space-between' }}>
      <span>Sources : Cadastre IGN · DVF DGFiP · DPE ADEME · Géorisques BRGM · BDNB · RNIC · SIRENE INSEE · OpenStreetMap</span>
      <span>Maj 23/05/2026</span>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// VARIANTE — AÉRÉE (plus d'espace, focus narratif)
// ─────────────────────────────────────────────────────────────
const FicheAeree = () => (
  <div className="gc-app gc-noscroll" style={{ overflow: 'auto' }}>
    <FicheHeader/>

    {/* Hero — map locator + KPIs en hauteur */}
    <div style={{ padding: '0 60px 48px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 48, alignItems: 'start' }}>
        {/* Big stats narratifs */}
        <div>
          <div className="gc-section-h" style={{ marginBottom: 24 }}>En un coup d'œil</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px 48px' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--slate-500)', marginBottom: 4 }}>Dernière mutation</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
                4,25<span style={{ fontSize: 24, color: 'var(--slate-500)', marginLeft: 4 }}>M€</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--slate-500)', marginTop: 8 }}>
                immeuble entier · juin 2021
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--slate-500)', marginBottom: 4 }}>Prix m² estimé</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
                  13 180<span style={{ fontSize: 24, color: 'var(--slate-500)', marginLeft: 4 }}>€</span>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                <Icons.TrendingUp size={13} color="var(--dpe-a)"/>
                <span style={{ fontSize: 13, color: 'var(--dpe-a)', fontWeight: 500 }}>+11,2%</span>
                <span style={{ fontSize: 13, color: 'var(--slate-500)' }}>vs. quartier</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--slate-500)', marginBottom: 4 }}>Surface bâtie</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em' }}>
                1 632<span style={{ fontSize: 18, color: 'var(--slate-500)', marginLeft: 4 }}>m²</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--slate-500)', marginTop: 4 }}>sur 287 m² de parcelle</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--slate-500)', marginBottom: 4 }}>Construit en</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em' }}>1885</div>
              <div style={{ fontSize: 13, color: 'var(--slate-500)', marginTop: 4 }}>haussmannien · 6 étages · 14 lots</div>
            </div>
          </div>
        </div>

        {/* Map locator */}
        <div>
          <div style={{ background: 'white', border: '1px solid var(--slate-200)', borderRadius: 6, overflow: 'hidden' }}>
            <MiniMap width={460} height={260}/>
            <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>Section AK · parcelle 0124</div>
                <div className="gc-mono" style={{ fontSize: 12, color: 'var(--slate-700)' }}>75111000AK0124</div>
              </div>
              <button className="gc-btn gc-btn-secondary gc-btn-sm">
                Voir sur la carte <Icons.ArrowUpRight size={12}/>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Évolution prix m² — full width chart */}
    <div style={{ padding: '0 60px 56px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 26, marginBottom: 6 }}>Évolution du prix au m²</h2>
          <div style={{ color: 'var(--slate-500)', fontSize: 14 }}>Médiane des transactions DVF sur l'immeuble · 2015–2023</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['1A', '5A', 'Tout'].map((p, i) => (
            <button key={i} className={`gc-btn gc-btn-sm ${i === 2 ? 'gc-btn-secondary' : 'gc-btn-ghost'}`}
              style={i === 2 ? { background: 'var(--slate-100)' } : {}}>{p}</button>
          ))}
        </div>
      </div>
      <div style={{ background: 'white', border: '1px solid var(--slate-200)', borderRadius: 6, padding: 28, position: 'relative' }}>
        <svg viewBox="0 0 800 220" width="100%" height="220" style={{ display: 'block' }}>
          {/* Grid */}
          {[0, 1, 2, 3, 4].map(i => (
            <line key={i} x1="40" x2="790" y1={20 + i * 40} y2={20 + i * 40} stroke="#f1f5f9" strokeWidth="1"/>
          ))}
          {/* Y labels */}
          {['14k', '12k', '10k', '8k', '6k'].map((l, i) => (
            <text key={i} x="32" y={24 + i * 40} fontSize="10" fill="#94a3b8" textAnchor="end" fontFamily="JetBrains Mono">{l}€</text>
          ))}
          {/* Quartier baseline */}
          <path d="M40 90 Q200 86, 400 82 T790 70" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 4"/>
          <text x="780" y="64" fontSize="10" fill="#94a3b8" textAnchor="end" fontFamily="Inter">médiane 11ᵉ</text>

          {/* Bldg curve */}
          <defs>
            <linearGradient id="fade" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#d97706" stopOpacity="0.15"/>
              <stop offset="100%" stopColor="#d97706" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d="M40 140 L130 130 L220 124 L310 110 L400 96 L490 84 L580 72 L670 58 L760 48 L760 200 L40 200 Z" fill="url(#fade)"/>
          <path d="M40 140 L130 130 L220 124 L310 110 L400 96 L490 84 L580 72 L670 58 L760 48" fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round"/>

          {/* Dots */}
          {[[40,140],[130,130],[220,124],[310,110],[400,96],[490,84],[580,72],[670,58],[760,48]].map(([x,y], i) => (
            <circle key={i} cx={x} cy={y} r={i === 8 ? 5 : 3.5} fill="#d97706" stroke="white" strokeWidth="1.5"/>
          ))}
          {/* X labels */}
          {['2015', '2017', '2019', '2021', '2023'].map((l, i) => (
            <text key={i} x={40 + i * 180} y="218" fontSize="10" fill="#94a3b8" textAnchor="middle" fontFamily="JetBrains Mono">{l}</text>
          ))}

          {/* Last value annotation */}
          <line x1="760" x2="760" y1="48" y2="58" stroke="#d97706" strokeWidth="1" strokeDasharray="2 2"/>
          <rect x="694" y="20" width="78" height="22" rx="3" fill="#1e293b"/>
          <text x="733" y="35" fontSize="11" fill="white" textAnchor="middle" fontFamily="JetBrains Mono" fontWeight="600">13 180 €/m²</text>
        </svg>
      </div>
    </div>

    {/* Mutations narrative */}
    <div style={{ padding: '0 60px 56px' }}>
      <h2 style={{ fontSize: 26, marginBottom: 6 }}>Mutations récentes</h2>
      <div style={{ color: 'var(--slate-500)', fontSize: 14, marginBottom: 24 }}>
        Source DVF DGFiP · 6 ventes entre 2016 et 2023
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {TRANSACTIONS.slice(0, 4).map((t, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '110px 1.4fr 1fr 1fr 60px',
            gap: 24, padding: '22px 0', alignItems: 'center',
            borderBottom: '1px solid var(--slate-200)' }}>
            <div className="gc-mono" style={{ fontSize: 13, color: 'var(--slate-500)' }}>{t.date}</div>
            <div>
              <div style={{ fontWeight: 500 }}>{t.type}</div>
              <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>{t.lot} · {t.etage !== '—' && t.etage + ' étage · '}{t.surface} m²</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600 }}>
                {(t.prix/1000000).toFixed(2).replace('.', ',')} M€
              </div>
            </div>
            <div>
              {t.m2 && <>
                <div className="gc-mono" style={{ fontSize: 14, fontWeight: 500 }}>{t.m2.toLocaleString('fr')} €/m²</div>
                {t.delta != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12,
                    color: t.delta > 0 ? 'var(--dpe-a)' : 'var(--dpe-g)' }}>
                    {t.delta > 0 ? <Icons.TrendingUp size={11}/> : <Icons.TrendingDown size={11}/>}
                    <span>{t.delta > 0 ? '+' : ''}{t.delta}% vs. quartier</span>
                  </div>
                )}
              </>}
            </div>
            <button className="gc-btn gc-btn-ghost gc-btn-sm" style={{ padding: '0 6px', marginLeft: 'auto' }}>
              <Icons.ChevronRight size={14}/>
            </button>
          </div>
        ))}
      </div>
      <button className="gc-btn gc-btn-secondary" style={{ marginTop: 16 }}>
        Voir les 6 mutations <Icons.ChevronDown size={14}/>
      </button>
    </div>

    {/* DPE side-by-side big */}
    <div style={{ padding: '0 60px 56px' }}>
      <h2 style={{ fontSize: 26, marginBottom: 6 }}>Performance énergétique</h2>
      <div style={{ color: 'var(--slate-500)', fontSize: 14, marginBottom: 32 }}>
        DPE collectif établi en juin 2021 · valide jusqu'au 30/06/2031
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginBottom: 24 }}>
            <div className="gc-dpe gc-dpe-D" style={{ width: 96, height: 96, fontSize: 56, borderRadius: 6 }}>D</div>
            <div>
              <div className="gc-section-h" style={{ marginBottom: 4 }}>Énergie</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600 }}>
                180<span style={{ fontSize: 16, color: 'var(--slate-500)' }}> kWh/m²·an</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--slate-500)' }}>consommation primaire</div>
            </div>
          </div>
          <DpeBarH value="D" kwh={180}/>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginBottom: 24 }}>
            <div className="gc-dpe gc-dpe-C" style={{ width: 96, height: 96, fontSize: 56, borderRadius: 6 }}>C</div>
            <div>
              <div className="gc-section-h" style={{ marginBottom: 4 }}>Climat (GES)</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600 }}>
                28<span style={{ fontSize: 16, color: 'var(--slate-500)' }}> kgCO₂/m²·an</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--slate-500)' }}>émissions</div>
            </div>
          </div>
          <DpeBarH value="C" kwh={28}/>
        </div>
      </div>

      <div style={{ marginTop: 32, padding: '20px 24px', background: 'white', border: '1px solid var(--slate-200)',
        borderRadius: 6, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Chauffage</div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Collectif gaz</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Eau chaude</div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Collective gaz</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Isolation</div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Murs non isolés</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Menuiseries</div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Double vitrage</div>
        </div>
      </div>
    </div>

    {/* Risques + POI deux colonnes */}
    <div style={{ padding: '0 60px 56px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 6 }}>Risques</h2>
        <div style={{ color: 'var(--slate-500)', fontSize: 13, marginBottom: 20 }}>Géorisques · BRGM</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {RISQUES.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16,
              padding: '14px 0', borderTop: i === 0 ? '1px solid var(--slate-200)' : '1px solid var(--slate-100)' }}>
              <span style={{ color: r.color }}>{r.i}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>{r.desc}</div>
              </div>
              <span style={{
                fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 14,
                color: r.color, background: r.color === 'var(--dpe-a)' ? 'rgba(49,152,52,0.1)' : (r.color === 'var(--amber-600)' ? 'var(--amber-50)' : 'var(--slate-100)'),
              }}>{r.level}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 6 }}>À proximité</h2>
        <div style={{ color: 'var(--slate-500)', fontSize: 13, marginBottom: 20 }}>7 points d'intérêt à moins de 500 m</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {POIS.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0',
              borderTop: '1px solid ' + (i === 0 ? 'var(--slate-200)' : 'var(--slate-100)') }}>
              <span style={{ color: 'var(--slate-500)' }}>{p.i}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>{p.cat} · {p.sub}</div>
              </div>
              <span className="gc-mono" style={{ fontSize: 13, color: 'var(--slate-600)' }}>{p.dist} m</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Footer */}
    <div style={{ padding: '24px 60px 40px', borderTop: '1px solid var(--slate-200)',
      fontSize: 12, color: 'var(--slate-500)', display: 'flex', justifyContent: 'space-between' }}>
      <span>Sources : Cadastre IGN · DVF DGFiP · DPE ADEME · Géorisques · BAN · INSEE</span>
      <span className="gc-mono">Dernière maj : 12/05/2026 · v2026.05</span>
    </div>
  </div>
);

Object.assign(window, {
  FicheDense, FicheAeree,
  MiniMap, SectionTitle, SECTION_STYLES, riskColor,
  TRANSACTIONS, DIAGNOSTICS, RISQUES_NAT, RISQUES_TECH, POI_GROUPS, SIRENE, HISTO,
});

/** Adresse telle que retournée dans ParcelleOutput */
export interface ParcelleAddress {
  banId: string
  numero: string | null
  voie: string | null
  codePostal: string | null
  commune: string | null
}

export interface ParcelleTransactionLot {
  typeLocal: string | null
  surfaceBati: number | null
  surfaceTerrain: number | null
  surfaceCarrez: number | null
  nombrePieces: number | null
}

/** Transaction telle que retournée dans ParcelleOutput (lots agrégés) */
export interface ParcelleTransaction {
  idMutation: string
  date: string | null
  nature: string | null
  valeurFonciere: number | null
  lots: ParcelleTransactionLot[]
}

/** DPE tel que retourné dans ParcelleOutput */
export interface ParcelleDpe {
  numeroDpe: string
  date: string | null
  dateFinValidite: string | null
  etiquetteDpe: string | null
  etiquetteGes: string | null
  consoPrimaire: number | null
  emissionGes: number | null
  typeBatiment: string | null
  surface: number | null
  periodeConstruction: string | null
  energieChauffage: string | null
  adresse: string | null
}

export interface Parcelle {
  idParcelle: string
  communeCode: string
  section: string | null
  numero: string | null
  contenance: number | null
  centroid: { lon: number; lat: number } | null
  address: ParcelleAddress | null
}

export interface SectionData<T> {
  items: T[]
  updatedAt: string | null
}

export interface Commune {
  code: string
  nom: string | null
  nbParcelles: number
  nbTransactions: number
  prixMedianM2: number | null
  nbDpes: number
  distributionDpe: Record<string, number>
  evolutionPrix: { annee: number; nbVentes: number; prixMedianM2: number | null }[]
}

export interface AddressParcelleRef {
  idParcelle: string
  section: string | null
  numero: string | null
  contenance: number | null
  lon: number | null
  lat: number | null
}

export interface AddressTransaction {
  idMutation: string
  date: string | null
  nature: string | null
  valeurFonciere: number | null
  typeLocal: string | null
  surfaceBati: number | null
  surfaceCarrez: number | null
  nombrePieces: number | null
  idParcelle: string | null
}

export interface AddressDpe {
  numeroDpe: string
  date: string | null
  dateFinValidite: string | null
  etiquetteDpe: string | null
  etiquetteGes: string | null
  consoPrimaire: number | null
  emissionGes: number | null
  typeBatiment: string | null
  surface: number | null
}

export interface Address {
  banId: string
  numero: string | null
  voie: string | null
  codePostal: string | null
  commune: string | null
  communeCode: string | null
  lon: number | null
  lat: number | null
  parcelles: AddressParcelleRef[]
  transactions: AddressTransaction[]
  dpes: AddressDpe[]
}

export interface RisqueDisplay {
  id: string
  libelle: string
  adresse: string
  commune: string
  type: 'naturel' | 'technologique'
}

export interface ParcelleRisques {
  risques: RisqueDisplay[]
}

export interface MonumentHistorique {
  reference: string
  denomination: string | null
  titre: string | null
  commune: string | null
  protection: 'classé' | 'inscrit'
  distanceM: number
}

export interface ParcellePatrimoine {
  monuments: MonumentHistorique[]
  enPerimetreAbf: boolean
  importRequired?: boolean
}

export interface BatimentBdnb {
  batimentGroupeId: string
  anneeConstruction: number | null
  nbLogements: number | null
  usageNiveau1: string | null
  millesime: string
}

export interface ApiCollection<T> {
  'hydra:member': T[]
  'hydra:totalItems': number
  'hydra:view'?: {
    '@id': string
    'hydra:first'?: string
    'hydra:last'?: string
    'hydra:next'?: string
  }
}

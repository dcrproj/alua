<?php

declare(strict_types=1);

namespace App\Controller;

use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class ParcelleDataController extends AbstractController
{
    public function __construct(
        private readonly Connection $connection,
        private readonly HttpClientInterface $http,
    ) {}

    #[Route('/api/parcelles/{idParcelle}/transactions', methods: ['GET'])]
    public function transactions(string $idParcelle): JsonResponse
    {
        $parcelleUuid = $this->connection->fetchOne(
            'SELECT id FROM parcelles WHERE id_parcelle = :id',
            ['id' => $idParcelle]
        );

        if (!$parcelleUuid) {
            return $this->json(['items' => [], 'updatedAt' => null]);
        }

        $rows = $this->connection->fetchAllAssociative(
            "SELECT m.id_mutation, m.date_mutation, m.nature_mutation, m.valeur_fonciere,
                    json_agg(json_build_object(
                        'typeLocal',     l.type_local,
                        'surfaceBati',   l.surface_reelle_bati,
                        'surfaceTerrain',l.surface_terrain,
                        'surfaceCarrez', l.surface_carrez,
                        'nombrePieces',  l.nombre_pieces_principales
                    ) ORDER BY l.type_local NULLS LAST) AS lots
             FROM mutations_dvf_lots l
             JOIN mutations_dvf m ON m.id = l.mutation_dvf_id
             WHERE l.parcelle_id = :id
             GROUP BY m.id, m.id_mutation, m.date_mutation, m.nature_mutation, m.valeur_fonciere
             ORDER BY m.date_mutation DESC
             LIMIT 100",
            ['id' => $parcelleUuid]
        );

        $updatedAt = $this->connection->fetchOne(
            'SELECT MAX(m.created_at)
             FROM mutations_dvf m
             JOIN mutations_dvf_lots l ON l.mutation_dvf_id = m.id
             WHERE l.parcelle_id = :id',
            ['id' => $parcelleUuid]
        );

        $items = array_map(fn(array $r) => [
            'idMutation'    => $r['id_mutation'],
            'date'          => $r['date_mutation'],
            'nature'        => $r['nature_mutation'],
            'valeurFonciere'=> $r['valeur_fonciere'] !== null ? (float) $r['valeur_fonciere'] : null,
            'lots'          => json_decode($r['lots'], true),
        ], $rows);

        return $this->json(['items' => $items, 'updatedAt' => $updatedAt ?: null]);
    }

    #[Route('/api/parcelles/{idParcelle}/dpes', methods: ['GET'])]
    public function dpes(string $idParcelle): JsonResponse
    {
        $parcelleUuid = $this->connection->fetchOne(
            'SELECT id FROM parcelles WHERE id_parcelle = :id',
            ['id' => $idParcelle]
        );

        if (!$parcelleUuid) {
            return $this->json(['items' => [], 'updatedAt' => null]);
        }

        $rows = $this->connection->fetchAllAssociative(
            'SELECT d.numero_dpe, d.date_etablissement, d.date_fin_validite,
                    d.etiquette_dpe, d.etiquette_ges,
                    d.conso_primaire, d.emission_ges,
                    d.type_batiment, d.surface_habitable,
                    d.periode_construction, d.type_energie_chauffage,
                    a.numero AS addr_numero, a.voie AS addr_voie
             FROM dpes d
             JOIN parcelles_addresses pa ON pa.address_id = d.address_id
             LEFT JOIN addresses a ON a.id = d.address_id
             WHERE pa.parcelle_id = :id
               AND d.address_id IS NOT NULL
             ORDER BY d.date_etablissement DESC
             LIMIT 20',
            ['id' => $parcelleUuid]
        );

        $updatedAt = $this->connection->fetchOne(
            'SELECT MAX(d.created_at)
             FROM dpes d
             JOIN parcelles_addresses pa ON pa.address_id = d.address_id
             WHERE pa.parcelle_id = :id AND d.address_id IS NOT NULL',
            ['id' => $parcelleUuid]
        );

        $items = array_map(fn(array $r) => [
            'numeroDpe'          => $r['numero_dpe'],
            'date'               => $r['date_etablissement'],
            'dateFinValidite'    => $r['date_fin_validite'],
            'etiquetteDpe'       => $r['etiquette_dpe'],
            'etiquetteGes'       => $r['etiquette_ges'],
            'consoPrimaire'      => $r['conso_primaire'] !== null ? (float) $r['conso_primaire'] : null,
            'emissionGes'        => $r['emission_ges'] !== null ? (float) $r['emission_ges'] : null,
            'typeBatiment'       => $r['type_batiment'],
            'surface'            => $r['surface_habitable'] !== null ? (float) $r['surface_habitable'] : null,
            'periodeConstruction'=> $r['periode_construction'],
            'energieChauffage'   => $r['type_energie_chauffage'],
            'adresse'            => trim(($r['addr_numero'] ?? '') . ' ' . ($r['addr_voie'] ?? '')) ?: null,
        ], $rows);

        return $this->json(['items' => $items, 'updatedAt' => $updatedAt ?: null]);
    }

    #[Route('/api/parcelles/{idParcelle}/risques', methods: ['GET'])]
    public function risques(string $idParcelle): JsonResponse
    {
        $row = $this->connection->fetchAssociative(
            'SELECT commune_code, ST_X(centroid) AS lon, ST_Y(centroid) AS lat
             FROM parcelles WHERE id_parcelle = :id',
            ['id' => $idParcelle]
        );

        if (!$row || $row['lon'] === null) {
            return $this->json(['risques' => []]);
        }

        $lon    = (float) $row['lon'];
        $lat    = (float) $row['lat'];
        $code   = $row['commune_code'];
        $latlon = "$lon,$lat";

        // 5 requêtes en parallèle
        $reqGasparAddr    = $this->http->request('GET', 'https://georisques.gouv.fr/api/v1/gaspar/risques', ['query' => ['latlon' => $latlon, 'rayon' => 500]]);
        $reqGasparCommune = $this->http->request('GET', 'https://georisques.gouv.fr/api/v1/gaspar/risques', ['query' => ['code_insee' => $code]]);
        $reqRadon         = $this->http->request('GET', 'https://georisques.gouv.fr/api/v1/radon',           ['query' => ['code_insee' => $code]]);
        $reqSeisme        = $this->http->request('GET', 'https://georisques.gouv.fr/api/v1/zonage_sismique',  ['query' => ['code_insee' => $code]]);
        $reqRga           = $this->http->request('GET', 'https://georisques.gouv.fr/api/v1/rga',             ['query' => ['latlon' => $latlon]]);

        // Codes GASPAR : addr = filtré sur la commune de la parcelle, commune = tous
        $addrCodes    = $this->extractGasparCodes($reqGasparAddr, $code);
        $communeCodes = $this->extractGasparCodes($reqGasparCommune, null);

        // Radon
        $radonLabel = 'Non renseigné';
        try {
            $d = $reqRadon->toArray();
            $classe = (int) ($d['data'][0]['classe_potentiel'] ?? 0);
            if ($classe > 0) {
                $radonLabel = match ($classe) {
                    1 => 'Faible',
                    2 => 'Moyen',
                    3 => 'Significatif',
                    default => "Classe $classe",
                };
            }
        } catch (\Throwable) {}

        // Séisme
        $seismeLabel = 'Non renseigné';
        try {
            $d = $reqSeisme->toArray();
            if (!empty($d['data'][0])) {
                $zone = (int) ($d['data'][0]['code_zone'] ?? 0);
                $seismeLabel = match ($zone) {
                    1 => 'Très faible',
                    2 => 'Faible',
                    3 => 'Modéré',
                    4 => 'Moyen',
                    5 => 'Fort',
                    default => $d['data'][0]['zone_sismicite'] ?? 'Non renseigné',
                };
            }
        } catch (\Throwable) {}

        // RGA via API Géorisques (pas besoin d'import shapefile)
        $rgaLabel = 'Non renseigné';
        try {
            $d = $reqRga->toArray(false);
            $expo = $d['codeExposition'] ?? null;
            if ($expo !== null) {
                $rgaLabel = match ((int) $expo) {
                    1 => 'Faible',
                    2 => 'Moyen',
                    3 => 'Important',
                    4 => 'Très important',
                    default => $d['exposition'] ?? 'Non renseigné',
                };
            }
        } catch (\Throwable) {}

        $risques = [
            ['id' => 'inondation', 'libelle' => 'Inondation',
             'adresse' => $this->gasparNiveau($addrCodes,    '11', ['116']),
             'commune' => $this->gasparNiveau($communeCodes, '11', ['116']),
             'type' => 'naturel'],

            ['id' => 'nappes', 'libelle' => 'Remontée de nappe',
             'adresse' => $this->gasparNiveau($addrCodes,    '116'),
             'commune' => $this->gasparNiveau($communeCodes, '116'),
             'type' => 'naturel'],

            ['id' => 'seisme', 'libelle' => 'Séisme',
             'adresse' => $seismeLabel, 'commune' => $seismeLabel,
             'type' => 'naturel'],

            ['id' => 'mvt', 'libelle' => 'Mouvements de terrain',
             'adresse' => $this->gasparNiveau($addrCodes,    '12'),
             'commune' => $this->gasparNiveau($communeCodes, '12'),
             'type' => 'naturel'],

            ['id' => 'rga', 'libelle' => 'Retrait-gonflement des argiles',
             'adresse' => $rgaLabel, 'commune' => 'Non renseigné',
             'type' => 'naturel'],

            ['id' => 'radon', 'libelle' => 'Radon',
             'adresse' => $radonLabel, 'commune' => $radonLabel,
             'type' => 'naturel'],

            ['id' => 'sis', 'libelle' => 'Pollution des sols',
             'adresse' => 'Non renseigné', 'commune' => 'Non renseigné',
             'type' => 'technologique'],

            ['id' => 'barrage', 'libelle' => 'Rupture de barrage',
             'adresse' => $this->gasparNiveau($addrCodes,    '23'),
             'commune' => $this->gasparNiveau($communeCodes, '23'),
             'type' => 'technologique'],
        ];

        return $this->json(['risques' => $risques]);
    }

    #[Route('/api/parcelles/{idParcelle}/patrimoine', methods: ['GET'])]
    public function patrimoine(string $idParcelle): JsonResponse
    {
        $row = $this->connection->fetchAssociative(
            'SELECT ST_X(centroid) AS lon, ST_Y(centroid) AS lat
             FROM parcelles WHERE id_parcelle = :id',
            ['id' => $idParcelle]
        );

        if (!$row || $row['lon'] === null) {
            return $this->json(['monuments' => [], 'enPerimetreAbf' => false]);
        }

        // Vérifie que la table existe
        $exists = $this->connection->fetchOne(
            "SELECT 1 FROM information_schema.tables WHERE table_name = 'monuments_historiques' AND table_schema = 'public'"
        );
        if (!$exists) {
            return $this->json(['monuments' => [], 'enPerimetreAbf' => false, 'importRequired' => true]);
        }

        $lon = (float) $row['lon'];
        $lat = (float) $row['lat'];

        $monuments = $this->connection->fetchAllAssociative(
            "SELECT reference, denomination, titre, commune, protection,
                    ROUND(ST_Distance(
                        geometry::geography,
                        ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography
                    ))::int AS distance_m
             FROM monuments_historiques
             WHERE ST_DWithin(
                 geometry::geography,
                 ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                 500
             )
             ORDER BY distance_m
             LIMIT 10",
            ['lon' => $lon, 'lat' => $lat]
        );

        return $this->json([
            'monuments'      => array_map(fn(array $m) => [
                'reference'  => $m['reference'],
                'denomination'=> $m['denomination'],
                'titre'      => $m['titre'],
                'commune'    => $m['commune'],
                'protection' => $m['protection'],
                'distanceM'  => (int) $m['distance_m'],
            ], $monuments),
            'enPerimetreAbf' => count($monuments) > 0,
        ]);
    }

    #[Route('/api/parcelles/{idParcelle}/batiment', methods: ['GET'])]
    public function batiment(string $idParcelle): JsonResponse
    {
        $exists = $this->connection->fetchOne(
            "SELECT 1 FROM information_schema.tables WHERE table_name = 'batiment_bdnb' AND table_schema = 'public'"
        );
        if (!$exists) {
            return $this->json(['items' => [], 'updatedAt' => null, 'importRequired' => true]);
        }

        $rows = $this->connection->fetchAllAssociative(
            'SELECT batiment_groupe_id, annee_construction, nb_logements, usage_niveau_1, millesime
             FROM batiment_bdnb
             WHERE parcelle_id = :id
             ORDER BY nb_logements DESC NULLS LAST, annee_construction DESC NULLS LAST',
            ['id' => $idParcelle]
        );

        return $this->json([
            'items'     => array_map(fn(array $r) => [
                'batimentGroupeId'  => $r['batiment_groupe_id'],
                'anneeConstruction' => $r['annee_construction'] !== null ? (int) $r['annee_construction'] : null,
                'nbLogements'       => $r['nb_logements'] !== null ? (int) $r['nb_logements'] : null,
                'usageNiveau1'      => $r['usage_niveau_1'],
                'millesime'         => $r['millesime'],
            ], $rows),
            'updatedAt' => null,
        ]);
    }

    #[Route('/api/parcelles/{idParcelle}/coproprietes', methods: ['GET'])]
    public function coproprietes(string $idParcelle): JsonResponse
    {
        // 1. Lien direct via références cadastrales RNIC
        $rows = $this->connection->fetchAllAssociative(
            'SELECT c.no_immatriculation, c.nom, c.nb_lots_total, c.nb_lots_principaux,
                    c.nb_lots_habitation, c.nb_lots_stationnement, c.periode_construction,
                    c.type_syndic, c.representant_legal, c.date_reglement,
                    c.type_syndicat_copro, c.nb_asl, c.nb_aful, c.nb_unions_syndicat,
                    c.syndicat_cooperatif, c.residence_service, c.date_immatriculation
             FROM coproprietes c
             JOIN coproprietes_parcelles cp ON cp.no_immatriculation = c.no_immatriculation
             WHERE cp.parcelle_id = :id
             ORDER BY c.nb_lots_total DESC NULLS LAST',
            ['id' => $idParcelle]
        );

        // 2. Fallback proximité + matching adresse : le RNIC ne renseigne pas toujours les refs cadastrales
        if (empty($rows)) {
            $parcelInfo = $this->connection->fetchAssociative(
                'SELECT ST_X(p.centroid) AS lon, ST_Y(p.centroid) AS lat, a.numero AS num_ban
                 FROM parcelles p
                 LEFT JOIN parcelles_addresses pa ON pa.parcelle_id = p.id
                 LEFT JOIN addresses a ON a.id = pa.address_id
                 WHERE p.id_parcelle = :id
                 LIMIT 1',
                ['id' => $idParcelle]
            );

            if ($parcelInfo && $parcelInfo['lon'] !== null) {
                $lon   = (float) $parcelInfo['lon'];
                $lat   = (float) $parcelInfo['lat'];
                $delta = 0.0009; // bbox ~100 m

                $nearby = $this->connection->fetchAllAssociative(
                    'SELECT no_immatriculation, nom, nb_lots_total, nb_lots_principaux,
                            nb_lots_habitation, nb_lots_stationnement, periode_construction,
                            type_syndic, representant_legal, date_reglement,
                            type_syndicat_copro, nb_asl, nb_aful, nb_unions_syndicat,
                            syndicat_cooperatif, residence_service, date_immatriculation,
                            adresse_reference,
                            round((sqrt(power((lon - :lon) * 80600, 2) + power((lat - :lat) * 111000, 2)))::numeric, 1) AS dist_m
                     FROM coproprietes
                     WHERE lon BETWEEN :lonMin AND :lonMax
                       AND lat BETWEEN :latMin AND :latMax
                       AND lon IS NOT NULL AND lat IS NOT NULL
                     ORDER BY dist_m
                     LIMIT 5',
                    [
                        'lon'    => $lon,    'lat'    => $lat,
                        'lonMin' => $lon - $delta, 'lonMax' => $lon + $delta,
                        'latMin' => $lat - $delta, 'latMax' => $lat + $delta,
                    ]
                );

                $numBan = trim((string) ($parcelInfo['num_ban'] ?? ''));

                $rows = array_values(array_filter($nearby, function (array $r) use ($numBan): bool {
                    if ((float) $r['dist_m'] > 30.0) return false;

                    $adrRef = trim((string) ($r['adresse_reference'] ?? ''));
                    if ($adrRef === '' || $numBan === '') return true; // pas d'info pour comparer

                    // Extraire le numéro de rue en tête de l'adresse RNIC
                    preg_match('/^\s*(\d+)/u', $adrRef, $m);
                    $numRnic = $m[1] ?? null;

                    return $numRnic === null || $numRnic === $numBan;
                }));
            }
        }

        $toItem = fn(array $r) => [
            'noImmatriculation'   => $r['no_immatriculation'],
            'nom'                 => $r['nom'],
            'representantLegal'   => $r['representant_legal'],
            'dateReglement'       => $r['date_reglement'],
            'nbLotsTotal'         => $r['nb_lots_total'] !== null ? (int) $r['nb_lots_total'] : null,
            'nbLotsPrincipaux'    => $r['nb_lots_principaux'] !== null ? (int) $r['nb_lots_principaux'] : null,
            'nbLotsHabitation'    => $r['nb_lots_habitation'] !== null ? (int) $r['nb_lots_habitation'] : null,
            'nbLotsStationnement' => $r['nb_lots_stationnement'] !== null ? (int) $r['nb_lots_stationnement'] : null,
            'periodeConstruction' => $r['periode_construction'],
            'typeSyndic'          => $r['type_syndic'],
            'typeSyndicatCopro'   => $r['type_syndicat_copro'],
            'nbAsl'               => $r['nb_asl'] !== null ? (int) $r['nb_asl'] : null,
            'nbAful'              => $r['nb_aful'] !== null ? (int) $r['nb_aful'] : null,
            'nbUnionsSyndicat'    => $r['nb_unions_syndicat'] !== null ? (int) $r['nb_unions_syndicat'] : null,
            'syndicatCooperatif'  => $r['syndicat_cooperatif'] !== null ? ($r['syndicat_cooperatif'] === 't' || $r['syndicat_cooperatif'] === true) : null,
            'residenceService'    => $r['residence_service'] !== null ? ($r['residence_service'] === 't' || $r['residence_service'] === true) : null,
            'dateImmatriculation' => $r['date_immatriculation'],
        ];

        return $this->json([
            'items'     => array_map($toItem, $rows),
            'updatedAt' => null,
        ]);
    }

    #[Route('/api/parcelles/{idParcelle}/permis', methods: ['GET'])]
    public function permis(string $idParcelle): JsonResponse
    {
        $exists = $this->connection->fetchOne(
            "SELECT 1 FROM information_schema.tables WHERE table_name = 'sitadel_permis' AND table_schema = 'public'"
        );
        if (!$exists) {
            return $this->json(['items' => [], 'updatedAt' => null, 'importRequired' => true]);
        }

        $rows = $this->connection->fetchAllAssociative(
            "SELECT sp.num_dau, sp.type_dau, sp.etat_dau, sp.commune_code, sp.an_depot,
                    sp.date_autorisation, sp.date_doc, sp.date_daact,
                    sp.nature_projet,
                    sp.nb_logements_crees, sp.nb_logements_demolis,
                    sp.surf_hab_creee, sp.surf_loc_creee
             FROM sitadel_permis sp
             JOIN parcelles p ON p.id_parcelle = :id
             WHERE sp.commune_code = p.commune_code
               AND (
                 (sp.sec_cadastre1 IS NOT NULL AND UPPER(sp.sec_cadastre1) = UPPER(p.section)
                  AND LPAD(sp.num_cadastre1, 4, '0') = p.numero)
                 OR
                 (sp.sec_cadastre2 IS NOT NULL AND UPPER(sp.sec_cadastre2) = UPPER(p.section)
                  AND LPAD(sp.num_cadastre2, 4, '0') = p.numero)
                 OR
                 (sp.sec_cadastre3 IS NOT NULL AND UPPER(sp.sec_cadastre3) = UPPER(p.section)
                  AND LPAD(sp.num_cadastre3, 4, '0') = p.numero)
               )
             ORDER BY sp.date_autorisation DESC NULLS LAST
             LIMIT 20",
            ['id' => $idParcelle]
        );

        $etatLabels = [
            5 => 'Autorisé', 6 => 'Commencé', 7 => 'Achevé',
            8 => 'Caduc',    9 => 'Annulé',   4 => 'Refusé',
        ];
        $natureLabels = [
            1 => 'Construction neuve',
            2 => 'Extension',
            3 => 'Transformation',
            4 => 'Changement de destination',
        ];
        $typeLabels = [
            'PC' => 'Permis de construire',
            'DP' => 'Déclaration préalable',
            'PA' => "Permis d'aménager",
            'PD' => 'Permis de démolir',
        ];

        $items = array_map(fn(array $r) => [
            'numDau'             => $r['num_dau'],
            'typeDau'            => $r['type_dau'],
            'typeDauLibelle'     => $typeLabels[$r['type_dau']] ?? $r['type_dau'],
            'etatDau'            => $r['etat_dau'] !== null ? (int) $r['etat_dau'] : null,
            'etatDauLibelle'     => $etatLabels[(int) $r['etat_dau']] ?? null,
            'anDepot'            => $r['an_depot'] !== null ? (int) $r['an_depot'] : null,
            'dateAutorisation'   => $r['date_autorisation'],
            'dateDoc'            => $r['date_doc'],
            'dateDaact'          => $r['date_daact'],
            'natureProjet'       => $r['nature_projet'] !== null ? (int) $r['nature_projet'] : null,
            'natureProjetLibelle'=> $natureLabels[(int) ($r['nature_projet'] ?? 0)] ?? null,
            'nbLogementsCrees'   => $r['nb_logements_crees'] !== null ? (int) $r['nb_logements_crees'] : null,
            'nbLogementsDemolis' => $r['nb_logements_demolis'] !== null ? (int) $r['nb_logements_demolis'] : null,
            'surfHabCreee'       => $r['surf_hab_creee'] !== null ? (int) $r['surf_hab_creee'] : null,
            'surfLocCreee'       => $r['surf_loc_creee'] !== null ? (int) $r['surf_loc_creee'] : null,
        ], $rows);

        $updatedAt = $this->connection->fetchOne(
            "SELECT MIN(updated_at) FROM sitadel_permis LIMIT 1"
        );

        return $this->json(['items' => $items, 'updatedAt' => $updatedAt ?: null]);
    }

    #[Route('/api/parcelles/{idParcelle}/entreprises', methods: ['GET'])]
    public function entreprises(string $idParcelle): JsonResponse
    {
        $exists = $this->connection->fetchOne(
            "SELECT 1 FROM information_schema.tables WHERE table_name = 'sirene_etablissements' AND table_schema = 'public'"
        );
        if (!$exists) {
            return $this->json(['items' => [], 'updatedAt' => null, 'importRequired' => true]);
        }

        $rows = $this->connection->fetchAllAssociative(
            "SELECT se.siret, se.siren,
                    COALESCE(se.enseigne, se.denomination, ul.denomination) AS nom,
                    se.naf_code, se.est_siege, se.date_creation
             FROM sirene_etablissements se
             JOIN parcelles p ON p.id_parcelle = :id
             LEFT JOIN parcelles_addresses pa ON pa.parcelle_id = p.id
             LEFT JOIN addresses a ON a.id = pa.address_id
             LEFT JOIN sirene_unites_legales ul ON ul.siren = se.siren
             WHERE se.commune_code = p.commune_code
               AND se.geometry IS NOT NULL
               AND COALESCE(se.enseigne, se.denomination, ul.denomination) IS NOT NULL
               AND (
                 -- Adresse BAN connue : même numéro de rue + proximité large
                 (a.numero IS NOT NULL
                    AND se.numero_voie = a.numero
                    AND ST_DWithin(se.geometry::geography, p.centroid::geography, 200))
                 OR
                 -- Pas d'adresse BAN : proximité stricte uniquement
                 (a.numero IS NULL
                    AND ST_DWithin(se.geometry::geography, p.centroid::geography, 30))
               )
             ORDER BY
               se.est_siege DESC,
               se.date_creation DESC NULLS LAST
             LIMIT 20",
            ['id' => $idParcelle]
        );

        $updatedAt = $this->connection->fetchOne(
            "SELECT MIN(updated_at) FROM sirene_etablissements LIMIT 1"
        );

        // Libellés NAF par division (2 premiers chiffres)
        $nafDivisions = [
            '01'=>'Agriculture','02'=>'Sylviculture','03'=>'Pêche',
            '10'=>'Alimentation','11'=>'Boissons','13'=>'Textile','14'=>'Habillement',
            '16'=>'Bois/papier','17'=>'Papier','18'=>'Imprimerie','20'=>'Chimie',
            '21'=>'Pharma','22'=>'Plastique','23'=>'Matériaux','24'=>'Métallurgie',
            '25'=>'Prod. métalliques','26'=>'Électronique','27'=>'Équip. électrique',
            '28'=>'Machines','29'=>'Automobile','31'=>'Meubles','32'=>'Industries div.',
            '33'=>'Réparation','35'=>'Énergie','36'=>'Eau','38'=>'Déchets',
            '41'=>'Construction','42'=>'Génie civil','43'=>'Travaux spéciaux',
            '45'=>'Commerce auto','46'=>'Commerce gros','47'=>'Commerce détail',
            '49'=>'Transport','50'=>'Transport maritime','51'=>'Transport aérien',
            '52'=>'Logistique','53'=>'Courrier/colis',
            '55'=>'Hébergement','56'=>'Restauration',
            '58'=>'Édition','59'=>'Cinéma/TV','61'=>'Télécom','62'=>'Informatique','63'=>'Services info',
            '64'=>'Finance','65'=>'Assurance','66'=>'Services financiers',
            '68'=>'Immobilier',
            '69'=>'Juridique/compta','70'=>'Direction','71'=>'Architecture/ingé',
            '72'=>'R&D','73'=>'Publicité','74'=>'Activités spécialisées','75'=>'Vétérinaire',
            '77'=>'Location','78'=>'Intérim/RH','79'=>'Voyages','80'=>'Sécurité',
            '81'=>'Services bâtiment','82'=>'Services bureau',
            '84'=>'Administration publique',
            '85'=>'Enseignement',
            '86'=>'Santé','87'=>'Médico-social','88'=>'Action sociale',
            '90'=>'Arts/spectacles','91'=>'Musées/bibliothèques','92'=>'Jeux/paris','93'=>'Sports/loisirs',
            '94'=>'Associations','95'=>'Réparation','96'=>'Services personnels',
        ];

        $nafLibelle = fn(?string $code): ?string => $code
            ? ($nafDivisions[substr($code, 0, 2)] ?? null)
            : null;

        $items = array_map(fn(array $r) => [
            'siret'        => $r['siret'],
            'siren'        => $r['siren'],
            'nom'          => $r['nom'],
            'nafCode'      => $r['naf_code'],
            'nafLibelle'   => $nafLibelle($r['naf_code']),
            'estSiege'     => $r['est_siege'] === 't' || $r['est_siege'] === true,
            'dateCreation' => $r['date_creation'],
        ], $rows);

        return $this->json(['items' => $items, 'updatedAt' => $updatedAt ?: null]);
    }

    /** Extrait tous les num_risque GASPAR ; si $filterCommune != null, limite à cette commune. */
    private function extractGasparCodes(mixed $req, ?string $filterCommune): array
    {
        try {
            $codes = [];
            foreach (($req->toArray()['data'] ?? []) as $commune) {
                if ($filterCommune !== null && $commune['code_insee'] !== $filterCommune) continue;
                foreach ($commune['risques_detail'] ?? [] as $r) {
                    $codes[] = (string) $r['num_risque'];
                }
            }
            return $codes;
        } catch (\Throwable) {
            return [];
        }
    }

    /** Retourne 'Existant' si un code commence par $prefix (hors exclusions), sinon 'Pas de risque connu'. */
    private function gasparNiveau(array $codes, string $prefix, array $exclude = []): string
    {
        foreach ($codes as $code) {
            if (!str_starts_with($code, $prefix)) continue;
            foreach ($exclude as $e) {
                if (str_starts_with($code, $e)) continue 2;
            }
            return 'Existant';
        }
        return 'Pas de risque connu';
    }

    // ── POI (Overpass / OpenStreetMap) ───────────────────────────────────────

    #[Route('/api/parcelles/{idParcelle}/poi', methods: ['GET'])]
    public function poi(string $idParcelle): JsonResponse
    {
        // Cache hit (TTL 90 jours)
        $cached = $this->connection->fetchAssociative(
            "SELECT data, fetched_at FROM poi_cache
             WHERE id_parcelle = :id AND fetched_at > NOW() - INTERVAL '90 days'",
            ['id' => $idParcelle]
        );
        if ($cached) {
            return $this->json([
                'categories' => json_decode($cached['data'], true),
                'fetchedAt'  => $cached['fetched_at'],
            ]);
        }

        $centroid = $this->connection->fetchAssociative(
            'SELECT ST_Y(centroid) AS lat, ST_X(centroid) AS lon FROM parcelles WHERE id_parcelle = :id',
            ['id' => $idParcelle]
        );
        if (!$centroid || $centroid['lat'] === null) {
            return $this->json(['categories' => [], 'fetchedAt' => null]);
        }

        $categories = $this->fetchOverpassPoi((float) $centroid['lat'], (float) $centroid['lon']);

        $this->connection->executeStatement(
            'INSERT INTO poi_cache (id_parcelle, data, fetched_at)
             VALUES (:id, :data, NOW())
             ON CONFLICT (id_parcelle) DO UPDATE SET data = EXCLUDED.data, fetched_at = NOW()',
            ['id' => $idParcelle, 'data' => json_encode($categories)]
        );

        return $this->json([
            'categories' => $categories,
            'fetchedAt'  => (new \DateTimeImmutable())->format('c'),
        ]);
    }

    private function fetchOverpassPoi(float $lat, float $lon): array
    {
        $c = "$lat,$lon";
        $query = <<<OQL
[out:json][timeout:15];
(
  node["highway"="bus_stop"](around:600,$c);
  node["amenity"="bus_station"](around:800,$c);
  node["railway"~"^(station|halt|tram_stop|subway_entrance)$"](around:1000,$c);
  node["amenity"~"^(school|kindergarten)$"](around:1000,$c);
  node["amenity"~"^(university|college)$"](around:1500,$c);
  node["amenity"~"^(hospital|clinic|pharmacy|doctors)$"](around:1000,$c);
  node["shop"~"^(supermarket|convenience|bakery)$"](around:500,$c);
  node["amenity"="bank"](around:400,$c);
  node["leisure"~"^(park|sports_centre|fitness_centre|swimming_pool)$"](around:800,$c);
  way["leisure"="park"](around:800,$c);
  node["amenity"~"^(cinema|theatre)$"](around:1000,$c);
);
out center body;
OQL;

        $ctx  = stream_context_create(['http' => [
            'method'  => 'POST',
            'content' => 'data=' . urlencode($query),
            'header'  => "Content-Type: application/x-www-form-urlencoded\r\nUser-Agent: alua/1.0\r\n",
            'timeout' => 20,
        ]]);
        $resp = @file_get_contents('https://overpass-api.de/api/interpreter', false, $ctx);
        if (!$resp) return [];

        $data = json_decode($resp, true);
        if (!isset($data['elements'])) return [];

        return $this->categorizePoiElements($data['elements'], $lat, $lon);
    }

    private function categorizePoiElements(array $elements, float $refLat, float $refLon): array
    {
        $cats = [
            'transport' => ['label' => 'Transports',      'items' => []],
            'education' => ['label' => 'Éducation',        'items' => []],
            'sante'     => ['label' => 'Santé',            'items' => []],
            'commerce'  => ['label' => 'Commerces',        'items' => []],
            'loisirs'   => ['label' => 'Loisirs & Sport',  'items' => []],
        ];

        foreach ($elements as $el) {
            $tags  = $el['tags'] ?? [];
            $elLat = (float) ($el['lat'] ?? $el['center']['lat'] ?? 0);
            $elLon = (float) ($el['lon'] ?? $el['center']['lon'] ?? 0);
            if (!$elLat) continue;

            [$cat, $type] = $this->classifyPoiTags($tags);
            if (!$cat) continue;

            $distM = (int) round(sqrt(
                pow(($refLat - $elLat) * 111320, 2) +
                pow(($refLon - $elLon) * 111320 * cos(deg2rad($refLat)), 2)
            ));

            $cats[$cat]['items'][] = [
                'name'  => isset($tags['name']) ? mb_substr($tags['name'], 0, 80) : null,
                'type'  => $type,
                'distM' => $distM,
            ];
        }

        foreach ($cats as &$cat) {
            usort($cat['items'], fn($a, $b) => $a['distM'] <=> $b['distM']);
            $cat['items'] = array_slice($cat['items'], 0, 5);
        }

        return array_values(array_filter($cats, fn($c) => !empty($c['items'])));
    }

    private function classifyPoiTags(array $tags): array
    {
        $amenity = $tags['amenity'] ?? null;
        $highway = $tags['highway'] ?? null;
        $railway = $tags['railway'] ?? null;
        $shop    = $tags['shop']    ?? null;
        $leisure = $tags['leisure'] ?? null;

        if ($highway === 'bus_stop')            return ['transport', 'Bus'];
        if ($amenity === 'bus_station')         return ['transport', 'Bus'];
        if ($railway === 'station')             return ['transport', 'Gare'];
        if ($railway === 'halt')                return ['transport', 'Halte ferroviaire'];
        if ($railway === 'tram_stop')           return ['transport', 'Tramway'];
        if ($railway === 'subway_entrance')     return ['transport', 'Métro'];

        if ($amenity === 'kindergarten')        return ['education', 'Maternelle'];
        if ($amenity === 'school')              return ['education', 'École'];
        if ($amenity === 'college')             return ['education', 'Collège/Lycée'];
        if ($amenity === 'university')          return ['education', 'Université'];

        if ($amenity === 'hospital')            return ['sante', 'Hôpital'];
        if ($amenity === 'clinic')              return ['sante', 'Clinique'];
        if ($amenity === 'pharmacy')            return ['sante', 'Pharmacie'];
        if ($amenity === 'doctors')             return ['sante', 'Médecin'];

        if ($shop === 'supermarket')            return ['commerce', 'Supermarché'];
        if ($shop === 'convenience')            return ['commerce', 'Épicerie'];
        if ($shop === 'bakery')                 return ['commerce', 'Boulangerie'];
        if ($amenity === 'bank')                return ['commerce', 'Banque'];

        if ($leisure === 'park')                return ['loisirs', 'Parc'];
        if ($leisure === 'sports_centre')       return ['loisirs', 'Centre sportif'];
        if ($leisure === 'fitness_centre')      return ['loisirs', 'Salle de sport'];
        if ($leisure === 'swimming_pool')       return ['loisirs', 'Piscine'];
        if ($amenity === 'cinema')              return ['loisirs', 'Cinéma'];
        if ($amenity === 'theatre')             return ['loisirs', 'Théâtre'];

        return [null, null];
    }
}

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
}

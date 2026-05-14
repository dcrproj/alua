<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\ParcelleOutput;
use Doctrine\DBAL\Connection;

final class ParcelleStateProvider implements ProviderInterface
{
    public function __construct(private readonly Connection $connection) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): ?ParcelleOutput
    {
        $idParcelle = $uriVariables['idParcelle'] ?? null;
        if (!$idParcelle) {
            return null;
        }

        $row = $this->connection->fetchAssociative(
            'SELECT p.id, p.id_parcelle, p.commune_code, p.section, p.numero, p.contenance,
                    ST_X(p.centroid) as lon, ST_Y(p.centroid) as lat,
                    a.ban_id, a.numero as addr_numero, a.voie, a.code_postal, a.commune
             FROM parcelles p
             LEFT JOIN parcelles_addresses pa ON pa.parcelle_id = p.id
             LEFT JOIN addresses a ON a.id = pa.address_id
             WHERE p.id_parcelle = :id',
            ['id' => $idParcelle]
        );

        if (!$row) {
            return null;
        }

        $output = new ParcelleOutput();
        $output->idParcelle  = $row['id_parcelle'];
        $output->communeCode = $row['commune_code'];
        $output->section     = $row['section'];
        $output->numero      = $row['numero'];
        $output->contenance  = $row['contenance'] !== null ? (int) $row['contenance'] : null;

        if ($row['lon'] !== null) {
            $output->centroid = ['lon' => (float) $row['lon'], 'lat' => (float) $row['lat']];
        }

        if ($row['ban_id']) {
            $output->address = [
                'banId'      => $row['ban_id'],
                'numero'     => $row['addr_numero'],
                'voie'       => $row['voie'],
                'codePostal' => $row['code_postal'],
                'commune'    => $row['commune'],
            ];
        }

        return $output;
    }

    private function fetchTransactions(string $parcelleUuid): array
    {
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
             LIMIT 20",
            ['id' => $parcelleUuid]
        );

        return array_map(fn(array $r) => [
            'idMutation'    => $r['id_mutation'],
            'date'          => $r['date_mutation'],
            'nature'        => $r['nature_mutation'],
            'valeurFonciere'=> $r['valeur_fonciere'] !== null ? (float) $r['valeur_fonciere'] : null,
            'lots'          => json_decode($r['lots'], true),
        ], $rows);
    }

    private function fetchDpes(string $parcelleUuid): array
    {
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
             LIMIT 5',
            ['id' => $parcelleUuid]
        );

        return array_map(fn(array $r) => [
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
    }
}

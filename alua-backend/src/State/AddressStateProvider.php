<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\AddressOutput;
use Doctrine\DBAL\Connection;

final class AddressStateProvider implements ProviderInterface
{
    public function __construct(private readonly Connection $connection) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): ?AddressOutput
    {
        $banId = $uriVariables['banId'] ?? null;
        if (!$banId) {
            return null;
        }

        $row = $this->connection->fetchAssociative(
            'SELECT a.id, a.ban_id, a.numero, a.voie, a.code_postal, a.commune, a.commune_code,
                    ST_X(a.geometry) as lon, ST_Y(a.geometry) as lat,
                    c.slug AS commune_slug
             FROM addresses a
             LEFT JOIN communes c ON c.code_insee = a.commune_code
             WHERE a.ban_id = :ban_id',
            ['ban_id' => $banId]
        );

        if (!$row) {
            return null;
        }

        $output = new AddressOutput();
        $output->banId       = $row['ban_id'];
        $output->numero      = $row['numero'];
        $output->voie        = $row['voie'];
        $output->codePostal  = $row['code_postal'];
        $output->commune     = $row['commune'];
        $output->communeCode = $row['commune_code'];
        $output->communeSlug = $row['commune_slug'] ?? null;
        $output->lon         = $row['lon'] !== null ? (float) $row['lon'] : null;
        $output->lat         = $row['lat'] !== null ? (float) $row['lat'] : null;

        $output->parcelles    = $this->fetchParcelles($row['id']);
        $output->dpes         = $this->fetchDpes($row['id']);
        $output->transactions = $this->fetchTransactions($row['id']);

        return $output;
    }

    private function fetchParcelles(string $addressUuid): array
    {
        $rows = $this->connection->fetchAllAssociative(
            'SELECT p.id_parcelle, p.section, p.numero, p.contenance,
                    ST_X(p.centroid) as lon, ST_Y(p.centroid) as lat
             FROM parcelles p
             JOIN parcelles_addresses pa ON pa.parcelle_id = p.id
             WHERE pa.address_id = :id',
            ['id' => $addressUuid]
        );

        return array_map(fn(array $r) => [
            'idParcelle' => $r['id_parcelle'],
            'section'    => $r['section'],
            'numero'     => $r['numero'],
            'contenance' => $r['contenance'] !== null ? (int) $r['contenance'] : null,
            'lon'        => $r['lon'] !== null ? (float) $r['lon'] : null,
            'lat'        => $r['lat'] !== null ? (float) $r['lat'] : null,
        ], $rows);
    }

    private function fetchDpes(string $addressUuid): array
    {
        $rows = $this->connection->fetchAllAssociative(
            'SELECT numero_dpe, date_etablissement, date_fin_validite,
                    etiquette_dpe, etiquette_ges, conso_primaire, emission_ges,
                    type_batiment, surface_habitable
             FROM dpes
             WHERE address_id = :id
             ORDER BY date_etablissement DESC
             LIMIT 10',
            ['id' => $addressUuid]
        );

        return array_map(fn(array $r) => [
            'numeroDpe'      => $r['numero_dpe'],
            'date'           => $r['date_etablissement'],
            'dateFinValidite'=> $r['date_fin_validite'],
            'etiquetteDpe'   => $r['etiquette_dpe'],
            'etiquetteGes'   => $r['etiquette_ges'],
            'consoPrimaire'  => $r['conso_primaire'] !== null ? (float) $r['conso_primaire'] : null,
            'emissionGes'    => $r['emission_ges'] !== null ? (float) $r['emission_ges'] : null,
            'typeBatiment'   => $r['type_batiment'],
            'surface'        => $r['surface_habitable'] !== null ? (float) $r['surface_habitable'] : null,
        ], $rows);
    }

    private function fetchTransactions(string $addressUuid): array
    {
        $rows = $this->connection->fetchAllAssociative(
            'SELECT m.id_mutation, m.date_mutation, m.nature_mutation, m.valeur_fonciere,
                    l.type_local, l.surface_reelle_bati, l.surface_carrez,
                    l.nombre_pieces_principales, l.id_parcelle
             FROM mutations_dvf_lots l
             JOIN mutations_dvf m ON m.id = l.mutation_dvf_id
             WHERE l.address_id = :id
             ORDER BY m.date_mutation DESC
             LIMIT 20',
            ['id' => $addressUuid]
        );

        return array_map(fn(array $r) => [
            'idMutation'    => $r['id_mutation'],
            'date'          => $r['date_mutation'],
            'nature'        => $r['nature_mutation'],
            'valeurFonciere'=> $r['valeur_fonciere'] !== null ? (float) $r['valeur_fonciere'] : null,
            'typeLocal'     => $r['type_local'],
            'surfaceBati'   => $r['surface_reelle_bati'] !== null ? (float) $r['surface_reelle_bati'] : null,
            'surfaceCarrez' => $r['surface_carrez'] !== null ? (float) $r['surface_carrez'] : null,
            'nombrePieces'  => $r['nombre_pieces_principales'] !== null ? (int) $r['nombre_pieces_principales'] : null,
            'idParcelle'    => $r['id_parcelle'],
        ], $rows);
    }
}

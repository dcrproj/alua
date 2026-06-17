<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\DepartementOutput;
use Doctrine\DBAL\Connection;

final class DepartementStateProvider implements ProviderInterface
{
    public function __construct(private readonly Connection $connection) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): ?DepartementOutput
    {
        $slug = $uriVariables['slug'] ?? null;
        if (!$slug) {
            return null;
        }

        $row = $this->connection->fetchAssociative(
            'SELECT d.code, d.nom, d.slug, d.code_region,
                    r.nom AS nom_region, r.slug AS slug_region
             FROM departements d
             LEFT JOIN regions r ON r.code = d.code_region
             WHERE d.slug = :slug',
            ['slug' => $slug]
        );
        if (!$row) {
            $row = $this->connection->fetchAssociative(
                'SELECT d.code, d.nom, d.slug, d.code_region,
                        r.nom AS nom_region, r.slug AS slug_region
                 FROM departements d
                 LEFT JOIN regions r ON r.code = d.code_region
                 WHERE d.code = :code',
                ['code' => strtoupper($slug)]
            );
        }
        if (!$row) {
            return null;
        }

        $output             = new DepartementOutput();
        $output->code       = $row['code'];
        $output->slug       = $row['slug'];
        $output->nom        = $row['nom'];
        $output->codeRegion = $row['code_region'];
        $output->nomRegion  = $row['nom_region'];
        $output->slugRegion = $row['slug_region'];

        $communeRows = $this->connection->fetchAllAssociative(
            'SELECT code_insee, nom, slug, population
             FROM communes WHERE code_departement = :code
             ORDER BY population DESC NULLS LAST LIMIT 50',
            ['code' => $row['code']]
        );
        $output->communes = array_map(fn(array $c) => [
            'codeInsee'  => $c['code_insee'],
            'nom'        => $c['nom'],
            'slug'       => $c['slug'],
            'population' => $c['population'] !== null ? (int) $c['population'] : null,
        ], $communeRows);

        $statsRow = $this->connection->fetchAssociative(
            'SELECT nb_communes_total, population_totale, nb_parcelles, nb_transactions,
                    nb_dpes, prix_median_m2, evolution_prix, distribution_dpe
             FROM stats_departements WHERE code_departement = :code',
            ['code' => $output->code]
        );

        if ($statsRow) {
            $output->nbCommunesTotal  = (int) ($statsRow['nb_communes_total'] ?? 0);
            $output->populationTotale = $statsRow['population_totale'] !== null ? (int) $statsRow['population_totale'] : null;
            $output->nbParcelles      = (int) ($statsRow['nb_parcelles'] ?? 0);
            $output->nbTransactions   = (int) ($statsRow['nb_transactions'] ?? 0);
            $output->nbDpes           = (int) ($statsRow['nb_dpes'] ?? 0);
            $output->prixMedianM2     = $statsRow['prix_median_m2'] !== null ? round((float) $statsRow['prix_median_m2'], 0) : null;
            $output->evolutionPrix    = json_decode($statsRow['evolution_prix'] ?? '[]', true) ?? [];
            $output->distributionDpe  = json_decode($statsRow['distribution_dpe'] ?? '{}', true) ?? [];
        }

        return $output;
    }
}

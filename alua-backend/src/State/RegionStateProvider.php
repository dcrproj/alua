<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\RegionOutput;
use Doctrine\DBAL\Connection;

final class RegionStateProvider implements ProviderInterface
{
    public function __construct(private readonly Connection $connection) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): ?RegionOutput
    {
        $slug = $uriVariables['slug'] ?? null;
        if (!$slug) {
            return null;
        }

        $row = $this->connection->fetchAssociative(
            'SELECT code, nom, slug FROM regions WHERE slug = :slug',
            ['slug' => $slug]
        );
        if (!$row) {
            $row = $this->connection->fetchAssociative(
                'SELECT code, nom, slug FROM regions WHERE code = :code',
                ['code' => $slug]
            );
        }
        if (!$row) {
            return null;
        }

        $output       = new RegionOutput();
        $output->code = $row['code'];
        $output->slug = $row['slug'];
        $output->nom  = $row['nom'];

        $deptRows = $this->connection->fetchAllAssociative(
            'SELECT code, nom, slug FROM departements WHERE code_region = :region ORDER BY nom',
            ['region' => $row['code']]
        );
        $output->departements = array_map(fn(array $d) => [
            'code' => $d['code'],
            'nom'  => $d['nom'],
            'slug' => $d['slug'],
        ], $deptRows);

        $statsRow = $this->connection->fetchAssociative(
            'SELECT nb_communes, population_totale, nb_parcelles, nb_transactions,
                    nb_dpes, prix_median_m2, evolution_prix
             FROM stats_regions WHERE code_region = :code',
            ['code' => $output->code]
        );

        if ($statsRow) {
            $output->nbCommunes       = (int) ($statsRow['nb_communes'] ?? 0);
            $output->populationTotale = $statsRow['population_totale'] !== null ? (int) $statsRow['population_totale'] : null;
            $output->nbParcelles      = (int) ($statsRow['nb_parcelles'] ?? 0);
            $output->nbTransactions   = (int) ($statsRow['nb_transactions'] ?? 0);
            $output->nbDpes           = (int) ($statsRow['nb_dpes'] ?? 0);
            $output->prixMedianM2     = $statsRow['prix_median_m2'] !== null ? round((float) $statsRow['prix_median_m2'], 0) : null;
            $output->evolutionPrix    = json_decode($statsRow['evolution_prix'] ?? '[]', true) ?? [];
        }

        return $output;
    }
}

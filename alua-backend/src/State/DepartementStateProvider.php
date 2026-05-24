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

        return $output;
    }
}

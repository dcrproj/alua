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

        return $output;
    }
}

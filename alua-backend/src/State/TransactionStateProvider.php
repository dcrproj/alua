<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\Pagination\TraversablePaginator;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\TransactionOutput;
use Doctrine\DBAL\Connection;

final class TransactionStateProvider implements ProviderInterface
{
    public function __construct(private readonly Connection $connection) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): TraversablePaginator
    {
        $filters       = $context['filters'] ?? [];
        $currentPage   = max(1, (int) ($filters['page'] ?? 1));
        $itemsPerPage  = min(100, max(1, (int) ($filters['itemsPerPage'] ?? 30)));
        $offset        = ($currentPage - 1) * $itemsPerPage;

        [$where, $params] = $this->buildWhere($filters);

        $total = (int) $this->connection->fetchOne(
            'SELECT COUNT(*) FROM mutations_dvf m' . $where,
            $params
        );

        $rows = $this->connection->fetchAllAssociative(
            'SELECT m.id, m.id_mutation, m.date_mutation, m.nature_mutation, m.valeur_fonciere,
                    m.code_commune, m.nom_commune, m.code_departement, m.nombre_lots
             FROM mutations_dvf m'
            . $where
            . ' ORDER BY m.date_mutation DESC'
            . ' LIMIT ' . $itemsPerPage . ' OFFSET ' . $offset,
            $params
        );

        $items = [];
        foreach ($rows as $row) {
            $items[] = $this->buildOutput($row);
        }

        return new TraversablePaginator(
            new \ArrayIterator($items),
            $currentPage,
            $itemsPerPage,
            $total
        );
    }

    private function buildWhere(array $filters): array
    {
        $conditions = [];
        $params     = [];

        if (!empty($filters['commune'])) {
            $conditions[]         = 'm.code_commune = :commune';
            $params['commune']    = $filters['commune'];
        }

        if (!empty($filters['departement'])) {
            $conditions[]           = 'm.code_departement = :departement';
            $params['departement']  = $filters['departement'];
        }

        if (!empty($filters['nature'])) {
            $conditions[]      = 'm.nature_mutation = :nature';
            $params['nature']  = $filters['nature'];
        }

        if (!empty($filters['dateMin'])) {
            $conditions[]        = 'm.date_mutation >= :date_min';
            $params['date_min']  = $filters['dateMin'];
        }

        if (!empty($filters['dateMax'])) {
            $conditions[]        = 'm.date_mutation <= :date_max';
            $params['date_max']  = $filters['dateMax'];
        }

        $where = $conditions ? ' WHERE ' . implode(' AND ', $conditions) : '';

        return [$where, $params];
    }

    private function buildOutput(array $row): TransactionOutput
    {
        $output = new TransactionOutput();
        $output->idMutation     = $row['id_mutation'];
        $output->dateMutation   = $row['date_mutation'];
        $output->natureMutation = $row['nature_mutation'];
        $output->valeurFonciere = $row['valeur_fonciere'] !== null ? (float) $row['valeur_fonciere'] : null;
        $output->codeCommune    = $row['code_commune'];
        $output->nomCommune     = $row['nom_commune'];
        $output->codeDepartement = $row['code_departement'];
        $output->nombreLots     = $row['nombre_lots'] !== null ? (int) $row['nombre_lots'] : null;

        $lots = $this->connection->fetchAllAssociative(
            'SELECT id_parcelle, type_local, surface_reelle_bati, surface_terrain,
                    surface_carrez, nombre_pieces_principales
             FROM mutations_dvf_lots
             WHERE mutation_dvf_id = :id',
            ['id' => $row['id']]
        );

        $output->lots = array_map(fn(array $l) => [
            'idParcelle'    => $l['id_parcelle'],
            'typeLocal'     => $l['type_local'],
            'surfaceBati'   => $l['surface_reelle_bati'] !== null ? (float) $l['surface_reelle_bati'] : null,
            'surfaceTerrain'=> $l['surface_terrain'] !== null ? (float) $l['surface_terrain'] : null,
            'surfaceCarrez' => $l['surface_carrez'] !== null ? (float) $l['surface_carrez'] : null,
            'nombrePieces'  => $l['nombre_pieces_principales'] !== null ? (int) $l['nombre_pieces_principales'] : null,
        ], $lots);

        return $output;
    }
}

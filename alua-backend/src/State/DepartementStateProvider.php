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

        // Résolution slug → code (+ fallback code direct)
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

        $code = $row['code'];

        $output              = new DepartementOutput();
        $output->code        = $code;
        $output->slug        = $row['slug'];
        $output->nom         = $row['nom'];
        $output->codeRegion  = $row['code_region'];
        $output->nomRegion   = $row['nom_region'];
        $output->slugRegion  = $row['slug_region'];

        $communeCodes = $this->communeCodesForDept($code);
        if (empty($communeCodes)) {
            return $output;
        }

        $inList = implode(',', array_map(fn($c) => "'" . addslashes($c) . "'", $communeCodes));

        $output->nbTransactions = (int) $this->connection->fetchOne(
            "SELECT COUNT(*) FROM mutations_dvf WHERE code_commune IN ($inList)"
        );

        $output->prixMedianM2 = $this->prixMedian($inList);

        $output->nbDpes = (int) $this->connection->fetchOne(
            "SELECT COUNT(*) FROM dpes WHERE code_commune IN ($inList)"
        );

        $dpeRows = $this->connection->fetchAllAssociative(
            "SELECT etiquette_dpe, COUNT(*) AS nb
             FROM dpes
             WHERE code_commune IN ($inList) AND etiquette_dpe IS NOT NULL
             GROUP BY etiquette_dpe ORDER BY etiquette_dpe"
        );
        foreach ($dpeRows as $r) {
            $output->distributionDpe[$r['etiquette_dpe']] = (int) $r['nb'];
        }

        $evolRows = $this->connection->fetchAllAssociative(
            "SELECT EXTRACT(YEAR FROM m.date_mutation) AS annee,
                    COUNT(DISTINCT m.id) AS nb_ventes,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY m.valeur_fonciere / l.surface_reelle_bati) AS prix_median
             FROM mutations_dvf m
             JOIN mutations_dvf_lots l ON l.mutation_dvf_id = m.id
             WHERE m.code_commune IN ($inList)
               AND l.surface_reelle_bati > 0
               AND m.valeur_fonciere > 0
               AND m.nature_mutation = 'Vente'
             GROUP BY annee ORDER BY annee"
        );
        $output->evolutionPrix = array_map(fn(array $r) => [
            'annee'        => (int) $r['annee'],
            'nbVentes'     => (int) $r['nb_ventes'],
            'prixMedianM2' => $r['prix_median'] !== null ? round((float) $r['prix_median'], 0) : null,
        ], $evolRows);

        // Top 20 communes par population (pour le maillage interne)
        $communeRows = $this->connection->fetchAllAssociative(
            "SELECT code_insee, nom, slug, population
             FROM communes WHERE code_departement = :code
             ORDER BY population DESC NULLS LAST LIMIT 20",
            ['code' => $code]
        );
        $output->communes = array_map(fn(array $r) => [
            'codeInsee'  => $r['code_insee'],
            'nom'        => $r['nom'],
            'slug'       => $r['slug'],
            'population' => $r['population'] !== null ? (int) $r['population'] : null,
        ], $communeRows);

        return $output;
    }

    private function communeCodesForDept(string $code): array
    {
        return $this->connection->fetchFirstColumn(
            'SELECT code_insee FROM communes WHERE code_departement = :code',
            ['code' => $code]
        );
    }

    private function prixMedian(string $inList): ?float
    {
        $val = $this->connection->fetchOne(
            "SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY m.valeur_fonciere / l.surface_reelle_bati)
             FROM mutations_dvf m
             JOIN mutations_dvf_lots l ON l.mutation_dvf_id = m.id
             WHERE m.code_commune IN ($inList)
               AND l.surface_reelle_bati > 0
               AND m.valeur_fonciere > 0
               AND m.nature_mutation = 'Vente'
               AND m.date_mutation >= NOW() - INTERVAL '10 years'"
        );
        return ($val !== false && $val !== null) ? round((float) $val, 0) : null;
    }
}

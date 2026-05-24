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

        $code = $row['code'];

        $output       = new RegionOutput();
        $output->code = $code;
        $output->slug = $row['slug'];
        $output->nom  = $row['nom'];

        $output->nbTransactions = (int) $this->connection->fetchOne(
            "SELECT COUNT(*)
             FROM mutations_dvf m
             JOIN communes c ON c.code_insee = m.code_commune
             JOIN departements d ON d.code = c.code_departement
             WHERE d.code_region = :region",
            ['region' => $code]
        );

        $val = $this->connection->fetchOne(
            "SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY m.valeur_fonciere / l.surface_reelle_bati)
             FROM mutations_dvf m
             JOIN mutations_dvf_lots l ON l.mutation_dvf_id = m.id
             JOIN communes c ON c.code_insee = m.code_commune
             JOIN departements d ON d.code = c.code_departement
             WHERE d.code_region = :region
               AND l.surface_reelle_bati > 0
               AND m.valeur_fonciere > 0
               AND m.nature_mutation = 'Vente'
               AND m.date_mutation >= NOW() - INTERVAL '10 years'",
            ['region' => $code]
        );
        $output->prixMedianM2 = ($val !== false && $val !== null) ? round((float) $val, 0) : null;

        $output->nbDpes = (int) $this->connection->fetchOne(
            "SELECT COUNT(*)
             FROM dpes dp
             JOIN communes c ON c.code_insee = dp.code_commune
             JOIN departements d ON d.code = c.code_departement
             WHERE d.code_region = :region",
            ['region' => $code]
        );

        $dpeRows = $this->connection->fetchAllAssociative(
            "SELECT dp.etiquette_dpe, COUNT(*) AS nb
             FROM dpes dp
             JOIN communes c ON c.code_insee = dp.code_commune
             JOIN departements d ON d.code = c.code_departement
             WHERE d.code_region = :region AND dp.etiquette_dpe IS NOT NULL
             GROUP BY dp.etiquette_dpe ORDER BY dp.etiquette_dpe",
            ['region' => $code]
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
             JOIN communes c ON c.code_insee = m.code_commune
             JOIN departements d ON d.code = c.code_departement
             WHERE d.code_region = :region
               AND l.surface_reelle_bati > 0
               AND m.valeur_fonciere > 0
               AND m.nature_mutation = 'Vente'
             GROUP BY annee ORDER BY annee",
            ['region' => $code]
        );
        $output->evolutionPrix = array_map(fn(array $r) => [
            'annee'        => (int) $r['annee'],
            'nbVentes'     => (int) $r['nb_ventes'],
            'prixMedianM2' => $r['prix_median'] !== null ? round((float) $r['prix_median'], 0) : null,
        ], $evolRows);

        $output->departements = $this->deptList($code);

        return $output;
    }

    /** Retourne les départements de la région avec prix médian (requête unique). */
    private function deptList(string $regionCode): array
    {
        $rows = $this->connection->fetchAllAssociative(
            "SELECT d.code, d.nom, d.slug,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (
                        ORDER BY m.valeur_fonciere / l.surface_reelle_bati
                    ) AS prix_median
             FROM departements d
             LEFT JOIN communes c ON c.code_departement = d.code
             LEFT JOIN mutations_dvf m ON m.code_commune = c.code_insee
                 AND m.nature_mutation = 'Vente'
                 AND m.valeur_fonciere > 0
                 AND m.date_mutation >= NOW() - INTERVAL '10 years'
             LEFT JOIN mutations_dvf_lots l ON l.mutation_dvf_id = m.id
                 AND l.surface_reelle_bati > 0
             WHERE d.code_region = :region
             GROUP BY d.code, d.nom, d.slug
             ORDER BY d.nom",
            ['region' => $regionCode]
        );

        return array_map(fn(array $d) => [
            'code'         => $d['code'],
            'nom'          => $d['nom'],
            'slug'         => $d['slug'],
            'prixMedianM2' => ($d['prix_median'] !== null) ? round((float) $d['prix_median'], 0) : null,
        ], $rows);
    }
}

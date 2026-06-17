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

        $totalsRow = $this->connection->fetchAssociative(
            'SELECT COUNT(*) AS nb_communes, SUM(c.population) AS population_totale
             FROM communes c
             JOIN departements d ON d.code = c.code_departement
             WHERE d.code_region = :code',
            ['code' => $output->code]
        );
        $output->nbCommunes      = (int) ($totalsRow['nb_communes'] ?? 0);
        $output->populationTotale = $totalsRow['population_totale'] !== null ? (int) $totalsRow['population_totale'] : null;

        $output->nbParcelles = (int) $this->connection->fetchOne(
            'SELECT COUNT(*) FROM parcelles p
             JOIN communes c ON c.code_insee = p.commune_code
             JOIN departements d ON d.code = c.code_departement
             WHERE d.code_region = :code',
            ['code' => $output->code]
        );

        $output->nbTransactions = (int) $this->connection->fetchOne(
            'SELECT COUNT(*) FROM mutations_dvf m
             JOIN communes c ON c.code_insee = m.code_commune
             JOIN departements d ON d.code = c.code_departement
             WHERE d.code_region = :code',
            ['code' => $output->code]
        );

        $output->nbDpes = (int) $this->connection->fetchOne(
            'SELECT COUNT(*) FROM dpes dp
             JOIN communes c ON c.code_insee = dp.code_commune
             JOIN departements d ON d.code = c.code_departement
             WHERE d.code_region = :code',
            ['code' => $output->code]
        );

        $prixMedian = $this->connection->fetchOne(
            "SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY m.valeur_fonciere / l.surface_reelle_bati)
             FROM mutations_dvf m
             JOIN mutations_dvf_lots l ON l.mutation_dvf_id = m.id
             JOIN communes c ON c.code_insee = m.code_commune
             JOIN departements d ON d.code = c.code_departement
             WHERE d.code_region = :code
               AND l.surface_reelle_bati > 0
               AND m.valeur_fonciere > 0
               AND m.nature_mutation = 'Vente'
               AND m.date_mutation >= NOW() - INTERVAL '10 years'",
            ['code' => $output->code]
        );
        $output->prixMedianM2 = $prixMedian !== false && $prixMedian !== null ? round((float) $prixMedian, 0) : null;

        $evolRows = $this->connection->fetchAllAssociative(
            "SELECT EXTRACT(YEAR FROM m.date_mutation) AS annee,
                    COUNT(DISTINCT m.id) AS nb_ventes,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY m.valeur_fonciere / l.surface_reelle_bati) AS prix_median
             FROM mutations_dvf m
             JOIN mutations_dvf_lots l ON l.mutation_dvf_id = m.id
             JOIN communes c ON c.code_insee = m.code_commune
             JOIN departements d ON d.code = c.code_departement
             WHERE d.code_region = :code
               AND l.surface_reelle_bati > 0
               AND m.valeur_fonciere > 0
               AND m.nature_mutation = 'Vente'
               AND m.date_mutation >= NOW() - INTERVAL '5 years'
             GROUP BY annee
             ORDER BY annee",
            ['code' => $output->code]
        );
        $output->evolutionPrix = array_map(fn(array $r) => [
            'annee'        => (int) $r['annee'],
            'nbVentes'     => (int) $r['nb_ventes'],
            'prixMedianM2' => $r['prix_median'] !== null ? round((float) $r['prix_median'], 0) : null,
        ], $evolRows);

        return $output;
    }
}

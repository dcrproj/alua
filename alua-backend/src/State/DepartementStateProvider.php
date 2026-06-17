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

        $totalsRow = $this->connection->fetchAssociative(
            'SELECT COUNT(*) AS nb_communes, SUM(population) AS population_totale
             FROM communes WHERE code_departement = :code',
            ['code' => $output->code]
        );
        $output->nbCommunesTotal  = (int) ($totalsRow['nb_communes'] ?? 0);
        $output->populationTotale = $totalsRow['population_totale'] !== null ? (int) $totalsRow['population_totale'] : null;

        $output->nbParcelles = (int) $this->connection->fetchOne(
            'SELECT COUNT(*) FROM parcelles
             WHERE commune_code IN (SELECT code_insee FROM communes WHERE code_departement = :code)',
            ['code' => $output->code]
        );

        $output->nbTransactions = (int) $this->connection->fetchOne(
            'SELECT COUNT(*) FROM mutations_dvf
             WHERE code_commune IN (SELECT code_insee FROM communes WHERE code_departement = :code)',
            ['code' => $output->code]
        );

        $output->nbDpes = (int) $this->connection->fetchOne(
            'SELECT COUNT(*) FROM dpes
             WHERE code_commune IN (SELECT code_insee FROM communes WHERE code_departement = :code)',
            ['code' => $output->code]
        );

        $prixMedian = $this->connection->fetchOne(
            "SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY m.valeur_fonciere / l.surface_reelle_bati)
             FROM mutations_dvf m
             JOIN mutations_dvf_lots l ON l.mutation_dvf_id = m.id
             WHERE m.code_commune IN (SELECT code_insee FROM communes WHERE code_departement = :code)
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
             WHERE m.code_commune IN (SELECT code_insee FROM communes WHERE code_departement = :code)
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

        $dpeRows = $this->connection->fetchAllAssociative(
            "SELECT etiquette_dpe, COUNT(*) AS nb
             FROM dpes
             WHERE code_commune IN (SELECT code_insee FROM communes WHERE code_departement = :code)
               AND etiquette_dpe IS NOT NULL
             GROUP BY etiquette_dpe
             ORDER BY etiquette_dpe",
            ['code' => $output->code]
        );
        $dist = [];
        foreach ($dpeRows as $r) {
            $dist[$r['etiquette_dpe']] = (int) $r['nb'];
        }
        $output->distributionDpe = $dist;

        return $output;
    }
}

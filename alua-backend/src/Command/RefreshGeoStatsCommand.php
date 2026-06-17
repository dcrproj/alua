<?php

declare(strict_types=1);

namespace App\Command;

use Doctrine\DBAL\Connection;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:refresh-geo-stats',
    description: 'Recalcule les agrégats stats_departements et stats_regions (prix médian, comptages).',
)]
final class RefreshGeoStatsCommand extends Command
{
    public function __construct(private readonly Connection $connection)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        // Désactiver le statement_timeout pour cette session (requêtes longues intentionnelles)
        $this->connection->executeStatement('SET statement_timeout = 0');

        $this->refreshDepartements($io);
        $this->refreshRegions($io);

        $io->success('Agrégats géo recalculés.');

        return Command::SUCCESS;
    }

    private function refreshDepartements(SymfonyStyle $io): void
    {
        $codes = $this->connection->fetchFirstColumn('SELECT code FROM departements ORDER BY code');
        $io->writeln(sprintf('Départements : %d à traiter…', count($codes)));
        $progress = $io->createProgressBar(count($codes));
        $progress->start();

        foreach ($codes as $code) {
            $totals = $this->connection->fetchAssociative(
                'SELECT COUNT(*) AS nb_communes, SUM(population) AS population_totale
                 FROM communes WHERE code_departement = :code',
                ['code' => $code]
            );

            $nbParcelles = (int) $this->connection->fetchOne(
                'SELECT COUNT(*) FROM parcelles
                 WHERE commune_code IN (SELECT code_insee FROM communes WHERE code_departement = :code)',
                ['code' => $code]
            );

            $nbTransactions = (int) $this->connection->fetchOne(
                'SELECT COUNT(*) FROM mutations_dvf
                 WHERE code_commune IN (SELECT code_insee FROM communes WHERE code_departement = :code)',
                ['code' => $code]
            );

            $nbDpes = (int) $this->connection->fetchOne(
                'SELECT COUNT(*) FROM dpes
                 WHERE code_commune IN (SELECT code_insee FROM communes WHERE code_departement = :code)',
                ['code' => $code]
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
                ['code' => $code]
            );

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
                 GROUP BY annee ORDER BY annee",
                ['code' => $code]
            );

            $dpeRows = $this->connection->fetchAllAssociative(
                "SELECT etiquette_dpe, COUNT(*) AS nb
                 FROM dpes
                 WHERE code_commune IN (SELECT code_insee FROM communes WHERE code_departement = :code)
                   AND etiquette_dpe IS NOT NULL
                 GROUP BY etiquette_dpe ORDER BY etiquette_dpe",
                ['code' => $code]
            );

            $evolutionPrix = array_map(fn(array $r) => [
                'annee'        => (int) $r['annee'],
                'nbVentes'     => (int) $r['nb_ventes'],
                'prixMedianM2' => $r['prix_median'] !== null ? (int) round((float) $r['prix_median']) : null,
            ], $evolRows);

            $distributionDpe = [];
            foreach ($dpeRows as $r) {
                $distributionDpe[$r['etiquette_dpe']] = (int) $r['nb'];
            }

            $this->connection->executeStatement(
                'INSERT INTO stats_departements
                    (code_departement, nb_communes_total, population_totale, nb_parcelles,
                     nb_transactions, nb_dpes, prix_median_m2, evolution_prix, distribution_dpe, computed_at)
                 VALUES (:code, :nb_communes, :pop, :parcelles, :transactions, :dpes,
                         :prix, :evol::jsonb, :dist::jsonb, NOW())
                 ON CONFLICT (code_departement) DO UPDATE SET
                    nb_communes_total = EXCLUDED.nb_communes_total,
                    population_totale = EXCLUDED.population_totale,
                    nb_parcelles      = EXCLUDED.nb_parcelles,
                    nb_transactions   = EXCLUDED.nb_transactions,
                    nb_dpes           = EXCLUDED.nb_dpes,
                    prix_median_m2    = EXCLUDED.prix_median_m2,
                    evolution_prix    = EXCLUDED.evolution_prix,
                    distribution_dpe  = EXCLUDED.distribution_dpe,
                    computed_at       = NOW()',
                [
                    'code'         => $code,
                    'nb_communes'  => (int) ($totals['nb_communes'] ?? 0),
                    'pop'          => $totals['population_totale'] !== null ? (int) $totals['population_totale'] : null,
                    'parcelles'    => $nbParcelles,
                    'transactions' => $nbTransactions,
                    'dpes'         => $nbDpes,
                    'prix'         => $prixMedian !== false && $prixMedian !== null ? round((float) $prixMedian, 2) : null,
                    'evol'         => json_encode($evolutionPrix),
                    'dist'         => json_encode($distributionDpe),
                ]
            );

            $progress->advance();
        }

        $progress->finish();
        $io->newLine();
    }

    private function refreshRegions(SymfonyStyle $io): void
    {
        $codes = $this->connection->fetchFirstColumn('SELECT code FROM regions ORDER BY code');
        $io->writeln(sprintf('Régions : %d à traiter…', count($codes)));
        $progress = $io->createProgressBar(count($codes));
        $progress->start();

        foreach ($codes as $code) {
            $totals = $this->connection->fetchAssociative(
                'SELECT COUNT(*) AS nb_communes, SUM(c.population) AS population_totale
                 FROM communes c
                 JOIN departements d ON d.code = c.code_departement
                 WHERE d.code_region = :code',
                ['code' => $code]
            );

            $nbParcelles = (int) $this->connection->fetchOne(
                'SELECT COUNT(*) FROM parcelles p
                 JOIN communes c ON c.code_insee = p.commune_code
                 JOIN departements d ON d.code = c.code_departement
                 WHERE d.code_region = :code',
                ['code' => $code]
            );

            $nbTransactions = (int) $this->connection->fetchOne(
                'SELECT COUNT(*) FROM mutations_dvf m
                 JOIN communes c ON c.code_insee = m.code_commune
                 JOIN departements d ON d.code = c.code_departement
                 WHERE d.code_region = :code',
                ['code' => $code]
            );

            $nbDpes = (int) $this->connection->fetchOne(
                'SELECT COUNT(*) FROM dpes dp
                 JOIN communes c ON c.code_insee = dp.code_commune
                 JOIN departements d ON d.code = c.code_departement
                 WHERE d.code_region = :code',
                ['code' => $code]
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
                ['code' => $code]
            );

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
                 GROUP BY annee ORDER BY annee",
                ['code' => $code]
            );

            $evolutionPrix = array_map(fn(array $r) => [
                'annee'        => (int) $r['annee'],
                'nbVentes'     => (int) $r['nb_ventes'],
                'prixMedianM2' => $r['prix_median'] !== null ? (int) round((float) $r['prix_median']) : null,
            ], $evolRows);

            $this->connection->executeStatement(
                'INSERT INTO stats_regions
                    (code_region, nb_communes, population_totale, nb_parcelles,
                     nb_transactions, nb_dpes, prix_median_m2, evolution_prix, computed_at)
                 VALUES (:code, :nb_communes, :pop, :parcelles, :transactions, :dpes,
                         :prix, :evol::jsonb, NOW())
                 ON CONFLICT (code_region) DO UPDATE SET
                    nb_communes       = EXCLUDED.nb_communes,
                    population_totale = EXCLUDED.population_totale,
                    nb_parcelles      = EXCLUDED.nb_parcelles,
                    nb_transactions   = EXCLUDED.nb_transactions,
                    nb_dpes           = EXCLUDED.nb_dpes,
                    prix_median_m2    = EXCLUDED.prix_median_m2,
                    evolution_prix    = EXCLUDED.evolution_prix,
                    computed_at       = NOW()',
                [
                    'code'         => $code,
                    'nb_communes'  => (int) ($totals['nb_communes'] ?? 0),
                    'pop'          => $totals['population_totale'] !== null ? (int) $totals['population_totale'] : null,
                    'parcelles'    => $nbParcelles,
                    'transactions' => $nbTransactions,
                    'dpes'         => $nbDpes,
                    'prix'         => $prixMedian !== false && $prixMedian !== null ? round((float) $prixMedian, 2) : null,
                    'evol'         => json_encode($evolutionPrix),
                ]
            );

            $progress->advance();
        }

        $progress->finish();
        $io->newLine();
    }
}

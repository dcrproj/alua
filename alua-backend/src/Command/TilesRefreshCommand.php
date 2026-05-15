<?php

declare(strict_types=1);

namespace App\Command;

use Doctrine\DBAL\Connection;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:tiles:refresh',
    description: 'Create or refresh materialized views used by martin tile server',
)]
class TilesRefreshCommand extends Command
{
    public function __construct(private readonly Connection $connection)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('recreate', null, InputOption::VALUE_NONE, 'Drop and recreate views instead of refreshing');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('Tiles materialized views refresh');

        $recreate = (bool) $input->getOption('recreate');

        $this->refreshView(
            $io,
            'view_transactions_tiles',
            $this->sqlTransactions(),
            $recreate,
            [
                'CREATE UNIQUE INDEX ON view_transactions_tiles (id)',
                'CREATE INDEX ON view_transactions_tiles USING GIST(geometry)',
                'ANALYZE view_transactions_tiles',
            ]
        );

        $this->refreshView(
            $io,
            'view_dpe_tiles',
            $this->sqlDpe(),
            $recreate,
            [
                'CREATE UNIQUE INDEX ON view_dpe_tiles (id)',
                'CREATE INDEX ON view_dpe_tiles USING GIST(geometry)',
                'ANALYZE view_dpe_tiles',
            ]
        );

        $io->success('Done.');

        return Command::SUCCESS;
    }

    private function refreshView(SymfonyStyle $io, string $name, string $createSql, bool $recreate, array $postCreateSql): void
    {
        $exists = (bool) $this->connection->fetchOne(
            "SELECT 1 FROM pg_matviews WHERE matviewname = ?",
            [$name]
        );

        if ($exists && $recreate) {
            $io->text(sprintf('Dropping %s…', $name));
            $this->connection->executeStatement("DROP MATERIALIZED VIEW {$name}");
            $exists = false;
        }

        if (!$exists) {
            $io->text(sprintf('Creating %s…', $name));
            $this->connection->executeStatement("CREATE MATERIALIZED VIEW {$name} AS {$createSql}");
            foreach ($postCreateSql as $sql) {
                $this->connection->executeStatement($sql);
            }
            $io->text(sprintf('  ✓ Created %s', $name));
        } else {
            $io->text(sprintf('Refreshing %s…', $name));
            $this->connection->executeStatement("REFRESH MATERIALIZED VIEW CONCURRENTLY {$name}");
            $io->text(sprintf('  ✓ Refreshed %s', $name));
        }
    }

    private function sqlTransactions(): string
    {
        return "
            WITH lots_principaux AS (
                SELECT DISTINCT ON (l.mutation_dvf_id)
                    l.mutation_dvf_id,
                    l.longitude,
                    l.latitude,
                    l.surface_reelle_bati,
                    l.type_local
                FROM mutations_dvf_lots l
                WHERE l.longitude IS NOT NULL AND l.latitude IS NOT NULL
                ORDER BY l.mutation_dvf_id,
                    CASE WHEN l.type_local NOT IN ('Dépendance', 'Local industriel. commercial ou assimilé')
                         THEN 0 ELSE 1 END,
                    l.surface_reelle_bati DESC NULLS LAST
            )
            SELECT
                m.id,
                m.valeur_fonciere,
                m.code_commune,
                EXTRACT(YEAR FROM m.date_mutation)::int AS annee,
                lp.type_local,
                lp.surface_reelle_bati AS surface,
                CASE WHEN lp.surface_reelle_bati > 0 AND m.valeur_fonciere > 0
                     THEN ROUND(m.valeur_fonciere / lp.surface_reelle_bati)::int
                     ELSE NULL
                END AS prix_m2,
                ST_SetSRID(ST_MakePoint(lp.longitude, lp.latitude), 4326)::geometry(Point, 4326) AS geometry
            FROM mutations_dvf m
            JOIN lots_principaux lp ON lp.mutation_dvf_id = m.id
            WHERE m.nature_mutation = 'Vente'
              AND m.valeur_fonciere > 0
        ";
    }

    private function sqlDpe(): string
    {
        return "
            SELECT
                d.id,
                d.etiquette_dpe,
                d.etiquette_ges,
                d.type_batiment,
                d.surface_habitable,
                d.conso_primaire,
                d.code_commune,
                ST_SetSRID(ST_MakePoint(d.longitude, d.latitude), 4326)::geometry(Point, 4326) AS geometry
            FROM dpes d
            WHERE d.longitude IS NOT NULL
              AND d.latitude IS NOT NULL
              AND d.etiquette_dpe IS NOT NULL
        ";
    }
}

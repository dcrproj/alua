<?php

declare(strict_types=1);

namespace App\Command;

use Doctrine\DBAL\Connection;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Helper\ProgressBar;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:import:dvf',
    description: 'Import real-estate transactions from DVF (DGFiP) CSV files',
)]
class ImportDvfCommand extends Command
{
    // Historique complet depuis 2014 jusqu'à l'année précédente (publication annuelle DGFiP)
    private const YEARS = ['2014','2015','2016','2017','2018','2019','2020','2021','2022','2023','2024'];
    private const BASE_URL = 'https://files.data.gouv.fr/geo-dvf/latest/csv';
    private const BATCH_SIZE = 200;

    private const DEPARTMENTS = [
        '01','02','03','04','05','06','07','08','09','10',
        '11','12','13','14','15','16','17','18','19','2A',
        '2B','21','22','23','24','25','26','27','28','29',
        '30','31','32','33','34','35','36','37','38','39',
        '40','41','42','43','44','45','46','47','48','49',
        '50','51','52','53','54','55','56','57','58','59',
        '60','61','62','63','64','65','66','67','68','69',
        '70','71','72','73','74','75','76','77','78','79',
        '80','81','82','83','84','85','86','87','88','89',
        '90','91','92','93','94','95',
    ];

    public function __construct(private readonly Connection $connection)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('department', 'd', InputOption::VALUE_REQUIRED, 'Department code (ex: 32). Omit for --all.')
            ->addOption('all', null, InputOption::VALUE_NONE, 'Import all departments')
            ->addOption('year', 'y', InputOption::VALUE_REQUIRED, 'Single year to import (ex: 2023). Default: all years.')
            ->addOption('from-department', null, InputOption::VALUE_REQUIRED, 'Resume --all from this department (ex: 22 to skip 01–21).')
            ->addOption('skip-linking', null, InputOption::VALUE_NONE, 'Skip lot→parcelle linking step')
            ->addOption('only-link', null, InputOption::VALUE_NONE, 'Skip import, run only the lot→parcelle linking step')
            ->addOption('only-link-addresses', null, InputOption::VALUE_NONE, 'Run only the lot→address linking step');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        ini_set('memory_limit', '-1');
        $this->connection->getConfiguration()->setMiddlewares([]);
        $io = new SymfonyStyle($input, $output);
        $io->title('Import DVF — Demandes de Valeurs Foncières (DGFiP)');

        if ($input->getOption('only-link')) {
            $io->section('Liaison lots DVF ↔ Parcelles');
            $linked = $this->linkLotsToParcelles($io, $output);
            $io->success(sprintf('%s liaisons créées.', number_format($linked, 0, ',', ' ')));
            return Command::SUCCESS;
        }

        if ($input->getOption('only-link-addresses')) {
            $io->section('Liaison lots DVF ↔ Adresses');
            [$viaParcel, $viaKnn] = $this->linkLotsToAddresses($io, $output);
            $io->success(sprintf('%s liaisons créées (%s via parcelle, %s via KNN).', number_format($viaParcel + $viaKnn, 0, ',', ' '), number_format($viaParcel, 0, ',', ' '), number_format($viaKnn, 0, ',', ' ')));
            return Command::SUCCESS;
        }

        $departments = $this->resolveDepartments($input, $io);
        if (null === $departments) {
            return Command::FAILURE;
        }

        $years = $this->resolveYears($input, $io);
        if (null === $years) {
            return Command::FAILURE;
        }

        $totalMutations = 0;
        $totalLots = 0;

        foreach ($departments as $dept) {
            foreach ($years as $year) {
                [$mutations, $lots] = $this->importFile($dept, $year, $io, $output);
                $totalMutations += $mutations;
                $totalLots += $lots;
                gc_collect_cycles();
            }
        }

        if (!$input->getOption('skip-linking')) {
            $io->section('Liaison lots DVF ↔ Parcelles');
            $linked = $this->linkLotsToParcelles($io, $output);
            $io->text(sprintf('  → %s liaisons créées.', number_format($linked, 0, ',', ' ')));
        }

        $io->success(sprintf(
            'Import terminé : %s mutations, %s lots traités.',
            number_format($totalMutations, 0, ',', ' '),
            number_format($totalLots, 0, ',', ' ')
        ));

        return Command::SUCCESS;
    }

    private function resolveDepartments(InputInterface $input, SymfonyStyle $io): ?array
    {
        if ($input->getOption('all')) {
            $departments = self::DEPARTMENTS;
            $fromDept = $input->getOption('from-department');
            if ($fromDept) {
                $fromDept = strtoupper($fromDept);
                $offset = array_search($fromDept, $departments, true);
                if ($offset === false) {
                    $io->error(sprintf('--from-department invalide : %s', $fromDept));
                    return null;
                }
                $departments = array_slice($departments, $offset);
            }
            return $departments;
        }

        $dept = $input->getOption('department');
        if (!$dept) {
            $io->error('Spécifie un département (--department=32) ou --all pour tout importer.');
            return null;
        }

        $dept = strtoupper($dept);
        if (!in_array($dept, self::DEPARTMENTS, true)) {
            $io->error(sprintf('Département invalide : %s', $dept));
            return null;
        }

        return [$dept];
    }

    private function resolveYears(InputInterface $input, SymfonyStyle $io): ?array
    {
        $year = $input->getOption('year');
        if (!$year) {
            return self::YEARS;
        }

        if (!in_array($year, self::YEARS, true)) {
            $io->error(sprintf('Année invalide : %s. Années disponibles : %s', $year, implode(', ', self::YEARS)));
            return null;
        }

        return [$year];
    }

    private function importFile(string $dept, string $year, SymfonyStyle $io, OutputInterface $output): array
    {
        $deptLower = strtolower($dept);
        $url = sprintf('%s/%s/departements/%s.csv.gz', self::BASE_URL, $year, $deptLower);
        $tmpFile = sys_get_temp_dir() . sprintf('/dvf_%s_%s.csv.gz', $deptLower, $year);

        $io->section(sprintf('Département %s — %s', $dept, $year));
        $io->text('Téléchargement...');

        if (!$this->download($url, $tmpFile)) {
            $io->warning(sprintf('Fichier indisponible pour %s/%s — ignoré.', $dept, $year));
            return [0, 0];
        }

        $handle = gzopen($tmpFile, 'rb');
        if (!$handle) {
            $io->warning(sprintf('Impossible d\'ouvrir le fichier pour %s/%s', $dept, $year));
            return [0, 0];
        }

        $header = fgetcsv($handle, 0, ',');
        if (!$header) {
            gzclose($handle);
            unlink($tmpFile);
            return [0, 0];
        }
        $columns = array_flip($header);

        $progressBar = new ProgressBar($output);
        $progressBar->setFormat(' %current% lots [%bar%] %elapsed:6s% %memory:6s%');
        $progressBar->start();

        // On regroupe les rows par id_mutation pour construire mutation + lots ensemble.
        // Un seul buffer de BATCH_SIZE mutations (chacune avec N lots) est conservé en mémoire.
        $mutationBuffer = [];
        $currentMutationId = null;
        $currentMutation = null;
        $currentLots = [];
        $mutationCount = 0;
        $lotCount = 0;

        $flush = function () use (&$mutationBuffer, &$mutationCount, &$lotCount) {
            if (empty($mutationBuffer)) {
                return;
            }
            $this->insertMutationBatch($mutationBuffer);
            foreach ($mutationBuffer as ['mutation' => $m, 'lots' => $lots]) {
                $mutationCount++;
                $lotCount += count($lots);
            }
            $mutationBuffer = [];
        };

        while (($row = fgetcsv($handle, 0, ',')) !== false) {
            $idMutation = trim($row[$columns['id_mutation']] ?? '');
            if ('' === $idMutation) {
                continue;
            }

            if ($idMutation !== $currentMutationId) {
                // Nouvelle mutation : on sauvegarde la précédente
                if ($currentMutationId !== null && $currentMutation !== null) {
                    $mutationBuffer[] = ['mutation' => $currentMutation, 'lots' => $currentLots];
                    $progressBar->advance(count($currentLots));

                    if (count($mutationBuffer) >= self::BATCH_SIZE) {
                        $flush();
                    }
                }
                $currentMutationId = $idMutation;
                $currentMutation = $this->parseMutation($row, $columns);
                $currentLots = [];
            }

            $lot = $this->parseLot($row, $columns);
            if ($lot !== null) {
                $currentLots[] = $lot;
            }
        }

        // Dernière mutation
        if ($currentMutationId !== null && $currentMutation !== null) {
            $mutationBuffer[] = ['mutation' => $currentMutation, 'lots' => $currentLots];
            $progressBar->advance(count($currentLots));
        }
        $flush();

        gzclose($handle);
        unlink($tmpFile);
        $progressBar->finish();
        $output->writeln('');
        $io->text(sprintf('  → %s mutations, %s lots importés.', number_format($mutationCount, 0, ',', ' '), number_format($lotCount, 0, ',', ' ')));

        return [$mutationCount, $lotCount];
    }

    private function parseMutation(array $row, array $columns): array
    {
        $col = fn(string $k) => trim($row[$columns[$k] ?? -1] ?? '');

        return [
            'id_mutation'      => substr($col('id_mutation'), 0, 20),
            'date_mutation'    => $col('date_mutation') ?: null,
            'nature_mutation'  => substr($col('nature_mutation'), 0, 80) ?: null,
            'valeur_fonciere'  => $this->parseDecimal($col('valeur_fonciere')),
            'code_commune'     => substr($col('code_commune'), 0, 5),
            'nom_commune'      => substr($col('nom_commune'), 0, 255) ?: null,
            'code_departement' => substr($col('code_departement'), 0, 3),
            'nombre_lots'      => $col('nombre_lots') !== '' ? (int) $col('nombre_lots') : null,
        ];
    }

    private function parseLot(array $row, array $columns): ?array
    {
        $col = fn(string $k) => trim($row[$columns[$k] ?? -1] ?? '');

        // Une row sans surface ET sans id_parcelle ET sans type local n'apporte rien
        $idParcelle = substr($col('id_parcelle'), 0, 14) ?: null;
        $surface = $this->parseDecimal($col('surface_reelle_bati'));
        $surfaceTerrain = $this->parseDecimal($col('surface_terrain'));
        $codeTypeLocal = substr($col('code_type_local'), 0, 3) ?: null;

        if ($idParcelle === null && $surface === null && $surfaceTerrain === null && $codeTypeLocal === null) {
            return null;
        }

        // Surface Carrez : somme des lots renseignés dans la mutation
        $surfaceCarrez = null;
        foreach (['lot1_surface_carrez','lot2_surface_carrez','lot3_surface_carrez','lot4_surface_carrez','lot5_surface_carrez'] as $lotCol) {
            $v = $this->parseDecimal($col($lotCol));
            if ($v !== null) {
                $surfaceCarrez = ($surfaceCarrez ?? '0') . '+' . $v;
            }
        }
        if ($surfaceCarrez !== null) {
            // Évaluer la somme (format "0+X+Y")
            $parts = array_map('floatval', array_filter(explode('+', $surfaceCarrez), fn($s) => $s !== ''));
            $surfaceCarrez = $parts ? (string) array_sum($parts) : null;
        }

        $lon = $col('longitude') !== '' && is_numeric($col('longitude')) ? (float) $col('longitude') : null;
        $lat = $col('latitude') !== '' && is_numeric($col('latitude')) ? (float) $col('latitude') : null;

        return [
            'id_parcelle'               => $idParcelle,
            'adresse_numero'            => substr($col('adresse_numero'), 0, 10) ?: null,
            'adresse_nom_voie'          => substr($col('adresse_nom_voie'), 0, 255) ?: null,
            'code_postal'               => substr($col('code_postal'), 0, 5) ?: null,
            'code_type_local'           => $codeTypeLocal,
            'type_local'                => substr($col('type_local'), 0, 100) ?: null,
            'surface_reelle_bati'       => $surface,
            'nombre_pieces_principales' => $col('nombre_pieces_principales') !== '' ? (int) $col('nombre_pieces_principales') : null,
            'code_nature_culture'       => substr($col('code_nature_culture'), 0, 5) ?: null,
            'nature_culture'            => substr($col('nature_culture'), 0, 100) ?: null,
            'surface_terrain'           => $surfaceTerrain,
            'surface_carrez'            => $surfaceCarrez,
            'longitude'                 => $lon,
            'latitude'                  => $lat,
        ];
    }

    private function insertMutationBatch(array $buffer): void
    {
        $now = (new \DateTimeImmutable())->format('Y-m-d H:i:s');

        // --- Mutations ---
        $mutationValueParts = [];
        $mutationParams = ['now' => $now];

        // Dédoublonner par id_mutation (un même id_mutation peut apparaître dans plusieurs années)
        $unique = [];
        foreach ($buffer as $entry) {
            $unique[$entry['mutation']['id_mutation']] = $entry;
        }
        $buffer = array_values($unique);

        foreach ($buffer as $i => ['mutation' => $m]) {
            $mutationValueParts[] = sprintf(
                "(gen_random_uuid(), :id_mut_%d, :date_%d, :nature_%d, :valeur_%d, :commune_%d, :nom_commune_%d, :dept_%d, :nb_lots_%d, 'DVF', :now)",
                $i, $i, $i, $i, $i, $i, $i, $i
            );
            $mutationParams["id_mut_{$i}"]     = $m['id_mutation'];
            $mutationParams["date_{$i}"]       = $m['date_mutation'];
            $mutationParams["nature_{$i}"]     = $m['nature_mutation'];
            $mutationParams["valeur_{$i}"]     = $m['valeur_fonciere'];
            $mutationParams["commune_{$i}"]    = $m['code_commune'];
            $mutationParams["nom_commune_{$i}"] = $m['nom_commune'];
            $mutationParams["dept_{$i}"]       = $m['code_departement'];
            $mutationParams["nb_lots_{$i}"]    = $m['nombre_lots'];
        }

        $mutationSql = sprintf(
            'INSERT INTO mutations_dvf
                (id, id_mutation, date_mutation, nature_mutation, valeur_fonciere, code_commune, nom_commune, code_departement, nombre_lots, source, created_at)
             VALUES %s
             ON CONFLICT (id_mutation) DO UPDATE SET
                 date_mutation    = EXCLUDED.date_mutation,
                 nature_mutation  = EXCLUDED.nature_mutation,
                 valeur_fonciere  = EXCLUDED.valeur_fonciere,
                 code_commune     = EXCLUDED.code_commune,
                 nom_commune      = EXCLUDED.nom_commune,
                 code_departement = EXCLUDED.code_departement,
                 nombre_lots      = EXCLUDED.nombre_lots
             RETURNING id, id_mutation',
            implode(', ', $mutationValueParts)
        );

        $rows = $this->connection->fetchAllAssociative($mutationSql, $mutationParams);

        // Construire un map id_mutation => uuid
        $mutationUuidMap = [];
        foreach ($rows as $r) {
            $mutationUuidMap[$r['id_mutation']] = $r['id'];
        }

        // Si ON CONFLICT ne retourne rien pour les lignes existantes, on récupère leurs IDs
        $missingIds = array_diff(
            array_column(array_column($buffer, 'mutation'), 'id_mutation'),
            array_keys($mutationUuidMap)
        );
        if (!empty($missingIds)) {
            $placeholders = implode(',', array_map(fn($j) => ":mid_{$j}", array_keys($missingIds)));
            $fetchParams = [];
            foreach (array_values($missingIds) as $j => $mid) {
                $fetchParams["mid_{$j}"] = $mid;
            }
            $existing = $this->connection->fetchAllAssociative(
                "SELECT id, id_mutation FROM mutations_dvf WHERE id_mutation IN ({$placeholders})",
                $fetchParams
            );
            foreach ($existing as $r) {
                $mutationUuidMap[$r['id_mutation']] = $r['id'];
            }
        }

        // --- Lots ---
        // Collecter tous les lots à insérer avec leur mutation_uuid, puis insérer par chunks
        // de 4 000 pour rester sous la limite PostgreSQL de 65 535 paramètres (15 params/lot).
        $allLots = [];

        foreach ($buffer as ['mutation' => $m, 'lots' => $lots]) {
            $mutationUuid = $mutationUuidMap[$m['id_mutation']] ?? null;
            if ($mutationUuid === null || empty($lots)) {
                continue;
            }

            $this->connection->executeStatement(
                'DELETE FROM mutations_dvf_lots WHERE mutation_dvf_id = :uuid',
                ['uuid' => $mutationUuid]
            );

            foreach ($lots as $lot) {
                $allLots[] = ['mutation_uuid' => $mutationUuid] + $lot;
            }
        }

        foreach (array_chunk($allLots, 4000) as $chunk) {
            $this->insertLotChunk($chunk, $now);
        }
    }

    private function insertLotChunk(array $chunk, string $now): void
    {
        $valueParts = [];
        $params = ['now' => $now];

        foreach ($chunk as $i => $lot) {
            $valueParts[] = sprintf(
                '(gen_random_uuid(), :mut_uuid_%d, :id_parc_%d, :adr_num_%d, :adr_voie_%d, :cp_%d, :code_tl_%d, :type_tl_%d, :surf_bati_%d, :nb_pieces_%d, :code_nc_%d, :nat_c_%d, :surf_ter_%d, :surf_cz_%d, :lon_%d, :lat_%d, :now)',
                $i, $i, $i, $i, $i, $i, $i, $i, $i, $i, $i, $i, $i, $i, $i
            );
            $params["mut_uuid_{$i}"]  = $lot['mutation_uuid'];
            $params["id_parc_{$i}"]   = $lot['id_parcelle'];
            $params["adr_num_{$i}"]   = $lot['adresse_numero'];
            $params["adr_voie_{$i}"]  = $lot['adresse_nom_voie'];
            $params["cp_{$i}"]        = $lot['code_postal'];
            $params["code_tl_{$i}"]   = $lot['code_type_local'];
            $params["type_tl_{$i}"]   = $lot['type_local'];
            $params["surf_bati_{$i}"] = $lot['surface_reelle_bati'];
            $params["nb_pieces_{$i}"] = $lot['nombre_pieces_principales'];
            $params["code_nc_{$i}"]   = $lot['code_nature_culture'];
            $params["nat_c_{$i}"]     = $lot['nature_culture'];
            $params["surf_ter_{$i}"]  = $lot['surface_terrain'];
            $params["surf_cz_{$i}"]   = $lot['surface_carrez'];
            $params["lon_{$i}"]       = $lot['longitude'];
            $params["lat_{$i}"]       = $lot['latitude'];
        }

        $this->connection->executeStatement(
            sprintf(
                'INSERT INTO mutations_dvf_lots
                    (id, mutation_dvf_id, id_parcelle, adresse_numero, adresse_nom_voie, code_postal, code_type_local, type_local, surface_reelle_bati, nombre_pieces_principales, code_nature_culture, nature_culture, surface_terrain, surface_carrez, longitude, latitude, created_at)
                 VALUES %s',
                implode(', ', $valueParts)
            ),
            $params
        );
    }

    private function linkLotsToParcelles(SymfonyStyle $io, OutputInterface $output): int
    {
        $io->text('Liaison lots DVF → parcelles via id_parcelle...');

        $linked = $this->connection->executeStatement(
            'UPDATE mutations_dvf_lots l
             SET parcelle_id = p.id
             FROM parcelles p
             WHERE l.id_parcelle = p.id_parcelle
               AND l.parcelle_id IS NULL
               AND l.id_parcelle IS NOT NULL'
        );

        return (int) $linked;
    }

    private function linkLotsToAddresses(SymfonyStyle $io, OutputInterface $output): array
    {
        // Étape 1 : lots avec parcelle_id → réutilise parcelles_addresses déjà calculé
        $io->text('Étape 1 : liaison via parcelle (join direct)...');
        $viaParcel = (int) $this->connection->executeStatement(
            'UPDATE mutations_dvf_lots l
             SET address_id = pa.address_id
             FROM parcelles_addresses pa
             WHERE l.parcelle_id = pa.parcelle_id
               AND l.address_id IS NULL
               AND l.parcelle_id IS NOT NULL'
        );
        $io->text(sprintf('  → %s liaisons via parcelle.', number_format($viaParcel, 0, ',', ' ')));

        // Étape 2 : lots sans parcelle_id mais avec lon/lat → KNN par commune
        $io->text('Étape 2 : liaison via KNN (lots sans parcelle, avec coordonnées)...');

        $communes = $this->connection->fetchFirstColumn(
            'SELECT DISTINCT m.code_commune
             FROM mutations_dvf_lots l
             JOIN mutations_dvf m ON l.mutation_dvf_id = m.id
             WHERE l.address_id IS NULL
               AND l.parcelle_id IS NULL
               AND l.longitude IS NOT NULL
               AND l.latitude IS NOT NULL
             ORDER BY m.code_commune'
        );

        $progressBar = new ProgressBar($output, count($communes));
        $progressBar->setFormat(' %current%/%max% communes [%bar%] %elapsed:6s%');
        $progressBar->start();

        $viaKnn = 0;
        foreach ($communes as $communeCode) {
            $linked = $this->connection->executeStatement(
                'UPDATE mutations_dvf_lots l
                 SET address_id = (
                     SELECT a.id
                     FROM addresses a
                     WHERE a.commune_code = :code
                     ORDER BY a.geometry <-> ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)
                     LIMIT 1
                 )
                 FROM mutations_dvf m
                 WHERE l.mutation_dvf_id = m.id
                   AND m.code_commune = :code
                   AND l.address_id IS NULL
                   AND l.parcelle_id IS NULL
                   AND l.longitude IS NOT NULL
                   AND l.latitude IS NOT NULL',
                ['code' => $communeCode]
            );
            $viaKnn += $linked;
            $progressBar->advance();
        }

        $progressBar->finish();
        $output->writeln('');
        $io->text(sprintf('  → %s liaisons via KNN.', number_format($viaKnn, 0, ',', ' ')));

        return [$viaParcel, $viaKnn];
    }

    private function parseDecimal(string $value): ?string
    {
        if ($value === '') {
            return null;
        }
        // DVF utilise la virgule comme séparateur décimal
        $value = str_replace(',', '.', $value);
        return is_numeric($value) ? $value : null;
    }

    private function download(string $url, string $destination): bool
    {
        $content = @file_get_contents($url);
        if (false === $content) {
            return false;
        }
        file_put_contents($destination, $content);
        return true;
    }
}

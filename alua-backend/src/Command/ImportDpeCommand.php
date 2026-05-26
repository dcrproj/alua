<?php

declare(strict_types=1);

namespace App\Command;

use App\Service\NextRevalidateService;
use Doctrine\DBAL\Connection;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Helper\ProgressBar;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:import:dpe',
    description: 'Import DPE from ADEME open data API (logements existants + anciens)',
)]
class ImportDpeCommand extends Command
{
    private const API_BASE = 'https://data.ademe.fr/data-fair/api/v1/datasets';
    private const PAGE_SIZE = 10000;
    private const BATCH_SIZE = 500;

    // Dataset pour les DPE depuis juillet 2021 (avec identifiant_ban)
    private const DATASET_EXISTANT = 'dpe03existant';
    // Dataset pour les DPE avant juillet 2021 (sans identifiant_ban)
    private const DATASET_ANCIEN = 'dpe-france';

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

    public function __construct(
        private readonly Connection $connection,
        private readonly NextRevalidateService $revalidate,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('department', 'd', InputOption::VALUE_REQUIRED, 'Department code (ex: 32).')
            ->addOption('all', null, InputOption::VALUE_NONE, 'Import all departments')
            ->addOption('from-department', null, InputOption::VALUE_REQUIRED, 'Resume --all from this department.')
            ->addOption('source', 's', InputOption::VALUE_REQUIRED, 'Dataset : existant, ancien, or all (default: all)', 'all')
            ->addOption('skip-linking', null, InputOption::VALUE_NONE, 'Skip DPE→address linking step')
            ->addOption('only-link', null, InputOption::VALUE_NONE, 'Run only the DPE→address linking step');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        ini_set('memory_limit', '-1');
        $this->connection->getConfiguration()->setMiddlewares([]);
        $io = new SymfonyStyle($input, $output);
        $io->title('Import DPE — Diagnostics de Performance Énergétique (ADEME)');

        if ($input->getOption('only-link')) {
            $io->section('Liaison DPE ↔ Adresses');
            $linked = $this->linkDpesToAddresses($io);
            $io->success(sprintf('%s liaisons créées.', number_format($linked, 0, ',', ' ')));
            return Command::SUCCESS;
        }

        $departments = $this->resolveDepartments($input, $io);
        if (null === $departments) {
            return Command::FAILURE;
        }

        $source = $input->getOption('source');
        if (!in_array($source, ['existant', 'ancien', 'all'], true)) {
            $io->error('--source doit être : existant, ancien, ou all.');
            return Command::FAILURE;
        }

        $totalExistant = 0;
        $totalAncien = 0;

        foreach ($departments as $dept) {
            $io->section(sprintf('Département %s', $dept));

            if (in_array($source, ['existant', 'all'], true)) {
                $totalExistant += $this->importDataset($dept, self::DATASET_EXISTANT, 'DPE_EXISTANT', $io, $output);
            }
            if (in_array($source, ['ancien', 'all'], true)) {
                $totalAncien += $this->importDataset($dept, self::DATASET_ANCIEN, 'DPE_ANCIEN', $io, $output);
            }

            gc_collect_cycles();
        }

        if (!$input->getOption('skip-linking')) {
            $io->section('Liaison DPE ↔ Adresses');
            $linked = $this->linkDpesToAddresses($io);
            $io->text(sprintf('  → %s liaisons créées.', number_format($linked, 0, ',', ' ')));
        }

        $io->success(sprintf(
            'Import terminé : %s DPE existants, %s DPE anciens.',
            number_format($totalExistant, 0, ',', ' '),
            number_format($totalAncien, 0, ',', ' ')
        ));

        $this->revalidate->revalidateTags(['dpe', 'communes']);

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
            $io->error('Spécifie un département (--department=32) ou --all.');
            return null;
        }

        $dept = strtoupper($dept);
        if (!in_array($dept, self::DEPARTMENTS, true)) {
            $io->error(sprintf('Département invalide : %s', $dept));
            return null;
        }

        return [$dept];
    }

    private function importDataset(string $dept, string $dataset, string $source, SymfonyStyle $io, OutputInterface $output): int
    {
        $isExistant = ($dataset === self::DATASET_EXISTANT);
        $label = $isExistant ? 'existants' : 'anciens';

        $deptFilter = $isExistant
            ? sprintf('code_departement_ban:%s', $dept)
            : sprintf('tv016_departement_code:%s', $dept);

        $select = $isExistant
            ? 'numero_dpe,date_etablissement_dpe,date_fin_validite_dpe,etiquette_dpe,etiquette_ges,conso_5_usages_par_m2_ep,emission_ges_5_usages_par_m2,type_batiment,surface_habitable_immeuble,periode_construction,type_energie_principale_chauffage,identifiant_ban,code_insee_ban,code_departement_ban,_geopoint'
            : 'numero_dpe,date_etablissement_dpe,classe_consommation_energie,classe_estimation_ges,consommation_energie,estimation_ges,surface_thermique_lot,annee_construction,code_insee_commune_actualise,tv016_departement_code';

        $url = sprintf(
            '%s/%s/lines?size=%d&qs=%s&select=%s',
            self::API_BASE,
            $dataset,
            self::PAGE_SIZE,
            urlencode($deptFilter),
            $select
        );

        $progressBar = new ProgressBar($output);
        $progressBar->setFormat(sprintf(' %%current%% DPE %s [%%bar%%] %%elapsed:6s%%', $label));
        $progressBar->start();

        $count = 0;
        $batch = [];

        while ($url !== null) {
            $response = $this->fetchJson($url);
            if ($response === null) {
                break;
            }

            foreach ($response['results'] ?? [] as $record) {
                $parsed = $isExistant
                    ? $this->parseExistant($record)
                    : $this->parseAncien($record);

                if ($parsed === null) {
                    continue;
                }

                $batch[] = $parsed;

                if (count($batch) >= self::BATCH_SIZE) {
                    $this->insertBatch($batch, $source);
                    $count += count($batch);
                    $progressBar->advance(count($batch));
                    $batch = [];
                }
            }

            $url = $response['next'] ?? null;

            if ($url !== null) {
                usleep(500000); // 0.5s entre les pages
            }
        }

        if (!empty($batch)) {
            $this->insertBatch($batch, $source);
            $count += count($batch);
            $progressBar->advance(count($batch));
        }

        $progressBar->finish();
        $output->writeln('');
        $io->text(sprintf('  → %s DPE %s importés.', number_format($count, 0, ',', ' '), $label));

        return $count;
    }

    private function parseExistant(array $r): ?array
    {
        $numeroDpe = trim($r['numero_dpe'] ?? '');
        $date = trim($r['date_etablissement_dpe'] ?? '');
        if ('' === $numeroDpe || '' === $date) {
            return null;
        }

        [$lat, $lon] = $this->parseGeopoint($r['_geopoint'] ?? null);

        return [
            'numero_dpe'           => substr($numeroDpe, 0, 26),
            'date_etablissement'   => $date,
            'date_fin_validite'    => $r['date_fin_validite_dpe'] ?: null,
            'etiquette_dpe'        => substr(trim($r['etiquette_dpe'] ?? ''), 0, 1) ?: null,
            'etiquette_ges'        => substr(trim($r['etiquette_ges'] ?? ''), 0, 1) ?: null,
            'conso_primaire'       => is_numeric($r['conso_5_usages_par_m2_ep'] ?? null) ? (string) $r['conso_5_usages_par_m2_ep'] : null,
            'emission_ges'         => is_numeric($r['emission_ges_5_usages_par_m2'] ?? null) ? (string) $r['emission_ges_5_usages_par_m2'] : null,
            'type_batiment'        => substr(trim($r['type_batiment'] ?? ''), 0, 50) ?: null,
            'surface_habitable'    => is_numeric($r['surface_habitable_immeuble'] ?? null) ? (string) $r['surface_habitable_immeuble'] : null,
            'periode_construction' => substr(trim($r['periode_construction'] ?? ''), 0, 20) ?: null,
            'type_energie_chauffage' => substr(trim($r['type_energie_principale_chauffage'] ?? ''), 0, 100) ?: null,
            'identifiant_ban'      => substr(trim($r['identifiant_ban'] ?? ''), 0, 26) ?: null,
            'code_departement'     => substr(trim($r['code_departement_ban'] ?? ''), 0, 3) ?: null,
            'code_commune'         => substr(trim($r['code_insee_ban'] ?? ''), 0, 5) ?: null,
            'longitude'            => $lon,
            'latitude'             => $lat,
        ];
    }

    private function parseAncien(array $r): ?array
    {
        $numeroDpe = trim($r['numero_dpe'] ?? '');
        $date = trim($r['date_etablissement_dpe'] ?? '');
        if ('' === $numeroDpe || '' === $date) {
            return null;
        }

        return [
            'numero_dpe'           => substr($numeroDpe, 0, 26),
            'date_etablissement'   => $date,
            'date_fin_validite'    => null,
            'etiquette_dpe'        => substr(trim($r['classe_consommation_energie'] ?? ''), 0, 1) ?: null,
            'etiquette_ges'        => substr(trim($r['classe_estimation_ges'] ?? ''), 0, 1) ?: null,
            'conso_primaire'       => is_numeric($r['consommation_energie'] ?? null) ? (string) $r['consommation_energie'] : null,
            'emission_ges'         => is_numeric($r['estimation_ges'] ?? null) ? (string) $r['estimation_ges'] : null,
            'type_batiment'        => null,
            'surface_habitable'    => is_numeric($r['surface_thermique_lot'] ?? null) ? (string) $r['surface_thermique_lot'] : null,
            'periode_construction' => isset($r['annee_construction']) && $r['annee_construction'] ? (string) $r['annee_construction'] : null,
            'type_energie_chauffage' => null,
            'identifiant_ban'      => null,
            'code_departement'     => substr(trim($r['tv016_departement_code'] ?? ''), 0, 3) ?: null,
            'code_commune'         => substr(trim($r['code_insee_commune_actualise'] ?? ''), 0, 5) ?: null,
            'longitude'            => null,
            'latitude'             => null,
        ];
    }

    private function insertBatch(array $batch, string $source): void
    {
        $now = (new \DateTimeImmutable())->format('Y-m-d H:i:s');

        $unique = [];
        foreach ($batch as $row) {
            $unique[$row['numero_dpe']] = $this->cleanRow($row);
        }
        $batch = array_values($unique);

        try {
            $this->doInsert($batch, $source, $now);
        } catch (\Doctrine\DBAL\Exception $e) {
            if (!str_contains($e->getMessage(), 'invalid byte sequence')) {
                throw $e;
            }
            foreach ($batch as $row) {
                try {
                    $this->doInsert([$row], $source, $now);
                } catch (\Doctrine\DBAL\Exception) {
                    // ligne ignorée silencieusement
                }
            }
        }
    }

    private function cleanRow(array $row): array
    {
        foreach (['type_batiment', 'periode_construction', 'type_energie_chauffage', 'identifiant_ban'] as $field) {
            if (isset($row[$field]) && is_string($row[$field])) {
                $row[$field] = $this->cleanUtf8($row[$field]);
            }
        }
        return $row;
    }

    private function cleanUtf8(string $s): string
    {
        if (mb_check_encoding($s, 'UTF-8')) {
            return $s;
        }
        return mb_convert_encoding($s, 'UTF-8', 'ISO-8859-1');
    }

    private function doInsert(array $batch, string $source, string $now): void
    {
        $ttl = (new \DateTimeImmutable())->modify('+180 days')->format('Y-m-d H:i:s');

        $valueParts = [];
        $params = ['now' => $now, 'source' => $source, 'ttl' => $ttl];

        foreach ($batch as $i => $row) {
            $valueParts[] = sprintf(
                "(gen_random_uuid(), :num_%d, :source, :date_%d, :fin_%d, :etdpe_%d, :etges_%d, :conso_%d, :ges_%d, :tbat_%d, :surf_%d, :periode_%d, :energie_%d, :ban_%d, :dept_%d, :commune_%d, :lon_%d, :lat_%d, :now, :ttl)",
                $i, $i, $i, $i, $i, $i, $i, $i, $i, $i, $i, $i, $i, $i, $i, $i
            );
            $params["num_{$i}"]     = $row['numero_dpe'];
            $params["date_{$i}"]    = $row['date_etablissement'];
            $params["fin_{$i}"]     = $row['date_fin_validite'];
            $params["etdpe_{$i}"]   = $row['etiquette_dpe'];
            $params["etges_{$i}"]   = $row['etiquette_ges'];
            $params["conso_{$i}"]   = $row['conso_primaire'];
            $params["ges_{$i}"]     = $row['emission_ges'];
            $params["tbat_{$i}"]    = $row['type_batiment'];
            $params["surf_{$i}"]    = $row['surface_habitable'];
            $params["periode_{$i}"] = $row['periode_construction'];
            $params["energie_{$i}"] = $row['type_energie_chauffage'];
            $params["ban_{$i}"]     = $row['identifiant_ban'];
            $params["dept_{$i}"]    = $row['code_departement'];
            $params["commune_{$i}"] = $row['code_commune'];
            $params["lon_{$i}"]     = $row['longitude'];
            $params["lat_{$i}"]     = $row['latitude'];
        }

        $this->connection->executeStatement(
            sprintf(
                'INSERT INTO dpes
                    (id, numero_dpe, source, date_etablissement, date_fin_validite, etiquette_dpe, etiquette_ges, conso_primaire, emission_ges, type_batiment, surface_habitable, periode_construction, type_energie_chauffage, identifiant_ban, code_departement, code_commune, longitude, latitude, created_at, ttl_expires_at)
                 VALUES %s
                 ON CONFLICT (numero_dpe) DO UPDATE SET
                     date_fin_validite      = EXCLUDED.date_fin_validite,
                     etiquette_dpe          = EXCLUDED.etiquette_dpe,
                     etiquette_ges          = EXCLUDED.etiquette_ges,
                     conso_primaire         = EXCLUDED.conso_primaire,
                     emission_ges           = EXCLUDED.emission_ges,
                     type_batiment          = EXCLUDED.type_batiment,
                     surface_habitable      = EXCLUDED.surface_habitable,
                     periode_construction   = EXCLUDED.periode_construction,
                     type_energie_chauffage = EXCLUDED.type_energie_chauffage,
                     identifiant_ban        = EXCLUDED.identifiant_ban,
                     code_commune           = EXCLUDED.code_commune,
                     longitude              = EXCLUDED.longitude,
                     latitude               = EXCLUDED.latitude,
                     ttl_expires_at         = EXCLUDED.ttl_expires_at',
                implode(', ', $valueParts)
            ),
            $params
        );
    }

    private function linkDpesToAddresses(SymfonyStyle $io): int
    {
        $io->text('Liaison DPE → adresse via identifiant_ban...');

        $linked = (int) $this->connection->executeStatement(
            'UPDATE dpes d
             SET address_id = a.id
             FROM addresses a
             WHERE d.identifiant_ban = a.ban_id
               AND d.address_id IS NULL
               AND d.identifiant_ban IS NOT NULL'
        );

        return $linked;
    }

    private function parseGeopoint(?string $geopoint): array
    {
        if ($geopoint === null || $geopoint === '') {
            return [null, null];
        }
        $parts = explode(',', $geopoint, 2);
        if (count($parts) !== 2) {
            return [null, null];
        }
        $lat = is_numeric(trim($parts[0])) ? (float) trim($parts[0]) : null;
        $lon = is_numeric(trim($parts[1])) ? (float) trim($parts[1]) : null;
        return [$lat, $lon];
    }

    private function fetchJson(string $url, int $retries = 5): ?array
    {
        $context = stream_context_create([
            'http' => [
                'timeout' => 60,
                'ignore_errors' => true,
                'header' => "User-Agent: alua-importer/1.0\r\n",
            ],
        ]);

        for ($attempt = 1; $attempt <= $retries; $attempt++) {
            $body = @file_get_contents($url, false, $context);

            if ($body === false) {
                if ($attempt < $retries) {
                    sleep(5 * $attempt);
                    continue;
                }
                return null;
            }

            // Vérifier le statut HTTP
            $status = 200;
            foreach ($http_response_header ?? [] as $header) {
                if (preg_match('/^HTTP\/\S+ (\d+)/', $header, $m)) {
                    $status = (int) $m[1];
                }
            }

            if ($status === 429 || $status >= 500) {
                if ($attempt < $retries) {
                    sleep(10 * $attempt);
                    continue;
                }
                return null;
            }

            $data = json_decode($body, true);
            return is_array($data) ? $data : null;
        }

        return null;
    }
}

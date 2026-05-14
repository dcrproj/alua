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
    name: 'app:import:pci',
    description: 'Import cadastral parcels from PCI Etalab (attributes + centroid only, no polygon geometry)',
)]
class ImportPciCommand extends Command
{
    private const BASE_URL = 'https://cadastre.data.gouv.fr/data/etalab-cadastre/latest/geojson/departements';
    private const BATCH_SIZE = 500;
    private const TTL_DAYS = 180;

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
            ->addOption('department', 'd', InputOption::VALUE_REQUIRED, 'Department code (ex: 32). Use "all" for all departments.')
            ->addOption('all', null, InputOption::VALUE_NONE, 'Import all departments')
            ->addOption('skip-linking', null, InputOption::VALUE_NONE, 'Skip parcelle→address linking step')
            ->addOption('only-link', null, InputOption::VALUE_NONE, 'Skip import, run only the parcelle→address linking step')
            ->addOption('keep-geojson', null, InputOption::VALUE_NONE, 'Keep downloaded GeoJSON files (needed for tippecanoe MBTiles generation)');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        ini_set('memory_limit', '-1');
        $this->connection->getConfiguration()->setMiddlewares([]);
        $io = new SymfonyStyle($input, $output);
        $io->title('Import PCI — Plan Cadastral Informatisé (Etalab)');

        if ($input->getOption('only-link')) {
            $io->section('Liaison parcelles ↔ adresses (KNN PostGIS)');
            $linked = $this->linkParcellesToAddresses($io, $output);
            $io->success(sprintf('%s liaisons créées.', number_format($linked, 0, ',', ' ')));
            return Command::SUCCESS;
        }

        $departments = $this->resolveDepartments($input, $io);
        if (null === $departments) {
            return Command::FAILURE;
        }

        $keepGeojson = $input->getOption('keep-geojson');
        $geojsonDir = sys_get_temp_dir() . '/alua_pci';
        if ($keepGeojson && !is_dir($geojsonDir)) {
            mkdir($geojsonDir, 0755, true);
        }

        $totalParcelles = 0;
        foreach ($departments as $dept) {
            $totalParcelles += $this->importDepartment($dept, $io, $output, $keepGeojson ? $geojsonDir : null);
        }

        if (!$input->getOption('skip-linking')) {
            $io->section('Liaison parcelles ↔ adresses (KNN PostGIS)');
            $linked = $this->linkParcellesToAddresses($io, $output);
            $io->text(sprintf('  → %s liaisons créées.', number_format($linked, 0, ',', ' ')));
        }

        if ($keepGeojson) {
            $io->note(sprintf('Fichiers GeoJSON conservés dans %s — utilisez tippecanoe pour générer les MBTiles.', $geojsonDir));
        }

        $io->success(sprintf('Import terminé : %s parcelles traitées.', number_format($totalParcelles, 0, ',', ' ')));

        return Command::SUCCESS;
    }

    private function resolveDepartments(InputInterface $input, SymfonyStyle $io): ?array
    {
        if ($input->getOption('all')) {
            return self::DEPARTMENTS;
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

    private function importDepartment(string $dept, SymfonyStyle $io, OutputInterface $output, ?string $keepDir): int
    {
        $deptLower = strtolower($dept);
        $url = sprintf('%s/%s/cadastre-%s-parcelles.json.gz', self::BASE_URL, $deptLower, $deptLower);
        $cachedFile = $keepDir ? $keepDir . sprintf('/cadastre-%s-parcelles.json.gz', $deptLower) : null;
        $tmpFile = sys_get_temp_dir() . sprintf('/pci_%s.json.gz', $deptLower);

        $io->section(sprintf('Département %s', $dept));

        if ($cachedFile && file_exists($cachedFile)) {
            $io->text('GeoJSON en cache, téléchargement ignoré.');
            $tmpFile = $cachedFile;
        } else {
            $io->text('Téléchargement...');
            if (!$this->download($url, $tmpFile)) {
                $io->warning(sprintf('Fichier indisponible pour le département %s — ignoré.', $dept));
                return 0;
            }
        }

        $progressBar = new ProgressBar($output);
        $progressBar->setFormat(' %current% parcelles [%bar%] %elapsed:6s% %memory:6s%');
        $progressBar->start();

        $batch = [];
        $count = 0;
        $skipped = 0;

        foreach ($this->streamFeatures($tmpFile) as $feature) {
            $parsed = $this->parseFeature($feature);
            if (null === $parsed) {
                ++$skipped;
                continue;
            }

            $batch[] = $parsed;

            if (count($batch) >= self::BATCH_SIZE) {
                $this->insertBatch($batch);
                $count += count($batch);
                $progressBar->advance(count($batch));
                $batch = [];
                gc_collect_cycles();
            }
        }

        if (!empty($batch)) {
            $this->insertBatch($batch);
            $count += count($batch);
            $progressBar->advance(count($batch));
        }

        $progressBar->finish();
        $output->writeln('');
        $io->text(sprintf('  → %s parcelles importées, %s ignorées.', number_format($count, 0, ',', ' '), $skipped));

        if ($cachedFile && $tmpFile !== $cachedFile) {
            rename($tmpFile, $cachedFile);
        } elseif (!$keepDir) {
            unlink($tmpFile);
        }

        return $count;
    }

    /**
     * Streaming GeoJSON parser — lit le fichier .gz par chunks de 64KB.
     * Une seule feature est en mémoire à la fois, quelle que soit la taille du fichier.
     *
     * @return \Generator<array>
     */
    private function streamFeatures(string $gzFilePath): \Generator
    {
        $handle = gzopen($gzFilePath, 'rb');
        if (!$handle) {
            return;
        }

        $depth = 0;
        $inString = false;
        $escape = false;
        $featuresStarted = false;
        $capturing = false;
        $featureBuffer = '';
        $lookback = '';

        while (!gzeof($handle)) {
            $chunk = gzread($handle, 65536);

            for ($i = 0, $len = strlen($chunk); $i < $len; $i++) {
                $c = $chunk[$i];

                if ($capturing) {
                    $featureBuffer .= $c;
                }

                if (!$featuresStarted) {
                    $lookback .= $c;
                    if (strlen($lookback) > 60) {
                        $lookback = substr($lookback, -60);
                    }
                }

                if ($escape) {
                    $escape = false;
                    continue;
                }

                if ($c === '\\' && $inString) {
                    $escape = true;
                    continue;
                }

                if ($c === '"') {
                    $inString = !$inString;
                    continue;
                }

                if ($inString) {
                    continue;
                }

                if (!$featuresStarted) {
                    if ($c === '[' && preg_match('/"features"\s*:\s*\[$/', $lookback)) {
                        $featuresStarted = true;
                    }
                    continue;
                }

                if ($c === '{') {
                    if ($depth === 0) {
                        $capturing = true;
                        $featureBuffer = '{';
                    }
                    $depth++;
                } elseif ($c === '}') {
                    $depth--;
                    if ($depth === 0 && $capturing) {
                        $feature = json_decode($featureBuffer, true);
                        if (is_array($feature)) {
                            yield $feature;
                        }
                        $featureBuffer = '';
                        $capturing = false;
                    }
                }
            }
        }

        gzclose($handle);
    }

    private function parseFeature(array $feature): ?array
    {
        $props = $feature['properties'] ?? [];
        $geometry = $feature['geometry'] ?? null;

        $idParcelle = trim($props['id'] ?? '');
        if ('' === $idParcelle || null === $geometry) {
            return null;
        }

        $centroid = $this->calculateCentroid($geometry);
        if (null === $centroid) {
            return null;
        }

        return [
            'id_parcelle'  => substr($idParcelle, 0, 14),
            'commune_code' => substr(trim($props['commune'] ?? ''), 0, 5),
            'section'      => substr(trim($props['section'] ?? ''), 0, 2),
            'numero'       => substr(trim($props['numero'] ?? ''), 0, 4),
            'contenance'   => isset($props['contenance']) ? (int) $props['contenance'] : null,
            'lon'          => $centroid[0],
            'lat'          => $centroid[1],
        ];
    }

    private function insertBatch(array $batch): void
    {
        $now = (new \DateTimeImmutable())->format('Y-m-d H:i:s');
        $ttl = (new \DateTimeImmutable())->modify(sprintf('+%d days', self::TTL_DAYS))->format('Y-m-d H:i:s');

        $unique = [];
        foreach ($batch as $row) {
            $unique[$row['id_parcelle']] = $row;
        }
        $batch = array_values($unique);

        $valueParts = [];
        $params = [];

        foreach ($batch as $i => $row) {
            $valueParts[] = sprintf(
                "(gen_random_uuid(), :id_%d, :commune_%d, :section_%d, :numero_%d, :contenance_%d, ST_SetSRID(ST_MakePoint(:lon_%d, :lat_%d), 4326), 'PCI_ETALAB', :now, :ttl, :now)",
                $i, $i, $i, $i, $i, $i, $i
            );
            $params["id_{$i}"]         = $row['id_parcelle'];
            $params["commune_{$i}"]    = $row['commune_code'];
            $params["section_{$i}"]    = $row['section'];
            $params["numero_{$i}"]     = $row['numero'];
            $params["contenance_{$i}"] = $row['contenance'];
            $params["lon_{$i}"]        = $row['lon'];
            $params["lat_{$i}"]        = $row['lat'];
        }

        $params['now'] = $now;
        $params['ttl'] = $ttl;

        $sql = sprintf(
            'INSERT INTO parcelles (id, id_parcelle, commune_code, section, numero, contenance, centroid, source, last_updated_at, ttl_expires_at, created_at)
             VALUES %s
             ON CONFLICT (id_parcelle) DO UPDATE SET
                 commune_code    = EXCLUDED.commune_code,
                 section         = EXCLUDED.section,
                 numero          = EXCLUDED.numero,
                 contenance      = EXCLUDED.contenance,
                 centroid        = EXCLUDED.centroid,
                 last_updated_at = NOW()',
            implode(', ', $valueParts)
        );

        $this->connection->executeStatement($sql, $params);
    }

    private function linkParcellesToAddresses(SymfonyStyle $io, OutputInterface $output): int
    {
        $communes = $this->connection->fetchFirstColumn(
            'SELECT DISTINCT p.commune_code
             FROM parcelles p
             WHERE NOT EXISTS (
                 SELECT 1 FROM parcelles_addresses pa WHERE pa.parcelle_id = p.id
             )
             ORDER BY p.commune_code'
        );

        if (empty($communes)) {
            $io->text('Toutes les parcelles sont déjà liées.');
            return 0;
        }

        $progressBar = new ProgressBar($output, count($communes));
        $progressBar->setFormat(' %current%/%max% communes [%bar%] %elapsed:6s%');
        $progressBar->start();

        $total = 0;
        foreach ($communes as $communeCode) {
            $linked = $this->connection->executeStatement(
                'WITH commune_addresses AS MATERIALIZED (
                     SELECT id, geometry FROM addresses WHERE commune_code = :code
                 )
                 INSERT INTO parcelles_addresses (parcelle_id, address_id)
                 SELECT p.id, nearest.id
                 FROM parcelles p
                 CROSS JOIN LATERAL (
                     SELECT a.id
                     FROM commune_addresses a
                     ORDER BY a.geometry <-> p.centroid
                     LIMIT 1
                 ) nearest
                 WHERE p.commune_code = :code
                 ON CONFLICT DO NOTHING',
                ['code' => $communeCode]
            );
            $total += $linked;
            $progressBar->advance();
        }

        $progressBar->finish();
        $output->writeln('');

        return $total;
    }

    private function calculateCentroid(array $geometry): ?array
    {
        return match ($geometry['type']) {
            'Polygon'      => $this->polygonCentroid($geometry['coordinates'][0]),
            'MultiPolygon' => $this->multiPolygonCentroid($geometry['coordinates']),
            default        => null,
        };
    }

    private function multiPolygonCentroid(array $polygons): ?array
    {
        $largest = null;
        $largestArea = 0.0;
        foreach ($polygons as $polygon) {
            $area = abs($this->ringArea($polygon[0]));
            if ($area > $largestArea) {
                $largestArea = $area;
                $largest = $polygon[0];
            }
        }
        return $largest ? $this->polygonCentroid($largest) : null;
    }

    private function polygonCentroid(array $ring): array
    {
        $n = count($ring);
        $area = 0.0;
        $cx = 0.0;
        $cy = 0.0;

        for ($i = 0; $i < $n - 1; $i++) {
            $cross = $ring[$i][0] * $ring[$i + 1][1] - $ring[$i + 1][0] * $ring[$i][1];
            $area += $cross;
            $cx += ($ring[$i][0] + $ring[$i + 1][0]) * $cross;
            $cy += ($ring[$i][1] + $ring[$i + 1][1]) * $cross;
        }

        $area /= 2.0;

        if (abs($area) < 1e-10) {
            return [
                array_sum(array_column($ring, 0)) / $n,
                array_sum(array_column($ring, 1)) / $n,
            ];
        }

        return [$cx / (6.0 * $area), $cy / (6.0 * $area)];
    }

    private function ringArea(array $ring): float
    {
        $n = count($ring);
        $area = 0.0;
        for ($i = 0; $i < $n - 1; $i++) {
            $area += $ring[$i][0] * $ring[$i + 1][1] - $ring[$i + 1][0] * $ring[$i][1];
        }
        return $area / 2.0;
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

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
    name: 'app:import:ban',
    description: 'Import addresses from Base Adresse Nationale (BAN)',
)]
class ImportBanCommand extends Command
{
    private const BASE_URL = 'https://adresse.data.gouv.fr/data/ban/adresses/latest/csv';
    private const BATCH_SIZE = 500;
    private const TTL_DAYS = 75;

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
            ->addOption('department', 'd', InputOption::VALUE_REQUIRED, 'Department code (ex: 31). Use "all" for all departments.')
            ->addOption('all', null, InputOption::VALUE_NONE, 'Import all departments');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        ini_set('memory_limit', '-1');
        $this->connection->getConfiguration()->setMiddlewares([]);
        $io = new SymfonyStyle($input, $output);
        $io->title('Import BAN — Base Adresse Nationale');

        $departments = $this->resolveDepartments($input, $io);
        if (null === $departments) {
            return Command::FAILURE;
        }

        $total = 0;
        foreach ($departments as $dept) {
            $total += $this->importDepartment($dept, $io, $output);
        }

        $io->success(sprintf('Import terminé : %s adresses traitées.', number_format($total, 0, ',', ' ')));

        return Command::SUCCESS;
    }

    private function resolveDepartments(InputInterface $input, SymfonyStyle $io): ?array
    {
        if ($input->getOption('all')) {
            return self::DEPARTMENTS;
        }

        $dept = $input->getOption('department');
        if (!$dept) {
            $io->error('Spécifie un département (--department=31) ou --all pour tout importer.');
            return null;
        }

        $dept = strtoupper($dept);
        if (!in_array($dept, self::DEPARTMENTS, true)) {
            $io->error(sprintf('Département invalide : %s', $dept));
            return null;
        }

        return [$dept];
    }

    private function importDepartment(string $dept, SymfonyStyle $io, OutputInterface $output): int
    {
        $url = sprintf('%s/adresses-%s.csv.gz', self::BASE_URL, strtolower($dept));
        $io->section(sprintf('Département %s — %s', $dept, $url));

        $tmpFile = sys_get_temp_dir() . sprintf('/ban_%s.csv.gz', $dept);

        $io->text('Téléchargement...');
        if (!$this->download($url, $tmpFile)) {
            $io->warning(sprintf('Impossible de télécharger le fichier pour le département %s — ignoré.', $dept));
            return 0;
        }

        $handle = gzopen($tmpFile, 'rb');
        if (!$handle) {
            $io->warning(sprintf('Impossible d\'ouvrir le fichier compressé pour le département %s', $dept));
            return 0;
        }

        // Lire l'en-tête pour connaître les colonnes
        $header = fgetcsv($handle, 0, ';');
        if (!$header) {
            gzclose($handle);
            return 0;
        }
        $columns = array_flip($header);

        $progressBar = new ProgressBar($output);
        $progressBar->setFormat(' %current% adresses [%bar%] %elapsed:6s% %memory:6s%');
        $progressBar->start();

        $batch = [];
        $count = 0;
        $skipped = 0;

        while (($row = fgetcsv($handle, 0, ';')) !== false) {
            $parsed = $this->parseRow($row, $columns);
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
            }
        }

        if (!empty($batch)) {
            $this->insertBatch($batch);
            $count += count($batch);
            $progressBar->advance(count($batch));
        }

        gzclose($handle);
        unlink($tmpFile);
        $progressBar->finish();
        $output->writeln('');

        $io->text(sprintf('  → %s adresses importées, %s ignorées (coordonnées manquantes).', number_format($count, 0, ',', ' '), $skipped));

        return $count;
    }

    private function parseRow(array $row, array $columns): ?array
    {
        $lon = isset($columns['lon']) ? trim($row[$columns['lon']] ?? '') : '';
        $lat = isset($columns['lat']) ? trim($row[$columns['lat']] ?? '') : '';

        if ('' === $lon || '' === $lat || !is_numeric($lon) || !is_numeric($lat)) {
            return null;
        }

        $banId = trim($row[$columns['id']] ?? '');
        if ('' === $banId) {
            return null;
        }

        return [
            'ban_id'       => substr($this->cleanUtf8($banId), 0, 20),
            'numero'       => substr($this->cleanUtf8(trim($row[$columns['numero']] ?? '')), 0, 10) ?: null,
            'voie'         => substr($this->cleanUtf8(trim($row[$columns['nom_voie']] ?? '')), 0, 255) ?: null,
            'code_postal'  => substr($this->cleanUtf8(trim($row[$columns['code_postal']] ?? '')), 0, 5) ?: null,
            'commune'      => substr($this->cleanUtf8(trim($row[$columns['nom_commune']] ?? '')), 0, 255) ?: null,
            'commune_code' => substr($this->cleanUtf8(trim($row[$columns['code_insee']] ?? '')), 0, 5) ?: null,
            'lon'          => (float) $lon,
            'lat'          => (float) $lat,
        ];
    }

    private function insertBatch(array $batch): void
    {
        // Le CSV BAN peut contenir des doublons sur ban_id — on garde le dernier
        $unique = [];
        foreach ($batch as $row) {
            $unique[$row['ban_id']] = $row;
        }
        $batch = array_values($unique);

        try {
            $this->doInsert($batch);
        } catch (\Doctrine\DBAL\Exception $e) {
            if (!str_contains($e->getMessage(), 'invalid byte sequence')) {
                throw $e;
            }
            // Encodage invalide dans le batch : retry ligne par ligne, on saute les lignes problématiques
            foreach ($batch as $row) {
                try {
                    $this->doInsert([$row]);
                } catch (\Doctrine\DBAL\Exception) {
                    // ligne ignorée silencieusement
                }
            }
        }
    }

    private function doInsert(array $batch): void
    {
        $now = (new \DateTimeImmutable())->format('Y-m-d H:i:s');
        $ttl = (new \DateTimeImmutable())->modify(sprintf('+%d days', self::TTL_DAYS))->format('Y-m-d H:i:s');

        $valueParts = [];
        $params = [];

        foreach ($batch as $i => $row) {
            $valueParts[] = sprintf(
                "(gen_random_uuid(), :ban_id_%d, :numero_%d, :voie_%d, :code_postal_%d, :commune_%d, :commune_code_%d, ST_SetSRID(ST_MakePoint(:lon_%d, :lat_%d), 4326), 'BAN', :now, :ttl, :now)",
                $i, $i, $i, $i, $i, $i, $i, $i
            );
            $params["ban_id_{$i}"]       = $row['ban_id'];
            $params["numero_{$i}"]       = $row['numero'];
            $params["voie_{$i}"]         = $row['voie'];
            $params["code_postal_{$i}"]  = $row['code_postal'];
            $params["commune_{$i}"]      = $row['commune'];
            $params["commune_code_{$i}"] = $row['commune_code'];
            $params["lon_{$i}"]          = $row['lon'];
            $params["lat_{$i}"]          = $row['lat'];
        }

        $params['now'] = $now;
        $params['ttl'] = $ttl;

        $sql = sprintf(
            'INSERT INTO addresses (id, ban_id, numero, voie, code_postal, commune, commune_code, geometry, source, last_updated_at, ttl_expires_at, created_at)
             VALUES %s
             ON CONFLICT (ban_id) DO UPDATE SET
                 numero         = EXCLUDED.numero,
                 voie           = EXCLUDED.voie,
                 code_postal    = EXCLUDED.code_postal,
                 commune        = EXCLUDED.commune,
                 commune_code   = EXCLUDED.commune_code,
                 geometry       = EXCLUDED.geometry,
                 last_updated_at = NOW()',
            implode(', ', $valueParts)
        );

        $this->connection->executeStatement($sql, $params);
    }

    private function cleanUtf8(string $s): string
    {
        if (mb_check_encoding($s, 'UTF-8')) {
            return $s;
        }
        return mb_convert_encoding($s, 'UTF-8', 'ISO-8859-1');
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

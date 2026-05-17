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

/**
 * Importe les données BDNB (bâtiments) depuis les exports départementaux du CSTB.
 * Source : https://bdnb.io/download/ (millésime 2025-07-a, format CSV par département)
 *
 * Fraîcheur : ~2 millésimes/an. Ré-import annuel recommandé.
 * Stratégie : import manuel via --millesime=XXXX-XX-X ou cron annuel.
 *
 * Procédure VPS :
 *   # Un département (test)
 *   php8.3 bin/console app:import:bdnb --department=32
 *
 *   # France entière (~1-2h, ~20 GB de téléchargement)
 *   php8.3 bin/console app:import:bdnb --all
 */
#[AsCommand(name: 'app:import:bdnb', description: 'Importe les bâtiments BDNB (groupes) par département')]
class ImportBdnbCommand extends Command
{
    private const MILLESIME = '2025-07-a';
    private const BASE_URL  = 'https://open-data.s3.fr-par.scw.cloud';
    private const TABLE     = 'batiment_bdnb';
    private const BATCH     = 500;

    public function __construct(private readonly Connection $connection)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('department', 'd', InputOption::VALUE_OPTIONAL, 'Code département (ex: 32, 2A)')
            ->addOption('all', null, InputOption::VALUE_NONE, 'Importer tous les départements métropolitains')
            ->addOption('millesime', null, InputOption::VALUE_OPTIONAL, 'Millésime BDNB (ex: 2025-07-a)', self::MILLESIME);
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io        = new SymfonyStyle($input, $output);
        $millesime = $input->getOption('millesime');

        $io->title("Import BDNB — Bâtiments (millésime $millesime)");

        if ($input->getOption('all')) {
            $departments = $this->getAllDepartments();
        } elseif ($dept = $input->getOption('department')) {
            $departments = [$dept];
        } else {
            $io->error('Spécifier --department=XX ou --all');
            return Command::FAILURE;
        }

        $total = 0;
        foreach ($departments as $dept) {
            $io->section("Département $dept");
            try {
                $n = $this->importDepartment($dept, $millesime, $io);
                $io->writeln("  → $n lignes importées/mises à jour");
                $total += $n;
            } catch (\Throwable $e) {
                $io->warning("  Erreur dept $dept : " . $e->getMessage());
            }
        }

        $grandTotal = $this->connection->fetchOne('SELECT COUNT(*) FROM ' . self::TABLE);
        $io->success("Total session : $total · Total en base : $grandTotal bâtiments.");
        return Command::SUCCESS;
    }

    private function importDepartment(string $dept, string $millesime, SymfonyStyle $io): int
    {
        $tmpDir = sys_get_temp_dir() . '/bdnb_' . $dept . '_' . getmypid();
        mkdir($tmpDir, 0755, true);

        try {
            $zipUrl  = self::BASE_URL
                . "/bdnb_millesime_{$millesime}/millesime_{$millesime}_dep{$dept}"
                . "/open_data_millesime_{$millesime}_dep{$dept}_csv.zip";
            $zipFile = "$tmpDir/bdnb.zip";

            $io->writeln("  Téléchargement…");
            $this->download($zipUrl, $zipFile);

            [$ffoFile, $relFile] = $this->extractFromZip($zipFile, $tmpDir);
            unlink($zipFile);

            if (!$ffoFile || !file_exists($ffoFile)) {
                $io->warning("  batiment_groupe_ffo_bat.csv introuvable dans le ZIP");
                return 0;
            }
            if (!$relFile || !file_exists($relFile)) {
                $io->warning("  rel_batiment_groupe_parcelle.csv introuvable dans le ZIP");
                return 0;
            }

            $io->writeln("  Chargement FFO en mémoire…");
            [$ffoMap, $ffoDebug] = $this->loadFfoMap($ffoFile);
            unlink($ffoFile);
            $io->writeln('  ' . count($ffoMap) . ' bâtiments FFO chargés (délimiteur: ' . $ffoDebug['sep'] . ')');
            if (count($ffoMap) === 0) {
                $io->warning('  Colonnes FFO détectées : ' . implode(' | ', array_slice($ffoDebug['cols'], 0, 10)));
            }

            $io->writeln("  Import des relations parcelle ↔ bâtiment…");
            [$count, $relDebug] = $this->importRel($relFile, $ffoMap, $millesime);
            unlink($relFile);
            if ($count === 0) {
                $io->warning('  Colonnes REL détectées : ' . implode(' | ', array_slice($relDebug['cols'], 0, 8)));
            }

            return $count;
        } finally {
            exec('rm -rf ' . escapeshellarg($tmpDir));
        }
    }

    private function extractFromZip(string $zipFile, string $tmpDir): array
    {
        $zip = new \ZipArchive();
        if ($zip->open($zipFile) !== true) {
            throw new \RuntimeException("Impossible d'ouvrir le ZIP : $zipFile");
        }

        $ffoFile = null;
        $relFile = null;

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);
            if (str_ends_with($name, 'batiment_groupe_ffo_bat.csv')) {
                $dest    = "$tmpDir/ffo.csv";
                $stream  = $zip->getStream($name);
                $out     = fopen($dest, 'wb');
                stream_copy_to_stream($stream, $out);
                fclose($out);
                fclose($stream);
                $ffoFile = $dest;
            } elseif (str_ends_with($name, 'rel_batiment_groupe_parcelle.csv')) {
                $dest    = "$tmpDir/rel.csv";
                $stream  = $zip->getStream($name);
                $out     = fopen($dest, 'wb');
                stream_copy_to_stream($stream, $out);
                fclose($out);
                fclose($stream);
                $relFile = $dest;
            }
            if ($ffoFile && $relFile) break;
        }

        $zip->close();
        return [$ffoFile, $relFile];
    }

    /**
     * Charge batiment_groupe_ffo_bat.csv en mémoire.
     * Retourne [map, debug] où map = [batiment_groupe_id => [annee, nb_log, usage]].
     */
    private function loadFfoMap(string $ffoFile): array
    {
        $handle = fopen($ffoFile, 'r');

        // Supprimer le BOM UTF-8 éventuel
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }

        $sep    = $this->detectSeparator($ffoFile);
        $header = fgetcsv($handle, 0, $sep);
        $debug  = ['sep' => $sep, 'cols' => []];

        if (!$header) {
            fclose($handle);
            return [[], $debug];
        }

        $cleanHeader = array_map(fn($c) => trim(str_replace("\xEF\xBB\xBF", '', $c)), $header);
        $debug['cols'] = $cleanHeader;
        $cols = array_flip($cleanHeader);

        $bgIdx    = $cols['batiment_groupe_id']   ?? null;
        $anneeIdx = $cols['annee_construction']    ?? null;
        $logIdx   = $cols['nb_log']               ?? null;
        $usageIdx = $cols['usage_niveau_1_txt']   ?? null;

        if ($bgIdx === null) {
            fclose($handle);
            return [[], $debug];
        }

        $map = [];
        while (($row = fgetcsv($handle, 0, $sep)) !== false) {
            $bgId = trim($row[$bgIdx] ?? '');
            if (!$bgId) continue;
            $map[$bgId] = [
                'annee'  => ($anneeIdx !== null && isset($row[$anneeIdx]) && $row[$anneeIdx] !== '')
                            ? (int) $row[$anneeIdx] : null,
                'nb_log' => ($logIdx !== null && isset($row[$logIdx]) && $row[$logIdx] !== '')
                            ? (int) $row[$logIdx] : null,
                'usage'  => ($usageIdx !== null && isset($row[$usageIdx]) && $row[$usageIdx] !== '')
                            ? mb_substr(trim($row[$usageIdx]), 0, 100) : null,
            ];
        }
        fclose($handle);
        return [$map, $debug];
    }

    /**
     * Parcourt rel_batiment_groupe_parcelle.csv, joint avec $ffoMap, insère par lots.
     * Retourne [count, debug].
     */
    private function importRel(string $relFile, array $ffoMap, string $millesime): array
    {
        $handle = fopen($relFile, 'r');

        // Supprimer le BOM UTF-8 éventuel
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }

        $sep    = $this->detectSeparator($relFile);
        $header = fgetcsv($handle, 0, $sep);
        $debug  = ['sep' => $sep, 'cols' => []];

        if (!$header) {
            fclose($handle);
            return [0, $debug];
        }

        $cleanHeader = array_map(fn($c) => trim(str_replace("\xEF\xBB\xBF", '', $c)), $header);
        $debug['cols'] = $cleanHeader;
        $cols = array_flip($cleanHeader);

        $bgIdx  = $cols['batiment_groupe_id'] ?? null;
        $parIdx = $cols['parcelle_id']        ?? null;

        if ($bgIdx === null || $parIdx === null) {
            fclose($handle);
            return [0, $debug];
        }

        $batch = [];
        $count = 0;

        while (($row = fgetcsv($handle, 0, $sep)) !== false) {
            $bgId       = trim($row[$bgIdx] ?? '');
            $parcelleId = trim($row[$parIdx] ?? '');
            if (!$bgId || !$parcelleId) continue;

            $ffo     = $ffoMap[$bgId] ?? [];
            $batch[] = [
                'parcelle_id'        => $parcelleId,
                'batiment_groupe_id' => $bgId,
                'annee_construction' => $ffo['annee'] ?? null,
                'nb_logements'       => $ffo['nb_log'] ?? null,
                'usage_niveau_1'     => $ffo['usage'] ?? null,
                'millesime'          => $millesime,
            ];

            if (count($batch) >= self::BATCH) {
                $this->flush($batch);
                $count += count($batch);
                $batch  = [];
            }
        }

        if ($batch) {
            $this->flush($batch);
            $count += count($batch);
        }

        fclose($handle);
        return [$count, $debug];
    }

    /** Détecte le délimiteur CSV en lisant la première ligne. */
    private function detectSeparator(string $file): string
    {
        $handle = fopen($file, 'r');
        // Skip BOM
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }
        $line = fgets($handle);
        fclose($handle);
        if (!$line) return ',';
        $commas     = substr_count($line, ',');
        $semicolons = substr_count($line, ';');
        $pipes      = substr_count($line, '|');
        $max = max($commas, $semicolons, $pipes);
        if ($max === 0) return ',';
        if ($semicolons === $max) return ';';
        if ($pipes === $max) return '|';
        return ',';
    }

    private function flush(array $batch): void
    {
        $vals   = [];
        $params = [];

        foreach ($batch as $i => $r) {
            $vals[]           = "(:par$i,:bg$i,:annee$i,:log$i,:usage$i,:mil$i)";
            $params["par$i"]  = $r['parcelle_id'];
            $params["bg$i"]   = $r['batiment_groupe_id'];
            $params["annee$i"]= $r['annee_construction'];
            $params["log$i"]  = $r['nb_logements'];
            $params["usage$i"]= $r['usage_niveau_1'];
            $params["mil$i"]  = $r['millesime'];
        }

        $this->connection->executeStatement(
            "INSERT INTO " . self::TABLE . "
                (parcelle_id, batiment_groupe_id, annee_construction, nb_logements, usage_niveau_1, millesime)
             VALUES " . implode(', ', $vals) . "
             ON CONFLICT (parcelle_id, batiment_groupe_id) DO UPDATE SET
                 annee_construction = EXCLUDED.annee_construction,
                 nb_logements       = EXCLUDED.nb_logements,
                 usage_niveau_1     = EXCLUDED.usage_niveau_1,
                 millesime          = EXCLUDED.millesime",
            $params
        );
    }

    private function download(string $url, string $dest): void
    {
        $fp = fopen($dest, 'wb');
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_FILE           => $fp,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT        => 1800,
            CURLOPT_USERAGENT      => 'alua/1.0',
            CURLOPT_FAILONERROR    => true,
        ]);
        $ok  = curl_exec($ch);
        $err = curl_error($ch);
        $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        fclose($fp);
        if (!$ok || $http >= 400) {
            throw new \RuntimeException("Téléchargement échoué (HTTP $http) : $err — $url");
        }
    }

    /** @return string[] */
    private function getAllDepartments(): array
    {
        $depts = [];
        for ($i = 1; $i <= 19; $i++) {
            $depts[] = str_pad((string) $i, 2, '0', STR_PAD_LEFT);
        }
        $depts[] = '2a';
        $depts[] = '2b';
        for ($i = 21; $i <= 95; $i++) {
            $depts[] = str_pad((string) $i, 2, '0', STR_PAD_LEFT);
        }
        return $depts;
    }
}

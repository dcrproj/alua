<?php

declare(strict_types=1);

namespace App\Command;

use Doctrine\DBAL\Connection;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(name: 'app:import:sirene', description: 'Importe les unités légales + établissements SIRENE actifs (INSEE)')]
class ImportSireneCommand extends Command
{
    private const UL_URL     = 'https://object.files.data.gouv.fr/data-pipeline-open/siren/stock/StockUniteLegale_utf8.zip';
    private const ETAB_URL   = 'https://object.files.data.gouv.fr/data-pipeline-open/siren/stock/StockEtablissement_utf8.zip';
    private const BATCH_SIZE = 1000;

    public function __construct(private readonly Connection $connection)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('Import SIRENE — unités légales + établissements actifs');

        // ── Étape 1 : StockUniteLegale (dénominations) ──────────────────
        $io->section('Étape 1/2 — StockUniteLegale (~900 MB)');
        $ulZip = sys_get_temp_dir() . '/sirene_ul_' . getmypid() . '.zip';
        try {
            $io->text('Téléchargement…');
            if (!$this->download(self::UL_URL, $ulZip, $io)) {
                $io->error('Échec téléchargement StockUniteLegale.');
                return Command::FAILURE;
            }
            $io->text(sprintf('  %.1f MB téléchargés', filesize($ulZip) / 1024 / 1024));

            exec('unzip -l ' . escapeshellarg($ulZip) . ' | grep -i "\\.csv" | awk \'{print $NF}\'', $ulEntries);
            $ulCsv = trim($ulEntries[0] ?? '');
            if (!$ulCsv) { $io->error('CSV introuvable dans le ZIP UL.'); return Command::FAILURE; }
            $io->text("  Fichier : $ulCsv");

            [$ulIns, , $ulSkip] = $this->streamAndImportUl($ulZip, $ulCsv, $io);
            $ulTotal = $this->connection->fetchOne('SELECT COUNT(*) FROM sirene_unites_legales');
            $io->text("  $ulIns inserts, $ulSkip ignorés. Total : $ulTotal unités légales.");
        } finally {
            @unlink($ulZip);
        }

        // ── Étape 2 : StockEtablissement ────────────────────────────────
        $io->section('Étape 2/2 — StockEtablissement (~2.6 GB)');
        $zipPath = sys_get_temp_dir() . '/sirene_etab_' . getmypid() . '.zip';

        try {
            $io->text('Téléchargement de StockEtablissement_utf8.zip (~2.6 GB)…');
            if (!$this->download(self::ETAB_URL, $zipPath, $io)) {
                $io->error('Échec du téléchargement.');
                return Command::FAILURE;
            }
            $io->text(sprintf('  Téléchargement terminé : %.1f MB', filesize($zipPath) / 1024 / 1024));

            // Find CSV filename inside the ZIP
            exec('unzip -l ' . escapeshellarg($zipPath) . ' | grep -i "\\.csv" | awk \'{print $NF}\'', $zipEntries);
            $csvEntry = trim($zipEntries[0] ?? '');
            if (!$csvEntry) {
                $io->error('Impossible de trouver le CSV dans le ZIP.');
                return Command::FAILURE;
            }
            $io->text("  Fichier dans le ZIP : $csvEntry");

            [$inserted, $updated, $skipped] = $this->streamAndImport($zipPath, $csvEntry, $io);

            $total = $this->connection->fetchOne('SELECT COUNT(*) FROM sirene_etablissements');
            $io->success(sprintf(
                'Import terminé — %d inserts, %d updates, %d ignorés. Total en base : %s établissements.',
                $inserted, $updated, $skipped, $total
            ));
        } finally {
            @unlink($zipPath);
        }

        return Command::SUCCESS;
    }

    private function download(string $url, string $dest, SymfonyStyle $io): bool
    {
        $ctx = stream_context_create(['http' => [
            'timeout'         => 3600,
            'follow_location' => true,
            'user_agent'      => 'alua-importer/1.0',
        ]]);

        $src = @fopen($url, 'r', false, $ctx);
        if (!$src) {
            return false;
        }

        $dst   = fopen($dest, 'w');
        $bytes = 0;
        while (!feof($src)) {
            $chunk  = fread($src, 65536);
            fwrite($dst, $chunk);
            $bytes += strlen($chunk);
            if ($bytes % (100 * 1024 * 1024) < 65536) {
                $io->text(sprintf('  %.0f MB téléchargés…', $bytes / 1024 / 1024));
            }
        }
        fclose($src);
        fclose($dst);

        return $bytes > 1_000_000;
    }

    private function streamAndImport(string $zipPath, string $csvEntry, SymfonyStyle $io): array
    {
        // Stream CSV from ZIP without writing the ~11 GB uncompressed file to disk
        $cmd  = 'unzip -p ' . escapeshellarg($zipPath) . ' ' . escapeshellarg($csvEntry);
        $proc = proc_open($cmd, [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
        if (!is_resource($proc)) {
            $io->error('proc_open failed.');
            return [0, 0, 0];
        }

        $fh     = $pipes[1];
        $header = fgetcsv($fh, 0, ',');
        if (!$header) {
            fclose($fh);
            proc_close($proc);
            return [0, 0, 0];
        }

        $cols = array_flip(array_map(fn(string $col) => $this->normalizeKey($col), $header));

        // Vérification des colonnes critiques
        $io->text(sprintf('  Colonnes Lambert détectées : X=%s Y=%s',
            isset($cols['coordonneelambertabscisseetablissement']) ? 'OUI ✓' : 'NON ✗',
            isset($cols['coordonneelambertordonneeetablissement']) ? 'OUI ✓' : 'NON ✗'
        ));
        $io->text(sprintf('  État admin. : %s | Siret : %s',
            isset($cols['etatadministratifetablissement']) ? 'OUI ✓' : 'NON ✗',
            isset($cols['siret']) ? 'OUI ✓' : 'NON ✗'
        ));

        $batch     = [];
        $inserted  = 0;
        $updated   = 0;
        $skipped   = 0;
        $lineCount = 0;

        while (($row = fgetcsv($fh, 0, ',')) !== false) {
            $lineCount++;

            $r = $this->mapRow($cols, $row);
            if ($r === null) {
                $skipped++;
            } else {
                $batch[] = $r;
            }

            if (count($batch) >= self::BATCH_SIZE) {
                [$i, $u] = $this->flush($batch);
                $inserted += $i;
                $updated  += $u;
                $batch     = [];
            }

            if ($lineCount % 500_000 === 0) {
                $io->text(sprintf('  %s lignes traitées (%d inserts, %d ignorés)…', number_format($lineCount), $inserted, $skipped));
            }
        }

        if ($batch) {
            [$i, $u] = $this->flush($batch);
            $inserted += $i;
            $updated  += $u;
        }

        fclose($fh);
        fclose($pipes[2]);
        proc_close($proc);

        $io->text(sprintf('  %s lignes lues.', number_format($lineCount)));

        return [$inserted, $updated, $skipped];
    }

    private function streamAndImportUl(string $zipPath, string $csvEntry, SymfonyStyle $io): array
    {
        $cmd  = 'unzip -p ' . escapeshellarg($zipPath) . ' ' . escapeshellarg($csvEntry);
        $proc = proc_open($cmd, [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
        if (!is_resource($proc)) { return [0, 0, 0]; }

        $fh     = $pipes[1];
        $header = fgetcsv($fh, 0, ',');
        if (!$header) { fclose($fh); proc_close($proc); return [0, 0, 0]; }

        $cols = array_flip(array_map(fn(string $c) => $this->normalizeKey($c), $header));

        $io->text(sprintf('  Colonnes : etat=%s denom=%s nom=%s',
            isset($cols['etatadministratifunitelegale']) ? 'OUI' : 'NON',
            isset($cols['denominationunitelegale'])      ? 'OUI' : 'NON',
            isset($cols['nomunitelegale'])               ? 'OUI' : 'NON',
        ));

        $v = function(string $col) use ($cols, &$row): ?string {
            return isset($cols[$col]) ? (trim($row[$cols[$col]]) ?: null) : null;
        };

        $batch = []; $inserted = 0; $skipped = 0; $lineCount = 0;

        while (($row = fgetcsv($fh, 0, ',')) !== false) {
            $lineCount++;

            if ($v('etatadministratifunitelegale') !== 'A') { $skipped++; continue; }

            $siren = $v('siren');
            if (!$siren || strlen($siren) !== 9) { $skipped++; continue; }

            $denom = $v('denominationunitelegale')
                  ?? $v('denominationusuelle1unitelegale');

            if (!$denom) {
                $nom    = $v('nomunitelegale');
                $prenom = $v('prenomusuelunitelegale') ?? $v('prenom1unitelegale');
                if ($nom) $denom = trim(($prenom ? $prenom . ' ' : '') . $nom);
            }

            if (!$denom) { $skipped++; continue; }

            $batch[$siren] = ['siren' => $siren, 'denomination' => mb_substr($denom, 0, 255)];

            if (count($batch) >= self::BATCH_SIZE) {
                $inserted += $this->flushUl(array_values($batch));
                $batch = [];
            }

            if ($lineCount % 1_000_000 === 0) {
                $io->text(sprintf('  %s lignes traitées (%d inserts)…', number_format($lineCount), $inserted));
            }
        }
        if ($batch) $inserted += $this->flushUl(array_values($batch));

        fclose($fh); fclose($pipes[2]); proc_close($proc);
        $io->text(sprintf('  %s lignes lues.', number_format($lineCount)));

        return [$inserted, 0, $skipped];
    }

    private function flushUl(array $batch): int
    {
        if (empty($batch)) return 0;

        $vals = []; $params = [];
        foreach ($batch as $i => $r) {
            $vals[] = "(:si$i,:dn$i)";
            $params["si$i"] = $r['siren'];
            $params["dn$i"] = $r['denomination'];
        }

        $this->connection->executeStatement(
            'INSERT INTO sirene_unites_legales (siren,denomination) VALUES ' . implode(',', $vals) . '
             ON CONFLICT (siren) DO UPDATE SET denomination = EXCLUDED.denomination, updated_at = NOW()',
            $params
        );

        return count($batch);
    }

    private function normalizeKey(string $col): string
    {
        $col = mb_strtolower($col, 'UTF-8');
        return strtr($col, [
            'é'=>'e','è'=>'e','ê'=>'e','ë'=>'e',
            'à'=>'a','â'=>'a','ä'=>'a',
            'ù'=>'u','û'=>'u','ü'=>'u',
            'î'=>'i','ï'=>'i',
            'ô'=>'o','ö'=>'o',
            'ç'=>'c',
        ]);
    }

    private function mapRow(array $cols, array $row): ?array
    {
        $v = fn(string $col): ?string => isset($cols[$col]) ? (trim($row[$cols[$col]]) ?: null) : null;

        $siret = $v('siret');
        if (!$siret || strlen($siret) !== 14) {
            return null;
        }

        // Active establishments only
        if ($v('etatadministratifetablissement') !== 'A') {
            return null;
        }

        // Require Lambert 93 coordinates (SRID 2154) for spatial linking
        $rawX = $v('coordonneelambertabscisseetablissement');
        $rawY = $v('coordonneelambertordonneeetablissement');
        if (!$rawX || !$rawY || !is_numeric($rawX) || !is_numeric($rawY)) {
            return null;
        }

        $enseigne     = $v('enseigne1etablissement');
        $denomination = $v('denominationusuelleetablissement');
        $naf          = $v('activiteprincipaleetablissement');
        $siege        = $v('etablissementsiege');

        return [
            'siret'        => $siret,
            'siren'        => substr($siret, 0, 9),
            'enseigne'     => $enseigne     ? mb_substr($enseigne, 0, 255)     : null,
            'denomination' => $denomination ? mb_substr($denomination, 0, 255) : null,
            'naf_code'     => $naf          ? mb_substr($naf, 0, 6)            : null,
            'commune_code' => $v('codecommuneetablissement')
                              ? mb_substr($v('codecommuneetablissement'), 0, 5) : null,
            'code_postal'  => $v('codepostaletablissement')
                              ? mb_substr($v('codepostaletablissement'), 0, 5) : null,
            'date_creation' => $v('datecreationetablissement')
                              ? mb_substr($v('datecreationetablissement'), 0, 10) : null,
            'est_siege'    => ($siege === 'true' || $siege === '1') ? true : false,
            'lambert_x'    => (float) $rawX,
            'lambert_y'    => (float) $rawY,
            'numero_voie'  => $v('numerovoieetablissement')
                              ? mb_substr($v('numerovoieetablissement'), 0, 10) : null,
            'libelle_voie' => $v('libellevoieetablissement')
                              ? mb_substr($v('libellevoieetablissement'), 0, 100) : null,
        ];
    }

    private function flush(array $batch): array
    {
        if (empty($batch)) {
            return [0, 0];
        }

        // Deduplicate on siret
        $deduped = [];
        foreach ($batch as $r) {
            $deduped[$r['siret']] = $r;
        }
        $batch = array_values($deduped);

        $vals   = [];
        $params = [];
        $keys   = ['si','sr','en','dn','nf','cc','cp','dc','es','nv','lv'];

        foreach ($batch as $i => $r) {
            // Geometry is embedded as a literal SQL expression (Lambert 93 → WGS84)
            $geoSql = sprintf(
                'ST_Transform(ST_SetSRID(ST_MakePoint(%s,%s),2154),4326)',
                number_format($r['lambert_x'], 2, '.', ''),
                number_format($r['lambert_y'], 2, '.', '')
            );
            $vals[] = '(:' . implode("$i,:", $keys) . "$i,$geoSql)";
            $params["si$i"] = $r['siret'];
            $params["sr$i"] = $r['siren'];
            $params["en$i"] = $r['enseigne'];
            $params["dn$i"] = $r['denomination'];
            $params["nf$i"] = $r['naf_code'];
            $params["cc$i"] = $r['commune_code'];
            $params["cp$i"] = $r['code_postal'];
            $params["dc$i"] = $r['date_creation'];
            $params["es$i"] = $r['est_siege'] ? 'true' : 'false';
            $params["nv$i"] = $r['numero_voie'];
            $params["lv$i"] = $r['libelle_voie'];
        }

        $colList = 'siret,siren,enseigne,denomination,naf_code,commune_code,code_postal,date_creation,est_siege,numero_voie,libelle_voie,geometry';

        $this->connection->executeStatement(
            "INSERT INTO sirene_etablissements ($colList)
             VALUES " . implode(',', $vals) . "
             ON CONFLICT (siret) DO UPDATE SET
                enseigne     = EXCLUDED.enseigne,
                denomination = EXCLUDED.denomination,
                naf_code     = EXCLUDED.naf_code,
                est_siege    = EXCLUDED.est_siege,
                numero_voie  = EXCLUDED.numero_voie,
                libelle_voie = EXCLUDED.libelle_voie,
                geometry     = COALESCE(EXCLUDED.geometry, sirene_etablissements.geometry),
                updated_at   = NOW()",
            $params
        );

        return [count($batch), 0];
    }
}

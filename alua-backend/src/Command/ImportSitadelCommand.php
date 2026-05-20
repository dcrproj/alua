<?php

declare(strict_types=1);

namespace App\Command;

use Doctrine\DBAL\Connection;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(name: 'app:import:sitadel', description: 'Importe les autorisations d\'urbanisme Sitadel')]
class ImportSitadelCommand extends Command
{
    // Les 4 fichiers du dataset (logements, locaux, démolir, aménager)
    private const FILES = [
        'logements' => 'https://data.statistiques.developpement-durable.gouv.fr/dido/api/v1/datafiles/8b35affb-55fc-4c1f-915b-7750f974446a/csv',
        'locaux'    => 'https://data.statistiques.developpement-durable.gouv.fr/dido/api/v1/datafiles/f8f0700f-806c-40a7-83b1-f21cf507e7c4/csv',
        'demolir'   => 'https://data.statistiques.developpement-durable.gouv.fr/dido/api/v1/datafiles/1a9a2f0c-56fe-4e69-84a7-fbbda2121f02/csv',
        'amenager'  => 'https://data.statistiques.developpement-durable.gouv.fr/dido/api/v1/datafiles/96883f50-538b-41f9-a059-c6eb97e6a23a/csv',
    ];

    private const BATCH_SIZE = 500;

    public function __construct(private readonly Connection $connection)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('Import Sitadel — autorisations d\'urbanisme');

        $totalInserted = 0;
        $totalUpdated  = 0;

        foreach (self::FILES as $label => $url) {
            $io->section("Fichier : $label");

            $tmpFile = sys_get_temp_dir() . "/sitadel_$label.csv";
            $io->text("Téléchargement depuis $url ...");

            if (!$this->download($url, $tmpFile, $io)) {
                $io->error("Échec téléchargement $label");
                continue;
            }

            [$ins, $upd] = $this->importFile($tmpFile, $label, $io);
            $totalInserted += $ins;
            $totalUpdated  += $upd;

            @unlink($tmpFile);
            $io->text("$label : $ins inserts, $upd updates");
        }

        // Mise à jour du TTL (30 jours)
        $io->section('Post-import');
        $io->text('Mise à jour updated_at → maintenant');
        $this->connection->executeStatement(
            'UPDATE sitadel_permis SET updated_at = NOW() WHERE updated_at < NOW() - INTERVAL \'1 day\''
        );

        $total = $this->connection->fetchOne('SELECT COUNT(*) FROM sitadel_permis');
        $io->success("Import terminé — $totalInserted inserts, $totalUpdated updates. Total en base : $total permis.");

        return Command::SUCCESS;
    }

    private function download(string $url, string $dest, SymfonyStyle $io): bool
    {
        $ctx = stream_context_create(['http' => [
            'timeout'         => 600,
            'follow_location' => true,
            'user_agent'      => 'alua-importer/1.0',
        ]]);

        $src = @fopen($url, 'r', false, $ctx);
        if (!$src) {
            return false;
        }

        $dst = fopen($dest, 'w');
        $bytes = 0;
        while (!feof($src)) {
            $chunk = fread($src, 65536);
            fwrite($dst, $chunk);
            $bytes += strlen($chunk);
            if ($bytes % (10 * 1024 * 1024) < 65536) {
                $io->text(sprintf('  %.1f MB téléchargés…', $bytes / 1024 / 1024));
            }
        }
        fclose($src);
        fclose($dst);

        $io->text(sprintf('  Téléchargement terminé : %.1f MB', $bytes / 1024 / 1024));
        return $bytes > 1000;
    }

    private function importFile(string $path, string $fileType, SymfonyStyle $io): array
    {
        $fh = fopen($path, 'r');
        if (!$fh) {
            return [0, 0];
        }

        // En-tête
        $header = fgetcsv($fh, 0, ';');
        if (!$header) {
            fclose($fh);
            return [0, 0];
        }
        $cols = array_flip(array_map('strtoupper', $header));

        $batch     = [];
        $inserted  = 0;
        $updated   = 0;
        $lineCount = 0;

        while (($row = fgetcsv($fh, 0, ';')) !== false) {
            $lineCount++;
            $r = $this->mapRow($cols, $row, $fileType);
            if ($r === null) {
                continue;
            }

            $batch[] = $r;

            if (count($batch) >= self::BATCH_SIZE) {
                [$i, $u] = $this->flush($batch);
                $inserted += $i;
                $updated  += $u;
                $batch = [];

                if ($lineCount % 50000 === 0) {
                    $io->text("  $lineCount lignes traitées…");
                }
            }
        }

        if ($batch) {
            [$i, $u] = $this->flush($batch);
            $inserted += $i;
            $updated  += $u;
        }

        fclose($fh);
        $io->text("  $lineCount lignes lues.");

        return [$inserted, $updated];
    }

    private function mapRow(array $cols, array $row, string $fileType): ?array
    {
        $v = fn(string $col): ?string => isset($cols[$col]) ? (trim($row[$cols[$col]]) ?: null) : null;
        $i = fn(string $col): ?int   => ($s = $v($col)) !== null ? (int) $s : null;

        $numDau = $v('NUM_DAU');
        if (!$numDau) {
            return null;
        }

        $commune = $v('COMM');
        if (!$commune || strlen($commune) !== 5) {
            return null;
        }

        $sec1 = $v('SEC_CADASTRE1') ? mb_substr(strtoupper($v('SEC_CADASTRE1')), 0, 5) : null;
        $num1 = $v('NUM_CADASTRE1') ? mb_substr($v('NUM_CADASTRE1'), 0, 10) : null;
        $sec2 = $v('SEC_CADASTRE2') ? mb_substr(strtoupper($v('SEC_CADASTRE2')), 0, 5) : null;
        $num2 = $v('NUM_CADASTRE2') ? mb_substr($v('NUM_CADASTRE2'), 0, 10) : null;
        $sec3 = $v('SEC_CADASTRE3') ? mb_substr(strtoupper($v('SEC_CADASTRE3')), 0, 5) : null;
        $num3 = $v('NUM_CADASTRE3') ? mb_substr($v('NUM_CADASTRE3'), 0, 10) : null;

        $natureRaw = $i('NATURE_PROJET_COMPLETEE') ?? $i('NATURE_PROJET_DECLAREE');

        // Surfaces et logements selon le type de fichier
        $nbLogCrees   = 0;
        $nbLogDemolis = 0;
        $surfHab      = 0;
        $surfLoc      = 0;

        if ($fileType === 'logements') {
            $nbLogCrees = $i('NB_LGT_TOT_CREES') ?? 0;
            $surfHab    = $i('SURF_HAB_CREEE')   ?? 0;
        } elseif ($fileType === 'locaux') {
            $surfLoc = $i('SURF_LOC_CREEE') ?? 0;
        } elseif ($fileType === 'demolir') {
            $nbLogDemolis = $i('NB_LGT_DEMOLIS') ?? 0;
        }

        return [
            'num_dau'              => $numDau,
            'type_dau'             => strtoupper($v('TYPE_DAU') ?? ''),
            'etat_dau'             => $i('ETAT_DAU'),
            'commune_code'         => $commune,
            'an_depot'             => $i('AN_DEPOT'),
            'date_autorisation'    => $this->parseDate($v('DATE_REELLE_AUTORISATION')),
            'date_doc'             => $this->parseDate($v('DATE_REELLE_DOC')),
            'date_daact'           => $this->parseDate($v('DATE_REELLE_DAACT')),
            'nature_projet'        => $natureRaw,
            'nb_logements_crees'   => $nbLogCrees,
            'nb_logements_demolis' => $nbLogDemolis,
            'surf_hab_creee'       => $surfHab,
            'surf_loc_creee'       => $surfLoc,
            'sec_cadastre1'        => $sec1,
            'num_cadastre1'        => $num1,
            'sec_cadastre2'        => $sec2,
            'num_cadastre2'        => $num2,
            'sec_cadastre3'        => $sec3,
            'num_cadastre3'        => $num3,
        ];
    }

    private function parseDate(?string $s): ?string
    {
        if (!$s || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $s)) {
            return null;
        }
        return $s;
    }

    private function flush(array $batch): array
    {
        if (empty($batch)) {
            return [0, 0];
        }

        $cols = [
            'num_dau', 'type_dau', 'etat_dau', 'commune_code', 'an_depot',
            'date_autorisation', 'date_doc', 'date_daact', 'nature_projet',
            'nb_logements_crees', 'nb_logements_demolis', 'surf_hab_creee', 'surf_loc_creee',
            'sec_cadastre1', 'num_cadastre1', 'sec_cadastre2', 'num_cadastre2',
            'sec_cadastre3', 'num_cadastre3',
        ];

        // Dédupliquer sur num_dau (même lot peut apparaître plusieurs fois dans le CSV)
        $deduped = [];
        foreach ($batch as $r) {
            $deduped[$r['num_dau']] = $r;
        }
        $batch = array_values($deduped);

        // Pattern identique à ImportRnicCommand : params courts indexés + connection->executeStatement()
        $vals   = [];
        $params = [];
        $keys   = ['nd','td','ed','cc','ad','da','dd','dc','np','nl','nm','sh','sl','s1','n1','s2','n2','s3','n3'];

        foreach ($batch as $i => $r) {
            $vals[] = '(:' . implode("$i,:", $keys) . "$i)";
            $params["nd$i"] = $r['num_dau'];
            $params["td$i"] = $r['type_dau'];
            $params["ed$i"] = $r['etat_dau'];
            $params["cc$i"] = $r['commune_code'];
            $params["ad$i"] = $r['an_depot'];
            $params["da$i"] = $r['date_autorisation'];
            $params["dd$i"] = $r['date_doc'];
            $params["dc$i"] = $r['date_daact'];
            $params["np$i"] = $r['nature_projet'];
            $params["nl$i"] = $r['nb_logements_crees'];
            $params["nm$i"] = $r['nb_logements_demolis'];
            $params["sh$i"] = $r['surf_hab_creee'];
            $params["sl$i"] = $r['surf_loc_creee'];
            $params["s1$i"] = $r['sec_cadastre1'];
            $params["n1$i"] = $r['num_cadastre1'];
            $params["s2$i"] = $r['sec_cadastre2'];
            $params["n2$i"] = $r['num_cadastre2'];
            $params["s3$i"] = $r['sec_cadastre3'];
            $params["n3$i"] = $r['num_cadastre3'];
        }

        $colList = 'num_dau,type_dau,etat_dau,commune_code,an_depot,date_autorisation,date_doc,date_daact,nature_projet,nb_logements_crees,nb_logements_demolis,surf_hab_creee,surf_loc_creee,sec_cadastre1,num_cadastre1,sec_cadastre2,num_cadastre2,sec_cadastre3,num_cadastre3';

        $this->connection->executeStatement(
            "INSERT INTO sitadel_permis ($colList)
             VALUES " . implode(',', $vals) . "
             ON CONFLICT (num_dau) DO UPDATE SET
                etat_dau             = EXCLUDED.etat_dau,
                date_autorisation    = EXCLUDED.date_autorisation,
                date_doc             = EXCLUDED.date_doc,
                date_daact           = EXCLUDED.date_daact,
                nb_logements_crees   = EXCLUDED.nb_logements_crees,
                nb_logements_demolis = EXCLUDED.nb_logements_demolis,
                surf_hab_creee       = EXCLUDED.surf_hab_creee,
                surf_loc_creee       = EXCLUDED.surf_loc_creee,
                updated_at           = NOW()",
            $params
        );

        return [count($batch), 0];
    }
}

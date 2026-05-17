<?php

declare(strict_types=1);

namespace App\Command;

use Doctrine\DBAL\Connection;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Importe les monuments historiques (classés + inscrits) depuis la base Mérimée du Ministère de la Culture.
 * Source : https://data.culture.gouv.fr/explore/dataset/liste-des-immeubles-proteges-au-titre-des-monuments-historiques/
 *
 * Procédure VPS :
 *   php8.3 bin/console app:import:abf
 *   (~5 min, ~43 000 monuments avec coordonnées)
 */
#[AsCommand(name: 'app:import:abf', description: 'Importe les monuments historiques Mérimée (secteurs ABF)')]
class ImportAbfCommand extends Command
{
    private const CSV_URL = 'https://data.culture.gouv.fr/api/explore/v2.1/catalog/datasets/liste-des-immeubles-proteges-au-titre-des-monuments-historiques/exports/csv?delimiter=%3B';
    private const TABLE   = 'monuments_historiques';
    private const BATCH   = 500;

    public function __construct(private readonly Connection $connection)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('Import ABF — Monuments historiques (base Mérimée)');

        $io->writeln('Téléchargement du CSV Mérimée (~95 MB)…');
        $tmpFile = tempnam(sys_get_temp_dir(), 'mh_') . '.csv';
        $this->downloadFile(self::CSV_URL, $tmpFile);
        $io->writeln("Téléchargé → $tmpFile");

        $handle = fopen($tmpFile, 'r');

        // Supprimer le BOM UTF-8 éventuel
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }

        // Lire la ligne d'en-tête et construire le mapping nom → index
        $header = fgetcsv($handle, 0, ';');
        $cols   = array_flip(array_map('trim', $header));

        $batch   = [];
        $count   = 0;
        $skipped = 0;

        while (($row = fgetcsv($handle, 0, ';')) !== false) {
            if (count($row) < 10) continue;

            $ref = trim($row[$cols['reference']] ?? '');
            if (!$ref) continue;

            // Coordonnées "lat, lon"
            $coordStr = trim($row[$cols['coordonnees_au_format_wgs84']] ?? '');
            if (!$coordStr || !str_contains($coordStr, ',')) {
                $skipped++;
                continue;
            }
            [$latStr, $lonStr] = explode(',', $coordStr, 2);
            $lat = (float) trim($latStr);
            $lon = (float) trim($lonStr);
            if ($lat === 0.0 && $lon === 0.0) {
                $skipped++;
                continue;
            }

            // Type de protection
            $protRaw = strtolower($row[$cols['date_et_typologie_de_la_protection']] ?? '');
            if (str_contains($protRaw, 'classé mh')) {
                $protection = 'classé';
            } elseif (str_contains($protRaw, 'inscrit mh')) {
                $protection = 'inscrit';
            } else {
                $skipped++;
                continue;
            }

            $titre = trim($row[$cols['titre_editorial_de_la_notice']] ?? '');
            $denom = mb_substr(trim($row[$cols['denomination_de_l_edifice']] ?? ''), 0, 200);

            $batch[] = [
                'ref'         => $ref,
                'denomination'=> $denom ?: null,
                'titre'       => $titre ?: null,
                'commune'     => trim($row[$cols['commune_forme_editoriale']] ?? '') ?: null,
                'commune_code'=> trim($row[$cols['cog_insee_lors_de_la_protection']] ?? '') ?: null,
                'departement' => trim($row[$cols['departement_format_numerique']] ?? '') ?: null,
                'protection'  => $protection,
                'lat'         => $lat,
                'lon'         => $lon,
            ];

            if (count($batch) >= self::BATCH) {
                $this->flush($batch);
                $count += count($batch);
                $batch  = [];
                if ($count % 5000 === 0) {
                    $io->writeln("  $count monuments importés…");
                }
            }
        }

        if ($batch) {
            $this->flush($batch);
            $count += count($batch);
        }

        fclose($handle);
        unlink($tmpFile);

        $total = $this->connection->fetchOne('SELECT COUNT(*) FROM ' . self::TABLE);
        $io->success("Import terminé : $count insérés/mis à jour, $skipped ignorés. Total en base : $total monuments.");

        return Command::SUCCESS;
    }

    private function flush(array $batch): void
    {
        $vals   = [];
        $params = [];

        foreach ($batch as $i => $r) {
            $vals[]          = "(:ref$i,:denom$i,:titre$i,:commune$i,:code$i,:dept$i,:prot$i,ST_SetSRID(ST_MakePoint(:lon$i,:lat$i),4326))";
            $params["ref$i"]    = $r['ref'];
            $params["denom$i"]  = $r['denomination'];
            $params["titre$i"]  = $r['titre'];
            $params["commune$i"]= $r['commune'];
            $params["code$i"]   = $r['commune_code'];
            $params["dept$i"]   = $r['departement'];
            $params["prot$i"]   = $r['protection'];
            $params["lon$i"]    = $r['lon'];
            $params["lat$i"]    = $r['lat'];
        }

        $this->connection->executeStatement(
            "INSERT INTO " . self::TABLE . " (reference, denomination, titre, commune, commune_code, departement, protection, geometry)
             VALUES " . implode(', ', $vals) . "
             ON CONFLICT (reference) DO UPDATE SET
                 denomination = EXCLUDED.denomination,
                 titre        = EXCLUDED.titre,
                 commune      = EXCLUDED.commune,
                 commune_code = EXCLUDED.commune_code,
                 protection   = EXCLUDED.protection,
                 geometry     = EXCLUDED.geometry",
            $params
        );
    }

    private function downloadFile(string $url, string $dest): void
    {
        $fp = fopen($dest, 'wb');
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_FILE           => $fp,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT        => 600,
            CURLOPT_USERAGENT      => 'alua/1.0',
        ]);
        curl_exec($ch);
        curl_close($ch);
        fclose($fp);
    }
}

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
 * Importe les copropriétés depuis le RNIC (Registre National d'Immatriculation des Copropriétés).
 * Source : data.gouv.fr — fichier CSV national, mis à jour quotidiennement.
 * URL stable : https://www.data.gouv.fr/fr/datasets/r/3ea8e2c3-0038-464a-b17e-cd5c91f65ce2
 *
 * Stratégie TTL : les enregistrements expirent après 3 mois. Le cron app:refresh:check
 * dispatche un RefreshRnicMessage dès qu'au moins un enregistrement est expiré.
 *
 * Fraîcheur source : quotidienne. Re-import complet à chaque exécution (~800 MB CSV, ~1M lignes).
 *
 * Procédure VPS :
 *   php8.3 bin/console app:import:rnic
 */
#[AsCommand(name: 'app:import:rnic', description: 'Importe les copropriétés depuis le RNIC (data.gouv.fr)')]
class ImportRnicCommand extends Command
{
    private const SOURCE_URL = 'https://www.data.gouv.fr/fr/datasets/r/3ea8e2c3-0038-464a-b17e-cd5c91f65ce2';
    private const TTL_MONTHS = 3;
    private const BATCH      = 500;

    public function __construct(private readonly Connection $connection)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('Import RNIC — Copropriétés');

        $tmpFile = sys_get_temp_dir() . '/rnic_' . getmypid() . '.csv';

        try {
            $io->writeln('Téléchargement du CSV national…');
            $this->download(self::SOURCE_URL, $tmpFile);
            $io->writeln('  → ' . round(filesize($tmpFile) / 1024 / 1024, 1) . ' MB téléchargés');

            [$count, $refs] = $this->importCsv($tmpFile, $io);
            $io->writeln("  → $count copropriétés importées/mises à jour");

            $io->writeln('Mise à jour de la table de jonction parcelles…');
            $this->swapJunction($refs);
            $io->writeln('  → ' . count($refs) . ' liens copropriété ↔ parcelle');

            $io->writeln('Dérivation des codes commune depuis les parcelles…');
            $updated = $this->connection->executeStatement(
                "UPDATE coproprietes c
                 SET commune_code = LEFT(cp.parcelle_id, 5)
                 FROM (
                     SELECT DISTINCT ON (no_immatriculation) no_immatriculation, parcelle_id
                     FROM coproprietes_parcelles
                     ORDER BY no_immatriculation
                 ) cp
                 WHERE c.no_immatriculation = cp.no_immatriculation
                   AND (c.commune_code IS NULL OR c.commune_code = '')"
            );
            $io->writeln("  → $updated communes mises à jour");

            $total = $this->connection->fetchOne('SELECT COUNT(*) FROM coproprietes');
            $io->success("Total en base : $total copropriétés.");
        } finally {
            if (file_exists($tmpFile)) {
                unlink($tmpFile);
            }
        }

        return Command::SUCCESS;
    }

    /**
     * Parcourt le CSV RNIC, upsert dans coproprietes, collecte les refs parcelles.
     * Retourne [count, refs] où refs = [[no_immatriculation, parcelle_id], ...].
     */
    private function importCsv(string $csvFile, SymfonyStyle $io): array
    {
        $handle = fopen($csvFile, 'r');

        // BOM UTF-8
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }

        $sep    = $this->detectSeparator($csvFile);
        $header = fgetcsv($handle, 0, $sep);

        if (!$header) {
            fclose($handle);
            $io->warning('CSV vide ou illisible');
            return [0, []];
        }

        $cleanHeader = array_map(fn($c) => mb_strtolower(trim(str_replace("\xEF\xBB\xBF", '', $c))), $header);
        $cols        = array_flip($cleanHeader);

        // Colonnes RNIC — plusieurs variantes selon le millésime du fichier
        $noIdx    = $cols['numero_immatriculation']                 ?? $cols['numero_immatriculation_siren'] ?? $cols['no_immatriculation'] ?? null;
        $comIdx   = $cols['code_officiel_commune']                  ?? $cols['code_commune']                        ?? $cols['commune_code']              ?? null;
        $nomIdx   = $cols['nom_usage_copropriete']                  ?? $cols['nom_usage_1']                        ?? $cols['nom']                       ?? null;
        $lonIdx   = $cols['longitude']                              ?? $cols['lon']                                ?? null;
        $latIdx   = $cols['latitude']                               ?? $cols['lat']                                ?? null;
        $totIdx   = $cols['nombre_total_lots']                      ?? $cols['nb_lots_total_par_immeuble']         ?? $cols['nb_lots_total']             ?? null;
        $habIdx   = $cols['nombre_lots_habitation']                 ?? $cols['nb_lots_usage_habitation']           ?? $cols['nb_lots_habitation']        ?? null;
        $staIdx   = $cols['nombre_lots_stationnement']              ?? $cols['nb_lots_usage_stationnement']        ?? $cols['nb_lots_stationnement']     ?? null;
        $perIdx   = $cols['periode_construction']                   ?? $cols['periode_construction_initiale']      ?? null;
        $synIdx   = $cols['type_syndic']                            ?? null;
        $cooIdx   = $cols['syndicat_cooperatif']                    ?? null;
        $dateIdx  = $cols['date_immatriculation']                   ?? $cols['date_immatriculation_initiale_rnic'] ?? null;
        $ref1Idx  = $cols['reference_cadastrale_1']                 ?? null;
        $ref2Idx  = $cols['reference_cadastrale_2']                 ?? null;
        $ref3Idx  = $cols['reference_cadastrale_3']                 ?? null;
        $adrIdx   = $cols['adresse_reference']                      ?? $cols['adresse']                            ?? null;
        $repIdx   = $cols['raison_sociale_representant_legal']      ?? null;
        $rglIdx   = $cols['date_reglement_copropriete']             ?? $cols['date_reglement']                     ?? null;
        $lprIdx   = $cols['nombre_lots_habitation_bureaux_commerces'] ?? $cols['nb_lots_principaux']               ?? $cols['nb_lots_usage_principal']   ?? null;
        $tscIdx   = $cols['syndicat_principal_ou_secondaire']       ?? $cols['type_syndicat_copropriete']          ?? $cols['nature_syndicat']           ?? null;
        $aslIdx   = $cols['nombre_asl']                             ?? $cols['nb_asl']                            ?? null;
        $afuIdx   = $cols['nombre_aful']                            ?? $cols['nb_aful']                           ?? null;
        $uniIdx   = $cols['nombre_unions_syndicats']                ?? $cols['nb_union_syndicat']                  ?? $cols['nb_unions_syndicat']        ?? null;
        $resIdx   = $cols['residence_service']                      ?? null;

        if ($noIdx === null) {
            fclose($handle);
            $io->warning('Colonne no_immatriculation introuvable. Toutes les colonnes détectées : ' . implode(', ', $cleanHeader));
            return [0, []];
        }

        $ttl   = (new \DateTimeImmutable())->modify('+' . self::TTL_MONTHS . ' months')->format('Y-m-d H:i:s');
        $batch = [];
        $refs  = [];
        $count = 0;

        while (($row = fgetcsv($handle, 0, $sep)) !== false) {
            $noImmat = trim($row[$noIdx] ?? '');
            if (!$noImmat) continue;

            $batch[] = [
                'no_immatriculation'    => $noImmat,
                'commune_code'          => $comIdx  !== null ? (mb_substr(trim($row[$comIdx] ?? ''), 0, 5) ?: null) : null,
                'nom'                   => $nomIdx  !== null ? (mb_substr(trim($row[$nomIdx] ?? ''), 0, 100) ?: null) : null,
                'lon'                   => $lonIdx  !== null && ($row[$lonIdx] ?? '') !== '' ? (float) $row[$lonIdx] : null,
                'lat'                   => $latIdx  !== null && ($row[$latIdx] ?? '') !== '' ? (float) $row[$latIdx] : null,
                'nb_lots_total'         => $totIdx  !== null && ($row[$totIdx] ?? '') !== '' ? (int) $row[$totIdx] : null,
                'nb_lots_habitation'    => $habIdx  !== null && ($row[$habIdx] ?? '') !== '' ? (int) $row[$habIdx] : null,
                'nb_lots_stationnement' => $staIdx  !== null && ($row[$staIdx] ?? '') !== '' ? (int) $row[$staIdx] : null,
                'periode_construction'  => $perIdx  !== null ? (mb_substr(trim($row[$perIdx] ?? ''), 0, 50) ?: null) : null,
                'type_syndic'           => $synIdx  !== null ? (mb_substr(trim($row[$synIdx] ?? ''), 0, 30) ?: null) : null,
                'syndicat_cooperatif'   => $cooIdx !== null && ($row[$cooIdx] ?? '') !== ''
                                            ? (in_array(strtolower(trim($row[$cooIdx])), ['1', 'true', 'oui', 'yes', 't'], true) ? 'true' : 'false')
                                            : null,
                'date_immatriculation'  => $dateIdx !== null && ($row[$dateIdx] ?? '') !== ''
                                            ? $this->parseDate($row[$dateIdx])
                                            : null,
                'adresse_reference'     => $adrIdx !== null ? (mb_substr(trim($row[$adrIdx] ?? ''), 0, 200) ?: null) : null,
                'representant_legal'    => $repIdx !== null ? (mb_substr(trim($row[$repIdx] ?? ''), 0, 200) ?: null) : null,
                'date_reglement'        => $rglIdx !== null && ($row[$rglIdx] ?? '') !== '' ? $this->parseDate($row[$rglIdx]) : null,
                'nb_lots_principaux'    => $lprIdx !== null && ($row[$lprIdx] ?? '') !== '' ? (int) $row[$lprIdx] : null,
                'type_syndicat_copro'   => $tscIdx !== null && ($v = strtolower(trim($row[$tscIdx] ?? ''))) !== ''
                                            ? ($v === 'oui' ? 'Principal ou unique' : ($v === 'non' ? 'Secondaire' : mb_substr($v, 0, 60)))
                                            : null,
                'nb_asl'                => $aslIdx !== null && ($row[$aslIdx] ?? '') !== '' ? (int) $row[$aslIdx] : null,
                'nb_aful'               => $afuIdx !== null && ($row[$afuIdx] ?? '') !== '' ? (int) $row[$afuIdx] : null,
                'nb_unions_syndicat'    => $uniIdx !== null && ($row[$uniIdx] ?? '') !== '' ? (int) $row[$uniIdx] : null,
                'residence_service'     => $resIdx !== null && ($row[$resIdx] ?? '') !== ''
                                            ? (in_array(strtolower(trim($row[$resIdx])), ['1', 'true', 'oui', 'yes', 't'], true) ? 'true' : 'false')
                                            : null,
                'ttl_expires_at'        => $ttl,
            ];

            // Références cadastrales → liens parcelles
            foreach ([$ref1Idx, $ref2Idx, $ref3Idx] as $refIdx) {
                if ($refIdx === null) continue;
                $ref = trim($row[$refIdx] ?? '');
                // Format attendu : 14 chars alphanum (identifiant cadastral normalisé)
                if ($ref !== '' && strlen($ref) <= 14) {
                    $refs[] = [$noImmat, $ref];
                }
            }

            if (count($batch) >= self::BATCH) {
                $this->flushCoproprietes($batch);
                $count += count($batch);
                $batch  = [];
            }
        }

        if ($batch) {
            $this->flushCoproprietes($batch);
            $count += count($batch);
        }

        fclose($handle);
        return [$count, $refs];
    }

    private function flushCoproprietes(array $batch): void
    {
        // Keep last occurrence when duplicates exist within the batch
        $deduped = [];
        foreach ($batch as $r) {
            $deduped[$r['no_immatriculation']] = $r;
        }
        $batch = array_values($deduped);

        $vals   = [];
        $params = [];

        foreach ($batch as $i => $r) {
            $vals[] = "(:no$i,:com$i,:nom$i,:lon$i,:lat$i,:tot$i,:hab$i,:sta$i,:per$i,:syn$i,:coo$i,:dat$i,:adr$i,:rep$i,:rgl$i,:lpr$i,:tsc$i,:asl$i,:afu$i,:uni$i,:res$i,:ttl$i)";
            $params["no$i"]  = $r['no_immatriculation'];
            $params["com$i"] = $r['commune_code'];
            $params["nom$i"] = $r['nom'];
            $params["lon$i"] = $r['lon'];
            $params["lat$i"] = $r['lat'];
            $params["tot$i"] = $r['nb_lots_total'];
            $params["hab$i"] = $r['nb_lots_habitation'];
            $params["sta$i"] = $r['nb_lots_stationnement'];
            $params["per$i"] = $r['periode_construction'];
            $params["syn$i"] = $r['type_syndic'];
            $params["coo$i"] = $r['syndicat_cooperatif'];
            $params["dat$i"] = $r['date_immatriculation'];
            $params["adr$i"] = $r['adresse_reference'];
            $params["rep$i"] = $r['representant_legal'];
            $params["rgl$i"] = $r['date_reglement'];
            $params["lpr$i"] = $r['nb_lots_principaux'];
            $params["tsc$i"] = $r['type_syndicat_copro'];
            $params["asl$i"] = $r['nb_asl'];
            $params["afu$i"] = $r['nb_aful'];
            $params["uni$i"] = $r['nb_unions_syndicat'];
            $params["res$i"] = $r['residence_service'];
            $params["ttl$i"] = $r['ttl_expires_at'];
        }

        $this->connection->executeStatement(
            'INSERT INTO coproprietes
                (no_immatriculation, commune_code, nom, lon, lat,
                 nb_lots_total, nb_lots_habitation, nb_lots_stationnement,
                 periode_construction, type_syndic, syndicat_cooperatif,
                 date_immatriculation, adresse_reference,
                 representant_legal, date_reglement, nb_lots_principaux,
                 type_syndicat_copro, nb_asl, nb_aful, nb_unions_syndicat,
                 residence_service, ttl_expires_at)
             VALUES ' . implode(', ', $vals) . '
             ON CONFLICT (no_immatriculation) DO UPDATE SET
                commune_code          = EXCLUDED.commune_code,
                nom                   = EXCLUDED.nom,
                lon                   = EXCLUDED.lon,
                lat                   = EXCLUDED.lat,
                nb_lots_total         = EXCLUDED.nb_lots_total,
                nb_lots_habitation    = EXCLUDED.nb_lots_habitation,
                nb_lots_stationnement = EXCLUDED.nb_lots_stationnement,
                periode_construction  = EXCLUDED.periode_construction,
                type_syndic           = EXCLUDED.type_syndic,
                syndicat_cooperatif   = EXCLUDED.syndicat_cooperatif,
                date_immatriculation  = EXCLUDED.date_immatriculation,
                adresse_reference     = EXCLUDED.adresse_reference,
                representant_legal    = EXCLUDED.representant_legal,
                date_reglement        = EXCLUDED.date_reglement,
                nb_lots_principaux    = EXCLUDED.nb_lots_principaux,
                type_syndicat_copro   = EXCLUDED.type_syndicat_copro,
                nb_asl                = EXCLUDED.nb_asl,
                nb_aful               = EXCLUDED.nb_aful,
                nb_unions_syndicat    = EXCLUDED.nb_unions_syndicat,
                residence_service     = EXCLUDED.residence_service,
                ttl_expires_at        = EXCLUDED.ttl_expires_at',
            $params
        );
    }

    /**
     * Remplace atomiquement toute la table coproprietes_parcelles.
     * Utilise une transaction MVCC : les lecteurs voient l'ancien état jusqu'au COMMIT.
     */
    private function swapJunction(array $refs): void
    {
        $this->connection->beginTransaction();
        try {
            $this->connection->executeStatement('DELETE FROM coproprietes_parcelles');

            $batch = [];
            foreach ($refs as $ref) {
                $batch[] = $ref;
                if (count($batch) >= self::BATCH) {
                    $this->flushJunction($batch);
                    $batch = [];
                }
            }
            if ($batch) {
                $this->flushJunction($batch);
            }

            $this->connection->commit();
        } catch (\Throwable $e) {
            $this->connection->rollBack();
            throw $e;
        }
    }

    private function flushJunction(array $batch): void
    {
        $vals   = [];
        $params = [];

        foreach ($batch as $i => [$noImmat, $parcelleId]) {
            $vals[]          = "(:no$i,:par$i)";
            $params["no$i"]  = $noImmat;
            $params["par$i"] = $parcelleId;
        }

        $this->connection->executeStatement(
            'INSERT INTO coproprietes_parcelles (no_immatriculation, parcelle_id)
             VALUES ' . implode(', ', $vals) . '
             ON CONFLICT DO NOTHING',
            $params
        );
    }

    private function parseDate(string $value): ?string
    {
        $v = trim($value);
        if ($v === '') return null;
        // Formats courants : YYYY-MM-DD, DD/MM/YYYY
        if (preg_match('/^\d{4}-\d{2}-\d{2}/', $v)) {
            return substr($v, 0, 10);
        }
        if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', $v, $m)) {
            return "$m[3]-$m[2]-$m[1]";
        }
        return null;
    }

    private function detectSeparator(string $file): string
    {
        $handle = fopen($file, 'r');
        $bom    = fread($handle, 3);
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

    private function download(string $url, string $dest): void
    {
        $fp = fopen($dest, 'wb');
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_FILE           => $fp,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT        => 3600,
            CURLOPT_USERAGENT      => 'alua/1.0',
            CURLOPT_FAILONERROR    => true,
        ]);
        $ok   = curl_exec($ch);
        $err  = curl_error($ch);
        $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        fclose($fp);
        if (!$ok || $http >= 400) {
            throw new \RuntimeException("Téléchargement échoué (HTTP $http) : $err — $url");
        }
    }
}

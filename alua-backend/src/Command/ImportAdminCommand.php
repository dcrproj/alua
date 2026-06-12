<?php

declare(strict_types=1);

namespace App\Command;

use App\Service\NextRevalidateService;
use Doctrine\DBAL\Connection;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:import:admin',
    description: 'Import administrative boundaries (regions, departments, communes) from geo.api.gouv.fr',
)]
class ImportAdminCommand extends Command
{
    private const API_BASE = 'https://geo.api.gouv.fr';

    private const METRO_REGIONS = ['11','24','27','28','32','44','52','53','75','76','84','93','94'];

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

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        ini_set('memory_limit', '-1');
        $io = new SymfonyStyle($input, $output);
        $io->title('Import — Limites administratives (geo.api.gouv.fr)');

        // Récupère les métadonnées (sans géométrie — l'API ne la fournit que pour les communes)
        $regionMeta = $this->fetchRegionMeta();
        $deptMeta   = $this->fetchDeptMeta();

        // 1. Communes avec géométrie (source : API)
        $this->importCommunes($io, $output);

        // 2. Départements : géométrie = union des communes (PostGIS)
        $this->deriveDepartements($io, $deptMeta);

        // 3. Régions : géométrie = union des départements (PostGIS)
        $this->deriveRegions($io, $regionMeta);

        $io->success('Import terminé.');

        $this->revalidate->revalidateTags(['communes']);

        return Command::SUCCESS;
    }

    private function fetchRegionMeta(): array
    {
        $meta = [];
        foreach ($this->fetchJson('/regions?fields=code,nom') as $item) {
            $code = $item['code'] ?? null;
            if ($code && in_array($code, self::METRO_REGIONS, true)) {
                $meta[$code] = $item['nom'] ?? '';
            }
        }
        return $meta;
    }

    private function fetchDeptMeta(): array
    {
        $meta = [];
        foreach ($this->fetchJson('/departements?fields=code,nom,codeRegion') as $item) {
            $code = $item['code'] ?? null;
            if ($code && in_array($code, self::DEPARTMENTS, true)) {
                $meta[$code] = ['nom' => $item['nom'] ?? '', 'codeRegion' => $item['codeRegion'] ?? null];
            }
        }
        return $meta;
    }

    private function deriveRegions(SymfonyStyle $io, array $regionMeta): void
    {
        $io->section('Régions (union des départements)');
        $count = 0;
        foreach ($regionMeta as $code => $nom) {
            $this->connection->executeStatement(
                "INSERT INTO regions (code, nom, geometry, slug)
                 SELECT :code, :nom, ST_Multi(ST_Union(geometry))::geometry(MultiPolygon,4326), :slug
                 FROM departements WHERE code_region = :code
                 ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, geometry = EXCLUDED.geometry",
                ['code' => $code, 'nom' => $nom, 'slug' => $this->slugify($nom) ?: $code]
            );
            ++$count;
        }
        $io->text(sprintf('  → %d régions dérivées.', $count));
    }

    private function deriveDepartements(SymfonyStyle $io, array $deptMeta): void
    {
        $io->section('Départements (union des communes)');
        $count = 0;
        foreach ($deptMeta as $code => $data) {
            $this->connection->executeStatement(
                "INSERT INTO departements (code, nom, code_region, geometry, slug)
                 SELECT :code, :nom, :code_region, ST_Multi(ST_Union(geometry))::geometry(MultiPolygon,4326), :slug
                 FROM communes WHERE code_departement = :code
                 ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, code_region = EXCLUDED.code_region, geometry = EXCLUDED.geometry",
                ['code' => $code, 'nom' => $data['nom'], 'code_region' => $data['codeRegion'], 'slug' => $this->slugify($data['nom']) ?: $code]
            );
            ++$count;
        }
        $io->text(sprintf('  → %d départements dérivés.', $count));
    }

    private function importCommunes(SymfonyStyle $io, OutputInterface $output): void
    {
        $io->section('Communes');
        $total = 0;

        foreach (self::DEPARTMENTS as $dept) {
            $items = $this->fetchJson(
                sprintf('/communes?codeDepartement=%s&fields=code,nom,codeDepartement,population,contour', $dept)
            );

            $withGeom    = [];
            $withoutGeom = [];
            foreach ($items as $item) {
                $code = $item['code'] ?? null;
                if (!$code) {
                    continue;
                }
                $base = [
                    'code_insee'       => $code,
                    'nom'              => $item['nom'] ?? '',
                    'code_departement' => $item['codeDepartement'] ?? null,
                    'population'       => $item['population'] ?? null,
                ];
                if (!empty($item['contour'])) {
                    $withGeom[] = $base + ['geom' => json_encode($item['contour'])];
                } else {
                    $withoutGeom[] = $base;
                }
            }

            if (!empty($withGeom)) {
                $this->assignSlugs($withGeom);
                $this->insertCommuneBatch($withGeom);
            }
            if (!empty($withoutGeom)) {
                $this->assignSlugs($withoutGeom);
                $this->insertCommuneBatchNoGeom($withoutGeom);
            }
            $total += count($withGeom) + count($withoutGeom);

            $output->write(sprintf("\r  → %d communes importées…", $total));
        }

        $output->writeln('');
        $io->text(sprintf('  → %d communes importées.', $total));
    }

    /**
     * Calcule les slugs pour un batch en évitant les conflits intra-batch
     * et avec les slugs déjà présents en base (pour une commune différente).
     */
    private function assignSlugs(array &$rows): void
    {
        foreach ($rows as &$row) {
            $row['slug'] = $this->slugify($row['nom']) ?: $row['code_insee'];
        }
        unset($row);

        // Dédupliquer les conflits intra-batch
        $seen = [];
        foreach ($rows as &$row) {
            if (isset($seen[$row['slug']])) {
                $row['slug'] .= '-' . $row['code_insee'];
            }
            $seen[$row['slug']] = true;
        }
        unset($row);

        // Vérifier les conflits avec les slugs déjà en base (commune différente)
        $slugs = array_column($rows, 'slug');
        $codes = array_column($rows, 'code_insee');
        if (empty($slugs)) {
            return;
        }

        $inList = implode(',', array_fill(0, count($slugs), '?'));
        $existing = $this->connection->fetchAllAssociative(
            "SELECT slug, code_insee FROM communes WHERE slug IN ($inList)",
            $slugs
        );

        $takenByOther = [];
        foreach ($existing as $ex) {
            $takenByOther[$ex['slug']] = $ex['code_insee'];
        }

        foreach ($rows as &$row) {
            $owner = $takenByOther[$row['slug']] ?? null;
            if ($owner !== null && $owner !== $row['code_insee']) {
                $row['slug'] .= '-' . $row['code_insee'];
            }
        }
    }

    private function insertCommuneBatch(array $batch): void
    {
        $valueParts = [];
        $params     = [];

        foreach ($batch as $i => $row) {
            $valueParts[] = sprintf(
                "(:code_%d, :nom_%d, :dept_%d, :pop_%d, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(:geom_%d), 4326))::geometry(MultiPolygon,4326), :slug_%d)",
                $i, $i, $i, $i, $i, $i
            );
            $params["code_{$i}"] = $row['code_insee'];
            $params["nom_{$i}"]  = $row['nom'];
            $params["dept_{$i}"] = $row['code_departement'];
            $params["pop_{$i}"]  = $row['population'];
            $params["geom_{$i}"] = $row['geom'];
            $params["slug_{$i}"] = $row['slug'];
        }

        $this->connection->executeStatement(
            sprintf(
                "INSERT INTO communes (code_insee, nom, code_departement, population, geometry, slug)
                 VALUES %s
                 ON CONFLICT (code_insee) DO UPDATE SET
                     nom      = EXCLUDED.nom,
                     code_departement = EXCLUDED.code_departement,
                     population       = EXCLUDED.population,
                     geometry         = EXCLUDED.geometry",
                implode(', ', $valueParts)
            ),
            $params
        );
    }

    private function insertCommuneBatchNoGeom(array $batch): void
    {
        $valueParts = [];
        $params     = [];

        foreach ($batch as $i => $row) {
            $valueParts[] = sprintf("(:code_%d, :nom_%d, :dept_%d, :pop_%d, :slug_%d)", $i, $i, $i, $i, $i);
            $params["code_{$i}"] = $row['code_insee'];
            $params["nom_{$i}"]  = $row['nom'];
            $params["dept_{$i}"] = $row['code_departement'];
            $params["pop_{$i}"]  = $row['population'];
            $params["slug_{$i}"] = $row['slug'];
        }

        $this->connection->executeStatement(
            sprintf(
                "INSERT INTO communes (code_insee, nom, code_departement, population, slug)
                 VALUES %s
                 ON CONFLICT (code_insee) DO UPDATE SET
                     nom              = EXCLUDED.nom,
                     code_departement = EXCLUDED.code_departement,
                     population       = EXCLUDED.population",
                implode(', ', $valueParts)
            ),
            $params
        );
    }

    private function slugify(string $text): string
    {
        $slug = (string) transliterator_transliterate('Any-Latin; Latin-ASCII; Lower()', $text);
        $slug = (string) preg_replace('/[^a-z0-9]+/', '-', $slug);
        return trim($slug, '-');
    }

    private function fetchJson(string $path): array
    {
        $url     = self::API_BASE . $path;
        $content = @file_get_contents($url);
        if ($content === false) {
            throw new \RuntimeException(sprintf('Impossible de télécharger : %s', $url));
        }

        $data = json_decode($content, true);
        if (!is_array($data)) {
            throw new \RuntimeException(sprintf('Réponse invalide pour : %s', $url));
        }

        return $data;
    }
}

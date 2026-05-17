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
 * Importe les zones RGA (Retrait-Gonflement des Argiles) depuis le shapefile BRGM national.
 *
 * Source : https://www.georisques.gouv.fr/donnees/bases-de-donnees/retrait-gonflement-des-argiles
 * Fichier attendu : /home/david/data/rga/RGA_NAT.shp (ou .gpkg)
 *
 * Procédure VPS :
 *   mkdir -p ~/data/rga && cd ~/data/rga
 *   wget "https://files.georisques.fr/RGA/RGA_NAT.zip"
 *   unzip RGA_NAT.zip
 *   php8.3 bin/console app:import:rga
 */
#[AsCommand(name: 'app:import:rga', description: 'Importe les zones RGA (retrait-gonflement des argiles) BRGM')]
class ImportRgaCommand extends Command
{
    private const SHAPEFILE = '/home/david/data/rga/RGA_NAT.shp';
    private const GPKG      = '/home/david/data/rga/RGA_NAT.gpkg';
    private const TABLE     = 'rga_zones';

    public function __construct(private readonly Connection $connection)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('Import RGA — Retrait-Gonflement des Argiles');

        $file = file_exists(self::GPKG) ? self::GPKG : (file_exists(self::SHAPEFILE) ? self::SHAPEFILE : null);
        if (!$file) {
            $io->error([
                'Fichier RGA non trouvé.',
                'Télécharger depuis : https://www.georisques.gouv.fr/donnees/bases-de-donnees/retrait-gonflement-des-argiles',
                'Placer dans : /home/david/data/rga/',
                'Nom attendu : RGA_NAT.shp ou RGA_NAT.gpkg',
            ]);
            return Command::FAILURE;
        }

        $io->writeln("Fichier : $file");

        $io->writeln('Lancement de ogr2ogr…');

        $db = $this->connection->getParams();
        $dsn = sprintf(
            'PG:host=%s port=%s dbname=%s user=%s password=%s',
            $db['host'] ?? '127.0.0.1',
            $db['port'] ?? '5432',
            $db['dbname'],
            $db['user'],
            $db['password'] ?? '',
        );

        // Identifier le champ aléa dans le fichier source (varie selon la version BRGM)
        // Champs possibles : ALEA, NIVEAU_ALEA, Alea, niveau_alea
        $aleaField = $this->detectAleaField($file);
        $io->writeln("Champ aléa détecté : $aleaField");

        $sql = "SELECT $aleaField AS niveau_alea, ST_Transform(wkb_geometry, 4326) AS geom FROM " . basename($file, '.shp');
        if (str_ends_with($file, '.gpkg')) {
            $sql = "SELECT $aleaField AS niveau_alea, ST_Transform(geom, 4326) AS geom FROM rga";
        }

        $cmd = sprintf(
            'ogr2ogr -f "PostgreSQL" %s %s -nln %s -nlt MULTIPOLYGON -overwrite -t_srs EPSG:4326 2>&1',
            escapeshellarg($dsn),
            escapeshellarg($file),
            self::TABLE . '_import'
        );

        $io->writeln('Import via ogr2ogr…');
        $exitCode = 0;
        system($cmd, $exitCode);

        if ($exitCode !== 0) {
            $io->error('ogr2ogr a échoué. Vérifier que ogr2ogr est installé (apt install gdal-bin).');
            return Command::FAILURE;
        }

        // Transférer dans la table finale avec le bon champ
        $this->connection->executeStatement("TRUNCATE " . self::TABLE);
        $this->connection->executeStatement("
            INSERT INTO " . self::TABLE . " (niveau_alea, geometry)
            SELECT $aleaField, wkb_geometry
            FROM " . self::TABLE . "_import
        ");
        $this->connection->executeStatement("DROP TABLE IF EXISTS " . self::TABLE . "_import");

        $count = $this->connection->fetchOne('SELECT COUNT(*) FROM ' . self::TABLE);
        $io->success("Import terminé : $count zones RGA importées.");

        return Command::SUCCESS;
    }

    private function detectAleaField(string $file): string
    {
        // Lire les champs disponibles via ogrinfo
        $output = shell_exec(sprintf('ogrinfo -al -so %s 2>/dev/null | grep -i alea | head -1', escapeshellarg($file)));
        if ($output && preg_match('/(\w*[Aa]lea\w*)/i', $output, $m)) {
            return $m[1];
        }
        return 'alea'; // nom par défaut BRGM
    }
}

<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260515000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Administrative boundary tables (regions, departements, communes) for map drill-down';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("
            CREATE TABLE regions (
                code    VARCHAR(3)   NOT NULL PRIMARY KEY,
                nom     VARCHAR(255) NOT NULL,
                geometry geometry(MultiPolygon, 4326) NOT NULL
            )
        ");
        $this->addSql('CREATE INDEX ON regions USING GIST(geometry)');

        $this->addSql("
            CREATE TABLE departements (
                code         VARCHAR(3)   NOT NULL PRIMARY KEY,
                nom          VARCHAR(255) NOT NULL,
                code_region  VARCHAR(3),
                geometry geometry(MultiPolygon, 4326) NOT NULL
            )
        ");
        $this->addSql('CREATE INDEX ON departements USING GIST(geometry)');

        $this->addSql("
            CREATE TABLE communes (
                code_insee       VARCHAR(5)   NOT NULL PRIMARY KEY,
                nom              VARCHAR(255) NOT NULL,
                code_departement VARCHAR(3),
                population       INTEGER,
                geometry geometry(MultiPolygon, 4326) NOT NULL
            )
        ");
        $this->addSql('CREATE INDEX ON communes USING GIST(geometry)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS communes');
        $this->addSql('DROP TABLE IF EXISTS departements');
        $this->addSql('DROP TABLE IF EXISTS regions');
    }
}

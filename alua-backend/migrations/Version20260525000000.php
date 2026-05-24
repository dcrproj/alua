<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260525000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add slug columns to communes, departements, regions for SEO-friendly URLs';
    }

    public function up(Schema $schema): void
    {
        // unaccent permet de translittérer les accents en ASCII (ä→a, é→e…)
        $this->addSql('CREATE EXTENSION IF NOT EXISTS unaccent');

        // ── Communes ─────────────────────────────────────────────────────────
        $this->addSql('ALTER TABLE communes ADD COLUMN slug VARCHAR(255)');

        // Génère le slug de base : minuscules, translittération accents, tirets
        $this->addSql("
            UPDATE communes
            SET slug = trim(both '-' from
                regexp_replace(lower(unaccent(nom)), '[^a-z0-9]+', '-', 'g')
            )
        ");

        // Résout les conflits : ajoute -code_insee pour les doublons
        $this->addSql("
            UPDATE communes c1
            SET slug = c1.slug || '-' || c1.code_insee
            WHERE (SELECT COUNT(*) FROM communes c2 WHERE c2.slug = c1.slug) > 1
        ");

        // Sécurité : slug vide ou null → code_insee
        $this->addSql("
            UPDATE communes SET slug = code_insee WHERE slug IS NULL OR slug = ''
        ");

        $this->addSql('ALTER TABLE communes ALTER COLUMN slug SET NOT NULL');
        $this->addSql('CREATE UNIQUE INDEX communes_slug_idx ON communes(slug)');

        // ── Départements ──────────────────────────────────────────────────────
        $this->addSql('ALTER TABLE departements ADD COLUMN slug VARCHAR(255)');

        $this->addSql("
            UPDATE departements
            SET slug = trim(both '-' from
                regexp_replace(lower(unaccent(nom)), '[^a-z0-9]+', '-', 'g')
            )
        ");

        $this->addSql("
            UPDATE departements SET slug = code WHERE slug IS NULL OR slug = ''
        ");

        $this->addSql('ALTER TABLE departements ALTER COLUMN slug SET NOT NULL');
        $this->addSql('CREATE UNIQUE INDEX departements_slug_idx ON departements(slug)');

        // ── Régions ──────────────────────────────────────────────────────────
        $this->addSql('ALTER TABLE regions ADD COLUMN slug VARCHAR(255)');

        $this->addSql("
            UPDATE regions
            SET slug = trim(both '-' from
                regexp_replace(lower(unaccent(nom)), '[^a-z0-9]+', '-', 'g')
            )
        ");

        $this->addSql("
            UPDATE regions SET slug = code WHERE slug IS NULL OR slug = ''
        ");

        $this->addSql('ALTER TABLE regions ALTER COLUMN slug SET NOT NULL');
        $this->addSql('CREATE UNIQUE INDEX regions_slug_idx ON regions(slug)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS communes_slug_idx');
        $this->addSql('ALTER TABLE communes DROP COLUMN IF EXISTS slug');

        $this->addSql('DROP INDEX IF EXISTS departements_slug_idx');
        $this->addSql('ALTER TABLE departements DROP COLUMN IF EXISTS slug');

        $this->addSql('DROP INDEX IF EXISTS regions_slug_idx');
        $this->addSql('ALTER TABLE regions DROP COLUMN IF EXISTS slug');
    }
}

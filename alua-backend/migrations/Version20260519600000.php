<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260519600000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Crée la table sirene_unites_legales (dénominations)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("
            CREATE TABLE sirene_unites_legales (
                siren        VARCHAR(9)   NOT NULL PRIMARY KEY,
                denomination VARCHAR(255),
                updated_at   TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
            )
        ");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS sirene_unites_legales');
    }
}

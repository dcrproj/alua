<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260517100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'monuments_historiques.commune_code VARCHAR(10) → VARCHAR(50) (codes multi-communes ou anciens formats)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE monuments_historiques ALTER COLUMN commune_code TYPE VARCHAR(50)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE monuments_historiques ALTER COLUMN commune_code TYPE VARCHAR(10)');
    }
}

<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260512110000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Increase precision of dpes numeric columns to DECIMAL(15,2)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE dpes ALTER COLUMN conso_primaire TYPE NUMERIC(15, 2)');
        $this->addSql('ALTER TABLE dpes ALTER COLUMN emission_ges TYPE NUMERIC(15, 2)');
        $this->addSql('ALTER TABLE dpes ALTER COLUMN surface_habitable TYPE NUMERIC(15, 2)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE dpes ALTER COLUMN conso_primaire TYPE NUMERIC(10, 2)');
        $this->addSql('ALTER TABLE dpes ALTER COLUMN emission_ges TYPE NUMERIC(10, 2)');
        $this->addSql('ALTER TABLE dpes ALTER COLUMN surface_habitable TYPE NUMERIC(10, 2)');
    }
}

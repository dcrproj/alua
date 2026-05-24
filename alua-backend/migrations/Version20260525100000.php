<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260525100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Indexes for region/département JOIN queries (mutations_dvf, dpes, communes, departements)';
    }

    public function up(Schema $schema): void
    {
        // Clé de jointure principale : mutations → communes
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_mutations_dvf_code_commune ON mutations_dvf(code_commune)');

        // Clés de jointure pour remonter commune → département → région
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_communes_code_departement ON communes(code_departement)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_departements_code_region ON departements(code_region)');

        // Filtre fréquent sur les mutations
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_mutations_dvf_nature ON mutations_dvf(nature_mutation)");
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_mutations_dvf_date ON mutations_dvf(date_mutation)');

        // DPE : jointure commune
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_dpes_code_commune ON dpes(code_commune)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS idx_mutations_dvf_code_commune');
        $this->addSql('DROP INDEX IF EXISTS idx_communes_code_departement');
        $this->addSql('DROP INDEX IF EXISTS idx_departements_code_region');
        $this->addSql('DROP INDEX IF EXISTS idx_mutations_dvf_nature');
        $this->addSql('DROP INDEX IF EXISTS idx_mutations_dvf_date');
        $this->addSql('DROP INDEX IF EXISTS idx_dpes_code_commune');
    }
}

<?php

declare(strict_types=1);

namespace App\Command;

use App\Message\RefreshDpeMessage;
use App\Message\RefreshRnicMessage;
use App\Message\RefreshSireneMessage;
use App\Message\RefreshSitadelMessage;
use Doctrine\DBAL\Connection;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\Messenger\MessageBusInterface;

#[AsCommand(
    name: 'app:refresh:check',
    description: 'Dispatch refresh jobs for entities with expired TTL',
)]
class RefreshCheckCommand extends Command
{
    public function __construct(
        private readonly Connection $connection,
        private readonly MessageBusInterface $bus,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('Refresh TTL check');

        // DPE : départements avec au moins un DPE expiré
        $departments = $this->connection->fetchFirstColumn(
            "SELECT DISTINCT code_departement
             FROM dpes
             WHERE ttl_expires_at IS NOT NULL
               AND ttl_expires_at < NOW()
               AND code_departement IS NOT NULL
             ORDER BY code_departement"
        );

        if (!empty($departments)) {
            $io->text(sprintf('%d département(s) avec DPE expirés :', count($departments)));
            foreach ($departments as $dept) {
                $this->bus->dispatch(new RefreshDpeMessage($dept));
                $io->text(sprintf('  → RefreshDpeMessage dispatché pour le dept %s', $dept));
            }
        }

        // RNIC : un seul message si au moins une copropriété expirée
        $rnicExpired = false;
        try {
            $rnicExpired = (bool) $this->connection->fetchOne(
                "SELECT 1 FROM coproprietes WHERE ttl_expires_at < NOW() LIMIT 1"
            );
        } catch (\Throwable) {
            // table absente (pas encore migré)
        }

        if ($rnicExpired) {
            $this->bus->dispatch(new RefreshRnicMessage());
            $io->text('  → RefreshRnicMessage dispatché');
        }

        // Sitadel : TTL 30 jours
        $sitadelExpired = false;
        try {
            $sitadelExpired = (bool) $this->connection->fetchOne(
                "SELECT 1 FROM sitadel_permis WHERE updated_at < NOW() - INTERVAL '30 days' LIMIT 1"
            );
        } catch (\Throwable) {}

        if ($sitadelExpired) {
            $this->bus->dispatch(new RefreshSitadelMessage());
            $io->text('  → RefreshSitadelMessage dispatché');
        }

        // SIRENE : TTL 30 jours
        $sireneExpired = false;
        try {
            $sireneExpired = (bool) $this->connection->fetchOne(
                "SELECT 1 FROM sirene_etablissements WHERE updated_at < NOW() - INTERVAL '30 days' LIMIT 1"
            );
        } catch (\Throwable) {}

        if ($sireneExpired) {
            $this->bus->dispatch(new RefreshSireneMessage());
            $io->text('  → RefreshSireneMessage dispatché');
        }

        $total = count($departments) + ($rnicExpired ? 1 : 0) + ($sitadelExpired ? 1 : 0) + ($sireneExpired ? 1 : 0);

        if ($total === 0) {
            $io->success('Aucune entité expirée.');
            return Command::SUCCESS;
        }

        $io->success(sprintf('%d jobs de refresh dispatchés.', $total));

        return Command::SUCCESS;
    }
}

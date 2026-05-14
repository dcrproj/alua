<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\CommuneOutput;
use App\Message\RefreshDpeMessage;
use Doctrine\DBAL\Connection;
use Symfony\Component\Messenger\MessageBusInterface;

final class CommuneStateProvider implements ProviderInterface
{
    public function __construct(
        private readonly Connection $connection,
        private readonly MessageBusInterface $bus,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): ?CommuneOutput
    {
        $code = $uriVariables['code'] ?? null;
        if (!$code) {
            return null;
        }

        // Vérifier que la commune existe (via une mutation ou une parcelle)
        $nom = $this->connection->fetchOne(
            'SELECT nom_commune FROM mutations_dvf WHERE code_commune = :code LIMIT 1',
            ['code' => $code]
        );

        $output = new CommuneOutput();
        $output->code = $code;
        $output->nom  = $nom ?: null;

        $output->nbParcelles    = (int) $this->connection->fetchOne(
            'SELECT COUNT(*) FROM parcelles WHERE commune_code = :code',
            ['code' => $code]
        );

        $output->nbTransactions = (int) $this->connection->fetchOne(
            'SELECT COUNT(*) FROM mutations_dvf WHERE code_commune = :code',
            ['code' => $code]
        );

        // Prix médian au m² (sur les 10 dernières années, lots avec surface > 0)
        $prixMedian = $this->connection->fetchOne(
            "SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY m.valeur_fonciere / l.surface_reelle_bati)
             FROM mutations_dvf m
             JOIN mutations_dvf_lots l ON l.mutation_dvf_id = m.id
             WHERE m.code_commune = :code
               AND l.surface_reelle_bati > 0
               AND m.valeur_fonciere > 0
               AND m.nature_mutation = 'Vente'
               AND m.date_mutation >= NOW() - INTERVAL '10 years'",
            ['code' => $code]
        );
        $output->prixMedianM2 = $prixMedian !== false && $prixMedian !== null ? round((float) $prixMedian, 0) : null;

        $output->nbDpes = (int) $this->connection->fetchOne(
            'SELECT COUNT(*) FROM dpes WHERE code_commune = :code',
            ['code' => $code]
        );

        // Distribution DPE
        $dpeRows = $this->connection->fetchAllAssociative(
            "SELECT etiquette_dpe, COUNT(*) as nb
             FROM dpes
             WHERE code_commune = :code AND etiquette_dpe IS NOT NULL
             GROUP BY etiquette_dpe
             ORDER BY etiquette_dpe",
            ['code' => $code]
        );
        $dist = [];
        foreach ($dpeRows as $r) {
            $dist[$r['etiquette_dpe']] = (int) $r['nb'];
        }
        $output->distributionDpe = $dist;

        // Évolution des prix par année
        $evolRows = $this->connection->fetchAllAssociative(
            "SELECT EXTRACT(YEAR FROM m.date_mutation) as annee,
                    COUNT(DISTINCT m.id) as nb_ventes,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY m.valeur_fonciere / l.surface_reelle_bati) as prix_median
             FROM mutations_dvf m
             JOIN mutations_dvf_lots l ON l.mutation_dvf_id = m.id
             WHERE m.code_commune = :code
               AND l.surface_reelle_bati > 0
               AND m.valeur_fonciere > 0
               AND m.nature_mutation = 'Vente'
             GROUP BY annee
             ORDER BY annee",
            ['code' => $code]
        );
        $output->evolutionPrix = array_map(fn(array $r) => [
            'annee'       => (int) $r['annee'],
            'nbVentes'    => (int) $r['nb_ventes'],
            'prixMedianM2'=> $r['prix_median'] !== null ? round((float) $r['prix_median'], 0) : null,
        ], $evolRows);

        // Stale-while-revalidate : si des DPE de cette commune sont expirés, dispatch refresh
        $this->dispatchIfStale($code);

        return $output;
    }

    private function dispatchIfStale(string $communeCode): void
    {
        $dept = $this->connection->fetchOne(
            "SELECT code_departement FROM dpes
             WHERE code_commune = :code
               AND ttl_expires_at IS NOT NULL
               AND ttl_expires_at < NOW()
               AND code_departement IS NOT NULL
             LIMIT 1",
            ['code' => $communeCode]
        );

        if ($dept) {
            $this->bus->dispatch(new RefreshDpeMessage($dept));
        }
    }
}

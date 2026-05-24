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
        $slug = $uriVariables['slug'] ?? null;
        if (!$slug) {
            return null;
        }

        // Résolution : slug d'abord, puis code_insee en fallback (rétrocompat liens existants)
        $communeRow = $this->connection->fetchAssociative(
            'SELECT code_insee, nom, slug, code_departement FROM communes WHERE slug = :slug',
            ['slug' => $slug]
        );
        if (!$communeRow) {
            $communeRow = $this->connection->fetchAssociative(
                'SELECT code_insee, nom, slug, code_departement FROM communes WHERE code_insee = :code',
                ['code' => $slug]
            );
        }

        if (!$communeRow) {
            return null;
        }

        $code = $communeRow['code_insee'];
        $nom  = $communeRow['nom'];

        // Département + région pour breadcrumb et maillage
        $deptRow = null;
        if (!empty($communeRow['code_departement'])) {
            $deptRow = $this->connection->fetchAssociative(
                'SELECT d.code, d.nom, d.slug, d.code_region,
                        r.nom AS nom_region, r.slug AS slug_region
                 FROM departements d
                 LEFT JOIN regions r ON r.code = d.code_region
                 WHERE d.code = :code',
                ['code' => $communeRow['code_departement']]
            );
        }

        $output = new CommuneOutput();
        $output->code = $code;
        $output->slug = $communeRow['slug'];
        $output->nom  = $nom;
        $output->codeDepartement = $communeRow['code_departement'] ?? null;
        $output->nomDepartement  = $deptRow['nom']        ?? null;
        $output->slugDepartement = $deptRow['slug']       ?? null;
        $output->codeRegion      = $deptRow['code_region'] ?? null;
        $output->nomRegion       = $deptRow['nom_region']  ?? null;
        $output->slugRegion      = $deptRow['slug_region'] ?? null;

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

        // 50 ventes les plus récentes avec le lot principal (surface la plus grande)
        $limit = 50;
        $txRows = $this->connection->fetchAllAssociative(
            "SELECT
                m.id_mutation,
                m.date_mutation::text AS date_mutation,
                m.nature_mutation,
                m.valeur_fonciere::float AS valeur_fonciere,
                l.id_parcelle,
                l.type_local,
                l.surface_reelle_bati,
                l.surface_carrez,
                l.nombre_pieces_principales,
                l.adresse_numero,
                l.adresse_nom_voie
             FROM mutations_dvf m
             LEFT JOIN LATERAL (
                SELECT l2.id_parcelle, l2.type_local, l2.surface_reelle_bati, l2.surface_carrez, l2.nombre_pieces_principales, l2.adresse_numero, l2.adresse_nom_voie
                FROM mutations_dvf_lots l2
                WHERE l2.mutation_dvf_id = m.id
                ORDER BY l2.surface_reelle_bati DESC NULLS LAST, l2.id
                LIMIT 1
             ) l ON true
             WHERE m.code_commune = :code
               AND m.nature_mutation = 'Vente'
             ORDER BY m.date_mutation DESC
             LIMIT :limit",
            ['code' => $code, 'limit' => $limit]
        );
        $output->transactionsTruncated = count($txRows) >= $limit && $output->nbTransactions > $limit;
        $output->transactions = array_map(fn(array $r) => [
            'idMutation'     => $r['id_mutation'],
            'date'           => $r['date_mutation'],
            'valeurFonciere' => $r['valeur_fonciere'] !== null ? (float) $r['valeur_fonciere'] : null,
            'nature'         => $r['nature_mutation'],
            'typeLocal'      => $r['type_local'],
            'surfaceBati'    => $r['surface_reelle_bati'] !== null ? (float) $r['surface_reelle_bati'] : null,
            'surfaceCarrez'  => $r['surface_carrez'] !== null ? (float) $r['surface_carrez'] : null,
            'nombrePieces'   => $r['nombre_pieces_principales'] !== null ? (int) $r['nombre_pieces_principales'] : null,
            'idParcelle'     => $r['id_parcelle'],
            'adresse'        => trim(($r['adresse_numero'] ?? '') . ' ' . ($r['adresse_nom_voie'] ?? '')) ?: null,
        ], $txRows);

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

<?php

declare(strict_types=1);

namespace App\Controller;

use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class SitemapController extends AbstractController
{
    private const BATCH_SIZE = 50_000;

    public function __construct(private readonly Connection $connection) {}

    #[Route('/api/sitemap/communes', methods: ['GET'])]
    public function communes(): JsonResponse
    {
        $rows = $this->connection->fetchFirstColumn(
            'SELECT slug FROM communes WHERE slug IS NOT NULL ORDER BY slug'
        );
        return $this->json($rows);
    }

    #[Route('/api/admin/regions', methods: ['GET'])]
    public function regionsList(): JsonResponse
    {
        $rows = $this->connection->fetchAllAssociative(
            'SELECT code, nom, slug FROM regions WHERE slug IS NOT NULL ORDER BY nom'
        );
        return $this->json($rows);
    }

    #[Route('/api/sitemap/admin', methods: ['GET'])]
    public function admin(): JsonResponse
    {
        $departements = $this->connection->fetchFirstColumn(
            'SELECT slug FROM departements WHERE slug IS NOT NULL ORDER BY slug'
        );
        $regions = $this->connection->fetchFirstColumn(
            'SELECT slug FROM regions WHERE slug IS NOT NULL ORDER BY slug'
        );
        return $this->json(['departements' => $departements, 'regions' => $regions]);
    }

    #[Route('/api/sitemap/parcelles/count', methods: ['GET'])]
    public function parcellesCount(): JsonResponse
    {
        $count = (int) $this->connection->fetchOne(
            'SELECT COUNT(DISTINCT id_parcelle) FROM mutations_dvf_lots WHERE id_parcelle IS NOT NULL'
        );
        return $this->json([
            'count'   => $count,
            'batches' => (int) ceil($count / self::BATCH_SIZE),
        ]);
    }

    #[Route('/api/sitemap/parcelles/{batch}', methods: ['GET'], requirements: ['batch' => '\d+'])]
    public function parcelles(int $batch): JsonResponse
    {
        $rows = $this->connection->fetchFirstColumn(
            'SELECT DISTINCT id_parcelle
             FROM mutations_dvf_lots
             WHERE id_parcelle IS NOT NULL
             ORDER BY id_parcelle
             LIMIT ' . self::BATCH_SIZE . ' OFFSET :offset',
            ['offset' => $batch * self::BATCH_SIZE]
        );
        return $this->json($rows);
    }

    /**
     * Returns batch counts for a list of departments.
     * Query param `depts` = comma-separated dept codes (e.g. "75,69,13").
     */
    #[Route('/api/sitemap/adresses/counts', methods: ['GET'])]
    public function adressesCounts(Request $request): JsonResponse
    {
        $raw   = $request->query->getString('depts', '75,69,13,33,31,06,67,76,44,34');
        $depts = array_filter(array_map('trim', explode(',', $raw)));

        $result = [];
        foreach ($depts as $dept) {
            $count = (int) $this->connection->fetchOne(
                "SELECT COUNT(*) FROM addresses WHERE commune_code LIKE :prefix",
                ['prefix' => $dept . '%']
            );
            $result[$dept] = [
                'count'   => $count,
                'batches' => (int) ceil($count / self::BATCH_SIZE),
            ];
        }

        $response = $this->json($result);
        $response->headers->set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
        return $response;
    }

    #[Route('/api/sitemap/adresses/{dept}/{batch}', methods: ['GET'], requirements: ['dept' => '\d{2,3}', 'batch' => '\d+'])]
    public function adresses(string $dept, int $batch): JsonResponse
    {
        $rows = $this->connection->fetchFirstColumn(
            'SELECT ban_id FROM addresses
             WHERE commune_code LIKE :prefix
             ORDER BY ban_id
             LIMIT ' . self::BATCH_SIZE . ' OFFSET :offset',
            ['prefix' => $dept . '%', 'offset' => $batch * self::BATCH_SIZE]
        );

        $response = $this->json($rows);
        $response->headers->set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
        return $response;
    }
}

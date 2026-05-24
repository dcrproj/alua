<?php

declare(strict_types=1);

namespace App\Controller;

use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
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
}

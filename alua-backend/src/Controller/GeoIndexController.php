<?php

declare(strict_types=1);

namespace App\Controller;

use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

class GeoIndexController extends AbstractController
{
    public function __construct(private readonly Connection $connection) {}

    #[Route('/api/regions-index', methods: ['GET'])]
    public function regions(): JsonResponse
    {
        $rows = $this->connection->fetchAllAssociative(
            'SELECT code, nom, slug FROM regions WHERE slug IS NOT NULL ORDER BY nom'
        );
        return $this->json($rows);
    }

    #[Route('/api/departements-index', methods: ['GET'])]
    public function departements(): JsonResponse
    {
        $rows = $this->connection->fetchAllAssociative(
            'SELECT code, nom, slug FROM departements WHERE slug IS NOT NULL ORDER BY nom'
        );
        return $this->json($rows);
    }
}

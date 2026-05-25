<?php

declare(strict_types=1);

namespace App\Controller;

use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

class CommuneController extends AbstractController
{
    public function __construct(private readonly Connection $connection) {}

    #[Route('/api/communes/{slug}/voisines', methods: ['GET'])]
    public function voisines(string $slug): JsonResponse
    {
        $rows = $this->connection->fetchAllAssociative(
            "SELECT c2.code_insee, c2.nom, c2.slug, c2.population
             FROM communes c1
             JOIN communes c2
               ON c2.code_insee != c1.code_insee
              AND ST_DWithin(c1.geometry::geography, c2.geometry::geography, 100)
             WHERE c1.slug = :slug OR c1.code_insee = :slug
             ORDER BY c2.population DESC NULLS LAST
             LIMIT 8",
            ['slug' => $slug]
        );

        $response = $this->json(array_map(fn(array $r) => [
            'code'       => $r['code_insee'],
            'nom'        => $r['nom'],
            'slug'       => $r['slug'],
            'population' => $r['population'] !== null ? (int) $r['population'] : null,
        ], $rows));

        $response->headers->set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
        return $response;
    }
}

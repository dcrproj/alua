<?php

declare(strict_types=1);

namespace App\Controller;

use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

class ParcelleDataController extends AbstractController
{
    public function __construct(private readonly Connection $connection) {}

    #[Route('/api/parcelles/{idParcelle}/transactions', methods: ['GET'])]
    public function transactions(string $idParcelle): JsonResponse
    {
        $parcelleUuid = $this->connection->fetchOne(
            'SELECT id FROM parcelles WHERE id_parcelle = :id',
            ['id' => $idParcelle]
        );

        if (!$parcelleUuid) {
            return $this->json(['items' => [], 'updatedAt' => null]);
        }

        $rows = $this->connection->fetchAllAssociative(
            "SELECT m.id_mutation, m.date_mutation, m.nature_mutation, m.valeur_fonciere,
                    json_agg(json_build_object(
                        'typeLocal',     l.type_local,
                        'surfaceBati',   l.surface_reelle_bati,
                        'surfaceTerrain',l.surface_terrain,
                        'surfaceCarrez', l.surface_carrez,
                        'nombrePieces',  l.nombre_pieces_principales
                    ) ORDER BY l.type_local NULLS LAST) AS lots
             FROM mutations_dvf_lots l
             JOIN mutations_dvf m ON m.id = l.mutation_dvf_id
             WHERE l.parcelle_id = :id
             GROUP BY m.id, m.id_mutation, m.date_mutation, m.nature_mutation, m.valeur_fonciere
             ORDER BY m.date_mutation DESC
             LIMIT 20",
            ['id' => $parcelleUuid]
        );

        $updatedAt = $this->connection->fetchOne(
            'SELECT MAX(m.created_at)
             FROM mutations_dvf m
             JOIN mutations_dvf_lots l ON l.mutation_dvf_id = m.id
             WHERE l.parcelle_id = :id',
            ['id' => $parcelleUuid]
        );

        $items = array_map(fn(array $r) => [
            'idMutation'    => $r['id_mutation'],
            'date'          => $r['date_mutation'],
            'nature'        => $r['nature_mutation'],
            'valeurFonciere'=> $r['valeur_fonciere'] !== null ? (float) $r['valeur_fonciere'] : null,
            'lots'          => json_decode($r['lots'], true),
        ], $rows);

        return $this->json(['items' => $items, 'updatedAt' => $updatedAt ?: null]);
    }

    #[Route('/api/parcelles/{idParcelle}/dpes', methods: ['GET'])]
    public function dpes(string $idParcelle): JsonResponse
    {
        $parcelleUuid = $this->connection->fetchOne(
            'SELECT id FROM parcelles WHERE id_parcelle = :id',
            ['id' => $idParcelle]
        );

        if (!$parcelleUuid) {
            return $this->json(['items' => [], 'updatedAt' => null]);
        }

        $rows = $this->connection->fetchAllAssociative(
            'SELECT d.numero_dpe, d.date_etablissement, d.date_fin_validite,
                    d.etiquette_dpe, d.etiquette_ges,
                    d.conso_primaire, d.emission_ges,
                    d.type_batiment, d.surface_habitable,
                    d.periode_construction, d.type_energie_chauffage,
                    a.numero AS addr_numero, a.voie AS addr_voie
             FROM dpes d
             JOIN parcelles_addresses pa ON pa.address_id = d.address_id
             LEFT JOIN addresses a ON a.id = d.address_id
             WHERE pa.parcelle_id = :id
               AND d.address_id IS NOT NULL
             ORDER BY d.date_etablissement DESC
             LIMIT 5',
            ['id' => $parcelleUuid]
        );

        $updatedAt = $this->connection->fetchOne(
            'SELECT MAX(d.created_at)
             FROM dpes d
             JOIN parcelles_addresses pa ON pa.address_id = d.address_id
             WHERE pa.parcelle_id = :id AND d.address_id IS NOT NULL',
            ['id' => $parcelleUuid]
        );

        $items = array_map(fn(array $r) => [
            'numeroDpe'          => $r['numero_dpe'],
            'date'               => $r['date_etablissement'],
            'dateFinValidite'    => $r['date_fin_validite'],
            'etiquetteDpe'       => $r['etiquette_dpe'],
            'etiquetteGes'       => $r['etiquette_ges'],
            'consoPrimaire'      => $r['conso_primaire'] !== null ? (float) $r['conso_primaire'] : null,
            'emissionGes'        => $r['emission_ges'] !== null ? (float) $r['emission_ges'] : null,
            'typeBatiment'       => $r['type_batiment'],
            'surface'            => $r['surface_habitable'] !== null ? (float) $r['surface_habitable'] : null,
            'periodeConstruction'=> $r['periode_construction'],
            'energieChauffage'   => $r['type_energie_chauffage'],
            'adresse'            => trim(($r['addr_numero'] ?? '') . ' ' . ($r['addr_voie'] ?? '')) ?: null,
        ], $rows);

        return $this->json(['items' => $items, 'updatedAt' => $updatedAt ?: null]);
    }
}

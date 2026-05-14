<?php

declare(strict_types=1);

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use App\State\TransactionStateProvider;

#[ApiResource(
    operations: [new GetCollection(provider: TransactionStateProvider::class)],
    uriTemplate: '/transactions',
    shortName: 'Transaction',
    paginationEnabled: true,
    paginationItemsPerPage: 30,
    paginationMaximumItemsPerPage: 100,
    paginationClientItemsPerPage: true,
)]
final class TransactionOutput
{
    public string $idMutation;
    public string $dateMutation;
    public ?string $natureMutation = null;
    public ?float $valeurFonciere = null;
    public string $codeCommune;
    public ?string $nomCommune = null;
    public string $codeDepartement;
    public ?int $nombreLots = null;
    public array $lots = [];   // [{idParcelle, typeLocal, surfaceBati, surfaceTerrain, surfaceCarrez, nombrePieces}]
}

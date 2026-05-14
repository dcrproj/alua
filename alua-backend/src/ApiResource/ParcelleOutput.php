<?php

declare(strict_types=1);

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use App\State\ParcelleStateProvider;

#[ApiResource(
    operations: [new Get(provider: ParcelleStateProvider::class)],
    uriTemplate: '/parcelles/{idParcelle}',
    shortName: 'Parcelle',
)]
final class ParcelleOutput
{
    public string $idParcelle;
    public string $communeCode;
    public string $section;
    public string $numero;
    public ?int $contenance = null;
    public ?array $centroid = null;
    public ?array $address = null;
}

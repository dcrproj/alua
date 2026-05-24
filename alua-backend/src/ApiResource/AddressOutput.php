<?php

declare(strict_types=1);

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use App\State\AddressStateProvider;

#[ApiResource(
    operations: [new Get(provider: AddressStateProvider::class)],
    uriTemplate: '/addresses/{banId}',
    shortName: 'Address',
)]
final class AddressOutput
{
    public string $banId;
    public ?string $numero = null;
    public ?string $voie = null;
    public ?string $codePostal = null;
    public ?string $commune = null;
    public ?string $communeCode = null;
    public ?string $communeSlug = null;
    public ?float $lon = null;
    public ?float $lat = null;
    public array $parcelles = [];     // parcelles liées
    public array $transactions = [];  // DVF via parcelles
    public array $dpes = [];          // DPE à cette adresse
}

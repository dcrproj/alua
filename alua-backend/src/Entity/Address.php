<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity]
#[ORM\Table(name: 'addresses')]
#[ORM\Index(name: 'idx_addresses_ban_id', columns: ['ban_id'])]
#[ORM\Index(name: 'idx_addresses_commune', columns: ['commune_code'])]
class Address
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private ?Uuid $id = null;

    #[ORM\Column(length: 20, unique: true)]
    private string $banId;

    #[ORM\Column(length: 10, nullable: true)]
    private ?string $numero = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $voie = null;

    #[ORM\Column(length: 5, nullable: true)]
    private ?string $codePostal = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $commune = null;

    #[ORM\Column(length: 5, nullable: true)]
    private ?string $communeCode = null;

    #[ORM\Column(type: 'geometry', options: ['geometry_type' => 'POINT', 'srid' => 4326])]
    private ?string $geometry = null;

    #[ORM\Column(length: 20)]
    private string $source = 'BAN';

    #[ORM\Column]
    private \DateTimeImmutable $lastUpdatedAt;

    #[ORM\Column]
    private \DateTimeImmutable $ttlExpiresAt;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->lastUpdatedAt = new \DateTimeImmutable();
        $this->ttlExpiresAt = (new \DateTimeImmutable())->modify('+75 days');
    }

    public function getId(): ?Uuid { return $this->id; }
    public function getBanId(): string { return $this->banId; }
    public function setBanId(string $banId): static { $this->banId = $banId; return $this; }
    public function getNumero(): ?string { return $this->numero; }
    public function setNumero(?string $numero): static { $this->numero = $numero; return $this; }
    public function getVoie(): ?string { return $this->voie; }
    public function setVoie(?string $voie): static { $this->voie = $voie; return $this; }
    public function getCodePostal(): ?string { return $this->codePostal; }
    public function setCodePostal(?string $codePostal): static { $this->codePostal = $codePostal; return $this; }
    public function getCommune(): ?string { return $this->commune; }
    public function setCommune(?string $commune): static { $this->commune = $commune; return $this; }
    public function getCommuneCode(): ?string { return $this->communeCode; }
    public function setCommuneCode(?string $communeCode): static { $this->communeCode = $communeCode; return $this; }
    public function getGeometry(): ?string { return $this->geometry; }
    public function setGeometry(?string $geometry): static { $this->geometry = $geometry; return $this; }
    public function getSource(): string { return $this->source; }
    public function getLastUpdatedAt(): \DateTimeImmutable { return $this->lastUpdatedAt; }
    public function getTtlExpiresAt(): \DateTimeImmutable { return $this->ttlExpiresAt; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}

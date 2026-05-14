<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity]
#[ORM\Table(name: 'parcelles')]
#[ORM\Index(name: 'idx_parcelles_commune', columns: ['commune_code'])]
#[ORM\Index(name: 'idx_parcelles_id_parcelle', columns: ['id_parcelle'])]
class Parcelle
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private ?Uuid $id = null;

    #[ORM\Column(length: 14, unique: true)]
    private string $idParcelle;

    #[ORM\Column(length: 5)]
    private string $communeCode;

    #[ORM\Column(length: 2)]
    private string $section;

    #[ORM\Column(length: 4)]
    private string $numero;

    #[ORM\Column(nullable: true)]
    private ?int $contenance = null;

    #[ORM\Column(type: 'geometry', options: ['geometry_type' => 'POINT', 'srid' => 4326], nullable: true)]
    private ?string $centroid = null;

    #[ORM\Column(length: 50)]
    private string $source = 'PCI_ETALAB';

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
        $this->ttlExpiresAt = (new \DateTimeImmutable())->modify('+180 days');
    }

    public function getId(): ?Uuid { return $this->id; }
    public function getIdParcelle(): string { return $this->idParcelle; }
    public function setIdParcelle(string $idParcelle): static { $this->idParcelle = $idParcelle; return $this; }
    public function getCommuneCode(): string { return $this->communeCode; }
    public function setCommuneCode(string $communeCode): static { $this->communeCode = $communeCode; return $this; }
    public function getSection(): string { return $this->section; }
    public function setSection(string $section): static { $this->section = $section; return $this; }
    public function getNumero(): string { return $this->numero; }
    public function setNumero(string $numero): static { $this->numero = $numero; return $this; }
    public function getContenance(): ?int { return $this->contenance; }
    public function setContenance(?int $contenance): static { $this->contenance = $contenance; return $this; }
    public function getCentroid(): ?string { return $this->centroid; }
    public function setCentroid(?string $centroid): static { $this->centroid = $centroid; return $this; }
    public function getSource(): string { return $this->source; }
    public function getLastUpdatedAt(): \DateTimeImmutable { return $this->lastUpdatedAt; }
    public function getTtlExpiresAt(): \DateTimeImmutable { return $this->ttlExpiresAt; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}

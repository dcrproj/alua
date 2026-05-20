<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'coproprietes')]
#[ORM\Index(name: 'coproprietes_commune_idx', columns: ['commune_code'])]
#[ORM\Index(name: 'coproprietes_ttl_idx',     columns: ['ttl_expires_at'])]
class Copropriete
{
    /** Identifiant RNIC, format RC-XXX-XXXXX */
    #[ORM\Id]
    #[ORM\Column(length: 20)]
    private string $noImmatriculation;

    #[ORM\Column(length: 5, nullable: true)]
    private ?string $communeCode = null;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $nom = null;

    #[ORM\Column(nullable: true)]
    private ?float $lon = null;

    #[ORM\Column(nullable: true)]
    private ?float $lat = null;

    #[ORM\Column(nullable: true)]
    private ?int $nbLotsTotal = null;

    #[ORM\Column(nullable: true)]
    private ?int $nbLotsHabitation = null;

    #[ORM\Column(nullable: true)]
    private ?int $nbLotsStationnement = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $periodeConstruction = null;

    #[ORM\Column(length: 30, nullable: true)]
    private ?string $typeSyndic = null;

    #[ORM\Column(nullable: true)]
    private ?bool $syndicatCooperatif = null;

    #[ORM\Column(type: Types::DATE_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $dateImmatriculation = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $ttlExpiresAt;

    public function getNoImmatriculation(): string { return $this->noImmatriculation; }
    public function setNoImmatriculation(string $v): static { $this->noImmatriculation = $v; return $this; }
    public function getCommuneCode(): ?string { return $this->communeCode; }
    public function setCommuneCode(?string $v): static { $this->communeCode = $v; return $this; }
    public function getNom(): ?string { return $this->nom; }
    public function setNom(?string $v): static { $this->nom = $v; return $this; }
    public function getLon(): ?float { return $this->lon; }
    public function setLon(?float $v): static { $this->lon = $v; return $this; }
    public function getLat(): ?float { return $this->lat; }
    public function setLat(?float $v): static { $this->lat = $v; return $this; }
    public function getNbLotsTotal(): ?int { return $this->nbLotsTotal; }
    public function setNbLotsTotal(?int $v): static { $this->nbLotsTotal = $v; return $this; }
    public function getNbLotsHabitation(): ?int { return $this->nbLotsHabitation; }
    public function setNbLotsHabitation(?int $v): static { $this->nbLotsHabitation = $v; return $this; }
    public function getNbLotsStationnement(): ?int { return $this->nbLotsStationnement; }
    public function setNbLotsStationnement(?int $v): static { $this->nbLotsStationnement = $v; return $this; }
    public function getPeriodeConstruction(): ?string { return $this->periodeConstruction; }
    public function setPeriodeConstruction(?string $v): static { $this->periodeConstruction = $v; return $this; }
    public function getTypeSyndic(): ?string { return $this->typeSyndic; }
    public function setTypeSyndic(?string $v): static { $this->typeSyndic = $v; return $this; }
    public function getSyndicatCooperatif(): ?bool { return $this->syndicatCooperatif; }
    public function setSyndicatCooperatif(?bool $v): static { $this->syndicatCooperatif = $v; return $this; }
    public function getDateImmatriculation(): ?\DateTimeInterface { return $this->dateImmatriculation; }
    public function setDateImmatriculation(?\DateTimeInterface $v): static { $this->dateImmatriculation = $v; return $this; }
    public function getTtlExpiresAt(): \DateTimeInterface { return $this->ttlExpiresAt; }
    public function setTtlExpiresAt(\DateTimeInterface $v): static { $this->ttlExpiresAt = $v; return $this; }
}

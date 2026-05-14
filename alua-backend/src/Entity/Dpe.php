<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity]
#[ORM\Table(name: 'dpes')]
#[ORM\Index(name: 'idx_dpes_commune', columns: ['code_commune'])]
#[ORM\Index(name: 'idx_dpes_dept', columns: ['code_departement'])]
#[ORM\Index(name: 'idx_dpes_etiquette', columns: ['etiquette_dpe'])]
#[ORM\Index(name: 'idx_dpes_ban', columns: ['identifiant_ban'])]
#[ORM\Index(name: 'idx_dpes_address', columns: ['address_id'])]
class Dpe
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private ?Uuid $id = null;

    #[ORM\Column(length: 26, unique: true)]
    private string $numeroDpe;

    #[ORM\Column(length: 15)]
    private string $source;

    #[ORM\Column(type: 'date_immutable')]
    private \DateTimeImmutable $dateEtablissement;

    #[ORM\Column(type: 'date_immutable', nullable: true)]
    private ?\DateTimeImmutable $dateFinValidite = null;

    #[ORM\Column(length: 1, nullable: true)]
    private ?string $etiquetteDpe = null;

    #[ORM\Column(length: 1, nullable: true)]
    private ?string $etiquetteGes = null;

    // kWh/m²/an énergie primaire
    #[ORM\Column(type: 'decimal', precision: 15, scale: 2, nullable: true)]
    private ?string $consoPrimaire = null;

    // kg CO2/m²/an
    #[ORM\Column(type: 'decimal', precision: 15, scale: 2, nullable: true)]
    private ?string $emissionGes = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $typeBatiment = null;

    #[ORM\Column(type: 'decimal', precision: 15, scale: 2, nullable: true)]
    private ?string $surfaceHabitable = null;

    #[ORM\Column(length: 20, nullable: true)]
    private ?string $periodeConstruction = null;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $typeEnergieChauffage = null;

    #[ORM\Column(length: 26, nullable: true)]
    private ?string $identifiantBan = null;

    #[ORM\Column(type: UuidType::NAME, nullable: true)]
    private ?Uuid $addressId = null;

    #[ORM\Column(length: 3, nullable: true)]
    private ?string $codeDepartement = null;

    #[ORM\Column(length: 5, nullable: true)]
    private ?string $codeCommune = null;

    #[ORM\Column(type: 'float', nullable: true)]
    private ?float $longitude = null;

    #[ORM\Column(type: 'float', nullable: true)]
    private ?float $latitude = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?Uuid { return $this->id; }
    public function getNumeroDpe(): string { return $this->numeroDpe; }
    public function setNumeroDpe(string $numeroDpe): static { $this->numeroDpe = $numeroDpe; return $this; }
    public function getSource(): string { return $this->source; }
    public function setSource(string $source): static { $this->source = $source; return $this; }
    public function getDateEtablissement(): \DateTimeImmutable { return $this->dateEtablissement; }
    public function setDateEtablissement(\DateTimeImmutable $d): static { $this->dateEtablissement = $d; return $this; }
    public function getDateFinValidite(): ?\DateTimeImmutable { return $this->dateFinValidite; }
    public function setDateFinValidite(?\DateTimeImmutable $d): static { $this->dateFinValidite = $d; return $this; }
    public function getEtiquetteDpe(): ?string { return $this->etiquetteDpe; }
    public function setEtiquetteDpe(?string $e): static { $this->etiquetteDpe = $e; return $this; }
    public function getEtiquetteGes(): ?string { return $this->etiquetteGes; }
    public function setEtiquetteGes(?string $e): static { $this->etiquetteGes = $e; return $this; }
    public function getConsoPrimaire(): ?string { return $this->consoPrimaire; }
    public function setConsoPrimaire(?string $v): static { $this->consoPrimaire = $v; return $this; }
    public function getEmissionGes(): ?string { return $this->emissionGes; }
    public function setEmissionGes(?string $v): static { $this->emissionGes = $v; return $this; }
    public function getTypeBatiment(): ?string { return $this->typeBatiment; }
    public function setTypeBatiment(?string $v): static { $this->typeBatiment = $v; return $this; }
    public function getSurfaceHabitable(): ?string { return $this->surfaceHabitable; }
    public function setSurfaceHabitable(?string $v): static { $this->surfaceHabitable = $v; return $this; }
    public function getPeriodeConstruction(): ?string { return $this->periodeConstruction; }
    public function setPeriodeConstruction(?string $v): static { $this->periodeConstruction = $v; return $this; }
    public function getTypeEnergieChauffage(): ?string { return $this->typeEnergieChauffage; }
    public function setTypeEnergieChauffage(?string $v): static { $this->typeEnergieChauffage = $v; return $this; }
    public function getIdentifiantBan(): ?string { return $this->identifiantBan; }
    public function setIdentifiantBan(?string $v): static { $this->identifiantBan = $v; return $this; }
    public function getAddressId(): ?Uuid { return $this->addressId; }
    public function setAddressId(?Uuid $v): static { $this->addressId = $v; return $this; }
    public function getCodeDepartement(): ?string { return $this->codeDepartement; }
    public function setCodeDepartement(?string $v): static { $this->codeDepartement = $v; return $this; }
    public function getCodeCommune(): ?string { return $this->codeCommune; }
    public function setCodeCommune(?string $v): static { $this->codeCommune = $v; return $this; }
    public function getLongitude(): ?float { return $this->longitude; }
    public function setLongitude(?float $v): static { $this->longitude = $v; return $this; }
    public function getLatitude(): ?float { return $this->latitude; }
    public function setLatitude(?float $v): static { $this->latitude = $v; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}

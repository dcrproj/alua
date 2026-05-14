<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity]
#[ORM\Table(name: 'mutations_dvf_lots')]
#[ORM\Index(name: 'idx_mutations_dvf_lots_mutation', columns: ['mutation_dvf_id'])]
#[ORM\Index(name: 'idx_mutations_dvf_lots_parcelle', columns: ['id_parcelle'])]
class MutationDvfLot
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private ?Uuid $id = null;

    #[ORM\ManyToOne(targetEntity: MutationDvf::class)]
    #[ORM\JoinColumn(name: 'mutation_dvf_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private MutationDvf $mutationDvf;

    #[ORM\Column(length: 14, nullable: true)]
    private ?string $idParcelle = null;

    #[ORM\Column(type: UuidType::NAME, nullable: true)]
    private ?Uuid $parcelleId = null;

    #[ORM\Column(type: UuidType::NAME, nullable: true)]
    private ?Uuid $addressId = null;

    #[ORM\Column(length: 10, nullable: true)]
    private ?string $adresseNumero = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $adresseNomVoie = null;

    #[ORM\Column(length: 5, nullable: true)]
    private ?string $codePostal = null;

    #[ORM\Column(length: 3, nullable: true)]
    private ?string $codeTypeLocal = null;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $typeLocal = null;

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2, nullable: true)]
    private ?string $surfaceReelleBati = null;

    #[ORM\Column(type: 'smallint', nullable: true)]
    private ?int $nombrePiecesPrincipales = null;

    #[ORM\Column(length: 5, nullable: true)]
    private ?string $codeNatureCulture = null;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $natureCulture = null;

    #[ORM\Column(type: 'decimal', precision: 12, scale: 2, nullable: true)]
    private ?string $surfaceTerrain = null;

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2, nullable: true)]
    private ?string $surfaceCarrez = null;

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
    public function getMutationDvf(): MutationDvf { return $this->mutationDvf; }
    public function setMutationDvf(MutationDvf $mutationDvf): static { $this->mutationDvf = $mutationDvf; return $this; }
    public function getIdParcelle(): ?string { return $this->idParcelle; }
    public function setIdParcelle(?string $idParcelle): static { $this->idParcelle = $idParcelle; return $this; }
    public function getParcelleId(): ?Uuid { return $this->parcelleId; }
    public function setParcelleId(?Uuid $parcelleId): static { $this->parcelleId = $parcelleId; return $this; }
    public function getAddressId(): ?Uuid { return $this->addressId; }
    public function setAddressId(?Uuid $addressId): static { $this->addressId = $addressId; return $this; }
    public function getAdresseNumero(): ?string { return $this->adresseNumero; }
    public function setAdresseNumero(?string $adresseNumero): static { $this->adresseNumero = $adresseNumero; return $this; }
    public function getAdresseNomVoie(): ?string { return $this->adresseNomVoie; }
    public function setAdresseNomVoie(?string $adresseNomVoie): static { $this->adresseNomVoie = $adresseNomVoie; return $this; }
    public function getCodePostal(): ?string { return $this->codePostal; }
    public function setCodePostal(?string $codePostal): static { $this->codePostal = $codePostal; return $this; }
    public function getCodeTypeLocal(): ?string { return $this->codeTypeLocal; }
    public function setCodeTypeLocal(?string $codeTypeLocal): static { $this->codeTypeLocal = $codeTypeLocal; return $this; }
    public function getTypeLocal(): ?string { return $this->typeLocal; }
    public function setTypeLocal(?string $typeLocal): static { $this->typeLocal = $typeLocal; return $this; }
    public function getSurfaceReelleBati(): ?string { return $this->surfaceReelleBati; }
    public function setSurfaceReelleBati(?string $surfaceReelleBati): static { $this->surfaceReelleBati = $surfaceReelleBati; return $this; }
    public function getNombrePiecesPrincipales(): ?int { return $this->nombrePiecesPrincipales; }
    public function setNombrePiecesPrincipales(?int $nombrePiecesPrincipales): static { $this->nombrePiecesPrincipales = $nombrePiecesPrincipales; return $this; }
    public function getCodeNatureCulture(): ?string { return $this->codeNatureCulture; }
    public function setCodeNatureCulture(?string $codeNatureCulture): static { $this->codeNatureCulture = $codeNatureCulture; return $this; }
    public function getNatureCulture(): ?string { return $this->natureCulture; }
    public function setNatureCulture(?string $natureCulture): static { $this->natureCulture = $natureCulture; return $this; }
    public function getSurfaceTerrain(): ?string { return $this->surfaceTerrain; }
    public function setSurfaceTerrain(?string $surfaceTerrain): static { $this->surfaceTerrain = $surfaceTerrain; return $this; }
    public function getSurfaceCarrez(): ?string { return $this->surfaceCarrez; }
    public function setSurfaceCarrez(?string $surfaceCarrez): static { $this->surfaceCarrez = $surfaceCarrez; return $this; }
    public function getLongitude(): ?float { return $this->longitude; }
    public function setLongitude(?float $longitude): static { $this->longitude = $longitude; return $this; }
    public function getLatitude(): ?float { return $this->latitude; }
    public function setLatitude(?float $latitude): static { $this->latitude = $latitude; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}

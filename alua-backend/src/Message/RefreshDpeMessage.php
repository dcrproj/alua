<?php

declare(strict_types=1);

namespace App\Message;

final class RefreshDpeMessage
{
    public function __construct(public readonly string $departmentCode) {}
}

<?php

use App\Kernel;
use Symfony\Bundle\FrameworkBundle\HttpCache\HttpCache;
use Symfony\Component\HttpKernel\HttpCache\Store;

require_once dirname(__DIR__).'/vendor/autoload_runtime.php';

return static function (array $context) {
    $kernel = new Kernel($context['APP_ENV'], (bool) $context['APP_DEBUG']);

    // Cache HTTP niveau applicatif en prod — répond en ~5ms sur cache hit
    // Store hors de var/cache/prod/ pour ne pas être wipé par cache:warmup
    if ('prod' === $context['APP_ENV']) {
        return new HttpCache(
            $kernel,
            new Store(dirname(__DIR__).'/var/http_cache'),
            null,
            ['debug' => false, 'allow_reload' => false, 'allow_revalidate' => false]
        );
    }

    return $kernel;
};

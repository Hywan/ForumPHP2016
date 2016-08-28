<?php

require 'vendor/autoload.php';

use Hoa\Consistency;
use Hoa\Event;
use Hoa\Socket;
use Hoa\Websocket;

$server = new Websocket\Server(new Socket\Server('ws://127.0.0.1:8080'));

$server->on(
    'message',
    function (Event\Bucket $bucket) {
        var_dump($bucket->getData());
        $bucket->getSource()->broadcastIf(
            function () {
                return true;
            },
            json_encode([
                'type'   => 'bubble/new',
                'id'     => Consistency::uuid(),
                'offset' => mt_rand(0, 100)
            ])
        );
    }
);

$server->run();

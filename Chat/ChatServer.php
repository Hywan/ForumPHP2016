<?php

require 'vendor/autoload.php';

use Hoa\Consistency;
use Hoa\Event;
use Hoa\Socket;
use Hoa\Websocket;

class Person extends Websocket\Node implements JsonSerializable
{
    protected $_pseudo   = null;
    protected $_personId = null;

    public function setPersonId($id)
    {
        $old             = $this->_personId;
        $this->_personId = $id;

        return $old;
    }

    public function getPersonId()
    {
        return $this->_personId;
    }

    public function setPseudo($pseudo)
    {
        $old           = $this->_pseudo;
        $this->_pseudo = $pseudo;

        return $old;
    }

    public function getPseudo()
    {
        return $this->_pseudo;
    }

    public function jsonSerialize()
    {
        return [
            'id'     => $this->getPersonId(),
            'pseudo' => $this->getPseudo()
        ];
    }
}

$server = new Websocket\Server(
    new Socket\Server('ws://127.0.0.1:8080')
);
$server
    ->getConnection()
    ->setNodeName(Person::class);

$server->on(
    'open',
    function (Event\Bucket $bucket) {
        echo 'New person', "\n";
    }
);

$server->on(
    'close',
    function (Event\Bucket $bucket) {
        echo 'Loss a person', "\n";

        $source = $bucket->getSource();
        $node   = $source->getConnection()->getCurrentNode();

        $source->broadcast(
            json_encode([
                'type' => 'client/person/delete',
                'id'   => $node->getPersonId()
            ])
        );
    }
);

$server->on(
    'message',
    function (Event\Bucket $bucket) {
        $data       = $bucket->getData();
        $source     = $bucket->getSource();
        $connection = $source->getConnection();
        $node       = $connection->getCurrentNode();

        if (false === $message = @json_decode($data['message'])) {
            $bucket->getSource()->close();

            return;
        }

        var_dump($message);

        switch ($message->type) {
            case 'server/person/new':
                $node->setPersonId($message->id);
                $node->setPseudo($message->pseudo);

                $source->send(
                    json_encode([
                        'type'    => 'client/persons',
                        'persons' => array_values($connection->getNodes())
                    ])
                );
                $source->broadcast(
                    json_encode([
                        'type'   => 'client/person/new',
                        'id'     => $node->getPersonId(),
                        'pseudo' => $node->getPseudo()
                    ])
                );

                break;

            case 'server/person/active':

                break;

            case 'server/person/inactive':

                break;


            default:
                $bucket->getSource()->close();

                return;
        }
    }
);

echo 'Server is listening…', "\n";

$server->run();

<?php

require 'vendor/autoload.php';

use Hoa\Consistency;
use Hoa\Event;
use Hoa\Socket;
use Hoa\Websocket;

class Node extends Websocket\Node implements JsonSerializable
{
    const TEAM_ONE = 'blue';
    const TEAM_TWO = 'yellow';

    protected $_playerId     = null;
    protected $_playerPseudo = null;
    protected $_team         = null;

    public function setPlayerId($id)
    {
        $old             = $this->_playerId;
        $this->_playerId = $id;

        return $old;
    }

    public function getPlayerId()
    {
        return $this->_playerId;
    }

    public function setPlayerPseudo($pseudo)
    {
        $old                 = $this->_playerPseudo;
        $this->_playerPseudo = $pseudo;

        return $old;
    }

    public function getPlayerPseudo()
    {
        return $this->_playerPseudo;
    }

    public function setTeam($team)
    {
        $old         = $this->_team;
        $this->_team = $team;

        return $old;
    }

    public function getTeam()
    {
        return $this->_team;
    }

    public function jsonSerialize()
    {
        return [
            'id'     => $this->getPlayerId(),
            'pseudo' => $this->getPlayerPseudo(),
            'team'   => $this->getTeam()
        ];
    }
}

$server = new Websocket\Server(new Socket\Server('ws://127.0.0.1:8080'));
$server->getConnection()->setNodeName(Node::class);

$server->on(
    'open',
    function (Event\Bucket $bucket) {
        var_dump('new player');
    }
);

$server->on(
    'close',
    function (Event\Bucket $bucket) {
        var_dump('loss player');
        $source = $bucket->getSource();
        $node   = $source->getConnection()->getCurrentNode();

        $source->broadcast(
            json_encode([
                'type' => 'client/player/delete',
                'id'   => $node->getPlayerId()
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

        switch ($message->type) {
            case 'server/player/new':
                $node->setPlayerId($message->id);
                $node->setPlayerPseudo($message->pseudo);

                $players   = [];
                $teamStats = [
                    Node::TEAM_ONE => 0,
                    Node::TEAM_TWO => 0
                ];

                foreach ($connection->getNodes() as $playerNode) {
                    if (null !== $playerNode->getPlayerId()) {
                        $players[] = $playerNode;

                        if ($playerNode !== $node) {
                            $team = $playerNode->getTeam();

                            if (!empty($team)) {
                                $teamStats[$team]++;
                            }
                        }
                    }
                }

                asort($teamStats, SORT_NUMERIC);
                $node->setTeam(key($teamStats));

                $source->send(
                    json_encode([
                        'type'    => 'client/players',
                        'players' => $players
                    ])
                );
                $source->broadcast(
                    json_encode([
                        'type'   => 'client/player/new',
                        'id'     => $node->getPlayerId(),
                        'pseudo' => $node->getPlayerPseudo(),
                        'team'   => $node->getTeam()
                    ])
                );

                break;

            case 'server/bubble/new':
                $bucket->getSource()->broadcastIf(
                    function () {
                        return true;
                    },
                    json_encode([
                        'type'   => 'client/bubble/new',
                        'id'     => Consistency::uuid(),
                        'offset' => mt_rand(0, 100)
                    ])
                );

                break;
        }
    }
);

$server->run();

<?php

require 'vendor/autoload.php';

use Hoa\Consistency;
use Hoa\Event;
use Hoa\Socket;
use Hoa\Websocket;

class Player extends Websocket\Node implements JsonSerializable
{
    const TEAM_ONE = 'green';
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

class Scores implements JsonSerializable
{
    protected $_scores = [];

    public function addToTeam($team, $points)
    {
        if (!isset($this->_scores[$team])) {
            $this->_scores[$team] = 0;
        }

        return $this->_scores[$team] += $points;
    }

    public function removeToTeam($team, $points)
    {
        if (!isset($this->_scores[$team])) {
            $this->_scores[$team] = 0;
        }

        return $this->_scores[$team] -= $points;
    }

    public function getTotalForTeam($team)
    {
        if (!isset($this->_scores[$team])) {
            return 0;
        }

        return $this->_scores[$team];
    }

    public function jsonSerialize()
    {
        return $this->_scores;
    }
}

$scores = new Scores();

$server = new Websocket\Server(new Socket\Server('ws://127.0.0.1:8080'));
$server->getConnection()->setNodeName(Player::class);

$server->on(
    'open',
    function (Event\Bucket $bucket) {
        echo 'New player', "\n";
    }
);

$server->on(
    'close',
    function (Event\Bucket $bucket) {
        echo 'Loss player', "\n";

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
    function (Event\Bucket $bucket) use ($scores) {
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
                    Player::TEAM_ONE => 0,
                    Player::TEAM_TWO => 0
                ];

                foreach ($connection->getNodes() as $playerNode) {
                    // …
                }

                // …

                break;

            case 'server/bubble/new':

                break;

            case 'server/bubble/delete':

                break;
        }
    }
);

echo 'Server is listening…', "\n";

$server->run();

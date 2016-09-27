function Game(uri, canvas) {
    var self = this;

    this.connection        = new WebSocket(uri);
    this.connection.onopen = function () {
        self.controls.networkStatus('online');
    };
    this.connection.onclose = function () {
        self.controls.networkStatus('offline');
    };
    this.connection.onmessage = function (event) {
        var bucket = JSON.parse(event.data);
        console.log(bucket);

        if (!bucket.type) {
            return;
        }

        switch (bucket.type) {
            case 'client/player/new':
                var player = new Player(bucket.id, bucket.pseudo, bucket.team);

                self.players[player.id] = player;
                self.controls.newPlayer(player);

                break;

            case 'client/players':
                self.controls.deletePlayers();

                bucket.players.forEach(
                    function (_player) {
                        var player = new Player(_player.id, _player.pseudo, _player.team);

                        self.players[player.id] = player;
                        self.controls.newPlayer(player, _player.id === self.currentPlayer.id);
                    }
                );

                break;

            case 'client/player/delete':
                delete self.players[bucket.id];

                self.controls.deletePlayer(bucket.id);

                break;

            case 'client/bubble/new':
                self.newBubble(
                    bucket.id,
                    bucket.offset,
                    bucket.radius,
                    bucket.team
                );

                break;

            case 'client/bubble/delete':
                self.deleteBubble(bucket.id);

                break;

            case 'client/scores':
                self.updateScores(bucket.scores);

                break;
        }
    };
    this.controls      = new Controls();
    this.canvas        = canvas;
    this.bubbles       = {};
    this.players       = {};
    this.currentPlayer = null;

    var intro = document.getElementById('intro');
    intro.addEventListener(
        'submit',
        function (event) {
            event.preventDefault();

            var pseudo         = document.getElementById('pseudo').value;
            var id             = guid();
            var player         = new Player(id, pseudo);
            self.currentPlayer = player;
            self.connection.send(
                JSON.stringify({
                    'type'  : 'server/player/new',
                    'id'    : player.id,
                    'pseudo': player.pseudo
                })
            );

            intro.setAttribute('aria-hidden', 'true');

            self.emitBubbles();

            return false;
        },
        false
    );
}

Game.prototype.askNewBubble = function () {
    this.connection.send(
        JSON.stringify({
            'type': 'server/bubble/new',
            'id'  : guid()
        })
    );
};

Game.prototype.emitBubbles = function () {
    var self            = this;
    var numberOfPlayers = Object.keys(self.players).length || 1;
    var basis           = 2500 * numberOfPlayers;

    self.askNewBubble();

    setTimeout(
        function () {
            self.emitBubbles();
        },
        basis - (Math.random() * (basis / 10) * (Math.random() > .5 ? -1 : 1))
    );
};

Game.prototype.newBubble = function (id, offset, radius, team) {
    var bubble = new Bubble(id, offset, radius, team);
    bubble.into(this.canvas);
    bubble.connect(this.connection);

    this.bubbles[id] = bubble;

    return bubble;
};

Game.prototype.deleteBubble = function (id) {
    if (!this.bubbles[id]) {
        return;
    }

    this.bubbles[id].explode();

    delete this.bubbles[id];
};

Game.prototype.updateScores = function (scores) {
    for (var team in scores) {
        this.controls.updateScore(team, scores[team]);
    }
};

function Player(id, pseudo, team) {
    this.id     = id;
    this.pseudo = pseudo;
    this.team   = team;
}

function Bubble(id, offset, radius, team) {
    this.id      = id;
    this.team    = team;
    var diameter = radius * 2;

    var bubbleElement = document.createElement('div');
    bubbleElement.classList.add('bubble');
    bubbleElement.setAttribute('data-id', this.id);
    bubbleElement.setAttribute('data-team', this.team);

    var containerElement = document.createElement('div');
    containerElement.classList.add('bubble__container');
    containerElement.appendChild(bubbleElement);
    containerElement.style.left   = 'calc(' + offset + 'vw - 12rem)';
    containerElement.style.width  = diameter + 'px';
    containerElement.style.height = diameter + 'px';

    this.containerElement = containerElement;
    this.element          = bubbleElement;
    this.parentElement    = null;
    this.connection       = null;

    var self = this;
    this.element.addEventListener(
        'click',
        function () {
            self.onclick();
        },
        false
    );
}

Bubble.prototype.into = function (containerElement) {
    this.parentElement = containerElement;
    this.parentElement.appendChild(this.containerElement);
};

Bubble.prototype.connect = function (websocketClient) {
    this.connection = websocketClient;
};

Bubble.prototype.explode = function () {
    this.parentElement.removeChild(this.containerElement);
};

Bubble.prototype.onclick = function () {
    var date = new Date();
    this.explode();

    if (null !== this.connection) {
        this.connection.send(
            JSON.stringify({
                'type': 'server/bubble/delete',
                'id'  : this.id,
                'team': this.team,
                'time': date.getTime() + '' + date.getMilliseconds()
            })
        );
    }
};

function Controls() {
    this.players = document.getElementById('players');
    this.scores  = document.getElementById('scores');
    this.html    = document.body.parentNode;
}

Controls.prototype.networkStatus = function (status) {
    if ('online' === status) {
        this.html.classList.remove('network-status-offline');
        this.html.classList.add('network-status-online');
    } else {
        this.html.classList.remove('network-status-online');
        this.html.classList.add('network-status-offline');
    }
};

Controls.prototype.newPlayer = function (player, me) {
    var playerListItem = document.createElement('li');
    playerListItem.setAttribute('data-id', player.id);
    playerListItem.setAttribute('data-team', player.team);
    playerListItem.innerHTML = player.pseudo + (me ? ' (me)' : '');
    this.players.appendChild(playerListItem);

    if (null === this.scores.querySelector('li[data-team="' + player.team + '"]')) {
        var scoreListItem = document.createElement('li');
        scoreListItem.setAttribute('data-team', player.team);
        scoreListItem.innerHTML = '0';
        this.scores.appendChild(scoreListItem);
    }

    return playerListItem;
};

Controls.prototype.deletePlayer = function (id) {
    var listItem = players.querySelector('[data-id="' + id + '"');

    if (null !== listItem) {
        listItem.remove();
    }
};

Controls.prototype.deletePlayers = function () {
    while (this.players.firstChild) {
        this.players.firstChild.remove();
    }
};

Controls.prototype.getScores = function () {
    var out           = {};
    var scoreElements = this.scores.querySelectorAll('li[data-team]');

    for (var i = 0; i < scoreElements.length; ++i) {
        var scoreElement = scoreElements.item(i);

        out[scoreElement.getAttribute('data-team')] = parseInt(scoreElement.innerHTML);
    }

    return out;
};

Controls.prototype.getCurrentWinningTeam = function () {
    var scores      = this.getScores();
    var winnerTeam  = null;
    var winnerScore = 0;

    for (var team in scores) {
        if (scores[team] > winnerScore) {
            winnerTeam  = team;
            winnerScore = scores[team];
        }
    }

    return winnerTeam;
};

Controls.prototype.updateScore = function (team, point) {
    var scoreElement = this.scores.querySelector('li[data-team="' + team + '"]');

    if (null === scoreElement) {
        return;
    }

    scoreElement.innerHTML = point;

    var teamIsWinning   = this.getCurrentWinningTeam() === team;
    var teamOrder       = teamIsWinning ? 1 : 2;
    var otherTeamsOrder = Math.abs(teamOrder - 3);

    scoreElement.style.order = teamOrder;

    var otherScoreElements = this.scores.querySelectorAll('li[data-team]:not([data-team="' + team + '"])');

    for (var i = 0; i < otherScoreElements.length; ++i) {
        var otherScoreElement         = otherScoreElements.item(i);
        otherScoreElement.style.order = otherTeamsOrder;
    }

};

function menu(item) {
    switch (item) {
        case 'documentation':
            window.open('https://hoa-project.net/Literature/Hack/Websocket.html');

            break;

        case 'sources':
            window.open('https://github.com/Hywan/ForumPHP2016');

            break;

        default:
            console.error('Menu option “' + item + '” is unknown.');
    }
};

var game = new Game(
    'ws://127.0.0.1:8080',
    document.getElementById('canvas')
);

function guid () {
    function s4 () {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }

    return s4() + s4() + '-' + s4() + '-' +
        s4() + '-' +
        s4() + '-' +
        s4() + s4() + s4();
}

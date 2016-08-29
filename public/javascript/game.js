function Game(uri, canvas) {
    var self = this;

    this.connection           = new WebSocket(uri);
    this.connection.onopen    = function () {
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
                var player = new Player(bucket.id, bucket.pseudo);

                self.players[player.id] = player;
                self.controls.newPlayer(player);

                break;

            case 'client/players':
                self.controls.deletePlayers();

                bucket.players.forEach(
                    function (_player) {
                        var player = new Player(_player.id, _player.pseudo);

                        self.players[player.id] = player;
                        self.controls.newPlayer(player);
                    }
                );

                break;

            case 'client/player/delete':
                delete self.players[bucket.id];

                self.controls.deletePlayer(bucket.id);

                break;

            case 'bubble/new':
                self.doNewBubble(bucket.id, bucket.offset);

                break;
        }
    };
    this.controls      = new Controls();
    this.canvas        = canvas;
    this.bubbles       = {};
    this.players       = {};
    this.currentPlayer = null;

    document.getElementById('ask-new-bubble').addEventListener(
        'click',
        function () {
            self.askNewBubble();
        },
        false
    );

    var intro = document.getElementById('intro');
    intro.addEventListener(
        'submit',
        function (event) {
            event.preventDefault();

            var pseudo = document.getElementById('pseudo').value;
            var id     = guid();
            var player = new Player(id, pseudo);
            self.setCurrentPlayer(player);
            self.connection.send(
                JSON.stringify({
                    'type'  : 'server/player/new',
                    'id'    : player.id,
                    'pseudo': player.pseudo
                })
            );

            intro.setAttribute('aria-hidden', 'true');

            return false;
        },
        false
    );
}

Game.prototype.askNewBubble = function () {
    this.connection.send(
        JSON.stringify({
            'type': 'bubble/new',
            'id'  : guid()
        })
    );
};

Game.prototype.doNewBubble = function (id, offset) {
    var bubble = new Bubble(id, offset);
    bubble.into(this.canvas);
    bubble.connect(this.connection);

    this.bubbles[id] = bubble;

    return bubble;
};

Game.prototype.setCurrentPlayer = function (player) {
    this.currentPlayer = player;
};

function Player(id, pseudo) {
    this.id     = id;
    this.pseudo = pseudo;
}

function Bubble(id, offset) {
    this.id = id;

    var bubbleElement = document.createElement('div');
    bubbleElement.classList.add('bubble');
    bubbleElement.setAttribute('data-id', this.id);

    var containerElement = document.createElement('div');
    containerElement.classList.add('bubble__container');
    containerElement.appendChild(bubbleElement);
    containerElement.style.left = offset + 'vw';

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
    if (null !== this.parentElement) {
        this.parentElement.removeChild(this.containerElement);

        if (null !== this.connection) {
            var date = new Date();
            this.connection.send(
                JSON.stringify({
                    'type': 'bubble/explode',
                    'id'  : this.id,
                    'time': date.getTime() + '' + date.getMilliseconds()
                })
            );
        }
    }
};

Bubble.prototype.onclick = function () {
    this.explode();
};

function Controls() {
    this.players = document.getElementById('players');
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

Controls.prototype.newPlayer = function (player) {
    var listItem = document.createElement('li');
    listItem.setAttribute('data-id', player.id);
    listItem.innerHTML = player.pseudo;
    self.players.appendChild(listItem);

    return listItem;
};

Controls.prototype.deletePlayer = function (id) {
    var listItem = players.querySelector('[data-id="' + id + '"');

    if (null !== listItem) {
        listItem.remove();
    }
};

Controls.prototype.deletePlayers = function () {
    while (self.players.firstChild) {
        self.players.firstChild.remove();
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

function Game (uri, canvas) {
    var self = this;

    this.connection           = new WebSocket(uri);
    this.connection.onmessage = function (event) {
        console.log(event);
        var bucket = JSON.parse(event.data);
        console.log(bucket);

        if (!bucket.type) {
            return;
        }

        switch (bucket.type) {
            case 'bubble/new':
                self.doNewBubble(bucket.id);

                break;
        }
    };
    this.canvas  = canvas;
    this.bubbles = {};

    document.getElementById('ask-new-bubble').addEventListener(
        'click',
        function () {
            console.log('ho');
            self.askNewBubble();
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

Game.prototype.doNewBubble = function (id) {
    var bubble = new Bubble(id);
    bubble.into(this.canvas);
    bubble.connect(this.connection);

    this.bubbles[id] = bubble;

    return bubble;
};

function Bubble (id) {
    this.id = id;

    var bubbleElement = document.createElement('div');
    bubbleElement.classList.add('bubble');
    bubbleElement.setAttribute('data-id', this.id);

    var containerElement = document.createElement('div');
    containerElement.classList.add('bubble__container');
    containerElement.appendChild(bubbleElement);

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

function WebsocketClient () {
    this.connection = new WebSocket('ws://127.0.0.1:8080');
}

WebsocketClient.prototype.send = function (data) {
    return this.connection.send(data);
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
        this.parentElement.remove(this.containerElement);
    }
};

Bubble.prototype.onclick = function () {
    if (null !== this.connection) {
        var date = new Date();

        this.explode();
        this.connection.send(
            JSON.stringify({
                "id": this.id,
                "time": date.getTime() + "" + date.getMilliseconds()
            })
        );
    }
};

var websocket = new WebsocketClient();
var canvas    = document.getElementById('canvas');
var bubbles   = [];

function newBubble (id, canvas, websocket) {
    var bubble = new Bubble(id);
    bubble.into(canvas);
    bubble.connect(websocket);

    return bubble;
}

function bubble (id) {
    return newBubble(id, canvas, websocket);
}

bubbles.push(bubble(42));

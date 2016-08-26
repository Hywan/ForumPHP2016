function WebsocketClient () {
    this.connection = new WebSocket('ws://127.0.0.1:8080');
}

WebsocketClient.prototype.send = function (data) {
    return this.connection.send(data);
};

var bubbleId = 0;

function Bubble () {
    this.id = bubbleId++;

    this.element = document.createElement('div');
    this.element.classList.add('bubble');
    this.element.setAttribute('data-id', this.id);
    this.connection = null;

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
    containerElement.appendChild(this.element);
};

Bubble.prototype.connect = function (websocketClient) {
    this.connection = websocketClient;
};

Bubble.prototype.onclick = function () {
    if (null !== this.connection) {
        this.connection.send(this.id);
    }
};

var websocketClient = new WebsocketClient();
var canvas = document.getElementById('canvas');
var b1 = new Bubble();
b1.into(canvas);
b1.connect(websocketClient);

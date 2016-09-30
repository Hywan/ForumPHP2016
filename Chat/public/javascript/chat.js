function Chat(uri) {
    var self = this;

    this.connection        = new WebSocket(uri);
    this.connection.onopen = function () {
        self.controls.networkStatus('online');
    };
    this.connection.onclose = function () {
        self.controls.networkStatus('offline');
    };
    this.controls = new Controls();

    var shootbox = document.getElementById('shootbox');
    var message = document.getElementById('message');

    shootbox.addEventListener(
        'submit',
        function (event) {
            event.preventDefault();

            console.log('> ' + message.value);

            return false;
        },
        false
    );
}

function Controls() {
    this.html = document.body.parentNode;
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


new Chat('ws://127.0.0.1:8080');

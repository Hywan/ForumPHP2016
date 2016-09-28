function Chat(uri) {

    //this.connection = new WebSocket(uri);

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


new Chat('ws://127.0.0.1:8080');

function Chat(uri) {
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
            case 'client/person/new':
                var person = new Person(bucket.id, bucket.pseudo);

                self.persons[person.id] = person;
                self.updatePersonCounter();

                break;

            case 'client/persons':
                bucket.persons.forEach(
                    function (_person) {
                        var person = new Person(_person.id, _person.pseudo);

                        self.persons[person.id] = person;
                    }
                );
                self.updatePersonCounter();

                break;
            
            case 'client/person/delete':
                delete self.persons[bucket.id];
                self.updatePersonCounter();

                break;

            case 'client/message/new':
                self.newMessage(self.persons[bucket.personId], bucket.message);
            
                break;
        }
    };
    this.controls      = new Controls();
    this.persons       = {};
    this.currentPerson = null;
    this.thread        = document.getElementById('thread');

    var shootbox = document.getElementById('shootbox');
    var message  = document.getElementById('message');

    shootbox.addEventListener(
        'submit',
        function (event) {
            event.preventDefault();

            self.connection.send(
                JSON.stringify({
                    'type'   : 'server/message/new',
                    'message': message.value
                })
            );
            self.newMessage(self.currentPerson, message.value);

            message.value = '';

            return false;
        },
        false
    );

    window.setTimeout(
        function () {
            var person         = new Person(guid(), 'Hywan');
            self.currentPerson = person;

            self.connection.send(
                JSON.stringify({
                    'type'  : 'server/person/new',
                    'id'    : person.id,
                    'pseudo': person.pseudo
                })
            );
        },
        1000
    );
}

Chat.prototype.newMessage = function (person, message) {
    var messageElement       = document.createElement('li');
    var messageHeaderElement = document.createElement('aside');
    var messageAvatarElement = document.createElement('img');
    var messagePseudoElement = document.createTextNode(person.pseudo);
    var messageBodyElement   = document.createTextNode(message);

    messageAvatarElement.setAttribute('src', '…');
    messageAvatarElement.setAttribute('alt', '');
    messageAvatarElement.setAttribute('role', 'presentation');

    messageHeaderElement.appendChild(messageAvatarElement);
    messageHeaderElement.appendChild(messagePseudoElement);

    if (person.id === this.currentPerson.id) {
        messageElement.setAttribute('data-message-type', 'me');
    }

    messageElement.appendChild(messageHeaderElement);
    messageElement.appendChild(messageBodyElement);

    this.thread.appendChild(messageElement);

    this.thread.scrollBy(0, 1000000);
};

Chat.prototype.updatePersonCounter = function () {
    document.getElementById('personCounter').innerHTML = Object.keys(this.persons).length;
};

function Person(id, pseudo) {
    this.id     = id;
    this.pseudo = pseudo;
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

new Chat('ws://127.0.0.1:8080');

function guid () {
    function s4 () {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }

    return s4() + s4() + '-' + s4() + '-' +
        s4() + '-' +
        s4() + '-' +
        s4() + s4() + s4();
}

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
                self.newMessage('info', person.pseudo + ' has joined this channel.');

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
                self.newMessage('info', self.persons[bucket.id].pseudo + ' has left this channel.');
                delete self.persons[bucket.id];
                self.updatePersonCounter();

                break;

            case 'client/message/new':
                var _person = self.persons[bucket.personId];

                self.newMessage(
                    _person.id === self.currentPerson.id ? 'me' : 'other',
                    bucket.message,
                    _person
                );

                break;

            case 'client/person/active':
                if (self.persons[bucket.id]) {
                    self.persons[bucket.id].active = true;
                }

                self.updateActivity();

                break;

            case 'client/person/inactive':
                if (self.persons[bucket.id]) {
                    self.persons[bucket.id].active = false;
                }

                self.updateActivity();

                break;
        }
    };
    this.controls        = new Controls();
    this.persons         = {};
    this.currentPerson   = null;
    this.thread          = document.getElementById('thread');
    this.activity        = document.getElementById('activity');
    this.activityMessage = document.getElementById('activity-message');

    var intro    = document.getElementById('intro');
    var shootbox = document.getElementById('shootbox');
    var message  = document.getElementById('message');

    intro.addEventListener(
        'submit',
        function (event) {
            event.preventDefault();

            var pseudo         = document.getElementById('pseudo').value;
            var id             = guid();
            var person         = new Person(id, pseudo);
            self.currentPerson = person;
            self.connection.send(
                JSON.stringify({
                    'type'  : 'server/person/new',
                    'id'    : person.id,
                    'pseudo': person.pseudo
                })
            );

            intro.setAttribute('aria-hidden', 'true');
            message.focus();

            return false;
        },
        false
    );

    shootbox.addEventListener(
        'keyup',
        new function () {
            var active = false;

            return function (event) {
                var text = message.value;

                if (true === active && ('' === text || 'Enter' === event.key)) {
                    active = false;
                    self.connection.send(
                        JSON.stringify({
                            'type'  : 'server/person/inactive',
                            'id'    : self.currentPerson.id,
                            'pseudo': self.currentPerson.pseudo
                        })
                    );
                } else if (false === active && ('' !== text)) {
                    active = true;
                    self.connection.send(
                        JSON.stringify({
                            'type'  : 'server/person/active',
                            'id'    : self.currentPerson.id,
                            'pseudo': self.currentPerson.pseudo
                        })
                    );
                }
            }
        }
    );

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
            self.newMessage('me', message.value, self.currentPerson);

            message.value = '';

            return false;
        },
        false
    );
}

Chat.prototype.newMessage = function (messageType, message, person) {
    var messageElement     = document.createElement('li');
    var messageBodyElement = document.createTextNode(message);

    if ('other' === messageType || 'me' === messageType) {
        var messageHeaderElement = document.createElement('aside');
        var messageAvatarElement = document.createElement('img');
        var messagePseudoElement = document.createTextNode(person.pseudo);

        messageAvatarElement.setAttribute('src', 'https://github.com/' + person.pseudo + '.png?size=40');
        messageAvatarElement.setAttribute('alt', '');
        messageAvatarElement.setAttribute('role', 'presentation');

        messageHeaderElement.appendChild(messageAvatarElement);
        messageHeaderElement.appendChild(messagePseudoElement);

        messageElement.appendChild(messageHeaderElement);
    }

    messageElement.setAttribute('data-message-type', messageType);
    messageElement.appendChild(messageBodyElement);

    this.thread.appendChild(messageElement);
    this.thread.scrollBy(0, 1000000);
};

Chat.prototype.updatePersonCounter = function () {
    document.getElementById('personCounter').innerHTML = Object.keys(this.persons).length;
};

Chat.prototype.updateActivity = function () {
    var self                  = this;
    var numberOfActivePersons = 0;

    var activePersons =
        Object
            .keys(this.persons)
            .filter(
                function (key) {
                    console.log(self.persons[key]);
                    return self.persons[key].active;
                }
            )
            .map(
                function (key) {
                    ++numberOfActivePersons;

                    return self.persons[key].pseudo;
                }
            )
            .join(', ');

    console.log(numberOfActivePersons, activePersons);

    if (0 === numberOfActivePersons) {
        this.activity.setAttribute('aria-hidden', 'true');
        this.activityMessage.innerHTML = '';

        return;
    }

    this.activity.setAttribute('aria-hidden', 'false');
    this.activityMessage.innerHTML =
        activePersons + ' ' +
        (numberOfActivePersons > 1 ? 'are' : 'is') + ' typing…';

    return;
};

function Person(id, pseudo) {
    this.id     = id;
    this.pseudo = pseudo;
    this.active = false;
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

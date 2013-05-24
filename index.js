var xmpp = require('node-xmpp');

// right now just copy-pasta from https://github.com/astro/node-xmpp/blob/master/examples/echo_bot.js

var c = new xmpp.Client({jid:process.argv[2], password:process.argv[3]});

c.on('online', function () {
    console.log("online")
    c.send(new xmpp.Element('presence', {})
		  .c('show').t('chat').up()
		  .c('status').t('Happily echoing your <message/> stanzas'));
});

c.on('offline', function () {
    console.log("offline");
});

c.on('stanza', function (stanza) {
    console.log(stanza.toString());
    
    if (stanza.is('presence') && stanza.attrs.type === 'subscribe') {
        // via http://stackoverflow.com/questions/9505949/authorization-request-add-to-roster-using-strophe-js
        c.send(new xmpp.Element('presence', {to:stanza.attrs.from, type:'subscribed'}));
    } else if (stanza.is('message') && stanza.attrs.type !== 'error') {
        // Swap addresses…
        stanza.attrs.to = stanza.attrs.from;
        delete stanza.attrs.from;
        // …and send back.
        c.send(stanza);
        console.log("MESSAGE IS:", stanza.getChild('body').getText());
    }
});
c.on('error', function (e) {
    console.log("error", e);
});

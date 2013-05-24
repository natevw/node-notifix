var xmpp = require('node-xmpp');

// right now just copy-pasta from https://github.com/astro/node-xmpp/blob/master/examples/echo_bot.js

var jid = process.argv[2],
    pwd = process.argv[3];

var c = new xmpp.Client({jid:jid+"/test321", password:pwd});

c.on('online', function () {
    console.log("online")
    c.send(new xmpp.Element('presence', {})
		  .c('show').t('chat').up()
		  .c('status').t('Happily echoing your <message/> stanzas'));
    
    var jidr = jid + "/testing123";
    c.send(new xmpp.Element('iq', {type:'set', from:jidr, to:"firehoser.superfeedr.com", id:'testing123'})
        .c('pubsub', {xmlns:"http://jabber.org/protocol/pubsub", 'xmlns:superfeedr':"http://superfeedr.com/xmpp-pubsub-ext"})
            .c('subscribe', {node:"http://push-pub.appspot.com/feed", jid:jidr}));
});

c.on('offline', function () {
    console.log("offline");
});

c.on('stanza', function (stanza) {
    console.log(stanza.toString(), "\n");
    
    if (stanza.is('presence') && stanza.attrs.type === 'subscribe') {
        // via http://stackoverflow.com/questions/9505949/authorization-request-add-to-roster-using-strophe-js
        c.send(new xmpp.Element('presence', {to:stanza.attrs.from, type:'subscribed'}));
    } else if (stanza.is('message') && stanza.attrs.type !== 'error') {
        // Swap addresses…
        stanza.attrs.to = stanza.attrs.from;
        delete stanza.attrs.from;
        // …and send back.
        c.send(stanza);
        var body = stanza.getChild('body');
        if (body) console.log("MESSAGE IS:", body.getText());
    }
});
c.on('error', function (e) {
    console.log("error", e);
});

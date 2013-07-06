// WARNING: prototype proof-of-concept code, do NOT to production this

var xmpp = require('node-xmpp'),
    url = require('url');

// XMPP things

var jid = process.argv[2],
    pwd = process.argv[3];

var c = new xmpp.Client({jid:jid, password:pwd});

c.on('online', function () {
    console.log("online")
    c.send(new xmpp.Element('presence', {})
		  .c('show').t('chat').up()
		  .c('status').t('/subscribe URL'));
});

c.on('offline', function () {
    console.log("offline");
});

c.on('stanza', function (stanza) {
    // TODO: I think this also gets outgoing stanzas
    console.log(stanza.toString(), "\n");
    
    if (stanza.is('presence') && stanza.attrs.type === 'subscribe') {
        // via http://stackoverflow.com/questions/9505949/authorization-request-add-to-roster-using-strophe-js
        // this "authorizes" e.g. iChat buddies who have added us to their roster
        c.send(new xmpp.Element('presence', {to:stanza.attrs.from, type:'subscribed'}));
    } else if (stanza.is('message') && stanza.attrs.type !== 'error') {
        var event = stanza.getChild('event'),       // TODO: namespaces!
            chat = stanza.getChild('body');
        if (event) {
            processEvent.call(stanza, event);
        } else if (chat) {
            // TODO: bare jid-ify from
            processBodyFrom.call(stanza, stanza.attrs.from, chat.getText());
        }
    }
    // TODO: pass on iq results
});
c.on('error', function (e) {
    console.warn("error", e);
});


// TX helpers

function sendBodyTo(to_jid, chat) {
    c.send(new xmpp.Element('message', {from:jid, to:to_jid}).c('body').t(chat));
}

function sendSuperfeedr(type, topic) {
    c.send(new xmpp.Element('iq', {type:'set', from:jid, to:"firehoser.superfeedr.com", id:Math.random().toFixed(9).slice(2)})
        .c('pubsub', {xmlns:"http://jabber.org/protocol/pubsub", 'xmlns:superfeedr':"http://superfeedr.com/xmpp-pubsub-ext"})
            .c(type, {node:topic, jid:jid}));
}

// RX helpers

function processEvent(event) {
    console.log("SUPERFEEDR NOTIFICATION", event);
    
    var topic = event.getChild('status').attrs.feed,
        feedParts = url.parse(topic),
        sub_jid = !feedParts.hash.indexOf('#notifix-') && decodeURIComponent(feedParts.hash.slice('#notifix-'.length)),
        feedURL = delete feedParts.hash && url.format(feedParts);
    // TODO: send entry url/title/extract instead
    sendBodyTo(sub_jid, "Update to " + feedURL);
}

function processBodyFrom(from_jid, chat) {
    console.log("CHAT MESSAGE from", from_jid, chat);
    
    var parts = chat.trim().split(' '),
        command = parts[0],
        feedURL = parts[1],
        topic = null;
    
    if (command && feedURL) {
        var feedParts = url.parse(feedURL);
        feedParts.hash = '#notifix-' + encodeURIComponent(from_jid);            // TODO: symmetric encrypt in case of leaky hub?
        topic = url.format(feedParts);
    }
    
    if (topic && ~command.indexOf('/sub')) {
        sendSuperfeedr('subscribe', topic);
    } else if (topic && ~command.indexOf('/unsub')) {
        sendSuperfeedr('unsubscribe', topic);
    } else {
        sendBodyTo(from_jid, "Please \"/subscribe URL\" or \"/unsubscribe URL\" and thank you.");
    }
    // TODO: /list at least
}
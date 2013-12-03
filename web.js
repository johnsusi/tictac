/**
 * 
 * POST /games/                  Create new game
 * POST /games/:id               Join created game
 * GET  /games/:id               Get full game info including all state
 * GET  /games/:id/states/latest Redirect to latest known game state
 * GET  /games/:id/states/:state Get game state, will block for up to 30s
 *                               if the state is not yet available.
 * 
 *
 */

var fs      = require('fs');
var uuid    = require('node-uuid');

var metrics = require('librato-metrics').createClient({
	email: 'john@susi.se',
	token: 'd21cf722053c202911f3c8f354928989ffdfb5eef834f6c19fcdfc25a206800f'
});

var express = require('express');
var app     = express();

var crypto = require('crypto');
var nacl_factory = require("js-nacl");
var nacl = nacl_factory.instantiate();

require('sugar');

var games = {};
var pollers = [];
var lobby = {};

var oneDayInSeconds = 60 * 60 * 24;
var oneYearInSeconds = oneDayInSeconds * 365;

app.use(express.logger());
app.use(express.json({
	verify: function (req, res, buf) {
		if ('rawBody' in req) req.rawBody += buf;
		else req.rawBody = buf;
		console.log('verify: ' + buf);
		return true;
	}		
}));
app.use(express.urlencoded());
app.use(express.static(__dirname + '/public'));

var secrets = {

	'hello': 'world'
};

function authenticate(req, res, next) {

	console.log(authenticate);

	var authorization = req.get('Authorization');

	if (!authorization) return res.set('WWW-Authenticate', 'TicToc').send(401);

	console.log(authorization);
	var l = authorization.match(/TicToc ([^:]*):(.*)/);
	console.log(l);
	if (!l || l.length != 3) return res.set('WWW-Authenticate', 'TicToc').send(401);

	var keyid     = l[1];
	var signature = l[2];

	console.log(keyid + ' => ' + signature);

	if (!(keyid in secrets)) return res.set('WWW-Authenticate', 'TicToc')
			.send(401, 'Key not registered');

	if (!('rawBody' in req)) return res.send(400, 'Missing body');
	 
	var hmacsha1 = crypto.createHmac('sha1', secrets[keyid]);
	hmacsha1.update(req.rawBody);
	
	if (signature !== hmacsha1.digest('base64')) return res.set('WWW-Authenticate', 'TicToc')
			.send(401, 'Signature does not match');


	return next();

}

app.post('*', authenticate);
app.put('*', authenticate);
app.delete('*', authenticate);

app.post('/verify-auth', function (req, res) {


	console.log(req.get('Authorization'));
	console.log(req.get('Content-Length'));


});


app.get('/', function (req, res) {
	return res.send("Hello World!");
});

app.get('/lobby', function (req, res) {
	return res.json(lobby);
});

function expired204(res, timeout) {
	var timestamp = new Date().getTime();
	return function() {
		if (new Date().getTime() >= timestamp + timeout) {
			res.send(204);
			return true;
		}
		else return false;
	}
}

app.put('/lobby/:id', function (req, res) {
	
	var game = games[req.params.id];
	lobby[game.id] = req.body;
	console.log(lobby);
	return pollers.push({
		completed: function() { 
			if (game.players.length >= req.body.players) {
				res.json(200, {});
				return true;
			}
			else return false;
		},
		expired: expired204(res, 30000),
		cleanup: function () { delete lobby[game.id]; }
	});
});

app.get('/lobby/find', function (req, res) {

	for (var id in lobby) {
		var entry = lobby[id];
		var match = true;
		for (var p in req.query) {
			if (!entry.hasOwnProperty(p) || 
					entry[p] != req.query[p]) match = false;
		}
		
		if (match) return res.redirect(302, '/games/' + id);

	}	

	return res.send(204);
});


app.get('/games/', function (req, res) {
    return res.json(games);
});

app.all('/games/:id*', function (req, res, next) {
	return (req.params.id in games) ? next() : res.send(404, 'Game not found');
});

app.post('/games/:id*', function (req, res, next) {
	return ('result' in games) ? res.send(403, 'Game is over') : next();
});

app.get('/games/:id', function (req, res) {
    return res.json(games[req.params.id]);
});

app.post('/games/', function (req, res) {

	var game = req.body;
	
	if (!('states' in game) || game.states.length == 0) return res.send(400);

	game.id = uuid.v4(); 
	if (!('players' in game)) game.players = [];
	if (game.players.length > 0) {
		game.players[0].user = { id: uuid.v4() };
	}

   	games[game.id] = game;
 	   
    return res.redirect(303, './' + game.id);
});

app.get('/games/:id/players/:playerid', function (req, res) {

	var game = games[req.params.id];

	return res.json(game.players[req.params.playerid]);
	
});

app.post('/games/:id/players/', function (req, res) {

    var game = games[req.params.id];
        
    if (game.players.length >= 2) return res.send(403, 'Game is full');
        
    var user = {
		id: uuid.v4(),
	};
   
	var player = {
		index: game.players.length,
        name: req.body.name,
        user: user
    };


    game.players.push(player);
                
    return res.redirect(303, './' + player.index);

});

app.get('/games/:id/states/latest', function (req, res) { 
  	var game = games[req.params.id];
	return res.redirect(302, './' + (game.history.length-1));
});

app.get('/games/:id/states/:state', function (req, res) {
 
    var game = games[req.params.id];
	var timestamp = new Date().getTime();

	// Comment out to disable long-polling
	if (req.params.state >= game.states.length ) {
		if ('result' in game) return res.send(404, 'Game is over');
        return pollers.push({
			completed: function() { 
				if (req.params.state < game.states.length) {
			   		res.json(game.states[req.params.state]); 
					return true;
				}
				else return false;
			},
			expired: expired204(res, 10000)
		});
    }

	return res.json(game.states[req.params.state]);

});

app.post('/games/:id/states/', function (req, res) {
	
	var game = games[req.params.id];
	game.states.push(req.body);	
	return res.redirect(303, 
			'./' + (game.states.length - 1));
});

app.get('/games/:id/result', function (req, res) {

	var game = games[req.params.id];
	if ('result' in game) res.json(game.result); 
	else res.send(404, 'Game is not over');

});

app.put('/games/:id/result', function (req, res) {

	var game = games[req.params.id];

	if ('result' in game) return res.header('Allow', 'GET')

	game.result = req.body;

	return res.send(201);

});

app.delete('/games/:id', function (req, res) {

	delete games[req.params.id];
  	return res.send(204);
});

var port = process.env.PORT || 5000;

app.listen(port, function() {
	console.log("Listening on " + port);
});


(function processQueues() {

	var expiration = new Date().getTime() - 30000; // 30s
   
    pollers = pollers.filter(function (poller) {  
		if (poller.completed() || poller.expired()) {
			if ('cleanup' in poller) poller.cleanup();
			return false;
		}
		else return true;
	});
    setTimeout(processQueues, 1000);
})();

(function sendMetrics() {

	metrics.post('/metrics', {

		gauges: [
			{ name: 'tictoc.pollers', value: pollers.length }
		]
		
	}, function() {});

	setTimeout(sendMetrics, 60000);

})();

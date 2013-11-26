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
var express = require('express');
var app     = express();

var games = {};
var pollers = [];

var oneDayInSeconds = 60 * 60 * 24;
var oneYearInSeconds = oneDayInSeconds * 365;

app.use(express.logger());
app.use(express.json());
app.use(express.urlencoded());
app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
	return res.send("Hello World!");
});

app.get('/games/', function (req, res) {
    return res.json(games);
});

app.all('/games/:id*', function (req, res, next) {
	if (!(req.params.id in games)) return res.send(404, 'Game not found');
	return next();
});

app.get('/games/:id', function (req, res) {
    return res.json(games[req.params.id]);
});

app.post('/games/', function (req, res) {

    var user = {
        id: uuid.v4()
	};

    var game = {
        id: uuid.v4(),
        players: [
            { name: req.body.name, user: user }
        ],
        states: [ req.body.state ]            
	};
    
    games[game.id] = game;
    
    return res.json({
        id: game.id,
        you: user.id
    });
});

app.post('/games/:id/players/', function (req, res) {

    var game = games[req.params.id];
        
    if (game.players.length >= 2) return res.send(403, 'Game is full');
        
    var user = {
		id: uuid.v4(),
	};
        
    game.players.push({
        name: req.body.name,
        user: user
    });
                
    return res.json({
		id: game.id, 
		you: user.id
	});

});

app.get('/games/:id/states/latest', function (req, res) { 
  	var game = games[req.params.id];
	return res.redirect(302, '' + (game.history.length-1));
});

app.get('/games/:id/states/:state', function (req, res) {
 
    var game = games[req.params.id];
	
	// Comment out to disable long-polling
	if (req.params.state >= game.states.length ) {
        return pollers.push({
            res: res,
            game: game,
            state: req.params.state,
            timestamp: new Date().getTime()
        });
    }

	return res
			.header('Cache-Control', 'public, max-age=3600')
			.json(game.states[req.params.state]);

});

app.post('/games/:id/states/', function (req, res) {
	
	var game = games[req.params.id];
	game.states.push(req.body);	
	return res.json(game.states.length);
});

app.delete('/games/:id', function (req, res) {

	delete games[req.params.id];
  	return res.json(true);
});

var port = process.env.PORT || 5000;

app.listen(port, function() {
	console.log("Listening on " + port);
});


(function processQueues() {

	var expiration = new Date().getTime() - 30000; // 30s
   
    pollers = pollers.filter(function (poller) {
    
        if (poller.state < poller.game.states.length) {
            poller.res.json(poller.game.states[poller.state]);
            return false;
        }
        else if (poller.timestamp < expiration) {
			poller.res.send(200, 'OK');
            return false;
        }
        else return true;
    
    });

    setTimeout(processQueues, 10);
})();


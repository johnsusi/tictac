var fs = require('fs');
eval(fs.readFileSync('./public/reversi.js').toString());

var express = require('express');
var app = express();

var uuid = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0,
            v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
};


var games = {};
var pollers = [];

app.use(express.logger());
app.use(express.bodyParser());
app.use(express.static(__dirname + '/public'));

app.get('/', function (request, response) {
	response.send("Hello World!");
});

app.get('/games/', function (req, res) {
    res.json(games);
});

app.get('/games/:id', function (req, res) {

    if (req.params.id in games) {
        res.json(games[req.params.id]);
    }
    else {
        res.statusCode = 404;
        return res.send('Error 404: Game not found');
    }
});

app.post('/games/', function (req, res) {

    var user = {
        id: uuid(),
        color: 'O'
    };

    var game = {
        id: uuid(),
        players: [
            { name: req.body.name, user: user }
        ],
        state: {
            board: [
                '.', '.', '.', '.', '.', '.', '.', '.',
                '.', '.', '.', '.', '.', '.', '.', '.',
                '.', '.', '.', '.', '.', '.', '.', '.',
                '.', '.', '.', '*', 'O', '.', '.', '.',
                '.', '.', '.', 'O', '*', '.', '.', '.',
                '.', '.', '.', '.', '.', '.', '.', '.',
                '.', '.', '.', '.', '.', '.', '.', '.',
                '.', '.', '.', '.', '.', '.', '.', '.',
            ],
            player: 0,
            nextState: 1
        },
        history: [],
        queue: []
    };
    
    game.state.validMoves = findValidMoves(game.state.board, 'O', '*', '.');
    game.history.push(game.state);
    
    games[game.id] = game;
    
    res.json({
        id: game.id,
        you: user
    });
});

app.post('/games/:id/players/', function (req, res) {
    if (req.params.id in games) {
        var game = games[req.params.id];
        
        if (game.players.length > 2) {
            res.statusCode = 400;
            return res.send('Error 400: This game does not allow any more players to join');
        }
        
        var user = {
            id: uuid(),
            color: game.players[0].user.color == 'O' ? '*' : 'O'
        };
        
        game.players.push({
            name: req.body.name,
            user: user
        });
                
        res.json(user);
    }
    else {
        res.statusCode = 404;
        return res.send('Error 404: Game not found');
    }

});

app.get('/games/:id/state/:state', function (req, res) {
    if (req.params.id in games) {
        var game = games[req.params.id];
        if (req.params.state < game.history.length ) {
            res.json(game.history[req.params.state]);
        }
        else {
            pollers.push({
                res: res,
                game: game,
                state: req.params.state,
                timestamp: new Date().getTime()
            });
        }

    }
    else {
        res.statusCode = 404;
        return res.send('Error 404: Game not found');
    }
});


app.post('/games/:id/queue', function (req, res) {
    
    if (req.params.id in games) {
        games[req.params.id].queue.push(req.body);
        res.json(true);
    }
    else {
        res.statusCode = 404;
        return res.send('Error 404: Game not found');
    }
    
});

app.delete('/games/:id', function (req, res) {

    if (req.params.id in games) {
        delete games[req.params.id];
        res.json(true);
    }
    else {
        res.statusCode = 404;
        return res.send('Error 404: Game not found');
    }


});

var port = process.env.PORT || 5000;

app.listen(port, function() {
	console.log("Listening on " + port);
});


(function processQueues() {

	var expiration = new Date().getTime() - 30000;
    for (var gameid in games) {
    
        var game = games[gameid];

        while (game.queue.length > 0) {
            var cmd = game.queue.shift();
            var board = game.state.board.join(",").split(","), validMoves, player;
            var move = typeof cmd.move == "number" ? cmd.move | 0 : parseInt(cmd.move);

            if (game.state.validMoves.indexOf(move) == -1 || cmd.me !=
            game.players[game.state.player].user.id
            
            ) {
                game.state["error"] = "Player tried to do an invalid move";
                validMoves = game.state.validMoves;
                player = game.state.player;
                console.log("error");
            }
            else {
                var p = game.players[game.state.player].user.color;
                var o = p == 'O' ? '*' : 'O';
                doMove(board, cmd.move % 8, cmd.move >> 3, p, o, '.');
                validMoves = findValidMoves(board, o, p, '.');
                player = (game.state.player + 1) % game.players.length;
            }
            game.state = {
                board: board,
                validMoves: validMoves,
                player: player,
                nextState: game.history.length +1
            };
            game.history.push(game.state);
 
            if (game.state.validMoves.length == 0) {
                var p = game.players[game.state.player].user.color;
                var o = p == 'O' ? '*' : 'O';
                board = game.state.board.join(",").split(",");
                player = (game.state.player + 1) % game.players.length;
                validMoves = findValidMoves(board, o, p, '.');
 
                if (validMoves.length == 0) {
                    // game is done
                }
                else {
                    game.state = {
                        board: board,
                        validMoves: validMoves,
                        player: player,
                        nextState: game.history.length +1
                    };
                    game.history.push(game.state);
                }
            }
 
        }
        
    }
    
    pollers = pollers.filter(function (poller) {
    
        if (poller.state < poller.game.history.length) {
            poller.res.json(poller.game.history[poller.state]);
            return false;
        }
        else if (poller.timestamp < expiration) {
            poller.res.statusCode = 200;
            poller.res.send("OK");
            return false;
        }
        else return true;
    
    });

    setTimeout(processQueues, 10);
})();
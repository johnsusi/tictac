var dx = 512 >> 3;
var dy = dx;
var width = dx * 8;
var height = dy * 8;
//var game;
var me, you, lastMoveWasPass = false;


var POLL_INTERVALL = 40000;

//d3.select('body').attr('width', dim).attr('height', dim);
console.clear();


function model(o, properties) {

	var observers = [];
	var proxy = Object.create(o);
	proxy.addObserver = function (observer) { 
		observers.push(observer); 
		return this;
	};
	proxy.removeObserver = function (observer) {
		observers = observers.filter(function (el) {
			el !== observer; 
		});
		return this;
	};
	
	function firePropertyChanged(value) {
		observers.forEach(function (observer) { observer(value); });
	}	
	
	var values = {};

	properties.forEach(function (property) {
		values[property] = o[property];
		Object.defineProperty(proxy, property, {
			get: function() { return values[property]; },
			set: function (value) {
				firePropertyChanged(values[property] = value);
			}
		});
	});

	return proxy;
}

$(function () {

	console.log("start");
	var game;
	var dim = Math.min($(window).width(), $(window).height());
	var svg = d3.select('body').append('svg:svg')
    		.attr('width', dim - 10)
		    .attr('height', dim - 10)
		    .attr('viewBox', '-24,-24,560,560')
	;

    svg.selectAll('rect')
        .data(new Array(64))
        .enter().append('rect')
                .attr('x', function (d, i) { return (i %  8) * dx; })
                .attr('y', function (d, i) { return (i >> 3) * dy; })
                .attr('width',  dx)
                .attr('height', dy)
                .attr('rx', 5.5)
                .attr('ry', 5.5)
                .style('fill', function (d, i) {
                    var x = i % 8;
                    var y = i >> 3;
                    return (x + y) % 2 ? "#2A76BA" : "#FFFFFF";
                })
    ;



var dataset = "ABCDEFGH".split("");

var xScale = d3.scale.ordinal()
    .domain("ABCDEFGH".split(""))
    .rangeRoundBands([0, 512], 0.05);

var yScale = d3.scale.ordinal()
	.domain("12345678".split(""))
	.rangeRoundBands([0, 512], 0.05);

var xAxis = d3.svg.axis().scale(xScale).orient("top");
var yAxis = d3.svg.axis().scale(yScale).orient("left");

svg.append("g")
    .attr("class", "x axis")
    .call(xAxis);

svg.append("g")
    .attr("class", "x bottom axis")
	.attr("transform", "translate(0, 512)")
    .call(xAxis);


svg.append("g")
	.attr("class", "y axis")
	.call(yAxis);

svg.append("g")
	.attr("class", "y right axis")
	.attr("transform", "translate(536, 0)")
 	.call(yAxis);


	$(window).resize(function () {
	    var dim = Math.min($(window).width(), $(window).height());
		svg.attr('width', dim-10).attr('height', dim-10);
	});


	create(function (data) {	

		game = model(data, ['state']).addObserver(function () {
			update(svg, game); 
			if (game.state.player != me.index) {
				poll(svg, game);
			}
		});	

		console.log(game.states);

if (0) {
		game.addObserver(function () {
			if (('next' in game.state) && game.state.player == 0) {
				console.log("doing white move");
				doRandomMove(game);
			}
		});
		game.addObserver(function () {
			if (('next' in game.state) && game.state.player == 1) {
				console.log("doing black move");
				doRandomMove(game);
			}
		});
}


if (0) {
			findPlayers(game, function (data) {
				me = { index: -1 };
				game.state = game.states.last();

			});
}

		join(game, 'I am White', function (data) {
			me = data;

			findPlayers(game, function (data) {
				game.state = game.states.last();
				poll(svg, game);
			});


		});
	});
});

// Library

function findPlayers(game, callback) {
	put('/lobby/' + game.id, { 'type': 'reversi/1.0', 'players': 2 })
			.done(function(data, status) {
		switch (status) {
			case 'nocontent': return findPlayers(game, callback);
			default: return callback(data);
		}
		
	});
	
}


function update(svg, game) {
	
	var state = game.state;
	var p = state.player == 0 ? 'O' : '*';
	var o = p == 'O' ? '*' : 'O';
    var circles = svg.selectAll('use');
			
	var myTurn = me.index == state.player;

	var validMoves = findValidMoves(state.board,p,o,'.');
	dumpMoves(validMoves);
	var b = state.board.split("").map(function (el, i) {
	var res = {
			el: (!myTurn || validMoves.indexOf(i) == -1) ? el : '?',
			x: i % 8, 
			y: i >> 3
		};
		console.log(i + " -> " + JSON.stringify(res));
		return res;
		}).filter(function (el) {
		return el.el == 'O' || el.el == '*' || el.el == '?';
	});
	

	circles = circles.data(b, function (d) {
		var key = d.x + d.y * 8;		
	 	switch (d.el) {
			case 'O': return key;
			case '*': return 64+key;
			default: return 128 + key;
		}
	});

	circles.enter()
			.append('use').attr('xlink:href', 
				function (d, i) {
					switch (d.el) {
						case '*': return '#blackchip';
						case 'O': return '#whitechip';
						case '?': return p == '*' ? '#blackchip' : '#whitechip';
					}
				})
			.attr("transform", "translate(-100, -100)")
			.transition().duration(1000)
			.attr("transform", function (d) {
				return "translate(" + (d.x * dx) + ", " + 
					(d.y * dy) + ")";
			})
	;

    circles .classed('black', function (d) { return d.el == '*'; })
            .classed('white', function (d) { return d.el == 'O'; })
			.classed('valid', function (d) { return d.el == '?'; })
            .on('click', function (d, i) {
				if (d.el == '?') {
					return move(game, d.x + d.y * 8);
				}
			});
    
    circles.exit()
			.transition().duration(1000)
			.attr('transform', 'translate(-100, -100)')
			.remove();
   
}

function post(url, data) {
	return send('POST', url, data);
}

function put(url, data) {
	return send('PUT', url, data);
}

function send(method, url, data) {
	if (typeof data !== 'string') data = JSON.stringify(data);
	var keyid = 'hello';
	var secret = 'world';
	var signature = CryptoJS.HmacSHA1(data,secret)
			.toString(CryptoJS.enc.Base64);
	return $.ajax({
			type: method,
			url: url, 
	        contentType: 'application/json; charset=utf-8',
			data: data,
			dataType: 'json',
			headers: { 'Authorization': 'TicToc ' + keyid + ':' + signature }
	});

}

function create(success) {

	post('/games/', { states: [ {
			board: [
    	    		'.', '.', '.', '.', '.', '.', '.', '.',
					'.', '.', '.', '.', '.', '.', '.', '.',
       	    	    '.', '.', '.', '.', '.', '.', '.', '.',
          	    	'.', '.', '.', '*', 'O', '.', '.', '.',
	               	'.', '.', '.', 'O', '*', '.', '.', '.',
		            '.', '.', '.', '.', '.', '.', '.', '.',
	                '.', '.', '.', '.', '.', '.', '.', '.',
	       	        '.', '.', '.', '.', '.', '.', '.', '.',
			].join(""),
			player: 0,
			lastMove: undefined,
			next: 1 
	}]}).done(success);

}

function join(game, name, success) {
	post('/games/' + game.id + '/players/', { 'name': name }).done(success);
}

function poll(svg, game) {
	$.ajax({
    	type: 'GET',
		url: '/games/' + game.id + '/states/' + game.state.next,
		statusCode: {
			204: function () { poll(svg, game); }
		},
        timeout: POLL_INTERVALL			
	}).done(function (data, status) {
		if (typeof data === "object") {    
			console.log('setting state from poll');	
			game.state = data;
		}
	}).fail(function (jqXHR, status, errorThrown) {
		switch (status) {
			case 'timeout': return poll(svg, game);
			default: return console.log(status + ' : ' + errorThrown);
		}				
	});
}

function move(game, pos) {
	var state = Object.clone(game.state, true);
	var p = state.player == 0 ? 'O' : '*';
	var o = p == 'O' ? '*' : 'O';
	var m = 'ABCDEFGH'[pos%8] + '12345678'[pos >>> 3];

	state.board = doMove(state.board, m, p, o, '.'); 
	state.player = (++state.player) % 2;
	state.lastMove = m;
	++state.next;
	console.log(p + ' : ' + state.lastMove);

	post('/games/' + game.id + '/states/', state).done(function(data) { 
		game.state = data;
	});
}

function pass(game) {
	var state = Object.clone(game.state, true);
	var p = state.player == 0 ? 'O' : '*';
	if (state.lastMove == '--') {
		$.ajax({
			type: 'PUT',
			url: '/games/' + game.id + '/result', 
	        contentType: 'application/json; charset=utf-8',
			data: JSON.stringify({'hello': 'world'}), 
			dataType: 'json'
		});
		delete state.player;
		delete state.next;
	}
	else {
		state.player = (++state.player) % 2;
		state.lastMove = '--';
		++state.next;
	}
	console.log(p + ' : ' + state.lastMove);

	post('/games/' + game.id + '/states/', state).done(function(data) { 
		game.state = data;
	});
}

function doRandomMove(game) {

	var p = game.state.player == 0 ? 'O' : '*';
	var o = p == 'O' ? '*' : 'O';
	var validMoves = findValidMoves(game.state.board,p,o,'.');

	if (validMoves.length > 0) {
		var m = Math.random() * validMoves.length;
		m = Math.floor(m);
		move(game, validMoves[m]);
	}
	else pass(game);
}

// Reversi lib

var moves = [
	'A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1',
	'A2', 'B2', 'C2', 'D2', 'E2', 'F2', 'G2', 'H2',
	'A3', 'B3', 'C3', 'D3', 'E3', 'F3', 'G3', 'H3',
	'A4', 'B4', 'C4', 'D4', 'E4', 'F4', 'G4', 'H4',
	'A5', 'B5', 'C5', 'D5', 'E5', 'F5', 'G5', 'H5',
	'A6', 'B6', 'C6', 'D6', 'E6', 'F6', 'G6', 'H6',
	'A7', 'B7', 'C7', 'D7', 'E7', 'F7', 'G7', 'H7',
	'A8', 'B8', 'C8', 'D8', 'E8', 'F8', 'G8', 'H8',
];

function dumpMoves(m) {
	console.log(m.map(function (el) { 
			return moves[el]; }));
}

function findValidMoves(board, player, opponent, empty) {

    var validMoves = [];
    
    var validate = function (x, y, dx, dy) {
        for (var xx = x + dx, yy = y + dy, flip = 0;
                xx >= 0 && xx <  8 &&
                yy >= 0 && yy < 8;xx += dx, yy += dy) {        
            if (board[yy * 8 + xx] == opponent) ++flip;
            else if (board[yy * 8 + xx] == player) return flip;
            else return 0;
            
        }
        return 0;
    };
    
    for (var y = 0;y < 8;++y) {
        for (var x = 0;x < 8;++x) {
            if (board[y * 8 + x] != empty) continue;
            var flip =
                    validate(x, y,  0, -1) +
                    validate(x, y,  0, +1) +
                    validate(x, y, +1, -1) +
                    validate(x, y, +1, +1) +
                    validate(x, y, -1, -1) +
                    validate(x, y, -1, +1) +
                    validate(x, y, -1,  0) +
                    validate(x, y, +1,  0);

            if (flip > 0) validMoves.push(y * 8 + x);
        }
    }
    
    return validMoves;

}

function doMove(board, move, player, opponent, empty) {
    
	board = board.split("");
	var x = 'ABCDEFGH'.indexOf(move[0]);
	var y = '12345678'.indexOf(move[1]);

    var flip = function (x, y, dx, dy) {
        for (var xx = x + dx, yy = y + dy, flip = 0;
                xx >= 0 && xx <  8 &&
                yy >= 0 && yy < 8;xx += dx, yy += dy) {        
            if (board[yy * 8 + xx] == opponent) ++flip;
            else if (board[yy * 8 + xx] == player) {
                if (flip > 0) {
                    do {
                        xx -= dx;
                        yy -= dy;
                        board[yy * 8 + xx] = player;
                    } while (xx != x || yy != y);
                }
                return;
            }
            else return;
        }
    };
    

    flip(x, y,  0, -1);
    flip(x, y,  0, +1);
    flip(x, y, +1, -1);
    flip(x, y, +1, +1);
    flip(x, y, -1, -1);
    flip(x, y, -1, +1);
    flip(x, y, -1,  0);
    flip(x, y, +1,  0);

	return board.join("");
    
}


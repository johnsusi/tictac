var dx = 512 >> 3;
var dy = dx;
var width = dx * 8;
var height = dy * 8;
//var game;
var me, you, lastMoveWasPass = false;


var POLL_INTERVALL = 40000;

//d3.select('body').attr('width', dim).attr('height', dim);
console.clear();
//localStorage.removeItem("tictac.keyid");
//localStorage.removeItem("tictac.secret");

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

	$.when(
		$.get('chip.svg').done(function (data) {
			$('body').append( document.importNode(data.documentElement,true) );
		})
	).then(main); 
});

function main() {
	console.log("start");
	var game;
	var dim = Math.min($(window).width(), $(window).height());
	var svg = d3.select('body').append('svg:svg')
   			.attr('width', dim - 10)
		    .attr('height', dim - 10)
		    .attr('viewBox', '-24,-24,560,560')
	;

	board(svg);
	axis(svg);

	$(window).resize(function () {
	    var dim = Math.min($(window).width(), $(window).height());
		svg.attr('width', dim-10).attr('height', dim-10);
	});


	tictac.handle('html', function (html) {
		$('body').append(html);
	});

	create(function (data) {	
		console.log('create');
		console.log(data);
		game = model(data, ['state']).addObserver(function () {
			console.log('state changed');
			update(svg, game); 
			if (game.state.player != me.index) {
				poll(svg, game);
			}

			for (var i = 0;i < 8;++i) {

				console.log(game.state.board.substring(i * 8, i * 8 + 8));
			}

		});	

		join(game, 'I am White', function (data) {
			me = data;
//		me = { index: -1 };
			findPlayers(game, function (data) {
				game.state = game.states.last();
				poll(svg, game);
			});


		});
	});
}

// d3

function board(svg) {
    svg.selectAll('rect')
        .data(new Array(64))
        .enter().append('rect')
                .attr('x', function (d, i) { return (i %  8) * dx; })
                .attr('y', function (d, i) { return (i >> 3) * dy; })
                .attr('width',  dx)
                .attr('height', dy)
                .attr('rx', 5.5)
                .attr('ry', 5.5)
				.attr('fill', '#FFFFFF')
				.transition().duration(1000)
				.style('fill', function (d, i) {
                    	var x = i % 8;
	                    var y = i >> 3;
    	                return (x + y) % 2 ? "#2A76BA" : "#FFFFFF";
        	        })
	
    ;

}

function axis(svg) {

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

}



// Library

function findPlayers(game, callback) {
	tictac.put('/lobby/' + game.id, { 'type': 'reversi/1.0', 'players': 2 })
			.done(function(data, status) {
		switch (status) {
			case 'nocontent': return findPlayers(game, callback);
			default: return callback(data);
		}
		
	});
	
}

var white = new Array(64).map(function () { return true; });
var black = new Array(64).map(function () { return true; });

var transition;
function update(svg, game) {

	transition = d3.transition();

	console.log("update");

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
		return res;
		}).filter(function (el) {
		return el.el == 'O' || el.el == '*' || el.el == '?';
	});
	
	circles = circles.data(b, function (d) {
		var key = d.x + d.y * 8;		
	 	switch (d.el) {
			case 'O': return key;
			case '*': return 64+key;
			default: return 128+key;
		}
	});


	transition = transition.duration(500).each( function () {
		console.log("exit");
		circles.exit()
			.transition()
				.attr('transform', 'translate(0, 600)')
				.remove();
 	});

	transition = transition.transition().each(function () {
		console.log("enter");
		circles.enter()
			.append('use').attr('xlink:href', 
				function (d, i) {
					switch (d.el) {
						case '*': return '#blackchip';
						case 'O': return '#whitechip';
						case '?': return p == '*' ? '#blackchip' : '#whitechip';
						default: console.log('oups');
					}
				})
				.attr("transform", "translate(-500, -500)scale(10)rotate(90)")
			.transition().duration(1000)
				.attr("transform", function (d) {
					return "translate(" + (d.x * dx) + ", " + 
						(d.y * dy) + ")";
				})
		;
	});

    circles .classed('black', function (d) { return d.el == '*'; })
            .classed('white', function (d) { return d.el == 'O'; })
			.classed('valid', function (d) { return d.el == '?'; })
            .on('click', function (d, i) {
				if (d.el == '?') {
					return move(game, d.x + d.y * 8);
				}
			});
    
}

function create(success) {

	tictac.post('/games/', { states: [ {
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
	tictac.post('/games/' + game.id + '/players/', { 'name': name }).done(success);
}

function poll(svg, game) {
	console.log("poll");
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

	tictac.post('/games/' + game.id + '/states/', state).done(function(data) { 
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

	tictac.post('/games/' + game.id + '/states/', state).done(function(data) { 
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


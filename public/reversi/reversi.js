var dx = 512 >> 3;
var dy = dx;
var width = dx * 8;
var height = dy * 8;
var game = {
    id: 0,
    me: {},
    state: {
        nextState: 0,
        board: []
    }
};


var dim = Math.min($(window).width(), $(window).height());

//d3.select('body').attr('width', dim).attr('height', dim);

var svg = d3.select('body').append('svg:svg')
    .attr('width', dim - 10)
    .attr('height', dim - 10)
    .attr('viewBox', '0,0,512,512')
;

$(window).resize(function () {
    console.log("resize: " + $(window).width() + ", " + $(window).height());
    var dim = Math.min($(window).width(), $(window).height());
//    dx = dim >> 3;
//    dy = dx;
//    width = dx * 8;
//    height = dy * 8;
    svg.attr('width', dim-10).attr('height', dim-10);
    update();
});
var update = function () {
    console.log("dx = " + dx + ", dy = " + dy);
    svg.selectAll('rect')
        .data(game.state.board)
        .enter().append('rect')
                .attr('x', function (d, i) { return (i %  8) * dx; })
                .attr('y', function (d, i) { return (i >> 3) * dy; })
                .attr('width',  dx)
                .attr('height', dy)
                .attr('rx', 5)
                .attr('ry', 5)
                .style('fill', function (d, i) {
                    var x = i % 8;
                    var y = i >> 3;
                    return (x + y) % 2 ? "#2A76BA" : "#FFFFFF";
                })
    ;


    var circles = svg.selectAll('circle').data(game.states.board);
	var validMoves = findValidMoves(game.states.

    circles.enter().append('circle')
            .attr('cx', function (d, i) { return dx / 2 + (i %  8) * dx; })
            .attr('cy', function (d, i) { return dy / 2 + (i >> 3) * dy; })
            .attr('r', dx / 2.5)
            .attr('stroke', "black")

    circles .classed('black', function (d) { return d == '*'; })
            .classed('white', function (d) { return d == 'O'; })
            .classed('empty', function (d) { return d == '.'; })
            .classed('valid', function (d, i) { return d == '.' && game.states.validMoves.indexOf(i) != -1; })
            .on('click', function (d, i) {
                if (game.states.validMoves.indexOf(i) != -1) {
                    $.ajax({
                        type: 'POST',
                        data: { move: i, me: game.state.player == 0 ? game.me.id : game.you.id},
                        dataType: 'json',
                        url: 'games/' + game.id + '/queue/',
                        success: function (data) {
                        }
                    });
                }
            })
    ;
    
    circles.exit().remove();
    
};

$.ajax({
        type: 'POST',
        data: { name: "I am white" },
        dataType: 'json',
        url: 'games/',
        success: function (data) {
            game.id = data.id;
            game.me = data.you;
       
            $.ajax({
                    type: 'POST',
                    data: { 
							name: "I am black",
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
							}
					},
                    dataType: 'json',
                    url: 'games/' + game.id + '/players/',
                    success: function (data) {
                        game.you = data;
                        (function poll() {
                            $.ajax({
                                    type: 'GET',
                                    url: 'games/' + game.id + '/states/' + game.state.nextState,
                                    success: function (data) {
                                        if (typeof data === "object") {                                
                                            game.state = data;
                                            update();
                                        }
                                    },
                                    complete: function (jqXHR, status) {
                                        if (status == "success" || status == "timeout") poll();
                                        else setTimeout(poll, 15000);
                                    },
                                    timeout: 30000
                            });
                        })();
                    }
            });
        }
});



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

function doMove(board, x, y, player, opponent, empty) {
    
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
    
}


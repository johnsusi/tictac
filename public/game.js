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

var svg = d3.select('body').append('svg:svg')
        .attr('width', width)
        .attr('height', height)
;

var update = function () {

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


    var circles = svg.selectAll('circle').data(game.state.board);

    circles.enter().append('circle')
            .attr('cx', function (d, i) { return dx / 2 + (i %  8) * dx; })
            .attr('cy', function (d, i) { return dy / 2 + (i >> 3) * dy; })
            .attr('r', dx / 2.5)
            .attr('stroke', "black")

    circles .classed('black', function (d) { return d == '*'; })
            .classed('white', function (d) { return d == 'O'; })
            .classed('empty', function (d) { return d == '.'; })
            .classed('valid', function (d, i) { return d == '.' && game.state.validMoves.indexOf(i) != -1; })
            .on('click', function (d, i) {
                if (game.state.validMoves.indexOf(i) != -1) {
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
                    data: { name: "I am black" },
                    dataType: 'json',
                    url: 'games/' + game.id + '/players/',
                    success: function (data) {
                        game.you = data;
                        (function poll() {
                            $.ajax({
                                    type: 'GET',
                                    url: 'games/' + game.id + '/state/' + game.state.nextState,
                                    success: function (data) {
                                        if (typeof data === "object") {                                
                                            game.state = data;
                                            console.log(data);
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




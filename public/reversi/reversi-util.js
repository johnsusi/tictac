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



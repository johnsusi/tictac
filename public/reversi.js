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
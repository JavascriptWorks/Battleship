class Player {
    constructor(id, cellSize) {
        this.id = id;

        this.pieces = {
            'patrol': new Piece(2, 'patrol', cellSize),
            'submarine': new Piece(3, 'submarine', cellSize),
            'destroyer': new Piece(3, 'destroyer', cellSize),
            'battleship': new Piece(4, 'battleship', cellSize, 1),
            'carrier': new Piece(5, 'carrier', cellSize, 1)
        }
        this.turn = false;

    }

}

Player.totalPieceLength = 17;
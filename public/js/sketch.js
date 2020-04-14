var playerCanvas;
var opponentCanvas;
var battleship;
var player;
var turn;

var boardWidth;
var selectedPiece;
var board;

function setup() {
    createCanvas(0, 0);
    select('#game').style('height', windowHeight + 'px');
    board = select('#board');

    boardWidth = windowWidth < 600 ? 0.55*windowWidth : Math.min(350, 0.4*windowWidth);

    battleship = new Battleship(gameID, 10, boardWidth);
    player = new Player(playerID, battleship.cellSize);
    Object.values(player.pieces).map(x => x.el.removeClass('loadingImg'));
    let cellSize = battleship.cellSize;
    let carrier = player.pieces['carrier']
    carrier.transform(carrier.height / 2 - cellSize / 4, 3 * (boardWidth + cellSize) / 4 + carrier.width / 4);
    let btlshp = player.pieces['battleship']
    btlshp.transform(boardWidth / 2 + btlshp.height / 2 - cellSize / 4, 3 * boardWidth / 4 + cellSize + btlshp.width / 2);
    let destroyer = player.pieces['destroyer'];
    destroyer.transform(-cellSize, 3 * boardWidth / 4 - cellSize + destroyer.height / 4);
    let submarine = player.pieces['submarine'];
    submarine.transform(-cellSize + submarine.width / 16, boardWidth / 2 - submarine.height / 4 - cellSize / 8);
    let patrol = player.pieces['patrol'];
    patrol.transform(-cellSize + patrol.width / 6, boardWidth / 4 - patrol.height / 4 + cellSize / 8);

    turn = select('#turn');
    turn.html('Place pieces')
    if (Object.keys(localStorage).includes(battleship.id)) {
        let json = JSON.parse(localStorage.getItem(battleship.id));
        let keys = Object.keys(json);
        battleship.playerBoard = keys.includes('playerBoard') ? json.playerBoard : battleship.playerBoard;
        battleship.opponentBoard = keys.includes('opponentBoard') ? json.opponentBoard : battleship.opponentBoard;
        battleship.ready = json.ready;
        battleship.started = keys.includes('started') ? json.started : battleship.started;
        player.turn = keys.includes('turn') ? json.turn : player.turn;
        if (battleship.ready) {
            start();
        }
        if(player.turn && battleship.started){
            turn.html('Your turn');
        }else if(!player.turn && battleship.started){
            turn.html('Their turn');
        }
        if (keys.includes('pieces')) {
            for (let p of Object.keys(player.pieces)) {
                let data = json['pieces'][p];
                player.pieces[p].el.removeClass('interactable');
                player.pieces[p].rotate(data.r);
                player.pieces[p].fit(data, cellSize);
            }
        }
    } else {
        localStorage.setItem(battleship.id, JSON.stringify({ 'ready': false, 'time': Date.now() }));
    }

    //localStorage cleanup

    var currentTime = Date.now()
    const items = Object.keys(localStorage);

    var maxAge = (1000 * 1) *//s
        (60 * 1) *//m
        (60 * 0.5) //h localStorage will be removed after 30 mins of initialization

    for (let i of items) {
        let timestamp = JSON.parse(localStorage.getItem(i))['time'];
        if ((currentTime - timestamp) > maxAge) {
            localStorage.removeItem(i);
            if (i == gameID) {
                window.location.href = '../../index';
            }
        }
    }
}

function playerReady() {
    if (battleship.ready)
        return;

    let ready = true;
    for (let p of Object.values(player.pieces)) {
        if (!p.ready)
            ready = false;
    }
    if (!ready) {
        turn.html('Please place all pieces');
        return;
    }

    let store = JSON.parse(localStorage.getItem(gameID));
    store['playerBoard'] = battleship.playerBoard;
    store['pieces'] = {};
    let pieces = Object.values(player.pieces);
    for (let p of pieces) {
        p.el.removeClass('interactable');
        store['pieces'][p.name] = { x: p.boardCoords[0][0], y: p.boardCoords[0][1], r: p.rotation };
    }

    battleship.ready = true;
    store['ready'] = true;
    localStorage.setItem(gameID, JSON.stringify(store));
    start();
}

function windowResized() {
    for (let p of Object.keys(player.pieces)) {
        if (Object.keys(localStorage).includes(p)) {
            localStorage.removeItem(p);
        }
    }
}

function update() {
    selectedPiece.isDragging = true;
    if (selectedPiece)
        selectedPiece.transform(selectedPiece.currentPosition.x + selectedPiece.delta.x, selectedPiece.currentPosition.y + selectedPiece.delta.y);
}

function mouseDragged(e) {
    if (e.touches) { e = e.touches[0]; }
    // console.log(e.clientX, e.clientY);
    if (selectedPiece) {
        selectedPiece.dragged = true;

        dx = (e.clientX - selectedPiece.startPosition.x);
        dy = (e.clientY - selectedPiece.startPosition.y);
        selectedPiece.delta = { x: dx, y: dy };
        if (selectedPiece.isDragging) {
            selectedPiece.isDragging = false;            // no need to call rAF up until next frame
            requestAnimationFrame(update); // request 60fps animation
        };
    }
}

function mouseReleased() {
    if (selectedPiece) {
        selectedPiece.delta = { x: 0, y: 0 };
        selectedPiece.isDragging = false;
        selectedPiece.dragged = false;
        selectedPiece = false;
    }
}


function postAttack() {
    if ((!player.turn || !battleship.started) && !battleship.finished) { //don't ping server when it is your turn
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState == XMLHttpRequest.DONE) {
                var json = JSON.parse(xhr.responseText);
                console.log(json);
                let attack = json['attack'];
                if(json['ready'] && !json['started']){
                    playerReady.turn = true;
                    turn.html('Attack to start playing');
                }

                if (attack !== null && json['started']) {
                    battleship.started = true;
                    player.turn = true;
                    turn.html('Your turn');
                    let store = JSON.parse(localStorage.getItem(battleship.id));
                    if (attack[2] == 1) {
                        battleship.playerBoard[attack[0]][attack[1]] = -1;
                    } else {
                        battleship.playerBoard[attack[0]][attack[1]] = -2;
                    }
                    result = battleship.done();
                    if(battleship.finished){
                        setTimeout(() => {
                            board.style('display', 'none');
                            turn.style('font-size', '40px');
                            turn.html('You '+(result == 1 ? 'won!' : 'lost!'));
                            localStorage.removeItem(battleship.id);
                        }, 1000);
                    }
                    store['playerBoard'] = battleship.playerBoard;
                    store['turn'] = player.turn;
                    localStorage.setItem(battleship.id, JSON.stringify(store));
                }

            }
        }
        xhr.open('POST', '/requestAttack?game=' + battleship.id + '&player=' + player.id);
        xhr.send();
    }
}

function start() {
    turn.html('Waiting for other player to be ready');
    let data = {
        playerBoard: battleship.playerBoard,
        game: battleship.id
    }

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/start', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(data));

    postAttack();
    setInterval(postAttack, 2000);
}

var playerSketch = (can) => {
    let cellSize;

    can.setup = () => {
        playerCanvas = can.createCanvas(boardWidth, boardWidth);
        cellSize = (can.width - 2) / battleship.size;
    }

    can.draw = () => {
        can.clear();
        can.background(175);
        can.stroke(70);
        can.strokeWeight(2);


        for (let i = 0; i < battleship.playerBoard.length; i++) { //rows
            for (let j = 0; j < battleship.playerBoard[i].length; j++) { //columns
                can.noFill();
                // if(floor(can.mouseY/can.width*10) == i && floor(can.mouseX/can.height*10) == j)
                //     can.fill(255);
                if (battleship.playerBoard[i][j] > 0) {
                    can.fill(0, 0, 255);
                } else if (battleship.playerBoard[i][j] == -1) {
                    can.fill(255, 0, 0);
                } else if (battleship.playerBoard[i][j] == -2) {
                    can.fill(0, 0, 0);
                }
                can.rect(j * cellSize + 1, i * cellSize + 1, cellSize + 2 / battleship.size, cellSize + 2 / battleship.size);
            }
        }
    }


    can.mouseReleased = () => {
        if (battleship.ready)
            return;

        if (selectedPiece) {
            releasedPiece = selectedPiece; //really bad as selectedPiece is set to false by global mouseReleased

            if (Math.abs(releasedPiece.delta.x) < 0.5 && Math.abs(releasedPiece.delta.y) < 0.5) {
                releasedPiece.rotate();
            }


            let place = releasedPiece.getPiecePlace();
            place.x = Math.round(place.x / can.width * battleship.size);
            place.y = Math.round(place.y / can.width * battleship.size);

            if (releasedPiece.ready) {
                releasedPiece.boardCoords.map(c => battleship.playerBoard[c[1]][c[0]] = 0);
                releasedPiece.ready = false;
            }

            if (battleship.piecePlaceOK(place.x, place.y, releasedPiece)) {
                releasedPiece.fit(place, battleship.cellSize);

                let pieceCoordinates = releasedPiece.coords.map(([i, j]) => [i + place.x, j + place.y]);

                for (let p of pieceCoordinates) {
                    battleship.playerBoard[p[1]][p[0]] = releasedPiece.getLength();
                }
                releasedPiece.boardCoords = pieceCoordinates;
                releasedPiece.ready = true;

            }
        }

    }

}

var opponentSketch = (can) => {
    let cellSize;
    can.setup = () => {
        opponentCanvas = can.createCanvas(boardWidth, boardWidth);
        cellSize = (can.width - 2) / battleship.size;
    }

    can.draw = () => {
        can.clear();
        can.background(175);
        can.stroke(70);
        can.strokeWeight(2);
        can.noFill();

        for (let i = 0; i < battleship.opponentBoard.length; i++) { //rows
            for (let j = 0; j < battleship.opponentBoard[i].length; j++) { //columns
                can.noFill();
                if (floor(can.mouseY / can.width * battleship.size) == i && floor(can.mouseX / can.height * battleship.size) == j)
                    can.fill(255);
                if (battleship.opponentBoard[i][j] > 0) {
                    can.fill(255, 0, 0);
                } else if (battleship.opponentBoard[i][j] < 0) {
                    can.fill(0, 0, 0);
                }
                can.rect(j * cellSize + 1, i * cellSize + 1, cellSize + 2 / battleship.size, cellSize + 2 / battleship.size);
            }
        }
    }

    can.mouseReleased = () => {
        if (battleship.ready) {
            let attack = [floor(can.mouseY / can.width * battleship.size), floor(can.mouseX / can.height * battleship.size)];
            if (!battleship.attackOK(attack[0], attack[1], player.attack))
                return

            if (player.turn || !battleship.started) {
                let data = {
                    player: player.id,
                    attack: attack,
                    game: gameID
                }

                var xhr = new XMLHttpRequest();
                xhr.open('POST', '/attack', true);
                xhr.onreadystatechange = function () {
                    if (xhr.readyState == XMLHttpRequest.DONE) {
                        var json = JSON.parse(xhr.responseText);
                        let hit = json['hit']
                        let value = hit ? 1 : -1;
                        battleship.opponentBoard[attack[0]][attack[1]] = value;
                        battleship.started = true;
                        player.turn = false;
                        turn.html('Their turn');
                        player.addAttack(attack);

                        result = battleship.done();
                        if(battleship.finished){
                            setTimeout(() => {
                                board.style('display', 'none');
                                turn.style('font-size', '40px');
                                turn.html('You '+(result == 1 ? 'won!' : 'lost!'));
                                localStorage.removeItem(battleship.id);
                            }, 1000);
                        }
                        let store = JSON.parse(localStorage.getItem(battleship.id));
                        store['opponentBoard'] = battleship.opponentBoard;
                        store['turn'] = player.turn;
                        store['started'] = battleship.started;
                        localStorage.setItem(battleship.id, JSON.stringify(store));
                    }
                }
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.send(JSON.stringify(data));
            } else {
                turn.html('Not your turn');
            }
        }
    }

}


new p5(playerSketch, "player");
new p5(opponentSketch, "opponent");
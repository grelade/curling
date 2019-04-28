
const fs = require("fs") //need to read static files
const url = require("url") //to parse url strings
const path = require("path")
const express = require("express")
// var options = {
//   key: fs.readFileSync('ssl/client-key.pem'),
//   cert: fs.readFileSync('ssl/client-cert.crt')
// };

//const app = require('http').createServer(handler)
const app = express()

//const PORT = process.env.PORT || 3000
const PORT = process.env.PORT || 3000
server = app.listen(PORT, function() {
  console.log("Server Running at PORT: 3000  CNTL-C to quit")
  console.log("To Test:")
  console.log("Open several browsers at: http://localhost:3000")
}) //start server listening on PORT


app.use(express.static(path.join(__dirname, 'html')))
app.get('/', function(req, res) {
  //res.send('dsads')
  res.sendFile(__dirname + '/html/canvasWithTimer.html')
})

const io = require('socket.io')(server) //wrap server app in socket io capability

const MIME_TYPES = {
  css: "text/css",
  gif: "image/gif",
  htm: "text/html",
  html: "text/html",
  ico: "image/x-icon",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  js: "application/javascript",
  json: "application/json",
  png: "image/png",
  svg: "image/svg+xml",
  txt: "text/plain"
}


function get_mime(filename) {
  for (let ext in MIME_TYPES) {
    if (filename.indexOf(ext, filename.length - ext.length) !== -1) {
      return MIME_TYPES[ext]
    }
  }
  return MIME_TYPES["txt"]
}

/*
Server uses (u,v) coordinates in the computational phase
display coordinates (x,y) are in turn used by the client
*/

// inner and outer radii of stones in (u,v) coordinates
const stoneOuterR = 60;
const stoneInnerR = 30;
const stoneInitialV = 1500;

// field boundaries in (u,v) coordinates
let iceFieldPositionU = -500;
let iceFieldPositionV = -500;
let iceFieldHeight = 2200;
let iceFieldWidth = 1000;

// initial stone data in (u,v) coordinates
const initStones = [];
initStones.push({ id: 1, owner: "playerOne", u: -5*stoneOuterR-30, v: stoneInitialV,velU:0,velV:0})
initStones.push({ id: 2, owner: "playerOne", u: -3*stoneOuterR-20, v: stoneInitialV,velU:0,velV:0})
initStones.push({ id: 3, owner: "playerOne", u: -1*stoneOuterR-10, v: stoneInitialV,velU:0,velV:0})
initStones.push({ id: 4, owner: "playerTwo", u: 1*stoneOuterR+10, v: stoneInitialV,velU:0,velV:0})
initStones.push({ id: 5, owner: "playerTwo", u: 3*stoneOuterR+20, v: stoneInitialV,velU:0,velV:0})
initStones.push({ id: 6, owner: "playerTwo", u: 5*stoneOuterR+30, v: stoneInitialV,velU:0,velV:0})

let stones = [];

// field circles in (u,v) coordinates
const fieldCircles = [];
fieldCircles.push({ color: "yellow", u: 0, v: 0 , r: 60, lineWidth: 100})
fieldCircles.push({ color: "red", u: 0, v: 0 , r: 120, lineWidth: 100})
fieldCircles.push({ color: "white", u: 0, v: 0 , r: 200, lineWidth: 100})
fieldCircles.push({ color: "blue", u: 0, v: 0 , r: 300, lineWidth: 100})

// game phases
let switchPhase = {"playerOne":"playerTwo","playerTwo":"playerOne"};


// PLAYER RELATED FUNCTIONS

// extract list of players from the server database
function extractPlayers() {
  let rooms = io.sockets.adapter.rooms;
  let players = [];
  let dataElement;
  let keys = Object.keys(rooms);
  for (let i=0; i<keys.length; i++) {
    dataElement = rooms[keys[i]];
    if (dataElement.type == "player") players.push(dataElement);
  }
  return players;
}

// check whether player exists in the players list
function playerExists(playerName) {
  let players = extractPlayers();
  let mask = false;
  for (let i=0;i<players.length;i++) mask = mask || players[i].playerName == playerName;
  return mask;
}

//remove player from the game info when he disconnects or leaves in other way
function removePlayerFromGame(player,game) {
  if (io.sockets.adapter.rooms[game]) {
    if (io.sockets.adapter.rooms[game].playerOne == player) io.sockets.adapter.rooms[game].playerOne = "";
    if (io.sockets.adapter.rooms[game].playerTwo == player) io.sockets.adapter.rooms[game].playerTwo = "";
  }
}

// GAME RELATED FUNCTIONS

// extract list of games from the server database
function extractGames() {
  let rooms = io.sockets.adapter.rooms;
  let games = [];
  let dataElement;
  let keys = Object.keys(rooms);
  for (let i=0; i<keys.length; i++) {
    dataElement = rooms[keys[i]];
    dataElement.gameName = keys[i];
    if (dataElement.type == "game") games.push(dataElement);
  }
  return games;
}

// returns the index and full game record from games list
function gameExists(gameName) {
  let games = extractGames();
  for (let i=0;i<games.length;i++) if (games[i].gameName==gameName) return true;
  return false;
}

// returns whether the game is free to join as a player and which one is vacant
function isGameFree(gameName) {
  let games = extractGames();
  let gameFree = false;
  let freePlayer = "";
  for (let i=0;i<games.length;i++) if (games[i].gameName==gameName) {
    let gameRecord = games[i];
    //console.log(gameRecord);
    if (gameRecord.playerOne == "") {
      freePlayer = "playerOne";
      gameFree = true;
    } else if (gameRecord.playerTwo == "") {
      freePlayer = "playerTwo";
      gameFree = true;
    } else {
      gameFree = false;
    }
    return {isFree: gameFree, freePlayer: freePlayer};
  };
}

// function to update the position of all stones; takes care of collisions and friction
function updateStones(stones) {

  let deltaT = 0.01;
  let friction = 0.995;

  for (let i=0;i<stones.length;i++) {

    // collisions with boundaries of the ice rink
    // left boundary
    if (stones[i].u-stoneOuterR<iceFieldPositionU) stones[i].velU *= -1;
    // right boundary
    if (stones[i].u+stoneOuterR>iceFieldPositionU+iceFieldWidth) stones[i].velU *= -1;
    // top boundary
    if (stones[i].v-stoneOuterR<iceFieldPositionV) stones[i].velV *= -1;
    // bottom boundary
    if (stones[i].v+stoneOuterR>iceFieldPositionV+iceFieldHeight) stones[i].velV *= -1;

    for (let j=0;j<stones.length;j++) {
        // find collisions
        // formulas taken from https://en.wikipedia.org/wiki/Elastic_collision
        if (Math.sqrt(Math.pow(stones[i].u-stones[j].u,2) + Math.pow(stones[i].v-stones[j].v,2)) < 2*stoneOuterR && i!= j) {
          //console.log("collision");

          let x1U = stones[i].u;
          let x1V = stones[i].v;
          let v1U = stones[i].velU;
          let v1V = stones[i].velV;

          let x2U = stones[j].u;
          let x2V = stones[j].v;
          let v2U = stones[j].velU;
          let v2V = stones[j].velV;

          let projection = ((v1U-v2U)*(x1U-x2U) + (v1V-v2V)*(x1V-x2V))/((x1U-x2U)*(x1U-x2U) + (x1V-x2V)*(x1V-x2V));
          stones[i].velU = v1U - projection*(x1U-x2U);
          stones[i].velV = v1V - projection*(x1V-x2V);
          stones[j].velU = v2U + projection*(x1U-x2U);
          stones[j].velV = v2V + projection*(x1V-x2V);
        }
    }
    // update motion
    stones[i].u += deltaT*stones[i].velU;
    stones[i].v += deltaT*stones[i].velV;
    // decrease velocity by friction coefficient
    stones[i].velU *= friction;
    stones[i].velV *= friction;
    // introduce arbitrary cutoff when stones are almost still
    if (Math.abs(stones[i].velU) < 10) stones[i].velU = 0;
    if (Math.abs(stones[i].velV) < 10) stones[i].velV = 0;
  }
  return stones;
}

// SOCKETS.IO
io.on('connection', function(socket) {

  let currentPlayerName;
  let currentGameName;

  // CONNECTION & REGISTERING PLAYER
  socket.on('registerPlayer', function (dataJSON) {

    let data = JSON.parse(dataJSON);
    let response = {};

    if (playerExists(data.playerName)) {

      console.log('[SOCKET '+socket.id+']','player *' + data.playerName + '* not connected; player already exists');
      response.nameExists = true;

    } else {

      currentPlayerName = data.playerName;
      console.log('[SOCKET '+socket.id+']','player *' + currentPlayerName + '* connected');
      // update server player data
      io.sockets.adapter.rooms[socket.id].playerName = currentPlayerName;
      io.sockets.adapter.rooms[socket.id].type = "player";

      // send client data containing initial data
      response.nameExists = false;
      response.stones = initStones;
      response.fieldCircles = fieldCircles;
      response.stonesProperties = {
        stoneOuterR: stoneOuterR,
        stoneInnerR: stoneInnerR,
        stoneInitialV: stoneInitialV
      };
      response.fieldProperties = {
        iceFieldPositionU: iceFieldPositionU,
        iceFieldPositionV: iceFieldPositionV,
        iceFieldHeight: iceFieldHeight,
        iceFieldWidth: iceFieldWidth
      };

    }
    //console.log(response);
    socket.emit('registerPlayer',JSON.stringify(response));
    io.emit('playerList',JSON.stringify(extractPlayers())); //broadcast player list to everybody
    io.emit('gamesList',JSON.stringify(extractGames())); //broadcast games list to everybody
  });

  // CREATING NEW GAME
  socket.on('newGame', function(dataJSON) {

    let data = JSON.parse(dataJSON);
    let response = {};
    let newGameName = data.newGameName;

    if (gameExists(newGameName)) {

      console.log('[SOCKET '+socket.id+']','game *' + newGameName + '* not created; game already exists');
      //send client response
      response.gameExists = true;

    } else {
      // update server GAME data (leave previous game)
      removePlayerFromGame(currentPlayerName,currentGameName);
      socket.leave(currentGameName);
      // join new game
      currentGameName = newGameName;
      console.log('[SOCKET '+socket.id+']','game *' + currentGameName + '* created');
      socket.join(currentGameName);
      // update server GAME data
      io.sockets.adapter.rooms[currentGameName].type = "game";
      io.sockets.adapter.rooms[currentGameName].playerOne = currentPlayerName;
      io.sockets.adapter.rooms[currentGameName].playerTwo = "";
      io.sockets.adapter.rooms[currentGameName].gamePhase = "playerOne"; // become playerOne by default
      io.sockets.adapter.rooms[currentGameName].stones = initStones;
      // send client response
      response.gameExists = false;
      response.playerRole = "playerOne";
      response.gamePhase = "playerOne";
      response.stones = initStones;
    }

    socket.emit('newGame',JSON.stringify(response));
    io.emit('playerList',JSON.stringify(extractPlayers())); //broadcast player list to everybody
    io.emit('gamesList',JSON.stringify(extractGames())); //broadcast games list to everybody
  });

  // JOIN EXISTING GAME
  socket.on('joinGame', function(dataJSON) {

    let data = JSON.parse(dataJSON);
    let response = {};
    let newGameName = data.newGameName;

    if (gameExists(newGameName)) {

      let gameProperties = isGameFree(newGameName);

      if (gameProperties.isFree) {
        // update server GAME data (leave previous game)
        removePlayerFromGame(currentPlayerName,currentGameName);
        socket.leave(currentGameName);
        // join another game (existing)
        currentGameName = newGameName;
        console.log('[SOCKET '+socket.id+']','player *' + currentPlayerName + '* is joining game *' + currentGameName + '* as ' + gameProperties.freePlayer);
        socket.join(currentGameName);
        // update server GAME data
        io.sockets.adapter.rooms[currentGameName][gameProperties.freePlayer] = currentPlayerName;
        //send client response
        response.gameExists = true;
        response.gameFree = true;
        response.gameName = currentGameName;
        response.playerRole = gameProperties.freePlayer;
        response.gamePhase = io.sockets.adapter.rooms[currentGameName].gamePhase;

      } else {

        console.log('[SOCKET '+socket.id+']','player *'+currentPlayerName+'* is NOT joining game *' + newGameName + '*; game is already full');
        //send client response
        response.gameExists = true;
        response.gameFree = false;
        response.gameName = currentGameName;

      }

    } else {

      console.log('[SOCKET '+socket.id+']','player *'+currentPlayerName+'* is NOT joining game *' + newGameName + '*; game does not exist');
      //send client response
      response.gameExists = false;
      response.gameName = currentGameName;

    }

    socket.emit('joinGame',JSON.stringify(response));
    io.emit('playerList',JSON.stringify(extractPlayers())); //broadcast player list to everybody
    io.emit('gamesList',JSON.stringify(extractGames())); //broadcast games list to everybody
  });

  // SPECTATE EXISTING GAME
  socket.on('spectateGame', function(dataJSON) {

    let data = JSON.parse(dataJSON);
    let response = {};
    let newGameName = data.newGameName;

    if (gameExists(newGameName)) {
      // update server GAME data (leave previous game)
      removePlayerFromGame(currentPlayerName,currentGameName);
      socket.leave(currentGameName);
      // join another game (existing)
      currentGameName = newGameName;
      console.log('[SOCKET '+socket.id+']','player *' + currentPlayerName + '* is joining game *' + currentGameName + '* as a spectator');
      socket.join(currentGameName);
      // prepare client reponse
      response.gamePhase = io.sockets.adapter.rooms[currentGameName].gamePhase;
      response.stones = io.sockets.adapter.rooms[currentGameName].stones;
      response.gameExists = true;
      response.gameName = currentGameName;
      response.playerRole = "spectator";

    } else {

      console.log('[SOCKET '+socket.id+']','player *'+currentPlayerName+'* is NOT joining game *' + newGameName + '*; game does not exist');
      response.gameExists = false;
      response.gameName = currentGameName;

    }

    socket.emit('spectateGame',JSON.stringify(response));
    io.emit('playerList',JSON.stringify(extractPlayers())); //broadcast player list to everybody
    io.emit('gamesList',JSON.stringify(extractGames())); //broadcast games list to everybody
  });

  // BROADCASTING STONE POSITIONS
  socket.on('broadcastStones',function(dataJSON) {

    let data = JSON.parse(dataJSON);
    //console.log('[SOCKET '+socket.id+']',data);
    let isMoving = true;
    //let i=0;

    var broadcastInterval = setInterval( function() {

        // update server GAME data
        io.sockets.adapter.rooms[currentGameName].stones = updateStones(data);
        let stones = io.sockets.adapter.rooms[currentGameName].stones;
        isMoving = false;

        for (let i=0;i<stones.length;i++) if (stones[i].velU != 0 || stones[i].velV != 0) { isMoving = true; break;}

        //console.log('[SOCKET '+socket.id+']',stones);
        //console.log('[SOCKET '+socket.id+']',"broadcastStones",i);
        //i++;
        io.to(currentGameName).emit('broadcastStones',JSON.stringify(stones));

        if (!isMoving) {

          let newGamePhase = switchPhase[io.sockets.adapter.rooms[currentGameName].gamePhase];
          io.to(currentGameName).emit('changePhase',JSON.stringify(newGamePhase));
          io.sockets.adapter.rooms[currentGameName].gamePhase = newGamePhase;
          clearInterval(broadcastInterval);

        };
      },10);
  });

  // PLAYER DISCONNECT
  socket.on('disconnect', function() {

    removePlayerFromGame(currentPlayerName,currentGameName);
    socket.leave(currentGameName);
    console.log(extractGames());
    console.log('[SOCKET '+socket.id+']','player *' + currentPlayerName + '* disconnected');
    io.emit('playerList',JSON.stringify(extractPlayers())); //broadcast player list to everybody
    io.emit('gamesList',JSON.stringify(extractGames())); //broadcast games list to everybody

  });
})

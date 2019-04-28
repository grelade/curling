

//connect to server and retain the socket
//let socket = io('//' + window.document.location.host)
//console.log('//' + window.document.location.host)
//let socket = io('http://localhost:3000');


let timer //used to control the free moving word


let iceField = document.getElementById("field") // field canvas
let iceFieldZoom = document.getElementById("field_zoom") // zoomed field canvas

// (u,v) to (x,y) transform variables
let iceFieldScaleX = 0.25;
let iceFieldScaleY = 0.25;
let iceFieldCenterX = iceField.width*0.5;
let iceFieldCenterY = iceField.height*0.25;
let iceFieldZoomScaleX = 0.5;
let iceFieldZoomScaleY = 0.5;
let iceFieldZoomCenterX = iceFieldZoom.width*0.5;
let iceFieldZoomCenterY = iceFieldZoom.height*0.5;

// field
let iceFieldPositionU;
let iceFieldPositionV;
let iceFieldHeight;
let iceFieldWidth;

// field circles in (u,v) coordinates
var fieldCircles = []

// stones in (u,v) coordinates
var stones = [];

// stones data
let stoneOuterR;
let stoneInnerR;
let stoneInitialV;

// user data
let currentGameName = "";
let currentPlayerName = "";
let playerRole;

// game data
let gamePhase;
let movementOn = false;
let broadcastOn = false;
let movingStoneID = -1;

let switchPhase = {"playerOne":"playerTwo","playerTwo":"playerOne"};
const stoneColors = {playerOne:"green",playerTwo:"red"};

// transformation functions
function toX(u) {
  return u*iceFieldScaleX + iceFieldCenterX;
}
function toY(v) {
  return v*iceFieldScaleY + iceFieldCenterY;
}
function toU(x) {
  return (x - iceFieldCenterX)/iceFieldScaleX;
}
function toV(y) {
  return (y - iceFieldCenterY)/iceFieldScaleY;
}

// identify active stones in (u,v) coords
function getStoneIDAtLocation(aCanvasU, aCanvasV) {

  for (let i = 0; i < stones.length; i++) {
    //console.log(i);
    //console.log(stones[i].u+" "+stones[i].v);
    //console.log(aCanvasU,aCanvasV );
    if ((Math.pow(stones[i].u-aCanvasU,2) + Math.pow(stones[i].v-aCanvasV,2) < Math.pow(stoneOuterR,2)) && stones[i].owner == gamePhase && gamePhase == playerRole) return i;
  }
  return -1;
}

// player list to html parser
function playerListToHTML(list) {
  let htmlString = "";
  for (let i=0;i<list.length;i++) htmlString += list[i].playerName + "<br>";
  return htmlString;
}

// games list to html parser
function gamesListToHTML(list) {
  let htmlString = "<table><tr id=\"titletr\"><td>Game</td><td>playerOne</td><td>playerTwo</td></tr>";
  for (let i=0;i<list.length;i++) htmlString += "<tr><td>" + list[i].gameName + "</td><td>" + list[i].playerOne +"</td><td>" + list[i].playerTwo + "</td></tr>";
  htmlString += "</table>";
  return htmlString;
}

//
function updateFields(responseField) {
  document.getElementById("responseField").innerHTML = responseField;
  document.getElementById("currentGame").innerHTML = currentGameName;

  $("#currentRoleDIV").attr('class', "bg bgPadding1 "+playerRole);
  document.getElementById("currentRole").innerHTML = playerRole;

  $("#gamePhaseDIV").attr('class', "bg bgPadding1 "+gamePhase);
  document.getElementById("gamePhase").innerHTML = gamePhase;
}

//
function drawField(canvas,centerX,centerY,scaleX,scaleY) {

  let context = canvas.getContext("2d");

  context.setTransform(scaleX,0,0,scaleY,centerX,centerY);  // transform coordinates
  context.fillStyle = "white";
  context.fillRect(-1000,-1000, 4000, 6000); //erase canvas
  context.fill();

  // draw the field
  context.beginPath();
  context.strokeStyle = "gray";
  context.lineWidth = 10;
  context.rect(iceFieldPositionU,iceFieldPositionV, iceFieldWidth, iceFieldHeight); //erase canvas
  context.stroke();


  // draw circles
  for (let i = 0; i < fieldCircles.length; i++) {
    context.beginPath();
    context.lineWidth = fieldCircles[i].lineWidth;
    context.strokeStyle = fieldCircles[i].color;
    context.arc(fieldCircles[i].u, fieldCircles[i].v, fieldCircles[i].r, 2*Math.PI,false);
    context.stroke();
  }

  // draw stones
  for (let i = 0; i < stones.length; i++) {
    context.beginPath();
    context.fillStyle = "gray";
    context.arc(stones[i].u,stones[i].v,stoneOuterR,2*Math.PI,false);
    context.fill();
    context.beginPath();
    context.fillStyle = stoneColors[stones[i].owner];
    context.arc(stones[i].u,stones[i].v,stoneInnerR,2*Math.PI,false);
    context.fill();
    // make some stones inactive
    if (stones[i].owner != gamePhase) {
      context.beginPath();
      context.fillStyle = "#ffffff77";
      context.arc(stones[i].u,stones[i].v,stoneOuterR,2*Math.PI,false);
      context.fill();
    }
  }
}

function drawCanvas() {
  drawField(iceField,iceFieldCenterX,iceFieldCenterY,iceFieldScaleX,iceFieldScaleY);
  drawField(iceFieldZoom,iceFieldZoomCenterX,iceFieldZoomCenterY,iceFieldZoomScaleX,iceFieldZoomScaleY);
}

function handleNewGameButton() {

  console.log('[SOCKET '+socket.id+']',"handleNewGameButton()");

  let newGameName = $('#gameNameField').val();
  socket.emit('newGame',JSON.stringify({newGameName: newGameName}));
  socket.on('newGame', function(dataJSON) {
      let data = JSON.parse(dataJSON);

      if (data.gameExists) {

        document.getElementById("responseField").innerHTML = "Could not create game " + newGameName + "; game already exists";

      } else {

        currentGameName = newGameName;
        playerRole = data.playerRole;
        gamePhase = data.gamePhase;
        stones = data.stones;
        //console.log(playerRole);
        updateFields("Created game " + currentGameName);

      }
    });
}

function handleJoinGameButton() {

  console.log('[SOCKET '+socket.id+']',"handleJoinGameButton()");
  let newGameName = $('#gameNameField').val();
  socket.emit('joinGame',JSON.stringify({newGameName: newGameName}));

  socket.on('joinGame', function(dataJSON) {
    let data = JSON.parse(dataJSON);

    if (data.gameExists) {

      if (data.gameFree) {

        currentGameName = data.gameName;
        playerRole = data.playerRole;
        gamePhase = data.gamePhase;
        updateFields("Joined succesfully to game: " + currentGameName);

      } else document.getElementById("responseField").innerHTML = "Could not join to game: " + newGameName + " ; game is full";

    } else document.getElementById("responseField").innerHTML = "Could not join to game: " + newGameName + " ; game does not exist";
  });
}

//
function handleSpectateGameButton() {

  console.log('[SOCKET '+socket.id+']',"handleSpectateGameButton()");

  let newGameName = $('#gameNameField').val();

  socket.emit('spectateGame',JSON.stringify({newGameName: newGameName}));
  socket.on('spectateGame', function(dataJSON) {
    let data = JSON.parse(dataJSON);

    if (data.gameExists) {

        currentGameName = data.gameName;
        playerRole = data.playerRole;
        gamePhase = data.gamePhase;
        updateFields("Joined succesfully to game: " + currentGameName);

    } else document.getElementById("responseField").innerHTML = "Could not join to game: " + newGameName + " ; game does not exist";
  });
}

//
function handleMouseDown(e) {
  //get mouse location relative to canvas top left
  let rect = iceField.getBoundingClientRect()
  let canvasX = e.pageX - rect.left; //use  event object pageX and pageY
  let canvasY = e.pageY - rect.top;
  let canvasU = toU(canvasX);
  let canvasV = toV(canvasY);

  //console.log("mouse down (u,v):" + canvasU + ", " + canvasV)
  //console.log("mouse down (x,y):" + canvasX + ", " + canvasY)

  if (!movementOn && gamePhase == playerRole) {
    movingStoneID = getStoneIDAtLocation(canvasU, canvasV);
    tempU = canvasU;
    tempV = canvasV;
  }
  // Stop propagation of the event and stop any default
  //  browser action
  e.stopPropagation()
  e.preventDefault()
}

//
function handleMouseUp(e) {
  //get mouse location relative to canvas top left
  let rect = iceField.getBoundingClientRect()
  let canvasX = e.pageX - rect.left //use  event object pageX and pageY
  let canvasY = e.pageY - rect.top
  let canvasU = toU(canvasX);
  let canvasV = toV(canvasY);

  //console.log("mouse up (u,v): " + canvasU + ", " + canvasV)
    if (movingStoneID!=-1 && gamePhase == playerRole && !movementOn) {
      stones[movingStoneID].velU = canvasU - tempU ;
      stones[movingStoneID].velV = canvasV - tempV ;
      broadcastOn = true;
      movementOn = true;
      console.log("broadcast: start");
    }

  // Stop propagation of the event and stop any default
  //  browser action
  e.stopPropagation()
  e.preventDefault()
}

//
function handleTimer() {
  if (broadcastOn) {
    socket.emit('broadcastStones',JSON.stringify(stones));
    console.log("broadcastStones to server");
    broadcastOn = false;
  }
  drawCanvas()
}


socket.on('broadcastStones',function(dataJSON) {
  let data = JSON.parse(dataJSON);
  console.log(data);
  stones = data;
});

socket.on('changePhase', function(dataJSON) {
  let data = JSON.parse(dataJSON);
  //console.log('call changePhase to '+data);
  gamePhase = data;
  movementOn = false;
  $("#gamePhaseDIV").attr('class', "bg bgPadding1 "+gamePhase);
  document.getElementById("gamePhase").innerHTML = gamePhase;

});



$(document).ready(function() {

  //add mouse down listener to our canvas object
  $("#field").mousedown(handleMouseDown)
  $("#field").mouseup(handleMouseUp)

  // SPECIFY PLAYER NAME
  let promptPlayerName = prompt("State your name:");
  socket.emit('registerPlayer',JSON.stringify({playerName: promptPlayerName}));
  socket.on('registerPlayer', function(dataJSON) {
    let data = JSON.parse(dataJSON);
    if (data.nameExists) {
      promptPlayerName = prompt("User exists! State another name:");
      socket.emit('registerPlayer',JSON.stringify({playerName: promptPlayerName}));
    } else {
      currentPlayerName = promptPlayerName;
      document.getElementById("currentPlayer").innerHTML = currentPlayerName;
      stones = data.stones;
      fieldCircles = data.fieldCircles;
      stoneOuterR = data.stonesProperties.stoneOuterR;
      stoneInnerR = data.stonesProperties.stoneInnerR;
      stoneInitialV = data.stonesProperties.stoneInitialV;
      iceFieldPositionU = data.fieldProperties.iceFieldPositionU;
      iceFieldPositionV = data.fieldProperties.iceFieldPositionV;
      iceFieldHeight = data.fieldProperties.iceFieldHeight;
      iceFieldWidth = data.fieldProperties.iceFieldWidth;
    }
  });

  // PICK PLAYER LIST
  socket.on('playerList', function(listJSON) {
    let list = JSON.parse(listJSON);
    document.getElementById("playerList").innerHTML = playerListToHTML(list);
  });

  // PICK GAMES LIST
  socket.on('gamesList', function(listJSON) {
    let list = JSON.parse(listJSON);
    document.getElementById("gamesList").innerHTML = gamesListToHTML(list);
  });


  timer = setInterval(handleTimer, 10) //tenth of second

  drawCanvas()
})

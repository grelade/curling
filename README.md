curling v0.1

1. Introduction

Game of curling. Code contains in-game mechanics and online play capability. To see the game at work visit:
https://coorling.herokuapp.com/

Runs on node.js with socket.io and express.

2. Installation

First run:
npm install

And then the server: 
node server.js

The local client is now:
http://localhost:3000

3. Playing the game
1) first name the game through the input
2) second create it with CREATE button.

The second player can join through JOIN.
Spectators can likewise join through SPECTATE.

Lists of games and players are shown on the right hand side. Some rudimentary server messages are also shown on the right.
Current game phase and players' color are suggested by the backgrounds.

curling v0.1

## Introduction

Game of curling. Code contains in-game mechanics and online play capability. To see the game at work visit:
https://coorling.herokuapp.com/

Runs on node.js with socket.io and express.

## Installation

First install all the modules and then simply run the server:
```
npm install
node server.js
```
The client is found locally under:
http://localhost:3000

## Gameplay

To play a game:
* name the game through the input
* second create it with CREATE button.

The second player can join through JOIN.
Spectators can likewise join through SPECTATE.

Lists of games and players are shown on the right hand side. Some rudimentary server messages are also shown on the right.
Current game phase and players' color are suggested by the backgrounds.

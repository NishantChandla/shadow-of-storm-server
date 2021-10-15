const express = require("express");
const http = require("http");
const PORT = process.env.PORT || 3001;
const socketio = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = socketio(server, {
	cors: { origin: "*" },
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

let availablePlayers = [];
let rooms = [];

io.on("connection", (socket) => {
	console.log("inital-connection");

	const now = rooms.length;

	socket.on("find-match", (player) => {
		if (availablePlayers.length < 1) {
			availablePlayers.push({
				player: player,
				socket: socket,
				accepted: false,
				ready: false,
			});
			return;
		}
		console.log(availablePlayers);
		console.log(rooms);

		rooms.push({
			p1: availablePlayers[availablePlayers.length - 1],
			p2: { player: player, socket, ready: false, accepted: false },
			accepted: false,
			started: false,
      p1Turn:true,
		});

		availablePlayers.pop();

    if(rooms[now]===undefined) return;

		rooms[now].p1.socket.emit("match-connected", rooms[now].p2.player);
		rooms[now].p2.socket.emit("match-connected", rooms[now].p1.player);

    rooms[now].p1.socket.on("match-making-cancel", (e) => {
      if(rooms[now]===undefined){
        return;
      }
      rooms[now].p1.socket.emit(
				"battle-ended",
			);
      rooms[now].p2.socket.emit(
				"battle-ended",
			);
			console.log("player 1 disconnect");
      rooms[now].p2.socket.removeAllListeners();
      rooms[now].p2.socket.disconnect();
      rooms[now].p1.socket.disconnect();

			rooms = rooms.filter(
				(obj, idx) => idx != now
			);
		});

		rooms[now].p2.socket.on("match-making-cancel", (e) => {
      if(rooms[now]===undefined){
        return;
      }
      rooms[now].p1.socket.emit(
				"battle-ended",
			);
      rooms[now].p2.socket.emit(
				"battle-ended",
			);
			console.log("player2 disconnect");
      rooms[now].p2.socket.removeAllListeners();

      rooms[now].p2.socket.disconnect();
      rooms[now].p1.socket.disconnect();
      
			rooms = rooms.filter(
				(obj, idx) => idx != now
			);
		});

    rooms[now].p1.socket.on("accept-battle", (e) => {
      if(rooms[now]===undefined){
        return;
      }
			rooms[now].p1.accepted = true;
			if (rooms[now].p2.accepted) {
        rooms[now].accepted = true;
				rooms[now].p1.socket.emit(
					"build-decks",
					"player2 - builddecks"
				);
				rooms[now].p2.socket.emit(
					"build-decks",
					"player1 - builddecks"
				);
				return;
			}
			rooms[now].p2.socket.emit(
				"accepted-battle",
				"player 1 has accepted the battle"
			);
		});

		rooms[now].p2.socket.on("accept-battle", (e) => {
      if(rooms[now]===undefined){
        return;
      }
			rooms[now].p2.accepted = true;
			if (rooms[now].p1.accepted) {
				rooms[now].accepted = true;
				rooms[now].p1.socket.emit(
					"build-decks",
					"player2 - builddeck"
				);
				rooms[now].p2.socket.emit(
					"build-decks",
					"player1 - buildecks"
				);
				return;
			}
			rooms[now].p1.socket.emit(
				"accepted-battle",
				"player 2 has accepted the battle"
			);
		});

    rooms[now].p1.socket.on("reject-battle",(m)=>{
      if(rooms[now]===undefined){
        return;
      }
      rooms[now].p2.socket.emit(
				"surrendered",
        "player has surrendered"
			);
      rooms[now].p1.socket.emit(
				"battle-ended",
			);
      rooms[now].p2.socket.emit(
				"battle-ended",
			);
      rooms[now].p2.socket.removeAllListeners();

      rooms[now].p2.socket.disconnect();
      rooms[now].p1.socket.disconnect();

      rooms = rooms.filter((obj, idx)=> idx!=now);
    });

    rooms[now].p2.socket.on("reject-battle",(m)=>{
      if(rooms[now]===undefined){
        return;
      }
      rooms[now].p1.socket.emit(
				"surrendered",
				"player has surrendered"
			);
      rooms[now].p1.socket.emit(
				"battle-ended",
			);
      rooms[now].p2.socket.emit(
				"battle-ended",
			);
      rooms[now].p2.socket.removeAllListeners();

      rooms[now].p2.socket.disconnect();
      rooms[now].p1.socket.disconnect();

      rooms = rooms.filter((obj, idx)=> idx!=now);
    });

    setTimeout(()=>{
      if(rooms[now]===undefined){
        return;
      }
      if(!rooms[now].started){

        if(rooms[now].p1.ready && !rooms[now].p2.ready){
          //make p1 win
        }else if(rooms[now].p2.ready && !rooms[now].p1.ready){
          //make p2 win
        }
        rooms[now].p1.socket.emit(
          "battle-ended",
        );
        rooms[now].p2.socket.emit(
          "battle-ended",
        );
        rooms[now].p2.socket.removeAllListeners();
        rooms[now].p2.socket.disconnect();
        rooms[now].p1.socket.disconnect();

        rooms = rooms.filter((obj, idx)=> idx!=now);
      }
    },300000);

		rooms[now].p1.socket.on("ready-battle", (deck) => {
      if(rooms[now]===undefined){
        return;
      }
      if(!rooms[now].p1.accepted || !rooms[now].p2.accepted){
        return;
      }
      // check if valid deck
      rooms[now].p1.deck = deck;
			console.log("player1 -ready");
			rooms[now].p1.ready = true;
			if (rooms[now].p2.ready) {
				rooms[now].started = true;
				rooms[now].p1.socket.emit(
					"battle-started",
          { 
            name: rooms[now].p2.player,
					  turn:rooms[now].p1Turn
          }
				);
				rooms[now].p2.socket.emit(
					"battle-started",
          { 
            name: rooms[now].p1.player,
					  turn:!rooms[now].p1Turn
          }
				);
				return;
			}
			rooms[now].p2.socket.emit(
				"ready-battle",
				"player 1 is ready"
			);
		});

		rooms[now].p2.socket.on("ready-battle", (deck) => {
      if(rooms[now]===undefined){
        return;
      }
      if(!rooms[now].p1.accepted || !rooms[now].p2.accepted){
        return;
      }
      // check if valid deck
      rooms[now].p2.deck = deck;
			console.log("player2 -ready");
			rooms[now].p2.ready = true;
			if (rooms[now].p1.ready) {
				rooms[now].started = true;
				rooms[now].p1.socket.emit(
					"battle-started",
          { 
            name: rooms[now].p2.player,
					  turn:rooms[now].p1Turn
          }
				);
				rooms[now].p2.socket.emit(
					"battle-started",
          { 
            name: rooms[now].p1.player,
					  turn:!rooms[now].p1Turn
          }
				);
				return;
			}
			rooms[now].p1.socket.emit(
				"ready-battle",
				"player 2 is ready"
			);
		});
    rooms[now].p1.socket.on("attack", (m)=>{
      if(!rooms[now].p1Turn){
        return;
      }

      if(rooms[now].p2.deck[m.idx].here){
        rooms[now].p2.deck[m.idx].here = false;
        rooms[now].p1.socket.emit(
          "hit",
          m
        );
        rooms[now].p2.socket.emit(
          "enemy-hit",
          m
        );
      }else{
        rooms[now].p1.socket.emit(
          "miss",
          m
        );
        rooms[now].p2.socket.emit(
          "enemy-miss",
          m
        );
      }

      let check = false;
      rooms[now].p2.deck.forEach((obj)=>{
        if(obj.here){
          check = true;
        }
      })
      if(!check){
        rooms[now].p1.socket.emit(
          "winner",
          true
        );
        rooms[now].p2.socket.emit(
          "winner",
          false
        );
      }

      rooms[now].p1Turn = false;

      rooms[now].p1.socket.emit(
        "turn",
        rooms[now].p1Turn
      );
      rooms[now].p2.socket.emit(
        "turn",
        !rooms[now].p1Turn
      );
    });

    rooms[now].p2.socket.on("attack",(m)=>{
      if(rooms[now].p1Turn){
        return;
      }

      if(rooms[now].p1.deck[m.idx].here){
        rooms[now].p1.deck[m.idx].here = false;
        rooms[now].p1.socket.emit(
          "enemy-hit",
          m
        );
        rooms[now].p2.socket.emit(
          "hit",
          m
        );
      }else{
        rooms[now].p1.socket.emit(
          "enemy-miss",
          m
        );
        rooms[now].p2.socket.emit(
          "miss",
          m
        );
      }
      let check = false;
      rooms[now].p1.deck.forEach((obj)=>{
        if(obj.here){
          check = true;
        }
      })
      if(!check){
        rooms[now].p1.socket.emit(
          "winner",
          false
        );
        rooms[now].p2.socket.emit(
          "winner",
          true
        );
      }
      rooms[now].p1Turn = true;
      
      rooms[now].p1.socket.emit(
        "turn",
        rooms[now].p1Turn
      );
      rooms[now].p2.socket.emit(
        "turn",
        !rooms[now].p1Turn
      );
    })


	});

});

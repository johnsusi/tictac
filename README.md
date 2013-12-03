Tic-Tac
===============================================================================

Available games
-------------------------------------------------------------------------------

http://tictac.susi.se/reversi/

REST API
-------------------------------------------------------------------------------

/games/

    - POST Create a new game

/games/:gameid/players/

	- POST Join game

/games/:gameid/states/

	- POST Do turn
		Post 

/games/:gameid/states/:stateid

	- GET state :stateid from game :gameid
		Note: if the state does not exist this method will block until 
		either the state is available or a timeout occurs.

/lobby/

	- POST Add a challenge
		Note: This will not return until the challenge is answered or 
		a timeout occurs.

/lobby/find

	- GET Find game to join. 
		Query is used to match a game. 

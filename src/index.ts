import express, { Request, Response } from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { Room } from './utils/props/all-props'

import { generateRoomId, getPoints, getRandomBrainrotName, getRandomDrawableWord } from './utils/helper-functions'
import { COUNTDOUN_UNIT, DEFAULT_LANGUAGE, DEFAULT_ROUND_TIME, DEFAULT_ROUNDS, DEFAULT_WORD_SELECTION_TIME } from './utils/const-values'

const app = express()

app.use(cors())
app.use(express.json())

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'https://scribbbly-server-ts.up.railway.app'
    ],
    methods: ['GET', 'POST'],
  },
})

const rooms: Record<string, Room> = {}

app.post('/room', (req: Request, res: Response) => {

  const roomId = generateRoomId()

  rooms[roomId] = {
    id: roomId,
    currentRound: 1,
    gameStarted: false,
    gameEnded: false,
    currentPhase: 'waiting',
    // currentRoundPoints : {},

    players: [],
    turnOrder: [],
    drawingData: [],
    correctGuessedPlayerIds: [],

    maxRounds: DEFAULT_ROUNDS,
    timeLeft: DEFAULT_ROUND_TIME,
    drawTime: DEFAULT_ROUND_TIME,
    selectedLanguage: DEFAULT_LANGUAGE,
    wordSelectionTime: DEFAULT_WORD_SELECTION_TIME,
    pointsBoardTime: 2
  }

  res.json({ roomId })

})

app.get('/room/:roomId', (req: Request<{ roomId: string }>, res: Response) => {

  const { roomId } = req.params

  const roomExists = rooms[roomId]

  if (!roomExists) {
    return res.status(404).json({
      success: false,
      message: 'Room not found',
    })
  }

  return res.json({
    success: true,
  })
})

function getUniqueBrainrotName(room: Room) {

  let randomName = getRandomBrainrotName()

  const existingNames = room.players.map(player => player.name)

  while (existingNames.includes(randomName)) {
    randomName = getRandomBrainrotName()
  }

  return randomName
}

const reverseSettingKeyMap = {
  selectedLanguage: 'LANGUAGE',
  maxRounds: 'MAX ROUNDS',
  maxPlayersCount: 'MAX PLAYERS',
  drawTime: 'DRAW TIME'
} as const

io.on('connection', (socket) => {
  console.log('User connected', socket.id)

  socket.on('join-room', (data) => {
    console.log('JOIN-ROOM received, socket.id:', socket.id, 'roomId:', data.roomId)
    const room = rooms[data.roomId]

    if (!room) return

    const playerAlreadyExists = rooms[data.roomId].players.find(player => player.id === socket.id)

    if (playerAlreadyExists) return

    socket.join(data.roomId)
    console.log('SOCKETS IN ROOM:', io.sockets.adapter.rooms.get(data.roomId))

    const isHost = room.players.length === 0

    if (isHost) {
      room.selectedLanguage = data.selectedLanguage
    }

    room.players.push({
      id: socket.id,
      name: data.name || getUniqueBrainrotName(room),
      avatarColor: data.avatarColor,
      isHost: isHost
    })

    room.turnOrder.push(socket.id)

    if (!room.messages) {
      room.messages = []
    }

    if (room.players.length > 0) {
      room.messages.push({
        text: `${room.players[room.players.length - 1].name} JOINED!`,
        type: 'system'
      })
    }

    io.to(data.roomId).emit('room-updated', room)

    io.to(data.roomId).emit('load-drawing', room.drawingData ?? [])
  })

  socket.on('settings-change', ({ roomId, roomProp, value }: {
    roomId: string
    roomProp: keyof Room
    value: string | number
  }) => {
    console.log('from settings', roomId, roomProp, value);

    const room = rooms[roomId]

    if (!room) return;

    (room as any)[roomProp] = value

    if (roomProp === 'drawTime') {
      (room as any)['timeLeft'] = value
    }

    room.messages?.push({
      text: `${(reverseSettingKeyMap as any)[roomProp]}  SET TO ${value}`,
      type: 'system',
    })

    io.to(roomId).emit('room-updated', room)
  })

  socket.on('invite-copied', ({ roomId }) => {
    const room = rooms[roomId]

    room.messages?.push({
      type: 'system',
      text: 'INVITE COPIED TO CLIPBOARD'
    })

    io.to(roomId).emit('room-updated', room)
  })

  socket.on('word-selected', ({ roomId, selectedWord }) => {
    const room = rooms[roomId]

    room.currentWord = selectedWord

    room.currentPhase = 'drawing'

    io.to(room.id).emit('room-updated', room)
  })

  socket.on('round-start', ({ roomId }) => {
    console.log('called for round 2');

    const room = rooms[roomId]

    if (!room) return

    if (!room.gameStarted) {
      const roomHasTwoPlayers = room.players.length > 1

      if (!roomHasTwoPlayers) {
        room.messages?.push({
          type: 'system',
          text: 'NEED 2+ PLAYERS TO START'
        })
        io.to(room.id).emit('room-updated', room)
        return
      }
      room.gameStarted = true
      room.currentDrawerId = room.turnOrder[0]
    }

    room.wordsCollection = ['dog', 'cat', 'mouse']

    room.currentPhase = 'selection'

    io.to(roomId).emit('room-updated', room)

    wordSelectionCountDown(room)
  })

  function wordSelectionCountDown(room: Room) {
    const wordSelectionInterval = setInterval(() => {

      room.wordSelectionTime = (room.wordSelectionTime ?? 0) - 1

      console.log('SERVER TICK - roomId:', room.id, 'time:', room.wordSelectionTime)


      if (room.wordSelectionTime <= 0) {
        if (!room.currentWord) {
          room.currentWord = (room.wordsCollection ?? [])[Math.floor(Math.random() * (room.wordsCollection ?? []).length)]
        }
        room.wordsCollection = []
        io.to(room.id).emit('room-updated', room)
        clearInterval(wordSelectionInterval)
        room.currentPhase = 'drawing'
        // new joint here 
        drawingCountDown(room)
      }

      io.to(room.id).emit('room-updated', room)   // here 
      console.log('SOCKETS IN ROOM DURING TICK:', io.sockets.adapter.rooms.get(room.id))
    }, COUNTDOUN_UNIT);
  }

  function drawingCountDown(room: Room) {
    const drawingInterval = setInterval(() => {

      room.timeLeft = (room.timeLeft ?? 0) - 1

      if (room.timeLeft <= 0) {
        room.currentPhase = 'results'
        showPointsBoard(room)
        clearInterval(drawingInterval)
      }

      io.to(room.id).emit('room-updated', room)

    }, COUNTDOUN_UNIT);
  }

  function showPointsBoard(room: Room) {
    const pointsBoardInterval = setInterval(() => {

      room.pointsBoardTime = (room.pointsBoardTime ?? 0) - 1

      if (room.pointsBoardTime <= 0) {

        const isLastTurn = room.currentDrawerId === room.turnOrder[room.turnOrder.length - 1]
        const isLastRound = (room.currentRound ?? 0) >= room.maxRounds

        // ✅ Game over condition — runs AFTER the last turn of the last round
        if (isLastRound && isLastTurn) {
          clearInterval(pointsBoardInterval)           // ← was missing
          room.currentPhase = 'gameEnded'             // ← was commented out
          io.to(room.id).emit('room-updated', room)   // ← was commented out
          return
        }


        clearInterval(pointsBoardInterval)

        room.pointsBoardTime = 5
        room.wordSelectionTime = DEFAULT_WORD_SELECTION_TIME
        room.timeLeft = DEFAULT_ROUND_TIME
        room.currentWord = undefined
        room.drawingData = []
        room.correctGuessedPlayerIds = []

        // change turn here 
        const currentIndex = room.turnOrder.findIndex(id => id === room.currentDrawerId)
        const nextIndex = (currentIndex + 1) % room.turnOrder.length

        if (nextIndex === 0) {
          room.currentRound = (room.currentRound ?? 0) + 1
        }

        room.currentDrawerId = room.turnOrder[nextIndex]
        room.wordsCollection = ['dog', 'cat', 'mouse']
        room.currentPhase = 'selection'
        io.to(room.id).emit('room-updated', room)

        wordSelectionCountDown(room)
        return
      }
      io.to(room.id).emit('room-updated', room)
    }, COUNTDOUN_UNIT);
  }

  function startTurnTimer(roomId: string) {
    const interval = setInterval(() => {
      const room = rooms[roomId];

      room.timeLeft = (room.timeLeft ?? 0) - 1

      // this will keep counting down for the time left to negative 
      io.to(roomId).emit('room-updated', room)

      if (room.timeLeft <= 0) {
        nextPlayer(roomId)
      }

      // if (room.timeLeft <= 0) {
      //   nextTurn(roomId)
      //   io.to(roomId).emit('room-updated', room)
      // }

      // if (!room.gameStarted && room.gameEnded) {
      //   clearInterval(interval)
      // }
    }, 1000);
  }

  function nextPlayer(roomId: string) {
    const room = rooms[roomId]

    const currentPlayerIndex = room.turnOrder.findIndex(playerId => playerId === room.currentDrawerId)

    const nextPlayerIndex = (currentPlayerIndex + 1) % room.turnOrder.length

    const roundCompleted = nextPlayerIndex === 0

    if (roundCompleted) {
      const rankings = [...room.players]
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .map((player, index) => ({
          rank: index + 1,
          name: player.name,
          score: player.score ?? 0
        }))

      io.to(roomId).emit('round-completed', {
        rankings,
        round: room.currentRound
      })
    } else {
      room.currentDrawerId = room.turnOrder[nextPlayerIndex];
    }

  }

  function nextTurn(roomId: string) {
    const room = rooms[roomId]

    const currentIndex = room.turnOrder.findIndex(id => id === room.currentDrawerId)

    const nextIndex = (currentIndex + 1) % room.turnOrder.length

    const circleCompleted = nextIndex === 0

    room.drawingData = []
    room.correctGuessedPlayerIds = []

    if (circleCompleted) {
      room.currentRound = (room.currentRound ?? 0) + 1
      room.messages?.push({
        text: `ROUND ${room.currentRound} STARTED!`,
        type: 'system'
      })
    }

    if ((room.currentRound ?? 0) > room.maxRounds) {
      room.gameStarted = false
      room.gameEnded = true
      return
    }

    room.currentWord = getRandomDrawableWord()

    room.currentDrawerId = room.turnOrder[nextIndex]

    // ! this might cause problems 
    room.timeLeft = room.drawTime

    io.to(roomId).emit('room-updated', room)
    io.to(roomId).emit('load-drawing', [])
  }

  socket.on('correct-guess', ({ roomId, playerId }) => {
    const room = rooms[roomId];

    const playerName = room.players.find(player => player.id === playerId)?.name

    // 1. Push message first
    room.messages?.push({
      type: 'correct',
      text: `${playerName} CRACKED IT!`,
      player: playerName,
    })

    // 2. Push to correct guessers
    room.correctGuessedPlayerIds?.push(playerId);

    if (room.correctGuessedPlayerIds) {

      // 3. Give drawing player +5 when the FIRST person guesses correctly
      if (room.correctGuessedPlayerIds.length === 1) {
        const drawingPlayer = room.players.find(player => player.id === room.currentDrawerId);
        if (drawingPlayer) {
          drawingPlayer.score = (drawingPlayer.score ?? 0) + 5
        }
      }

      // rank is 0-indexed: first guesser = 0, second = 1, etc.
      const rank = room.correctGuessedPlayerIds.length - 1

      const player = room.players.find(p => p.id === playerId)

      if (player) {
        if (rank === 0) {
          player.score = (player.score ?? 0) + 10
        } else if (rank === 1) {
          player.score = (player.score ?? 0) + 7
        } else if (rank === 2) {
          player.score = (player.score ?? 0) + 5
        } else {
          player.score = (player.score ?? 0) + 0  // no points after 3rd
        }
      }

      console.log(room.correctGuessedPlayerIds.length, room.turnOrder.length);

      if (room.correctGuessedPlayerIds.length === room.turnOrder.length - 1) {
        room.currentPhase = 'results'
      }
    }

    io.to(roomId).emit('room-updated', room)
  })

  socket.on('wrong-guess', ({ text, roomId, playerId }) => {
    const room = rooms[roomId];

    const playerName = room.players.find(player => player.id === playerId)?.name

    room.messages?.push({
      player: playerName,
      type: '',
      text,
    })

    io.to(roomId).emit('room-updated', room)
  })

  socket.on('draw-line', (data) => {

    const room = rooms[data.roomId]

    if (!room) return

    if (!room.drawingData) {
      room.drawingData = []
    }

    room.drawingData.push({
      x1: data.x1,
      y1: data.y1,
      x2: data.x2,
      y2: data.y2,
      color: data.color,
      size: data.size
    })

    socket.to(data.roomId).emit('draw-line', data)
    socket.to(data.roomId).emit('load-drawing', room.drawingData ?? [])

  })

  socket.on('disconnect', () => {
    console.log('socket disconnected');
  })

})

server.listen(3001, () => {
  console.log('Server running on port 3001')
})
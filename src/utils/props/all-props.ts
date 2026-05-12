export type LanguageType = 'ENGLISH' | 'FRENCH' | 'GERMAN' | 'SPANISH'

export type Player = {
    id: string
    name: string
    avatarColor: string
    isHost: boolean

    score?: number
    guessedCorrectly?: boolean
    isDrawer?: boolean
}

type gamePhase = 'waiting' | 'selection' | 'drawing' | 'results' | 'gameEnded'

export type Room = {

    id: string

    players: Player[]

    gameStarted: boolean

    turnOrder: string[]

    currentRound?: number

    currentDrawerId?: string

    timeLeft?: number

    gameEnded: boolean

    drawingData?: DrawStroke[]

    messages?: ChatMessage[]

    correctGuessedPlayerIds?: string[]


    maxRounds: number

    selectedLanguage?: LanguageType

    drawTime?: number

    maxPlayersCount?: number


    currentWord?: string

    wordsCollection?: string[]

    wordSelectionTime?: number


    pointsBoardTime?: number

    currentPhase?: gamePhase


    currentRoundPoints? : Record<string , number>

}

export type DrawStroke = {
    x1: number
    y1: number
    x2: number
    y2: number
    color: string
    size: number
}

export type ChatMessage = {
    player?: string
    type: string
    playerId?: string
    text: string
}
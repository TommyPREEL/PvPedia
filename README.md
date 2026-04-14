# PvPedia

A competitive multiplayer Wikipedia word game — find the article title first!

## Quick start

```bash
# Install both server & client
npm run install:all

# Terminal 1 — server (port 3850)
npm run dev:server

# Terminal 2 — client (port 5173)
npm run dev:client
```

Open [http://localhost:5173](http://localhost:5173).

---

## Features

| Feature | Description |
|---|---|
| 🏠 Room system | 4-char code (e.g. `AZ5R`), up to 20 players |
| 🌍 Game language | EN 🇬🇧 / FR 🇫🇷 Wikipedia articles |
| 🖥️ UI language | Separate EN/FR interface via language pill |
| 📖 Wikipedia game | All words hidden as black boxes (width = word length) |
| 🖱️ Click hint | Hover/click a black box → letter count + heat emoji shown |
| ⌨️ Word guessing | Guess words to reveal them for everyone |
| 🚫 Stopwords | Common articles/prepositions can't be guessed ("too common") |
| 🔄 Duplicate guard | Client-side check prevents re-submitting the same word |
| 🔥 Semantic proximity | Failed guesses trigger Datamuse similarity search → hot/cold color gradient on hidden blocks |
| 🏆 Win condition | First to type the article title wins |
| ⏱️ Timer | Live elapsed clock from game start |
| 📊 Scoreboard | Per player: guesses · revealed · finish time; winner in green |
| 📝 Word list | Left sidebar — all your guesses with ✓ found / ✗ miss / ≈ common status |
| 💬 IRC Chat | Real-time chat with system messages |
| 😀 Emoji reactions | Send emojis that float up on all screens |
| 🔊 Sounds | Web Audio synthesized tones (found, miss, too-common, win) with mute toggle |
| 📱 Responsive | Desktop 3-col, tablet 2-col, mobile tab bar (Article / Words / Chat) |
| 📐 Safe areas | notched-phone support via `env(safe-area-inset-*)` |
| 🔁 Reconnect | sessionStorage token + 2-min server grace period on disconnect |
| 🔄 New game | Leader starts a fresh round with a new article |

---

## Architecture

```
server/
  src/index.ts          Socket.io handlers, port 3850
  src/roomManager.ts    In-memory rooms, sessions, grace disconnect
  src/wikipedia.ts      Wikipedia REST API, tokenizer, Datamuse proximity
  src/stopwords.ts      EN/FR stopword lists
  src/types.ts

client/
  src/App.tsx           Root, i18n context, session reconnect, global events
  src/i18n.ts           EN/FR translation system
  src/sounds.ts         Web Audio synthesis + proximity color helper
  src/pages/
    LobbyPage           Create / join, language pill
    WaitingRoomPage     Pre-game lobby, ready system
    GamePage            Responsive 3-panel layout + mobile tabs
  src/components/
    ArticleDisplay      Censored article, proximity heat colors, letter hints
    WordInput           Guess input, duplicate prevention, inline score
    WordList            Guess history sidebar (found/miss/common)
    Scoreboard          Rankings with win time
    Chat                IRC-style real-time chat
    Timer               Live elapsed timer
    EmojiPanel          Emoji picker → floating reactions
```

## Semantic proximity

When a guess isn't found in the article, the server queries the [Datamuse API](https://www.datamuse.com/api/) for semantically similar words. Any of those similar words that appear in the article light up with a **hot→cold gradient**:

- 🔥 Red/orange = very close semantically
- 🌡️ Yellow = somewhat related  
- ❄️ Blue = distantly related

The heat map is cumulative across your guesses and clears on a new game.

## Reconnection

On join/create, the server issues a `sessionToken` stored in `sessionStorage`. If you refresh or drop connection during a game, the server keeps your slot for **2 minutes**. On reload, the client automatically re-sends the token to restore your full game state.

## Scaling

For multi-server horizontal scaling, replace the in-memory `rooms` Map and `sessions` Map in `server/src/roomManager.ts` with a Redis-backed store and use the `socket.io-redis` adapter.

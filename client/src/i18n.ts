export type UILang = 'en' | 'fr';

const T = {
  en: {
    // Lobby
    subtitle: 'competitive',
    tagline: 'Find the Wikipedia article title before everyone else!',
    createRoom: 'Create a room',
    joinRoom: 'Join with a code',
    yourName: 'Your name',
    namePlaceholder: 'Enter your name…',
    roomCodePlaceholder: 'e.g. AZ5R',
    creating: 'Creating…',
    joining: 'Joining…',
    createBtn: 'Create room',
    joinBtn: 'Join room',
    howToPlay: 'How to play',
    howTo1: '📖 A Wikipedia article is chosen — its title is hidden.',
    howTo2: '⌨️ Guess words to reveal them in the article text.',
    howTo3: '🏆 First to find the title word wins!',
    shareCode: 'Share code',
    withFriends: 'with friends',
    back: '←',
    // Waiting room
    waitingFor: 'Waiting for players…',
    roomCode: 'Room code',
    players: 'Players',
    language: 'Game language',
    english: '🇬🇧 English',
    french: '🇫🇷 Français',
    ready: 'Ready!',
    notReady: 'Not ready',
    cancelReady: 'Cancel ready',
    startGame: 'Start game!',
    loadingArticle: 'Loading article…',
    waitingPlayers: 'Waiting for players…',
    leader: 'Leader',
    chat: 'Chat',
    // Game header
    room: 'Room',
    guesses: 'guesses',
    revealed: 'revealed',
    newGame: 'New game',
    quickRestart: 'Instant restart',
    leaveGame: 'Leave game',
    revealWord: 'Reveal a word',
    revealWordPlaceholder: 'Type a word to reveal…',
    revealWordNotFound: 'Word not in article',
    revealWordAlready: 'Already revealed',
    revealWordNotLeader: 'Only the leader can reveal',
    revealWordConfirm: 'Reveal',
    revealWordCancel: 'Cancel',
    revealWordHint: '💡 Reveal hint',
    revealWordHintShort: '💡',
    revealWordActive: '💡 Cancel',
    revealWordReveal: 'Reveal',
    revealWordSuccess: '💡 \'{{word}}\' revealed for everyone!',
    // Win banner
    theAnswerWas: '🎉 The answer was:',
    canStartNewGame: 'You can start a new game above.',
    // Panels
    article: 'Article',
    wordList: 'Words',
    scoreboard: 'Scores',
    // Loading
    fetchingArticle: 'Fetching Wikipedia article…',
    // Input
    typeToReveal: 'Type a word to reveal it…',
    gameOver: 'Game over!',
    guess: 'Guess',
    // Word list
    myGuesses: 'My guesses',
    noGuessesYet: 'Start guessing…',
    // Chat
    noMessages: 'No messages yet',
    sendPlaceholder: 'Type a message…',
    send: 'Send',
    // Scoreboard
    you: '(you)',
    // Feedback
    tooCommon: '"{{word}}" is too common',
    alreadyGuessed: '"{{word}}" already guessed',
    // Letter hint
    letters: '{{n}} letter',
    lettersPlural: '{{n}} letters',
    // Sounds
    soundOn: '🔊',
    soundOff: '🔇',
  },
  fr: {
    subtitle: 'compétitif',
    tagline: "Trouve le titre de l'article Wikipedia avant tout le monde !",
    createRoom: 'Créer une salle',
    joinRoom: 'Rejoindre avec un code',
    yourName: 'Ton nom',
    namePlaceholder: 'Entre ton nom…',
    roomCodePlaceholder: 'ex. AZ5R',
    creating: 'Création…',
    joining: 'Connexion…',
    createBtn: 'Créer la salle',
    joinBtn: 'Rejoindre',
    howToPlay: 'Comment jouer',
    howTo1: "📖 Un article Wikipedia est choisi — son titre est caché.",
    howTo2: '⌨️ Devine des mots pour les révéler dans le texte.',
    howTo3: '🏆 Le premier à trouver le titre gagne !',
    shareCode: 'Partage le code',
    withFriends: 'avec tes amis',
    back: '←',
    waitingFor: 'En attente des joueurs…',
    roomCode: 'Code de salle',
    players: 'Joueurs',
    language: 'Langue du jeu',
    english: '🇬🇧 Anglais',
    french: '🇫🇷 Français',
    ready: 'Prêt !',
    notReady: 'Pas prêt',
    cancelReady: 'Annuler',
    startGame: 'Lancer la partie !',
    loadingArticle: 'Chargement…',
    waitingPlayers: 'En attente…',
    leader: 'Chef',
    chat: 'Chat',
    room: 'Salle',
    guesses: 'essais',
    revealed: 'révélés',
    newGame: 'Nouvelle partie',
    quickRestart: 'Restart instantané',
    leaveGame: 'Quitter',
    revealWord: 'Révéler un mot',
    revealWordPlaceholder: 'Tape un mot à révéler…',
    revealWordNotFound: 'Mot absent de l\'article',
    revealWordAlready: 'Déjà révélé',
    revealWordNotLeader: 'Réservé au chef',
    revealWordConfirm: 'Révéler',
    revealWordCancel: 'Annuler',
    revealWordHint: '💡 Révéler',
    revealWordHintShort: '💡',
    revealWordActive: '💡 Annuler',
    revealWordReveal: 'Révéler',
    revealWordSuccess: '💡 \'{{word}}\' révélé pour tout le monde !',
    theAnswerWas: '🎉 La réponse était :',
    canStartNewGame: 'Tu peux lancer une nouvelle partie ci-dessus.',
    article: 'Article',
    wordList: 'Mots',
    scoreboard: 'Scores',
    fetchingArticle: "Chargement de l'article…",
    typeToReveal: 'Tape un mot pour le révéler…',
    gameOver: 'Partie terminée !',
    guess: 'Deviner',
    myGuesses: 'Mes essais',
    noGuessesYet: 'Commence à deviner…',
    noMessages: 'Aucun message',
    sendPlaceholder: 'Écris un message…',
    send: 'Envoyer',
    you: '(toi)',
    tooCommon: '"{{word}}" est trop commun',
    alreadyGuessed: '"{{word}}" déjà essayé',
    letters: '{{n}} lettre',
    lettersPlural: '{{n}} lettres',
    soundOn: '🔊',
    soundOff: '🔇',
  },
} as const;

type TranslationMap = typeof T['en'];
export type TKey = keyof TranslationMap;

export function createT(lang: UILang) {
  const map = T[lang] as Record<string, string>;
  const fallback = T.en as Record<string, string>;
  return function t(key: TKey, vars?: Record<string, string>): string {
    let str = map[key] ?? fallback[key] ?? String(key);
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{{${k}}}`, v);
      }
    }
    return str;
  };
}

export type TFn = ReturnType<typeof createT>;

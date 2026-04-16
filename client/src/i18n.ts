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
    // Reveal confirmation dialog
    revealDescTitle: 'Reveal description?',
    revealDescBody: 'Reveal all words in the article body for everyone. The title stays hidden — game continues.',
    revealAllTitle: 'Reveal everything?',
    revealAllBody: 'Reveal the title and the full article for everyone. The game will end.',
    revealDescBtn: '📄 Description only',
    revealAllBtn: '🏁 Title + description',
    confirmCancel: 'Cancel',
    // Generic confirm dialog
    confirmLeaveTitle: 'Leave the room?',
    confirmLeaveBody: 'You will lose your progress in the current game.',
    confirmLeaveBtn: 'Leave',
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
    // Game mode
    gameMode: 'Game mode',
    competitiveMode: '⚔️ Competitive',
    coopMode: '🤝 Cooperative',
    compModeDesc: 'Words revealed only for you',
    coopModeDesc: 'Words revealed for everyone',
    // Difficulty
    difficulty: 'Difficulty',
    easyMode: '🟢 Easy',
    mediumMode: '🟡 Medium',
    hardMode: '🔴 Hard',
    easyModeDesc: 'Popular articles (well-known topics)',
    mediumModeDesc: 'Random articles (default)',
    hardModeDesc: 'Obscure articles (short descriptions)',
    // Article display
    findTheArticle: 'Find the article',
    viewWikipedia: '🔗 View on Wikipedia',
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
    // Reveal confirmation dialog
    revealDescTitle: 'Révéler la description ?',
    revealDescBody: 'Révèle tous les mots du corps de l\'article pour tout le monde. Le titre reste caché — la partie continue.',
    revealAllTitle: 'Tout révéler ?',
    revealAllBody: 'Révèle le titre et l\'article complet pour tout le monde. La partie se terminera.',
    revealDescBtn: '📄 Description seulement',
    revealAllBtn: '🏁 Titre + description',
    confirmCancel: 'Annuler',
    // Generic confirm dialog
    confirmLeaveTitle: 'Quitter la salle ?',
    confirmLeaveBody: 'Tu perdras ta progression dans la partie en cours.',
    confirmLeaveBtn: 'Quitter',
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
    // Game mode
    gameMode: 'Mode de jeu',
    competitiveMode: '⚔️ Compétitif',
    coopMode: '🤝 Coopératif',
    compModeDesc: 'Mots révélés uniquement pour toi',
    coopModeDesc: 'Mots révélés pour tout le monde',
    // Difficulty
    difficulty: 'Difficulté',
    easyMode: '🟢 Facile',
    mediumMode: '🟡 Moyen',
    hardMode: '🔴 Difficile',
    easyModeDesc: 'Articles populaires (sujets connus)',
    mediumModeDesc: 'Articles aléatoires (par défaut)',
    hardModeDesc: 'Articles obscurs (descriptions courtes)',
    findTheArticle: 'Trouve l\'article',
    viewWikipedia: '🔗 Voir sur Wikipédia',
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

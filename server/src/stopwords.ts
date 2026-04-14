// Words that cannot be guessed/revealed — too common to give meaningful hints

const EN: ReadonlySet<string> = new Set([
  // Articles & determiners
  'a','an','the','this','that','these','those','some','any','all','both','each',
  'every','few','many','more','most','other','another','same','such','no','neither',
  // Prepositions
  'of','in','to','for','on','at','by','with','from','into','onto','upon','out',
  'off','over','under','above','below','through','across','along','around','between',
  'behind','beside','near','within','without','about','against','during','before',
  'after','until','since','towards','among','via','per','despite','beyond','except',
  // Conjunctions
  'and','or','but','nor','for','yet','so','if','because','as','when','while',
  'although','though','unless','whether','than','once','since','after','before',
  'until','while','whereas','even','just','also','too','either','neither',
  // Pronouns
  'i','me','my','myself','you','your','yours','yourself','he','him','his','himself',
  'she','her','hers','herself','it','its','itself','we','us','our','ours','ourselves',
  'they','them','their','theirs','themselves','who','whom','whose','which','what',
  'there','here',
  // Auxiliaries & linking verbs
  'is','am','are','was','were','be','been','being','have','has','had','do','does',
  'did','will','would','could','should','may','might','shall','can','cannot',
  'must','ought','need','dare','used',
  // Common particles / connectors
  'not','no','yes','now','then','so','very','quite','really','rather','too',
  'just','even','still','already','yet','only','never','always','often','sometimes',
  'again','further','once','ever','however','though','although','therefore','thus',
  'hence','indeed','meanwhile','whereby','thereby','thereof','wherein',
  // Short words often meaningless in context
  's','t','m','ll','d','re','ve','n',
]);

const FR: ReadonlySet<string> = new Set([
  // Articles
  'le','la','les','l','un','une','des','du','d',
  // Prepositions
  'de','a','au','aux','en','dans','sur','sous','par','pour','avec','sans','entre',
  'vers','chez','jusque','jusqu','depuis','avant','apres','pendant','lors','deja',
  'encore','toujours','jamais','souvent','parfois','peu','beaucoup','tres','bien',
  'plus','moins','aussi','autant','meme','autre','certain','certaine','certains',
  'certaines','plusieurs','quelque','quelques','tout','tous','toute','toutes',
  // Conjunctions
  'et','ou','mais','donc','or','ni','car','que','qu','quand','quoi','dont','lorsque',
  'puisque','comme','si','alors','ainsi','cependant','pourtant','toutefois','cela',
  'ceci','ca','c','car','parce','afin','pour',
  // Pronouns
  'je','j','tu','t','il','elle','nous','vous','ils','elles','me','m','te','se',
  's','lui','leur','y','on','eux','ce','cet','cette','ces','mon','ton','son','ma',
  'ta','sa','nos','vos','leurs','moi','toi','soi','qui','quoi','quel','quelle',
  'quels','quelles','lequel','laquelle','lesquels','lesquelles',
  // Auxiliaries
  'est','sont','ai','as','a','avons','avez','ont','etait','etaient','ete','sera',
  'serait','soit','etre','avoir','faire','fais','fait','faite','faits','faites',
  'eut','eut','sont','ont','avait','avaient','aura','aurait',
  // Common adverbs / negation
  'ne','pas','plus','jamais','rien','personne','nulle','nul','non','oui','tres',
  'bien','mal','vite','comment','pourquoi','combien','ici','la','voici','voila',
]);

/**
 * Returns true when the (already-normalized) word is a stopword
 * and should not be revealable via player guesses.
 */
export function isStopword(normalizedWord: string, language: 'en' | 'fr'): boolean {
  if (normalizedWord.length <= 1) return true;
  return language === 'en' ? EN.has(normalizedWord) : FR.has(normalizedWord);
}

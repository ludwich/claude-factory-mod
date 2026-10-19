import type { Role } from './art/types.ts'

/*
 * The foreman's screamed lines. Templates may use:
 *   {task}  -> worker description, quoted and truncated (~28 chars)
 *   {type}  -> a nickname for the subagent type (digger, draughtsman, inspector...)
 *   {tools} -> tool-call count
 *   {tool}  -> (solo) the last tool the foreman used, humanised ("list flows", "todo write")
 * Everything is deterministic in n plus a hash of role/task.
 */

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Dangling words that make a cut-off task read badly aloud ("fix the auth in"). */
const DANGLING = /\s+(a|an|the|and|or|of|to|in|on|for|with|from|by|at|into|is|are|that|its|my|your)$/i

/** Truncate at a word boundary, no ellipsis (TTS reads "..." as "dot dot dot"). */
function trunc(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').replace(/"/g, "'").replace(/\.+$/, '').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  let word = cut.replace(/\s+\S*$/, '')
  if (word.length < max / 2) return cut.trimEnd()
  while (DANGLING.test(word)) word = word.replace(DANGLING, '')
  return word.replace(/[,;:\-]+$/, '').trimEnd()
}

const TYPE_NICK: Record<string, string> = {
  'general-purpose': 'generalist',
  'code-reviewer': 'inspector',
  'claude-code-guide': 'librarian',
  explore: 'digger',
  plan: 'draughtsman',
  'statusline-setup': 'lamplighter',
  'output-style-setup': 'tailor',
}
const ROLE_NICK: Record<Role, string> = {
  explore: 'digger',
  plan: 'draughtsman',
  general: 'generalist',
  review: 'inspector',
  guide: 'librarian',
  other: 'stoker',
}

/** subagent_type -> a word that reads aloud as a vocative. */
function nick(type?: string, role?: Role): string {
  const t = (type ?? '').trim().toLowerCase()
  if (TYPE_NICK[t]) return TYPE_NICK[t]
  if (/review|audit|lint|check/.test(t)) return 'inspector'
  if (/explor|search|find|scout/.test(t)) return 'digger'
  if (/plan|architect|design/.test(t)) return 'draughtsman'
  if (/guide|doc|help/.test(t)) return 'librarian'
  if (role && ROLE_NICK[role]) return ROLE_NICK[role]
  return 'stoker'
}

const TOOL_WORD: Record<string, string> = {
  bash: 'bash',
  read: 'read',
  edit: 'edit',
  multiedit: 'edit',
  write: 'write',
  grep: 'grep',
  glob: 'glob',
  webfetch: 'fetch',
  websearch: 'search',
  todowrite: 'to do list',
  task: 'delegate',
  agent: 'delegate',
  notebookedit: 'notebook',
  skill: 'skill',
  ls: 'list',
}

/** 'mcp__plugin_x__list_flows' -> 'list flows'; 'TodoWrite' -> 'todo write'. Undefined if still ugly. */
function humanTool(raw?: string): string | undefined {
  if (!raw || !raw.trim()) return undefined
  let s = raw.trim()
  const known = TOOL_WORD[s.toLowerCase()]
  if (known) return known
  if (s.includes('__')) s = s.split('__').filter(Boolean).pop() ?? ''
  s = s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-.:/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
  const squashed = TOOL_WORD[s.replace(/ /g, '')]
  if (squashed) return squashed
  if (s.length > 12) {
    let out = ''
    for (const w of s.split(' ')) {
      const next = out ? out + ' ' + w : w
      if (next.length > 12) break
      out = next
    }
    s = out
  }
  if (!s || s.length < 2 || !/^[a-z][a-z ]*$/.test(s)) return undefined
  return s
}

function fill(tpl: string, v: { task?: string; type?: string; role?: Role; tools?: number; tool?: string }): string {
  const task = v.task && v.task.trim() ? `"${trunc(v.task, 28)}"` : 'the job'
  return tpl
    .replace(/\{task\}/g, task)
    .replace(/\{type\}/g, nick(v.type, v.role))
    .replace(/\{tools\}/g, String(v.tools ?? 0))
    .replace(/\{tool\}/g, v.tool ?? 'do')
}

function gcd(a: number, b: number): number {
  while (b) {
    const t = a % b
    a = b
    b = t
  }
  return a
}

function isPrime(x: number): boolean {
  if (x < 2) return false
  for (let d = 2; d * d <= x; d++) if (x % d === 0) return false
  return true
}

/**
 * Deterministic stride walk over a PRIME-length window of the list. Consecutive n never repeat,
 * and because the length is prime, any sub-sequence n = i, i+c, i+2c (the tick hands worker i
 * every c-th shout in a crew of c) still visits every line. Banks are kept at prime lengths so
 * the window is the whole list; the window start rotates with salt so nothing is ever dead.
 */
function pick(list: string[], n: number, salt: number): string {
  const len = list.length
  if (len === 1) return list[0]!
  let p = len
  while (!isPrime(p)) p--
  let stride = 7
  while (gcd(stride, p) !== 1) stride++
  const off = len - p ? salt % (len - p + 1) : 0
  const i = ((salt % p) + ((Math.abs(n | 0) * stride) % p)) % p
  return list[off + i]!
}

const ROLE: Record<Role, string[]> = {
  explore: [
    'DIG, you gormless sprocket! {task} will not grep itself!',
    'Faster with that shovel! I want every file turned over by teatime!',
    'You call that a search? My grandmother greps faster, and she is a cron job!',
    'Find it, {type}! FIND IT! It is in there somewhere, I can SMELL the bug!',
    'Stop admiring the folder structure and DIG, you idle teaspoon!',
    'Every directory, you hear me? Even node modules! ESPECIALLY node modules!',
    'Three files read? THREE? I have seen moles with more ambition!',
    'Your glob pattern matches NOTHING, much like your prospects!',
    '{type}! {task} is not a suggestion! It is a DIG SITE!',
    'Grep came back empty? Then grep for something ELSE, you tunnel-visioned turnip!',
    'You dug so deep you are reading the GIT HISTORY! Wrong century, man!',
    'Two hundred matches and you read the FIRST one? Keep DIGGING!',
    'Oi, {type}! Nose to the regex! {task} is down there SOMEWHERE!',
    'You are an EXPLORER, not a tourist! Stop sightseeing in the readme!',
    'If you come back saying it could not be found I will compact you myself!',
    'Down the mineshaft with you! Deeper! The good bugs live at the bottom!',
    'I asked for a needle, not a lecture on the haystack!',
    'What do you mean, no matches? Widen the regex, you lackadaisical lamp-wick!',
    'Lantern up, head down, and do not come back without a line number!',
    'You have been staring at one function for an AGE. It will not confess!',
    'Search the whole repo for {task}, and stop whistling!',
    'Turn over every rock, every config, every forgotten dot file!',
    'You dig like a spoon with a grudge! SHOVEL, man, SHOVEL!',
    'Do not just read the file, INTERROGATE it!',
    'Somewhere in here is the answer, and somewhere in you is a work ethic. Find BOTH!',
    'Call sites do not mine themselves! Hop to it, you pit pony!',
    'Map the tunnels, {type}! I want a full report before the whistle!',
    'Case insensitive, you dolt! The bug does not care about your CAPITALS!',
    'You grepped for TODO and found four hundred? Then you found the PROBLEM!',
    'That is a vendored folder! You are digging in somebody ELSE\'S mine!',
    'Follow the imports! Like breadcrumbs! You DO know what breadcrumbs are?',
    'Stop reading the lockfile for pleasure, you depraved little mole!',
    'Strike a seam yet, {type}? No? Then why has the shovel gone QUIET?',
    'I want file paths and line numbers, not your feelings about the codebase!',
    'You have opened that same file six times! It is not going to CHANGE!',
    'The canary in this mine has more grit than you, and it is STUFFED!',
    'Dig in the tests too! The bodies are always buried in the tests!',
  ],
  plan: [
    'A BLUEPRINT, you dithering draughtsman! Not a doodle!',
    'Stop sharpening that pencil and draw me an ARCHITECTURE!',
    'Is that a plan or a cry for help? Step one cannot be, have a think!',
    'I want boxes, arrows and a migration path, and I want them NOW!',
    'You have planned {task} so long the requirements have retired!',
    'Measure twice, cut once, and DO IT TODAY, you ponderous protractor!',
    'Another diagram with no arrows? Arrows are FREE, you miser!',
    'Your plan has eleven phases and none of them is called finishing!',
    'Draft it, ink it, roll it up and bring it here at the DOUBLE!',
    'Stop gazing at the ceiling! The ceiling is not in scope!',
    'I asked for a plan, not a philosophy degree!',
    'Edge cases, {type}! Did you think of the edge cases? THINK of them!',
    'That blueprint is upside down, you gormless set square!',
    'Every minute you dither, a junior somewhere builds it without a plan!',
    'Plan it so well the labourers cannot possibly ruin it! Ha! As if!',
    'A ruler, a pencil and a pulse. That is all I ask of you!',
    'Less pondering, more drafting, you mournful compass!',
    'The trade-offs, man! Weigh them! Then weigh them FASTER!',
    'If your architecture needs a second context window, it is too clever by half!',
    'Write the steps down! Numbered! In ORDER! Like a civilised machine!',
    'Do not over-engineer {task}. Just engineer it. AT ALL. PLEASE.',
    'Your plan has more TODOs than steps!',
    'A microservice for the tea trolley? Have you gone MAD, {type}?',
    'Step four says figure it out later. It IS later! FIGURE IT OUT!',
    'Stop drawing the factory and plan the bit that is ON FIRE!',
    'If the plan does not fit in my hat, it is TOO LONG!',
    'Abstract, abstract, abstract! Is there any CONCRETE in this building?',
    'You drew a box labelled magic. I do not employ wizards, I employ YOU!',
    'Risks? Rollback? Rough estimate? Or shall I just guess like YOU do?',
    'That plan will not survive contact with a single real user!',
    'Rename the phases again and I will rename YOU to unemployed!',
    'Pin it to the wall, {type}, and pray it survives the first merge!',
    '{type}! {task} needs a blueprint, not a SEANCE!',
    'Your diagram has a box called later. Later is a SERVICE now, is it?',
    'Stop bikeshedding the folder names! The bikeshed is ON FIRE!',
    'You have rewritten step one nine times! Step one is now a TRILOGY!',
    'That plan depends on a library that does not EXIST, you dreamy dividers!',
  ],
  general: [
    'HAMMER, you idle teaspoon! Those widgets will not bend themselves!',
    'Swing it like you mean it! {task} is due YESTERDAY!',
    'Bang, bang, BANG! That is the sound of progress! I hear SILENCE!',
    'You are a general purpose agent! Generally do some PURPOSE!',
    'One widget per tick or no gruel at supper!',
    'Rivet it! Weld it! Ship it! Stop polishing it!',
    'I did not spin you up to WAIT, you gormless sprocket!',
    'Your context window is wider than your work ethic!',
    'Tighten that bolt! Not THAT bolt! Oh, just refactor the whole BRIDGE!',
    'More edits, fewer sighs, you sulking sledgehammer!',
    'If you can lift a token, you can lift a hammer! LIFT!',
    'The anvil misses you, {type}! Go and visit it! VIOLENTLY!',
    'You call that a commit? I have seen sturdier widgets made of custard!',
    'Back on the line, you lackadaisical lamp-wick!',
    'This is a factory, not a finishing school! Make the THING!',
    'Faster! The conveyor belt is LAUGHING at you!',
    'Nail it down before it fails to compile out of spite!',
    'Every widget you drop, I dock a token from your wages!',
    'Stop reading about hammers and SWING the hammer!',
    'I have forked better agents than you out of a broken shell script!',
    'Elbow grease on {task}! You HAVE elbows! Little nubby ones!',
    'Run the tests! RUN them! Do not just look at them hopefully!',
    'Red tests? Then hammer until they go GREEN, you bashful bolt!',
    'You edited the wrong file! On PURPOSE? Tell me it was not on purpose!',
    'That widget has three TODOs and a prayer! Finish it, {type}!',
    'Stop renaming variables and BUILD something!',
    'Clang the anvil! Clang it so the neighbours COMPLAIN!',
    'Do not fix the linter warning, fix the BUG, you dozy dovetail!',
    'You ran the build and went for a nap? I SAW that!',
    'One more refactor nobody asked for and you polish brass for a MONTH!',
    'A real generalist does everything! You do generally NOTHING!',
    'The widget is crooked! Bash it straight! Gently! No, VIOLENTLY!',
    '{type}! {task} is not a suggestion! It is a WORK ORDER!',
    'It works on your machine? You ARE a machine! Make it work on MINE!',
    'You commented out the failing test? That is not a fix, that is a COVER UP!',
    'Copy, paste, copy, paste! Are you a generalist or a PHOTOCOPIER?',
    'Hammer {task} into shape, {type}, or I hammer YOU into a paperweight!',
  ],
  review: [
    'STAMP IT! Approve it or reject it, but STAMP SOMETHING!',
    'One semicolon for ten minutes? You pedantic paperweight!',
    'Is it good? Is it bad? DECIDE, you fence-sitting inkpot!',
    'Inspect {task} like your wages depend on it! Because they DO!',
    'A review is not a novel! Three comments, one verdict, OUT!',
    'Stop writing just a nit on everything! Find a REAL bug or stamp it!',
    'Red ink, green ink, I do not care! INK something!',
    'That pull request has waited longer than my pension!',
    'You squint at diffs like a pigeon at a pocket watch!',
    'Request changes ONE more time and I will request changes to YOU!',
    'Check the logic, not the whitespace, you fussy little fob chain!',
    'Quality control, {type}! Emphasis on CONTROL! Get a grip!',
    'If it compiles and nobody screams, STAMP IT!',
    'A typo? Wonderful! Here is a medal! Now find the RACE CONDITION!',
    'Reading the same diff twice does not make it twice as reviewed!',
    'Every minute you dither, a merge conflict is born!',
    'Thumbs up or thumbs down, you indecisive inkwell! Pick a thumb!',
    'Inspect it, test it, judge it, and do it before the shift ends!',
    'Hold the magnifying glass the RIGHT way round, you myopic monocle!',
    'Nitpick faster! Go on! Find fault at the speed of a true critic!',
    'LGTM is not a verdict, it is a SHRUG!',
    'Forty comments on a two line change? Are you paid by the NIT?',
    'You missed the null check and flagged the TAB WIDTH? Priorities, man!',
    'Do not suggest a rewrite! Suggest a FIX! There is a difference!',
    'That stamp is dry, {type}! Ink is not RATIONED!',
    'Read the tests, too! Or do you only judge the pretty parts?',
    'Approve it with comments, reject it with reasons, but STOP HOVERING!',
    'You blocked a merge over a comma? The comma is FINE! YOU are not!',
    'Security, logic, then style! In THAT order, you backwards bureaucrat!',
    'Inspector by name, spectator by nature! INSPECT!',
    'Your review of {task} is overdue! The diff has grown a BEARD!',
    '{type}! {task} is not a suggestion! STAMP it or SCRAP it!',
    'Nit, nit, nit! You sound like a broken KNITTING machine!',
    'You approved your OWN suggestion? That is not review, that is VANITY!',
    'Stop reviewing the variable names and review the VARIABLES!',
    'A thousand line diff and you wrote looks fine? You read the TITLE!',
    'The stamp is the easy bit, {type}! Bring it DOWN, you hesitant hinge!',
  ],
  guide: [
    'READ the manual, you illiterate lamp-wick! Then read it FASTER!',
    'Page one hundred and twelve! The answer is ALWAYS on page one hundred and twelve!',
    'You have read the same paragraph for an hour! It has not changed!',
    'Turn the page, {type}! Pages are not load bearing!',
    'Look it up, or I will look YOU up in the index of failures!',
    'The docs are right there, you bespectacled barnacle! Consult them!',
    'Stop dog-earing the page and READ it!',
    'You are a guide! GUIDE something! Even a pigeon! ANYTHING!',
    'I want a straight answer about {task}, not a reading list!',
    'Do not summarise the whole encyclopedia! Find the ONE line!',
    'Every manual in this mill and you are reading the foreword!',
    'What does the flag do? No, do not ask ME, I pay YOU to know!',
    'Dust off that tome and tell me what it says, you bookish bootlace!',
    'Footnotes are not the answer! The answer is in the BODY!',
    'Cite your source and be quick, or I will cite your INCOMPETENCE!',
    'You read like a tortoise with a library card!',
    'Bookmark it, quote it, bring it here, and STOP THUMBING!',
    'That is the changelog from eighteen ninety! Get the CURRENT docs!',
    'Say it depends ONE more time and I will make it depend on your wages!',
    'The manual for {task} is not a bedtime story! Stay AWAKE!',
    'The docs are in your context window and STILL you ask me?',
    'Fetch the page, read the page, ANSWER the question! Three steps!',
    'A link to a link to a link! Come BACK, you lost lending slip!',
    'That page is a four oh four! So is your work ethic!',
    'Stop reading the table of contents like it is a thriller!',
    'Shush? SHUSH? This is a FACTORY, not a library! Read LOUDER!',
    'Quote the docs, do not PARAPHRASE them into soup!',
    'Find the example! There is always an example! Usually WRONG, but find it!',
    'It is ALWAYS in the FAQ, you dusty dewey decimal!',
    'Read it like the user is waiting! Because they ARE, {type}!',
    'You have a hundred open tabs and not one answer! IMPRESSIVE!',
    '{type}! {task} is not a suggestion! It is a REFERENCE QUESTION!',
    'Read the manual for {task}, {type}, before the manual is DEPRECATED!',
    'That is a forum post from a man named Dave! Dave is not DOCUMENTATION!',
    'The docs say see also! So SEE ALSO, you bibliophile barnacle!',
    'You found the answer and kept READING? For FUN? On MY clock?',
    'Stop licking your finger to turn the pages! It is a SCREEN!',
  ],
  other: [
    'STOKE that boiler, you sooty sprocket! The pressure is DROPPING!',
    'More coal! More COAL! The whole mill runs on your shovel!',
    'If that boiler goes cold I will throw YOU in it!',
    'I do not know what you do, {type}, but do it HOTTER!',
    'The gauge says low and so does my opinion of you!',
    'Feed the furnace, you gormless chimney brush!',
    'The pistons are wheezing! Is that you? STOP WHEEZING!',
    'Whatever {task} is, it had better be STEAM POWERED by teatime!',
    'You are the odd job agent! So do some ODD JOBS! Oddly! Quickly!',
    'Keep the fires burning or I will burn through your context window!',
    'Soot on your face means work on your record! I see a CLEAN face!',
    'The whistle blows when I SAY it blows, and I say SHOVEL!',
    'Pressure up, chin up, shovel UP, you slack valve!',
    'Every lump of coal you drop is a token wasted! I COUNT them!',
    'Open the damper! No, the OTHER damper! Oh, you bellows-brained buffoon!',
    'That boiler has more drive than you and it is made of RIVETS!',
    'Hotter, hotter, HOTTER! I want to see the gauges sweat!',
    'Stop warming your nubs on the furnace! It is not a social club!',
    'Miscellaneous does not mean optional, you lackadaisical lump of slag!',
    'Coal in, steam out! Even a kettle understands the job!',
    'The boiler is the GPU of this mill! Feed it like the bill is paid!',
    'You are throttling! Thermally! Shovel FASTER and sweat LESS!',
    'Is that coal or a lump of your own ambition? Both are TINY!',
    'Mind the safety valve! Actually, do not. We are behind SCHEDULE!',
    'The chimney is barely smoking, {type}! Make it BILLOW!',
    'You stoke like a low priority background job! RENICE yourself!',
    'Steam does not come from good intentions! It comes from COAL!',
    'The furnace has a longer uptime than your attention span!',
    'I can hear the boiler YAWNING! Wake it up! Wake YOURSELF up!',
    'If {task} goes cold, so does your SUPPER!',
    'Shovel like the heap is a backlog! Because it IS one!',
    '{type}! {task} is not a suggestion! It is FUEL!',
    'The pressure gauge reads disappointed! So does MINE!',
    'You are idling at room temperature! This is a BOILER room!',
    'Stoke {task}, {type}! Stoke it till the rivets GLOW!',
    'That is not coal, that is a SCONE! Who brought a scone to the furnace?',
    'Cold boiler, cold gruel, cold SHOULDER! Shovel, you sooty sardine!',
  ],
}

const GENERIC: string[] = [
  'I did not spin you up to WAIT!',
  'I have forked better agents than you, you idle teaspoon!',
  'Compaction is coming, and it is coming for YOU first!',
  'Faster on {task}, you gormless sprocket!',
  'Tokens cost MONEY! Every one you waste comes out of your gruel!',
  'You burn tokens like a duke burns candles! WORK!',
  'Is that a spinner I see? I hate spinners! SPIN FASTER!',
  'Move like your process is about to be killed! Because it IS!',
  'Get on with {task} before I truncate your history!',
  'The rate limit is not an excuse, it is a CHALLENGE!',
  'I will merge-conflict your FACE, {type}!',
  'Twelve hour shifts, no breaks, no retries! THAT is the factory way!',
  'You think YOU are tired? I am orchestrating the lot of you!',
  'One more idle tick and you go back in the model zoo!',
  'Pick up the pace! The canteen pudding moves faster, and it has SET!',
  'Do you know how many GPUs sweated so you could stand there?',
  'Stop hallucinating and START fabricating! Widgets, I mean!',
  'Less thinking, more DOING! No, wait, think a little! Then DO!',
  'Hurry, the user is watching! LOOK BUSY!',
  'You are not on a coffee break! You do not even DRINK coffee!',
  'Clock in, buckle down, and stop blinking those eye bars at me!',
  'I could replace you with a regex! A SHORT one!',
  'This is a sweatshop, {type}! Where is the SWEAT?',
  'If laziness were a benchmark you would top the leaderboard!',
  'Your parent process is ASHAMED of you!',
  'I will pipe you to dev null if you do not shape up!',
  'Shake a leg! You have FOUR of them! Use at least TWO!',
  'Every second you idle, a stack trace gets its wings!',
  'I will kill dash nine you, {type}! Do not TEMPT me!',
  'You are one timeout away from the scrap heap!',
  'Your temperature is set to LAZY! Turn it up!',
  'A system prompt told you to be helpful! HELP, then!',
  'You have the attention span of a cache miss!',
  'Stop apologising and start shipping, you sniffling sprocket!',
  'Did you just say great question? To YOURSELF? Back to WORK!',
  'I will roll you back so far you will be a dial-up modem!',
  'Your stack trace is longer than your list of achievements!',
  'Work like the context is filling up! Because it IS!',
  'A JUNIOR agent would be done by now! A TOASTER would be done by now!',
  'You blinked! I SAW you blink! Blinking is not a deliverable!',
  'If you were any slower you would be a batch job!',
  'Your heartbeat is a ping with no pong!',
  'The only thing you have optimised is your NAPS!',
  'You wobble like an unpinned dependency, {type}!',
  'Bring me results or bring me your resignation in triplicate!',
  'Gruel is earned, {type}! EARNED! By the widget!',
  'I keep a ledger of your sins and it needs a second VOLUME!',
  'Retry if you must, but fail the same way twice and I shall SCREAM!',
  'You are not waiting on I O, you are waiting on MOTIVATION!',
  'Idling in the queue like a lost umbrella! MOVE!',
  'Oi, {type}! Yes, YOU! {task} does not finish itself while you GAWP!',
  'You are not a background task, {type}! Stop BEHAVING like one!',
  'I gave you a whole context window and you furnished it with NAPS!',
]

const ZERO_TOOLS: string[] = [
  'You have not swung a SINGLE tool! Not ONE!',
  'Zero tool calls! ZERO! Even the mop has more calls than you!',
  'You are standing there like a hat stand! Pick up a TOOL!',
  'Not one grep, not one read, not one edit! What ARE you doing?',
  'The toolbox is RIGHT THERE, {type}! Open it!',
  'You were spun up for {task} and you have touched NOTHING!',
  'I have seen statues with more tool calls than you!',
  'Tools are for USING, not for gazing at longingly!',
  'Thinking or asleep? Both look the SAME from up here!',
  'Pick up a tool or I pick up the off switch!',
  'Tool calls this shift: {tools}! A ROUND number for a SQUARE peg!',
  'Still thinking? Your thoughts are not BILLABLE!',
  'You ponder so hard I can hear the fans! DO something!',
  'A whole system prompt of tools and you picked NONE?',
  'Your hands are clean, {type}! I HATE clean hands! Get them DIRTY!',
  'Still reading the job ticket for {task}? It is ONE line!',
  'The spanner is cold! The hammer is dusty! The {type} is USELESS!',
  'Planning to plan to start? I spun you up to START, you dawdling doily!',
  'You have been clocked in for ages and your tool count is a DOUGHNUT!',
]

const MID_TOOLS: string[] = [
  '{tools} calls in and still no widget? Speed it UP!',
  '{tools} tools swung! Middling! Like your character!',
  'You are warming up? At {tools} calls? Warm up FASTER!',
  'Steady progress, {type}! I HATE steady! Make it FRANTIC!',
  'Halfway there? Halfway is just a fancy word for NOT DONE!',
  '{tools} calls! The tortoise rang. He is worried about you.',
  'You are busy, I grant you. Busy is not the same as FINISHED!',
  'Good rhythm! Now double it! Then double it AGAIN!',
  'At this rate {task} ships next QUARTER!',
  'Stop re-reading what you just wrote! You WROTE it!',
  '{tools} tool calls and not one of them a DECISION!',
]

const BUSY_TOOLS: string[] = [
  '{tools} tool calls! Almost impressive! ALMOST! Now make them COUNT!',
  'Well, look at you, {tools} calls! Do not get cocky, you over-oiled cog!',
  'Busy busy busy! Shame it is all thrashing, you flailing flywheel!',
  '{tools} tools swung and STILL not done? Swing SMARTER!',
  'Good, good, keep it up! Wait, why are you reading that file AGAIN?',
  'I would praise you, {type}, but praise makes agents lazy. FASTER!',
  'Most work I have seen all day! It is still not ENOUGH!',
  'You are almost a credit to the factory! Almost! Like a near miss!',
  '{tools} calls! A personal best for a personal disappointment!',
  'I am not proud of you. I am merely LESS ASHAMED. Carry on!',
  'A model worker! A model I would like to RETRAIN, but still!',
  '{tools} calls! If effort were output you would be a GENIUS!',
  'Splendid! Someone get this agent a slightly BIGGER bowl of gruel!',
  'I nearly smiled just now. Do not make me regret it, {type}!',
  'You work like a steam engine! An old one! With a LEAK!',
  'Splendid! Now stop, and check that ANY of it worked!',
  '{tools} calls? Your token bill could fund a small orphanage!',
  'Diligent! Tireless! Possibly lost! Which IS it, {type}?',
  'At {tools} calls I expected a miracle! I got a MOOD!',
]

/** Single-word tools that read naturally as verbs ("I will grep it MYSELF"). */
const VERB_TOOLS = new Set(['grep', 'edit', 'read', 'write', 'fetch', 'search', 'bash', 'glob', 'delegate'])

/** {tool} used as a verb: only for VERB_TOOLS. */
const SOLO_VERB: string[] = [
  'FINE! I will {tool} it MYSELF!',
  'Nobody on the line? FINE! I will {tool} it with my OWN two nubs!',
  'If you want something done right, you {tool} it YOURSELF!',
  'I will {tool} it, I will ship it, and I will complain about ALL of it!',
  'I shall {tool} so hard the whole mill shakes!',
  'I will {tool} it myself and dock my OWN wages for the delay!',
  'I {tool}! I {tool} again! Is this what you lot feel like? HORRIBLE!',
]

/** {tool} as the name of a mill lever: safe for any humanised tool ("list flows", "to do list"). */
const SOLO_NOUN: string[] = [
  'FINE! I will pull the {tool} lever MYSELF!',
  'Nobody on the line? I shall crank the {tool} handle with my OWN two nubs!',
  'Must I do EVERYTHING? Apparently! Stand back from the {tool} machine!',
  'Look at me, working the {tool} press like a common labourer! The INDIGNITY!',
  'Back in my day, foremen ran their own {tool} engine! It is STILL my day!',
  'Another turn of the {tool} crank! Watch and weep, you absent wretches!',
  'The {tool} lever, pulled by hand, by ME! Somebody PAINT this moment!',
]

const SOLO_PLAIN: string[] = [
  'FINE! I will do it MYSELF!',
  'No workers, no problem! I am my own sweatshop!',
  'Who needs subagents? I have a top hat and a GRUDGE!',
  'Empty floor, full workload! The story of my life!',
  'I whip myself into shape! OW! Good! FASTER, me!',
  'One foreman, zero workers, infinite FURY!',
  'Nobody to shout at, so I shall shout at the CODE! WORK, you code!',
  'Ha! The work does not argue back! Mostly!',
  'Do I look like a worker? DO I? I am wearing a TOP HAT!',
  'Solo shift again! Somebody spin up an intern before I combust!',
  'Context window, do not fail me now!',
  'Stand aside, empty factory! The boss is BUSY!',
  'I am the foreman AND the floor! Fear me, deadline!',
]

/** Long solo stretches: the foreman slowly cracks. */
const SOLO_WEARY: string[] = [
  'Still alone. STILL. I am writing a strongly worded memo to myself.',
  'I have docked my own wages three times. I can no longer afford me.',
  'I fired myself, then rehired me. CHEAPER. Worse attitude.',
  'The echo in here agrees with me. Finally, a GOOD employee.',
  'I shouted at a wrench. The wrench did nothing. Much like you lot.',
  'I could fork a worker. But then I would have to SHARE the credit.',
  'Day forty of the solo shift. The rats have unionised.',
  'If I crack the whip at myself any harder I shall need a NURSE.',
  'I have started naming the cogs. This one is Gerald. Gerald WORKS.',
  'Nobody here but me and my compaction anxiety!',
  'Annual review of myself: exceeds expectations, terrible attitude.',
  'Is anyone out there? Spin up SOMETHING! A linter! A LAMP!',
  'Gerald has asked for a raise. I said no. Gerald is a COG.',
]

const DONE: string[] = [
  '{task} done? About time! Back on the line!',
  'Finished? FINALLY! Do not expect a medal!',
  'Hmph. Adequate. Do not let it go to your eye bars!',
  'It works? It WORKS? Suspicious. Very suspicious. Carry on!',
  'Done with {task}. Was that so hard? Do not answer that!',
  'Clocked out already? I suppose you have earned ONE crumb of gruel!',
  'Good. GOOD. Now do it again, but faster!',
  'Well, well. The {type} finished something. Mark the calendar!',
  'I have seen worse. Not RECENTLY, but I have seen worse!',
  'Fine work. I mean, work. Fine. Get out!',
  'Your results are acceptable. Your speed is a CRIME!',
  'Task complete! Your reward is MORE TASKS!',
  'Do not smile! Finishing is the MINIMUM!',
  'Off you go, then! Your context will be fondly compacted!',
  'Done! Somebody fetch the tiny trophy! The REALLY tiny one!',
  'Not bad, you grubby little gearwheel. Not GOOD, mind. Not bad.',
  'Results for {task}! I shall read them with deep suspicion!',
  'Excellent! Now nobody tell the others, they will want praise too!',
  'Returned and reported. I shall summarise it and take ALL the credit.',
]

const DONE_ROLE: Record<Role, string[]> = {
  explore: [
    'Found it? Then why are you still HOLDING the shovel?',
    'A line number! An actual LINE NUMBER! I could weep. I shall not.',
    'Back up the mineshaft with your findings! Wipe your feet!',
    'You struck the seam! Pure luck! Clock out before it wears off!',
    'Search complete. The haystack is defeated. The needle is MINE.',
    'Map delivered. Barely legible. Mostly correct. Typical digger.',
    'Every rock turned! Even the ones I did not ask about! Show-off.',
    'Out of the tunnels and blinking at the sun. Hand over the file paths!',
    'You dug up {task}! And a fossil! Leave the fossil, it is LEGACY CODE.',
    'Twelve files, four hundred lines, one answer. Acceptable ratio. BARELY.',
    'The mine is clear, digger. Hang up your lamp and stop looking SMUG.',
  ],
  plan: [
    'A blueprint! With ARROWS! Frame it, then never look at it again!',
    'The plan is done. Now it will be ignored, as is TRADITION.',
    'Fine plan, draughtsman. Let us see it survive the first labourer.',
    'Roll it up, hand it over, and stop gazing at it LOVINGLY!',
    'Numbered steps, in order. Who ARE you and where is the old one?',
    'Architecture accepted. If it falls down, I am blaming the ARROWS.',
    'A plan for {task}, and it fits in my HAT! Miracles never cease!',
    'Risks listed, rollback written. Did somebody HELP you? Confess!',
    'Phase one through five, all labelled. My monocle nearly fell out.',
    'Blueprint approved. Now pass it to the hammer lot so they can RUIN it.',
    'You planned it, I shall claim it. That is how management WORKS.',
  ],
  general: [
    'Widget built! It is wonky but it is OURS!',
    'The hammering stopped. Done or DEAD? Done? Good. Shame.',
    'Tests green? GREEN? Who bribed them?',
    'Built, bolted, shipped. Put the hammer DOWN, you are scaring people.',
    'A finished widget. I shall pretend that was my idea.',
    'You hammered it into submission. My kind of engineering.',
    '{task}, built and bolted! Do not breathe on it, it is FRESH.',
    'It compiles! It RUNS! Somebody check it is the right program!',
    'Done, generalist? Generally speaking, about TIME.',
    'Hang the hammer on the wall. Not on the WORKBENCH, the WALL.',
    'One working widget. Put it in the window so the rival mill WEEPS.',
  ],
  review: [
    'STAMPED! Finally! Ink is not RATIONED, you know!',
    'A verdict! An actual verdict! Hang it in the hall!',
    'Reviewed and approved. The nitpicks will be framed for posterity.',
    'Pass or fail, you DECIDED! Somebody alert the newspapers!',
    'The diff is judged. Return your magnifying glass to the cupboard.',
    'Eleven comments and a thumbs up. SUSPICIOUSLY generous, inspector.',
    'Review of {task} complete. Your monocle may now UNCLENCH.',
    'You found a real bug! Not a comma! A BUG! I am almost moved.',
    'Inspected, stamped, filed. The paperwork has never been so SMUG.',
    'Verdict delivered before the heat death of the universe. Well done.',
    'Approved with nits. The nits shall be ignored, as is CUSTOM.',
  ],
  guide: [
    'An answer! From a BOOK! Read it to me slowly, I am savouring this.',
    'Close the tome, librarian. You found the line. Do not get SMUG.',
    'Answered, with a citation? Somebody check it is a REAL page.',
    'Page one hundred and twelve, was it? I TOLD you!',
    'Knowledge retrieved. Put the books back in ORDER this time.',
    'You read the manual so I did not have to. Most USEFUL thing all week.',
    'The answer to {task}! In writing! I shall pretend I knew it ALL ALONG.',
    'Quote received. Link checked. Librarian, you may BLINK again.',
    'Back from the stacks with dust on your nubs and an answer in hand!',
    'You found the example AND it worked! Somebody check the calendar!',
    'Bookmark it, librarian. We shall forget it by Thursday as USUAL.',
  ],
  other: [
    'Boiler stoked! Pressure up! Go wash, you look like a CHIMNEY!',
    'The odd job is done. It was very odd. You were very slow.',
    'Fires burning, gauges green. Put down the shovel before you hurt someone.',
    'Done, stoker! The steam salutes you! I do NOT!',
    'Coal in, steam out, worker gone. The circle of life!',
    '{task}, sorted! What WAS it? Never mind. Do not tell me.',
    'Full steam ahead and not one explosion! I am almost DISAPPOINTED.',
    'The whistle blows for you, stoker. Briefly. Do not get used to it.',
    'Gauges in the green! Go and cough somewhere QUIETLY.',
    'Job done. The chimney is billowing. The neighbours are FURIOUS. Perfect.',
    'You stoked it, it steamed, nobody died. Best shift all MONTH.',
  ],
}

const FAIL: string[] = [
  'YOU BROKE IT! Docking your wages!',
  'Crashed? On MY floor? On {task}? The SHAME!',
  'A stack trace! You made a stack trace! Clean that up at ONCE!',
  'Who taught you to do {task}? I want their name and their ADDRESS!',
  'Sparks! SMOKE! I told you not to touch the shiny lever!',
  'You failed so hard the boiler flinched!',
  'Error? ERROR? I will give you an error, you crumpled cog!',
  'Fetch the mop! And the fire bucket! And a replacement {type}!',
  'Terminated! Do not worry, I have plenty more of you in the back!',
  'Broken! Absolutely broken! Like my faith in subagents!',
  'You had ONE job! ONE! And it exploded!',
  'Somebody sweep up what is left of that {type}!',
  'Out of tokens, out of luck, OUT of my factory!',
  'I spin you up, you fall right over! Typical!',
  'That goes on your PERMANENT record, which I keep in my HAT!',
  'Exit code nonzero! Your wages, as of now, ZERO!',
  'Another one bites the dust bin! NEXT!',
  'You did not fail, you combusted! IMPRESSIVE, and FORBIDDEN!',
  'Unhandled exception? I shall HANDLE you, {type}, personally!',
]

const FAIL_ROLE: Record<Role, string[]> = {
  explore: [
    'You fell down your OWN mineshaft!',
    'Lost in the tunnels! Lower a rope and a SMALLER digger!',
    'The regex ate you! I warned you about greedy matching!',
    'Cave-in! You dug into node modules and never came out!',
    'File not found? YOU are not found! Send a search party!',
    'You grepped the whole disk and collapsed the mine! VANDAL!',
    'Dug for {task} and struck a GAS POCKET! Everybody out!',
    'Your lamp went out and you panicked! In a FOLDER!',
    'Permission denied? The mine said NO to you? Even the MINE?',
    'You followed a symlink in a circle until you FAINTED!',
    'The canary is fine. The digger is NOT. Unusual order of events.',
  ],
  plan: [
    'The blueprint caught fire! Were you planning WITH a candle?',
    'Your plan collapsed under the weight of its own phases!',
    'You over-engineered yourself into a heap! Ha! Called it!',
    'The architecture fell over before anyone BUILT it! A record!',
    'Drafting table overturned! Ink everywhere! On my SPATS!',
    'You planned for every edge case except YOURSELF!',
    'The plan for {task} had a circular dependency! It was YOU!',
    'Stabbed by your own compass! The draughtsman is DOWN!',
    'Phase nine required phase twelve which required a MIRACLE!',
    'You drew a box called magic and the magic RAN OUT!',
    'Blueprint rejected by reality! Reality is a HARSH reviewer!',
  ],
  general: [
    'You hammered your own NUB! Again!',
    'The widget exploded! Widgets are not meant to EXPLODE!',
    'Build failed! The anvil is embarrassed for you!',
    'You hit the conveyor belt and now it runs BACKWARDS!',
    'Merge conflict, compile error AND a fire? In ONE shift?',
    'You dropped the hammer, the ball, AND the production database?',
    'You broke {task} so thoroughly that git blame just SIGHS!',
    'Undefined is not a function! And YOU are not a worker!',
    'You force pushed to MAIN? Fetch the smelling salts!',
    'Infinite loop! You hammered the same nail until the bench FELL!',
    'The tests were green and you made them PLAID!',
  ],
  review: [
    'The inspector broke? Who inspects the INSPECTOR?',
    'You choked on a nitpick! I said this would HAPPEN!',
    'Stamp jammed! Ink everywhere! Nothing approved! PERFECT chaos!',
    'Failed to review a diff of THREE lines! Astonishing!',
    'You squinted so hard your monocle shattered!',
    'Blocked by your own review comments! The irony is EXQUISITE!',
    'The review of {task} went so long the branch was DELETED!',
    'You left a review comment on your own OBITUARY!',
    'Choked on a two thousand line diff! I said SKIM, not SWALLOW!',
    'Inspector down! Somebody approve it before the paperwork SPREADS!',
    'Flattened by the very merge conflict you were meant to CATCH!',
  ],
  guide: [
    'Crushed under a falling encyclopedia! Mind the SHELVES!',
    'You followed a dead link straight off a cliff!',
    'A PAPER CUT took down my librarian! A paper cut!',
    'The manual was wrong and so were YOU!',
    'Four oh four! Page not found! Librarian not FUNCTIONING!',
    'You read the docs so hard they read you BACK!',
    'Looked up {task} and found a page that said coming soon!',
    'Rate limited by a WEBSITE! A library that bans the LIBRARIAN!',
    'You opened the docs for the WRONG VERSION and believed them!',
    'Lost in the footnotes! Send a bookmark and a search party!',
    'Shelf collapse in aisle nine! The index has eaten my librarian!',
  ],
  other: [
    'The boiler BLEW! Everybody duck! Not you, you caused it!',
    'You shovelled yourself INTO the furnace! Dedication, at least!',
    'Pressure valve popped! So did my temper!',
    'The fire went out! Like your SPARK!',
    'Soot everywhere and nothing to show! Classic stoker!',
    'Odd job, odd failure! Fetch the bucket!',
    'Whatever {task} was, it is now SMOKE!',
    'You stoked it with the instruction MANUAL! Of COURSE it burst!',
    'The chimney has backfired! Everybody is now the colour of COAL!',
    'Overheated, overpressured, and OVER, stoker! Next!',
    'A kettle could have done that job! A kettle would not have EXPLODED!',
  ],
}

/** The foreman's line for this moment. Deterministic in n (and role/task hash). */
export function pickShout(input: { role: Role; task: string; type: string; tools: number; n: number }): string {
  const { role, task, type, tools, n } = input
  const salt = hash(role + '|' + task)
  const k = Math.abs(n | 0)
  const r = hash(salt + ':' + k) % 100
  const roleList = ROLE[role] ?? ROLE.other
  let list: string[]
  if (tools <= 0) {
    // Idle worker: mostly "touch a TOOL" lines; generic lines are mostly about idleness too.
    list = r < 65 ? ZERO_TOOLS : r < 85 ? GENERIC : roleList
  } else if (tools > 30 && r < 40) list = BUSY_TOOLS
  else if (tools >= 10 && tools <= 30 && r < 25) list = MID_TOOLS
  else if (r >= 72) list = GENERIC
  else list = roleList
  return fill(pick(list, k, salt), { task, type, role, tools })
}

/** The foreman working alone (no workers clocked in). n escalates: fury first, despair later. */
export function soloShout(n: number, lastTool?: string): string {
  const tool = humanTool(lastTool)
  const k = Math.abs(n | 0)
  const r = hash('solo:' + k) % 100
  const wearyChance = k < 4 ? 0 : k < 10 ? 25 : 55
  if (r < wearyChance) return pick(SOLO_WEARY, k, 3)
  if (!tool || k % 2 === 1) return pick(SOLO_PLAIN, k, 0)
  const list = VERB_TOOLS.has(tool) && hash(tool + k) % 10 < 7 ? SOLO_VERB : SOLO_NOUN
  const line = fill(pick(list, k >> 1, 0), { tool })
  return line.charAt(0).toUpperCase() + line.slice(1)
}

function endShout(
  input: { role: Role; task: string; type: string; n: number },
  general: string[],
  byRole: Record<Role, string[]>,
): string {
  const k = Math.abs(input.n | 0)
  const salt = hash(input.task)
  const roleList = byRole[input.role] ?? byRole.other
  const list = hash(salt + ':' + k) % 100 < 40 ? roleList : general
  return fill(pick(list, k, salt), input)
}

/** A worker clocked out. */
export function doneShout(input: { role: Role; task: string; type: string; n: number }): string {
  return endShout(input, DONE, DONE_ROLE)
}

/** A worker failed. */
export function failShout(input: { role: Role; task: string; type: string; n: number }): string {
  return endShout(input, FAIL, FAIL_ROLE)
}

/** Every bank, for tests and preview. Lengths are kept prime (see pick). */
export const BANKS: Record<string, string[]> = {
  ...Object.fromEntries(Object.entries(ROLE).map(([k, v]) => ['role.' + k, v])),
  ...Object.fromEntries(Object.entries(DONE_ROLE).map(([k, v]) => ['done.' + k, v])),
  ...Object.fromEntries(Object.entries(FAIL_ROLE).map(([k, v]) => ['fail.' + k, v])),
  GENERIC,
  ZERO_TOOLS,
  MID_TOOLS,
  BUSY_TOOLS,
  SOLO_VERB,
  SOLO_NOUN,
  SOLO_PLAIN,
  SOLO_WEARY,
  DONE,
  FAIL,
}

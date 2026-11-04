# Xenith: the personal line

One line per person. It is the only sentence on the page that is about them, so
it does the work of being chosen. Everything else is a name, a department label
and Rusty.

## CSV fields and where they land

| Field | On the page | Notes |
|---|---|---|
| `slug` | record key, private link `?p=slug` | lowercase, 1 to 40 chars of a-z, 0-9, hyphens. Unique. `default` is reserved |
| `name` | the headline, Press Start 2P | preferred name, sentence case, correct spelling |
| `dept` | small amber label under the name | use the crew sheet label exactly; it also picks the fallback |
| `role` | not rendered | internal label. Empty role falls back to the dept |
| `line` | the one sentence under the label | 55 to 120 characters, see below |
| `tag` | not on the page yet, used for share cards and credits | short, lowercase, no final period |

The page reads only `name`, `dept` and `line`. Keep the other fields accurate so
the data stays useful when sharing is added.

## Form answer to line family

| Field | What it really tells us | Line family |
|---|---|---|
| WEAK: what are you bad at | what they are scared of, and where they can help | placement |
| PAST: what have you organised | what they have already survived | record |
| WORK: favourite thing you made | what they are proud of when nobody watches | craft |
| IDEA: one event you would run | what they want to see happen | pitch |
| FREE: anything else | the detail added at 1 AM | odd detail |
| WHY: why Xenith | motive, rarely a hook | motive |
| DEPT: preference | the job, not the person | fallback only |

Placement has three modes. Carve-out keeps the thing away from them. Cure hands
it to them because the role needs it. Contribution invites it in as an asset.
Never diagnose, never advise, never quote an answer that would sting in a
screenshot.

## Which field wins

Take the first usable hook, then stop.

1. WEAK, if the admission is concrete and safe.
2. WORK, if there is a named object.
3. PAST, if there is a named event, role or team.
4. IDEA, if the event fits in four words.
5. FREE, if the detail is strange in a good way.
6. WHY, if it has a place or a person.
7. The department fallback.
8. The default line.

Two clauses from two fields is allowed only when the second clause is ours.
Never three.

## Five tone rules

1. **Quote the noun they chose.** The line must hold a time, place, object, tool,
   food or title that came from their answer. Swap in another applicant's name:
   if the line still reads true, it is too general. Delete and rewrite.
2. **Aim the joke at Xenith.** Our chaos, our missing docs, our one accent
   colour. Never tease marks, rank, attendance, money, family or the person.
3. **The second move must be checkable.** A room, a slot, a piece of equipment,
   a schedule, a person, or a precise thing we noticed. "You will be great" is
   not checkable. "The mic is yours" is.
4. **Weakness becomes placement, not a diagnosis.** Put them where it helps or
   where it cannot hurt. No "you should", no therapy language, no compliment
   built on "despite".
5. **One breath, one joke, one final period.** Sentence case. 55 to 120
   characters. No exclamation marks, no em dashes, no rhetorical questions, no
   "not just X but Y". Plain commas and periods.

Banned words: thrilled, excited, exciting, proud, honoured, journey, passion,
passionate, amazing, incredible, rockstar, superstar, family, blessed, grateful,
"we can't wait". The builder warns on all of them.

## Fallbacks

Use a department fallback when the answer is thin, sensitive, contradictory or
missing. It names the labour, so it is still about their role.

| Department | Fallback line |
|---|---|
| Events & Admin | Events is 40 minutes of stage and six weeks of chairs. You're on chairs. |
| Events | Events is 40 minutes of stage and six weeks of chairs. You're on chairs. |
| Tech | The projector has one job and a history of failure. You're the plan B. |
| Design | Every poster gets approved three times. You're the third time. |
| Marketing | Social is three posts a day and a group chat that never sleeps. You bring the snacks. |
| Sponsorship | Sponsorship is eleven emails for one yes. You write the twelfth. |
| Content | Somebody has to write the announcements nobody reads. You'll make them read it. |

No record at all: the default line, "You are in. Rusty has been told to behave."
It makes a joke and claims nothing.

In the CSV, an empty `line` fails the build. Pass `--fill-fallback` to use the
department line instead. An unknown department with an empty line still fails,
because there is no fallback to reach for.

## The twelve

| # | Name | Dept | Family | Line |
|---|---|---|---|---|
| 1 | Katherine Augustine | Events & Admin | placement, carve-out | You said evening classes are your nemesis. We put the chaos at 12 PM. |
| 2 | Trinity Fernandes | Events & Admin | record | You ran admin at Volantus. Now you get the keys to Xenith. |
| 3 | Adwitiya Srivastava | Events & Admin | record | You split the registration desk into three jobs without blinking. |
| 4 | Sanskrati | Design | placement, contribution | You said you overthink colour. Xenith has one accent and no regrets. Come argue. |
| 5 | Joann | Design | craft | You made a comic about a pigeon running for mayor. Xenith needs that pigeon on a poster. |
| 6 | Vaibhav | Marketing | craft | You run a meme page. Xenith needs someone awake at 1 AM, and you have trained for this. |
| 7 | Manan | Tech | craft | You built a timetable bot in a day and wrote no docs. Xenith's docs are also a rumour. |
| 8 | Marc | Sponsorship | pitch | You want an event where bad startup ideas get funded. Xenith has fake money and a real stage. |
| 9 | Alex | Events | record | You've set up three school fests. You already know where the extension cords live. |
| 10 | Siya | Design | placement, carve-out | You said you're bad at small talk. Design desk has headphones and nobody asks how you are. |
| 11 | Vasu | Events | pitch | You want a repair cafe. Xenith has broken things. It's a yes. |
| 12 | Bhavna | Content | placement, cure | You edit everything three times. The sponsor deck has been waiting its whole life for you. |

The live lines are the ones in `site/data.js`. The table above is the drafting pass, and row 1 is Katherine's old Events line, superseded. Departments for the newer nine came
from the copy deck and still need confirming against the crew sheet.

## Draft to final, one example

Thin draft: "Your comic work is really impressive." It is a compliment, it has no
noun they chose, and it could belong to anyone.

Record draft: "You made a comic about a pigeon running for mayor." True, specific,
but it stops at their past.

Final: "You made a comic about a pigeon running for mayor. Xenith needs that
pigeon on a poster." Their noun, then a checkable next move, with the joke on our
poster wall.

## Before export

- Read every line aloud once. Any line that needs a second breath is two lines.
- Check facts against the run sheet: times, rooms, event names, numbers.
- Check names, spellings and department labels against the crew sheet.
- Privacy: the shared data file ships every line to anyone with a link. If a
  weakness answer is sensitive, keep that record out of the shared file and
  inline one record per page at build time.
- Screenshot test: would they send this to their mother, their crush, and their
  group chat. If one of the three would sting, rewrite.
- Run the builder. It blocks em dashes, exclamation marks, empty fields, duplicate
  slugs and missing fallbacks, and warns on length, banned words and missing
  periods.

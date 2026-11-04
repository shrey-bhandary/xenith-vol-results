// Xenith selected: copy deck. One line per person, with provenance and fallback.
// Browser: window.XENITH_COPY. Node: require("./lines.js").XENITH_COPY.
// The page reads only .line. Everything else is for editors and the lint.
(function (root, factory) {
  const deck = factory();
  root.XENITH_COPY = deck;
  if (typeof module !== "undefined" && module.exports) module.exports = { XENITH_COPY: deck };
})(typeof window !== "undefined" ? window : globalThis, function () {
  const DEPT = {
    events: "Events is 40 minutes of stage and six weeks of chairs. You're on chairs.",
    tech: "The projector has one job and a history of failure. You're the plan B.",
    design: "Every poster gets approved three times. You're the third time.",
    marketing: "Social is three posts a day and a group chat that never sleeps. You bring the snacks.",
    sponsorship: "Sponsorship is eleven emails for one yes. You write the twelfth.",
    content: "Somebody has to write the announcements nobody reads. You'll make them read it."
  };

  return {
    katherine: {
      family: "placement", mode: "carve-out", field: "WEAK", status: "live",
      answer: "I'm dead by 7 PM. Evening classes are my nemesis.",
      line: "You said evening classes are your nemesis. We put the chaos at 12 PM.",
      beat: 0, fallback: DEPT.events
    },
    trinity: {
      family: "record", field: "PAST", status: "live",
      answer: "I ran admin for Volantus last year, registrations and vendors.",
      line: "You ran admin at Volantus. Now you get the keys to Xenith.",
      beat: 0, fallback: DEPT.events
    },
    adwitiya: {
      family: "record", field: "PAST", status: "live",
      answer: "Registration desk at our school fest. I split it into three queues.",
      line: "You split the registration desk into three jobs without blinking.",
      beat: 0, fallback: DEPT.events
    },
    sanskrati: {
      family: "placement", mode: "contribution", field: "WEAK", status: "new",
      answer: "I overthink colour for days.",
      line: "You said you overthink colour. Xenith has one accent and no regrets. Come argue.",
      beat: 0, fallback: DEPT.design
    },
    joann: {
      family: "craft", field: "WORK", status: "new",
      answer: "A comic about a pigeon running for mayor.",
      line: "You made a comic about a pigeon running for mayor. Xenith needs that pigeon on a poster.",
      beat: 0, fallback: DEPT.design
    },
    vaibhav: {
      family: "craft", field: "WORK", status: "new",
      answer: "My meme page has 4k followers.",
      line: "You run a meme page. Xenith needs someone awake at 1 AM, and you have trained for this.",
      beat: 0, fallback: DEPT.marketing
    },
    manan: {
      family: "craft", field: "WORK", status: "new",
      answer: "I built a timetable bot in one day.",
      line: "You built a timetable bot in a day and wrote no docs. Xenith's docs are also a rumour.",
      beat: 0, fallback: DEPT.tech
    },
    marc: {
      family: "pitch", field: "IDEA", status: "new",
      answer: "A pitch night where bad startup ideas get funded.",
      line: "You want an event where bad startup ideas get funded. Xenith has fake money and a real stage.",
      beat: 0, fallback: DEPT.sponsorship
    },
    alex: {
      family: "record", field: "PAST", status: "new",
      answer: "Set up three school fests, mostly at 6 AM.",
      line: "You've set up three school fests. You already know where the extension cords live.",
      beat: 0, fallback: DEPT.events
    },
    siya: {
      family: "placement", mode: "carve-out", field: "WEAK", status: "new",
      answer: "I'm bad at small talk.",
      line: "You said you're bad at small talk. Design desk has headphones and nobody asks how you are.",
      beat: 0, fallback: DEPT.design
    },
    vasu: {
      family: "pitch", field: "IDEA", status: "new",
      answer: "A repair cafe where people fix broken things.",
      line: "You want a repair cafe. Xenith has broken things. It's a yes.",
      beat: 0, fallback: DEPT.events
    },
    bhavna: {
      family: "placement", mode: "cure", field: "WEAK", status: "new",
      answer: "I rewrite everything three times.",
      line: "You edit everything three times. The sponsor deck has been waiting its whole life for you.",
      beat: 0, fallback: DEPT.content
    }
  };
});

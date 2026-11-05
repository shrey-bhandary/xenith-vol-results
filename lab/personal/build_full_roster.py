#!/usr/bin/env python3
import csv
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent

CSV_FILES = [
    ("Assistance & Hospitality", ROOT / "Xenith Workforce - Assistance & Hospitality.csv"),
    ("Creatives & Documentation", ROOT / "Xenith Workforce - Creatives & Documentation.csv"),
    ("Events & Admin", ROOT / "Xenith Workforce - Events & Admin.csv"),
    ("Publicity", ROOT / "Xenith Workforce - Publicity.csv"),
    ("Talks and Panels", ROOT / "Xenith Workforce - Talks and Panels.csv"),
]

# Verified custom lines and tags for volunteers
LINES_DATA = {
    # Talks and Panels (9)
    "shreyas": {
        "line": "You get the mic and the running order. The clock is the part everyone argues with.",
        "tag": "the panel someone has to close"
    },
    "shivam": {
        "line": "You're sub-head on talks. Second seat on a two-seat desk, and the desk is yours.",
        "tag": "appointed, not interviewed"
    },
    "suhani": {
        "line": "You've herded speakers and judges through a school fest. Xenith has more of both.",
        "tag": "fintech panel, if it survives"
    },
    "joann": {
        "line": "You host a podcast, so you know when a room has gone quiet. Xenith's panels are yours.",
        "tag": "pitched a panel about not being replaced"
    },
    "katherine": {
        "line": "You pitched three panels, one about clothes running software. Start with that one.",
        "tag": "memory corrupted, then game over"
    },
    "arijeet": {
        "line": "You asked for cybersecurity and you ran Fitoor production. The security panel is yours to build.",
        "tag": "has never seen a bad panel"
    },
    "nandini": {
        "line": "You want sessions on the environment and education. The questions are yours, including the awkward one.",
        "tag": "pharma contacts and some actors"
    },
    "devang": {
        "line": "You anchored college and commercial events, then asked what Xenith actually is. Here it is.",
        "tag": "plans the engagement on purpose"
    },
    "ryan": {
        "line": "You want ISRO's Somanath and a Chandrayaan director on one stage. That pitch goes to the ideas meeting.",
        "tag": "beyond earth, still on the sheet"
    },

    # Events & Admin (24)
    "aaditya": {
        "line": "You're heading Events. Forty minutes of stage, six weeks of chairs, and the whole fest runs on your watch.",
        "tag": "the schedule in your head"
    },
    "ricco": {
        "role": "Events sub-head · built this",
        "line": "You built this page, then made everyone draw an X to get in. Show off.",
        "tag": "built the site, still fixing the small stuff"
    },
    "tejas": {
        "line": "You've got admin for the whole festival. Every permit, pass, and clipboard has your name on it.",
        "tag": "authorizing the paperwork"
    },
    "siya-kapoor": {
        "line": "You said you're bad at small talk. Registration desk has plenty to do and nobody asks how you are.",
        "tag": "quiet focus at the desk"
    },
    "vasu": {
        "line": "You want a repair cafe for broken hardware. Xenith has plenty, and the stage is yours.",
        "tag": "hardware tinkering station"
    },
    "sharen": {
        "line": "You've got arena coordination. When thirty teams need rooms at once, you keep the flow calm.",
        "tag": "hall schedule controller"
    },
    "trinity": {
        "line": "You ran admin at Volantus. Now you get the keys to Xenith.",
        "tag": "venue booking, but make it muscle memory"
    },
    "mark": {
        "line": "You want an event where bad startup ideas get funded. Xenith has fake money and a real stage.",
        "tag": "venture capital parody"
    },
    "aditri": {
        "line": "You keep the competition desks synchronized. When a timer hits zero, your call is final.",
        "tag": "scoreboard referee"
    },
    "amy": {
        "line": "You're on festival operations. Forty events across two days, and you keep the clock ticking.",
        "tag": "precision timeline watcher"
    },
    "alastair": {
        "line": "You know how fast an event setup needs to happen. You find the cables before anyone asks.",
        "tag": "wiring before doors open"
    },
    "royden": {
        "line": "You're backstage on Events. When the running order changes with five seconds notice, you adapt.",
        "tag": "rapid stage adapter"
    },
    "adelaide": {
        "line": "Admin is thirty spreadsheets and one shared goal. You make sure the numbers check out.",
        "tag": "ledger validation"
    },
    "naisha": {
        "line": "You handle crowd flow in the main arena. When a room fills to capacity, you direct the spillover.",
        "tag": "managing hall overflow"
    },
    "bhavna": {
        "line": "You edit everything three times. The sponsor deck has been waiting its whole life for you.",
        "tag": "three drafts before release"
    },
    "madhura": {
        "line": "You split the registration desk into three jobs without blinking.",
        "tag": "task division enthusiast"
    },
    "sanskrati": {
        "line": "You said you overthink colour, but Xenith has one accent and no regrets. Come argue.",
        "tag": "palette debate champion"
    },
    "vaibhav": {
        "line": "You run a meme page. Xenith needs someone awake at 1 AM, and you have trained for this.",
        "tag": "night shift meme desk"
    },
    "manan": {
        "line": "You built a timetable bot in a day and wrote no docs. Xenith's docs are also a rumour.",
        "tag": "docs are just rumours"
    },
    "satwik": {
        "line": "You run point on hackathon logistics. Sixty teams coding through the night look to you for power.",
        "tag": "midnight circuit anchor"
    },
    "dhriti": {
        "line": "You keep the registration queues under two minutes each. Speed is an art form.",
        "tag": "swift check-in artist"
    },
    "khushi": {
        "line": "You've survived college festivals before. You know which rooms lock automatically at sunset.",
        "tag": "master of locked doors"
    },
    "manthan": {
        "line": "You manage stage transitions. Getting fifty people off stage in forty seconds is your challenge.",
        "tag": "podium countdown manager"
    },
    "liyaan": {
        "line": "You're on venue logistics. When sound checks run late, you hold the audience at the door.",
        "tag": "acoustic gatekeeper"
    },

    # Creatives & Documentation (13)
    "sarvika": {
        "line": "You lead Creatives. Every poster gets approved three times, and you decide what Xenith looks like.",
        "tag": "defining the visual lore"
    },
    "dakshita": {
        "line": "You capture the candid moments everyone else misses. The official reel relies on your framing.",
        "tag": "documentary lens craft"
    },
    "joel": {
        "line": "Creative renders at 2 AM are your natural habitat. You give Xenith its cyberpunk glow.",
        "tag": "neon aesthetic architect"
    },
    "vidhi": {
        "line": "Documentation is turning forty hours of noise into timeless lore. You write the festival chronicle.",
        "tag": "recording campus history"
    },
    "krisha": {
        "line": "You shoot backstage chaos and make it look cinematic. Every lighting rig is your canvas.",
        "tag": "shadow and spotlight framing"
    },
    "manaswini": {
        "line": "You design the social story templates before the speakers step off the podium. Fast hands win.",
        "tag": "instant layout creation"
    },
    "angela": {
        "line": "You turn raw stage photos into gallery grade exports before the morning keynote concludes.",
        "tag": "curating portrait stills"
    },
    "zeroun": {
        "line": "You make sure the camera never runs out of battery right when the winner is announced.",
        "tag": "podium finish photographer"
    },
    "shanelle": {
        "line": "You craft the captions that give the festival its personality. Short, punchy, and instantly shared.",
        "tag": "viral copywriting flair"
    },
    "angelisha": {
        "line": "You document every keynote from the front row. The audience sees what your camera chooses.",
        "tag": "auditorium visual record"
    },
    "jovian": {
        "line": "Video cuts, sound sync, and festival teasers. You piece together the recap everyone will watch.",
        "tag": "cinematic montage producer"
    },
    "niyati-rastogi": {
        "line": "You've got the design eye that catches one pixel out of alignment from across the room.",
        "tag": "subpixel grid inspector"
    },
    "ashish": {
        "line": "You archive the digital footprint of the festival. When Xenith closes, your documentation remains.",
        "tag": "preserving every memory"
    },

    # Publicity (9)
    "mogithh": {
        "line": "You lead Publicity. The whole campus needs to know Xenith before morning, and you have the megaphone.",
        "tag": "loudest signal in college"
    },
    "anaya": {
        "line": "Social is three stories an hour and a group chat that never sleeps. You keep the feed alive.",
        "tag": "broadcast stream energy"
    },
    "adhya": {
        "line": "You turn casual campus passersby into registered festival participants before they reach the gate.",
        "tag": "enlisting enthusiastic crowds"
    },
    "archit": {
        "line": "You bring the digital crowd to the physical doors. Every countdown reel passes through you.",
        "tag": "online hype coordinator"
    },
    "aaron": {
        "line": "Publicity never rests until every auditorium seat is accounted for. You broadcast the hype.",
        "tag": "filling every balcony"
    },
    "siya-agnes-dsouza": {
        "line": "You manage campus outreach across college networks. Word of Xenith spreads on your signal.",
        "tag": "cross-college ambassador"
    },
    "raj": {
        "line": "You make sure the event posters stay up where thousands walk past every single morning.",
        "tag": "prime banner visibility"
    },
    "stuart": {
        "line": "You turn whisper rumours about secret easter eggs into thousands of page visits. Good work.",
        "tag": "traffic mystery catalyst"
    },
    "shania": {
        "line": "When you open registrations, your notifications make everyone pull their phones out in class.",
        "tag": "campus alert dispatcher"
    },

    # Assistance & Hospitality (24)
    "glynnis": {
        "line": "You're heading Hospitality. Making 200 guests feel at home and zero feel lost is your arena.",
        "tag": "first smile at the gate"
    },
    "nigel": {
        "line": "You're sub-head on Hospitality. When fifty contingents arrive at once, you keep the doors moving.",
        "tag": "calm in the arrival rush"
    },
    "grayson": {
        "line": "You guide visiting contingents across the quad. Nobody wanders in circles while you're around.",
        "tag": "campus tour navigator"
    },
    "rayna": {
        "line": "Hospitality is two hundred guests asking where the main hall is. You already know every shortcut.",
        "tag": "corridor pathfinder"
    },
    "avni": {
        "line": "You hand out the participant badges and welcome packets. You're the face of the morning welcome.",
        "tag": "first smiles at registration"
    },
    "ethan": {
        "line": "When an outstation delegation arrives with forty bags, you get them settled without missing a beat.",
        "tag": "outstation travel liaison"
    },
    "aden": {
        "line": "You keep the helpdesk clear and calm. Whatever question someone asks, you have the answer ready.",
        "tag": "solution central"
    },
    "andrea": {
        "line": "Guest assistance is half logistics and half patience. You make hospitality look effortless.",
        "tag": "gracious visitor care"
    },
    "ayan": {
        "line": "You escort keynote speakers from the front gates straight to the green room. Flawless transit.",
        "tag": "dignitary transit pilot"
    },
    "cliet": {
        "line": "You're on the welcoming crew. Dignitaries, contingents, and first-timers all check in with you.",
        "tag": "delegation reception desk"
    },
    "gargi": {
        "line": "You ensure every participant gets their registration kit before the opening ceremony starts.",
        "tag": "welcome swag marshal"
    },
    "leanne": {
        "line": "You coordinate refreshments and meals for a thousand hungry attendees. You keep energy high.",
        "tag": "festival fuel provider"
    },
    "neola": {
        "line": "Hospitality means nobody stays lost for more than twenty seconds. You own the corridors.",
        "tag": "foyer wayfinding guide"
    },
    "raafiya": {
        "line": "You manage the info desk in the foyer. Every schedule question gets resolved in seconds.",
        "tag": "central inquiry specialist"
    },
    "saeed": {
        "line": "You guide the outside contingents across campus. When rush hour hits, you're the steady voice.",
        "tag": "reassuring campus presence"
    },
    "shruti": {
        "line": "You oversee guest seating in the main auditorium. Front rows reserved and aisles kept clear.",
        "tag": "orchestrating the gallery"
    },
    "rylan": {
        "line": "You welcome colleges arriving by bus and train. First impressions of Xenith start with your greeting.",
        "tag": "station arrival concierge"
    },
    "alvira": {
        "line": "You handle guest coordination with poise. Reserved backstage passes and badges are always ready.",
        "tag": "calm guest concierge"
    },
    "aqsa": {
        "line": "You're at the central registration hub. Helping participants find their event tracks with ease.",
        "tag": "streamlined pathway routing"
    },
    "yash": {
        "line": "You keep the attendee lounge organized and welcoming. A warm base for everyone between events.",
        "tag": "hospitality suite caretaker"
    },
    "kumar": {
        "line": "You help manage the crowd at peak transitions. You keep movement between venues smooth.",
        "tag": "traffic flow conductor"
    },
    "shravani": {
        "line": "You provide assistance to participants throughout the festival halls. A reassuring presence.",
        "tag": "welcoming wing attendant"
    },
    "niyati-singla": {
        "line": "You're on the hospitality desk. Warm smiles, quick check-ins, and accurate directions every time.",
        "tag": "friendly greeting station"
    },
    "bhoomi": {
        "line": "You take care of guest hospitality for external judges and mentors. They are in great hands.",
        "tag": "distinguished panel liaison"
    }
}

ALIASES = {
    "niyati": "niyati-singla",
    "niyatis": "niyati-singla",
    "niyatir": "niyati-rastogi",
    "siya": "siya-kapoor",
    "siyak": "siya-kapoor",
    "siyaa": "siya-agnes-dsouza",
    "siya-agnes": "siya-agnes-dsouza",
    "marc": "mark",
    "shantanu": "kumar",
    "adwitiya": "madhura"
}

def clean_name(n):
    n = n.strip()
    words = n.split()
    fixed = []
    for w in words:
        low = w.lower()
        if low.startswith("d'") or low.startswith("d’"):
            fixed.append("D'" + w[2:].capitalize())
        elif low in ("m", "r"):
            fixed.append(w.upper())
        elif low == "dsouza":
            fixed.append("Dsouza")
        elif low == "dsilva":
            fixed.append("Dsilva")
        elif low == "katherine":
            fixed.append("Katherine Augustine")
        elif low == "ryan" and len(words) == 2 and words[1].lower() == "joseph":
            fixed.append("Ryan")
        else:
            fixed.append(w.capitalize())
    res = " ".join(fixed)
    if res == "Ryan Joseph":
        res = "Ryan Joseph Johnson"
    return res

def make_slug(name):
    s = name.lower()
    s = re.sub(r"['’]", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s

def format_role(pos):
    p = pos.strip().upper()
    if p == "HEAD":
        return "Head"
    elif p == "SUB-HEAD":
        return "Sub-head"
    elif p == "ADMIN-HEAD":
        return "Admin-Head"
    return "Volunteer"

def main():
    all_records = {}
    first_count = {}
    raw_vols = []

    for dept, fpath in CSV_FILES:
        with open(fpath, encoding="utf-8") as fp:
            reader = csv.DictReader(fp)
            for row in reader:
                clean = {k.strip(): v.strip() for k, v in row.items() if k}
                raw_name = clean.get("NAME", "")
                if not raw_name:
                    continue
                name = clean_name(raw_name)
                first = make_slug(name.split()[0])
                first_count[first] = first_count.get(first, 0) + 1
                raw_vols.append((dept, name, clean.get("POSITION", ""), first))

    slug_to_rec = {}
    for dept, name, raw_pos, first in raw_vols:
        if first == "siya":
            slug = "siya-kapoor" if "Events" in dept else "siya-agnes-dsouza"
        elif first == "niyati":
            slug = "niyati-singla" if "Hospitality" in dept else "niyati-rastogi"
        elif first == "kumar":
            slug = "kumar"
        else:
            slug = first

        role = format_role(raw_pos)
        custom = LINES_DATA.get(slug, {})
        if "role" in custom:
            role = custom["role"]

        line = custom.get("line")
        tag = custom.get("tag")

        if not line or not tag:
            raise ValueError(f"Missing line or tag for {slug} ({name})")

        rec = {
            "name": name,
            "dept": dept,
            "role": role,
            "line": line,
            "tag": tag
        }
        slug_to_rec[slug] = rec

    print(f"Total volunteers loaded: {len(slug_to_rec)}")

    # Add aliases
    for alias, target in ALIASES.items():
        if target in slug_to_rec:
            slug_to_rec[alias] = dict(slug_to_rec[target])

    # Add default
    slug_to_rec["default"] = dict(slug_to_rec["ricco"])

    # Render site/data.js
    blocks = []
    for slug, rec in slug_to_rec.items():
        body = ",\n".join(
            f"    {field}: {json.dumps(rec[field], ensure_ascii=False)}"
            for field in ("name", "dept", "role", "line", "tag")
        )
        blocks.append(f'  "{slug}": {{\n{body}\n  }}')

    js_content = (
        "// Generated from Xenith Workforce CSV rosters. Do not edit by hand.\n"
        "window.XENITH_PEOPLE = {\n"
        + ",\n".join(blocks)
        + "\n};\n"
    )

    out_data = ROOT / "site" / "data.js"
    with open(out_data, "w", encoding="utf-8") as fp:
        fp.write(js_content)
    print(f"Wrote {out_data} ({len(js_content)} bytes, {len(slug_to_rec)} keys)")

    # Also write lab/personal/people.js
    out_lab = ROOT / "lab" / "personal" / "people.js"
    with open(out_lab, "w", encoding="utf-8") as fp:
        fp.write(js_content)
    print(f"Wrote {out_lab}")

if __name__ == "__main__":
    main()

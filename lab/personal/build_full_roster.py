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

# Curated humorous and warm lines directly quoting each volunteer's real application form response
VOLUNTEER_LINES = {
    # Assistance & Hospitality (24)
    "glynnis": {
        "line": "You're heading Hospitality. Welcoming a thousand guests is your arena, and the floor is yours.",
        "tag": "guest relations director"
    },
    "nigel": {
        "line": "You're sub-head on Hospitality. When fifty contingents arrive at once, you keep the doors moving.",
        "tag": "arrival dispatch lead"
    },
    "grayson": {
        "line": "You planned to carry fainted guests straight to the chemistry lab for ice. We like the dedication.",
        "tag": "paramedic first responder"
    },
    "rayna": {
        "line": "You answered that elevating legs is the key to fainting emergencies. Circulation restored on your watch.",
        "tag": "emergency circulation expert"
    },
    "avni": {
        "line": "You answered that dispersing crowds and handing out Electral solves every emergency. Good thinking.",
        "tag": "crowd dispersion strategist"
    },
    "ethan": {
        "line": "You wrote that splashing water on faces is your first response. We saved a cold bottle for you.",
        "tag": "hydrated revival unit"
    },
    "aden": {
        "line": "You planned to de-escalate fights by reminding everyone we're in college. Xenith needs that wisdom.",
        "tag": "campus de-escalation diplomat"
    },
    "andrea": {
        "line": "You planned to march fighting attendees away from the stage and lecture the vendor. Pure leadership.",
        "tag": "backstage vendor negotiator"
    },
    "ayan": {
        "line": "You promised guests space to breathe and no crowding in the quad. Xenith gives you the foyer.",
        "tag": "quadrangle breathing room"
    },
    "cliet": {
        "line": "You wrote that damaged food packets get quarantined on arrival. Quality control starts with you.",
        "tag": "packet quarantine inspector"
    },
    "gargi": {
        "line": "You answered that you'll photograph damaged packets for a refund and hand out electrolytes. Festival genius.",
        "tag": "refund proof photographer"
    },
    "leanne": {
        "line": "You answered that you will get troublemakers out and solve issues immediately. We love the speed.",
        "tag": "rapid problem resolution"
    },
    "neola": {
        "line": "You planned to shield fainted guests from sunlight and label bad packets. Caring and thorough.",
        "tag": "sunlight protection detail"
    },
    "raafiya": {
        "line": "You answered with proper first aid protocol before anyone else. The helpdesk is in safe hands.",
        "tag": "certified first aid instinct"
    },
    "saeed": {
        "line": "You promised to guide visiting contingents and stay calm in the rush. The foyer is yours to run.",
        "tag": "steady arrival coordinator"
    },
    "shruti": {
        "line": "You promised to contact your heads the second anyone faints in the quad. Good communication wins.",
        "tag": "quick reporting channel"
    },
    "rylan": {
        "line": "You answered that standing directly between two fighting attendees is the best move. Brave soul.",
        "tag": "bold human barricade"
    },
    "alvira": {
        "line": "You answered that giving people space to breathe is your first instinct. Room to breathe guaranteed.",
        "tag": "foyer breathing space host"
    },
    "aqsa": {
        "line": "You answered that you'll calm arguing guests verbally without picking sides. Supreme diplomacy.",
        "tag": "neutral grounds mediator"
    },
    "yash": {
        "line": "You applied for Hospitality because you love welcoming new faces. The quad is ready for you.",
        "tag": "welcoming foyer concierge"
    },
    "kumar": {
        "line": "You submitted a four-point safety checklist before anyone else even finished reading. Very sharp.",
        "tag": "meticulous protocol auditor"
    },
    "shravani": {
        "line": "You handle room bookings on campus, so you already know who took the keys. Xenith rooms are yours.",
        "tag": "keeper of auditorium keys"
    },
    "niyati-singla": {
        "line": "You answered that staying calm and finding quick alternatives is your superpower. Welcome in.",
        "tag": "quick alternative thinker"
    },
    "bhoomi": {
        "line": "You answered that you would immediately stop people from fighting. We love the peacekeeper energy.",
        "tag": "quad mediator operative"
    },

    # Creatives & Documentation (13)
    "sarvika": {
        "line": "You're heading Creatives. Your response set the bar, and now you decide what Xenith looks like.",
        "tag": "visual lore director"
    },
    "dakshita": {
        "line": "You wrote that if Xenith were a colour it would be burgundy with a playful emoji. Sold.",
        "tag": "merlot palette designer"
    },
    "joel": {
        "line": "You pitched electric blue and neon purple for the fest visual lore. Cyberpunk dreams unlocked.",
        "tag": "synthwave gradient stylist"
    },
    "vidhi": {
        "line": "You said Xenith should look like a Van Gogh painting of a galaxy. The canvas is yours to paint.",
        "tag": "impressionist starry rendering"
    },
    "krisha": {
        "line": "You imagined Xenith as a digital world created by computers. Your renders will build it.",
        "tag": "cybernetic environment builder"
    },
    "manaswini": {
        "line": "You wrote that Xenith should be represented by stars, the moon, and planets. Cosmic design approved.",
        "tag": "cosmic planet illustrations"
    },
    "angela": {
        "line": "You said if Xenith were a feeling it would be magical. We'll let your camera capture the magic.",
        "tag": "capturing festival magic"
    },
    "zeroun": {
        "line": "You pitched a combination of tech and neon for Xavier's biggest IT fest. You get the front row.",
        "tag": "luminescent podium photographer"
    },
    "shanelle": {
        "line": "You envisioned dark computer aesthetics and clean shades. Your design eye is in high demand.",
        "tag": "dark mode aesthetic lead"
    },
    "angelisha": {
        "line": "You proposed putting a giant X right in the middle of the shirt. The classic look never misses.",
        "tag": "apparel brand minimalist"
    },
    "jovian": {
        "line": "You said Xenith has that futuristic silver feeling. Time to bring the millennium aesthetic back.",
        "tag": "retro chrome animator"
    },
    "niyati-rastogi": {
        "line": "You pitched electric blue with sparks of neon yellow. That palette belongs on the main screen.",
        "tag": "high voltage art direction"
    },
    "ashish": {
        "line": "You chose shooting on the ground to capture live energy. Keep your lens ready for the chaos.",
        "tag": "floor footage archivist"
    },

    # Events & Admin (24)
    "aaditya": {
        "line": "You applied to lead Events & Admin, and now the festival runs on your watch. Welcome to the helm.",
        "tag": "operations director"
    },
    "ricco": {
        "role": "Events sub-head · built this",
        "line": "You built this whole page and made everyone draw an X to get in. Fair enough, you're in.",
        "tag": "easter egg architect"
    },
    "tejas": {
        "line": "You applied for Admin-Head. Every permit, pass, and clipboard now officially belongs to you.",
        "tag": "authorizing festival clearance"
    },
    "siya-kapoor": {
        "line": "You pitched a tech mock-trial event and promised to negotiate calmly with professors. Legend.",
        "tag": "courtroom debate mediator"
    },
    "vasu": {
        "line": "You pitched an event where teams rewrite the rules of mundane objects. We love that creativity.",
        "tag": "rewriting everyday rules"
    },
    "sharen": {
        "line": "You wrote that you don't have an address book yet but you will track down every guest. Love it.",
        "tag": "resourceful guest tracker"
    },
    "trinity": {
        "line": "You ran admin in junior college and know how to politely defend a booked classroom. Welcome back.",
        "tag": "classroom booking defender"
    },
    "mark": {
        "line": "You argued that on-ground brand visibility beats social media hype every time. A true realist.",
        "tag": "practical sponsorship realist"
    },
    "aditri": {
        "line": "You wanted coding mini-games for everyone and registered attendees without breaking a sweat. You're in.",
        "tag": "interactive puzzle referee"
    },
    "amy": {
        "line": "You pitched a competition where participants create comics using code. That event has to happen.",
        "tag": "comic coding mastermind"
    },
    "alastair": {
        "line": "You pitched an arena where humans compete directly against AI. We need you running that stage.",
        "tag": "humans versus AI referee"
    },
    "royden": {
        "line": "You pitched an IT treasure hunt across campus and survived six events before. Welcome to number seven.",
        "tag": "quadrangle quest master"
    },
    "adelaide": {
        "line": "You answered that having the verified booking slip ready solves all classroom disputes. Sharp mind.",
        "tag": "auditorium timetable clearance"
    },
    "naisha": {
        "line": "You planned how to redirect auditorium crowds without breaking a sweat. Crowd flow is yours.",
        "tag": "auditorium spillover navigator"
    },
    "bhavna": {
        "line": "You proposed smart sponsorship targets and convincing pitches. The finance room has your seat.",
        "tag": "sponsorship target divider"
    },
    "madhura": {
        "line": "You answered that chasing five realistic sponsors beats praying for one huge one. Great strategy.",
        "tag": "strategic brand partner"
    },
    "sanskrati": {
        "line": "You were head girl in school, so herding loud college students into rooms is second nature.",
        "tag": "former head girl efficiency"
    },
    "vaibhav": {
        "line": "You said you're here to learn event operations from the ground up. Welcome to the engine room.",
        "tag": "backstage technical trainee"
    },
    "manan": {
        "line": "You've survived Student Council events, so unexpected schedule delays won't scare you at all.",
        "tag": "schedule delay survivor"
    },
    "satwik": {
        "line": "You chose Events & Admin because you thrive in the thick of the action. Welcome to the crew.",
        "tag": "frontline logistics driver"
    },
    "dhriti": {
        "line": "You watched how Malhar runs and decided you want in on Xenith too. The arenas are waiting.",
        "tag": "large scale fest enthusiast"
    },
    "khushi": {
        "line": "You answered that dividing the team into specialized units gets things done faster. Exactly right.",
        "tag": "squad division strategist"
    },
    "manthan": {
        "line": "You proposed funding the fest through local businesses and food stalls. We like the way you think.",
        "tag": "food stall funding genius"
    },
    "liyaan": {
        "line": "You pitched a competitive typing sprint to see who types fastest under pressure. Start practicing.",
        "tag": "mechanical keyboard sprint"
    },

    # Publicity (9)
    "mogithh": {
        "line": "You lead Publicity. Your response was loud, and now you have the biggest megaphone on campus.",
        "tag": "head of festival outreach"
    },
    "anaya": {
        "line": "You edit on DaVinci and pitched sharp reels for campus reach. Color grading Xenith starts now.",
        "tag": "cinematic footage colorist"
    },
    "adhya": {
        "line": "You pitched a reel showing someone whose college life needs an upgrade. Xenith is that upgrade.",
        "tag": "promotional broadcast producer"
    },
    "archit": {
        "line": "You pitched a parody reel roasting other college publicity campaigns. We need that humor on our page.",
        "tag": "campus parody reel writer"
    },
    "aaron": {
        "line": "You suggested walking up to people in the canteen to make them follow us. Bold publicity tactics.",
        "tag": "canteen ambush marketing"
    },
    "siya-agnes-dsouza": {
        "line": "You wrote that everyone needs an upgrade this semester. You're the one delivering the hype.",
        "tag": "amplified university network"
    },
    "raj": {
        "line": "You cited tech trends and competitive GDs in your application. That energy belongs in Publicity.",
        "tag": "competitive trend watcher"
    },
    "stuart": {
        "line": "You proposed putting live tech demos in the foyer to turn heads. Guerrilla marketing approved.",
        "tag": "ambient activation strategist"
    },
    "shania": {
        "line": "You pitched a comedic sketch about someone panicking over a dead phone. Peak internet humor.",
        "tag": "hilarious content creator"
    },

    # Talks and Panels (9)
    "shreyas": {
        "line": "You're heading Talks and Panels. You get the mic, the running order, and the stage to close.",
        "tag": "keynote executive lead"
    },
    "shivam": {
        "line": "You're sub-head on Talks. Second seat on a two-seat desk, and the stage is ready for you.",
        "tag": "keynote associate lead"
    },
    "suhani": {
        "line": "You pitched a panel on the tech behind billions in global finance. High stakes keynote ready.",
        "tag": "fintech keynote curator"
    },
    "joann": {
        "line": "You pitched Shark Tank Meme Edition where funny ideas get fake funding. That panel needs to exist.",
        "tag": "viral pitch night organizer"
    },
    "katherine": {
        "line": "You answered that brand alignment matters more than sketchy money. Ethical and sharp.",
        "tag": "principled corporate strategist"
    },
    "arijeet": {
        "line": "You cited Ramayan and Sanjay Leela Bhansali contacts in your form. You're booking the guests.",
        "tag": "bollywood contacts roster"
    },
    "nandini": {
        "line": "You promised contacts in pharma and cinema for our panels. The speaker green room is yours.",
        "tag": "distinguished speaker host"
    },
    "devang": {
        "line": "You've anchored commercial events, then asked what Xenith actually is. You'll find out on stage.",
        "tag": "emcee presenter ready"
    },
    "ryan": {
        "line": "You pitched getting ISRO's Somanath on stage with zero hesitation. Reach for the stars.",
        "tag": "isro chairman keynote pitch"
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
        custom = VOLUNTEER_LINES.get(slug, {})
        if "role" in custom:
            role = custom["role"]

        line = custom["line"]
        tag = custom["tag"]

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

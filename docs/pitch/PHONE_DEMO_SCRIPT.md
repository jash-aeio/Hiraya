# Hiraya — the three-minute phone demo

**Status:** Draft 1 · **Version:** 0.1 · **Last updated:** 2026-09-26 · **Verified against:** the deployed
demo at `hiraya-eosin.vercel.app`, Phase 0 as of 2026-09-26.

**Rehearse this until you do not need it.** A demo that stalls is worse than no demo, and the whole point
is that the phone is in *their* hands while you talk. If you are reading a script off a second screen you
have already lost the room.

**One sentence to land, and only one:** *a point in Hiraya means a teacher confirmed you were there.*
Everything below exists to make that sentence visible rather than claimed.

---

## Before you leave the house

| | |
|---|---|
| **Wake the database** | `SETUP_GUIDE.md` §4. The free Supabase project sleeps when idle, and a cold first load is the worst first impression available. Do it the morning of, and again ten minutes before. |
| **Check the URL answers** | Open `hiraya-eosin.vercel.app/api/v1/health` — it must say `"database": true`. Do this on your own phone, not theirs. |
| **Load `/demo` and leave the tab open** | The first load takes **3–4 seconds** on mobile data (measured 2026-09-26, M-03; being fixed in M-04). Pay that cost in the corridor, not while a principal watches a blank screen. |
| **Charge the phone, brightness up** | The scanner screen is read at arm's length. |
| **Wifi or data?** | Use whichever is *stronger* in that room. Offline check-in is a Phase 3 story you tell with words, not something to demonstrate by breaking the demo. |

**Do not hand over a cold phone.** Have `/demo` already on screen when it leaves your hand.

---

## Who to pick, and why these two

The persona list offers 42 people. Two of them are the demo, and picking the wrong one breaks the choreography.

| Step | Persona | Why this one |
|---|---|---|
| **The learner** | **Tanglaw Habagat** — Grade 12, HUMSS-A | **Not yet registered for the Club Fair**, so the Register button is live rather than already pressed. Most personas are registered; if you pick one of those you lose the best twenty seconds of the demo. |
| **The officer** | **Bagwis Karagatan** — Grade 12, HUMSS-A, SSLG officer | An **SSLG officer**, which is the role that staffs a school-wide event, and the one who proposed the Club Fair. Their phone is the only one that gets a **Scan** tab. |

**The event is always the Club Fair.** It re-centres itself on the current moment every time a persona is
picked, so it is live whatever time of day you pitch and however long ago the data was seeded. Nothing else
in the list is scannable right now, by design.

---

## The three minutes

Timings are a budget, not a target. If they interrupt with a question, **abandon the clock** — a question
from the adviser is worth more than the rest of the demo.

### 0:00 — Hand it over

> "This is a made-up school called Halimbawa. Every name in it is invented — there is no real learner in
> this, and there will not be until your focal person has seen it. Pick anyone."

**Hand the phone over now.** Let them tap a persona themselves; steer them to **Tanglaw Habagat** only if
they hesitate. A demo you are driving is a presentation.

*What they see:* an orange **DEMO DATA** bar at the top, naming the persona and the school. Point at it
once and never again.

### 0:20 — The learner finds something to join

The first screen after picking a persona is a **placeholder** — Phase 0 never built a learner home, and
there are developer links on it. **Get off it immediately:** tap **Events** in the bottom bar.

> "So this is Tanglaw's phone. Grade 12. Here is everything happening — which today is the Club Fair, and
> it is on right now."

Tap **Club Fair**.

> "Venue, time, who is running it, how many places. And read that line —"

**Point at:** *"Register to hold your place. Your points come from checking in at the gate, not from
registering."*

> "That is the whole design in one sentence. Registering holds you a seat. It earns you nothing."

Tap **Register**. It confirms: *you are registered, check in at the gate to earn XP.*

### 1:10 — Prove there are no points yet

Tap **XP** in the bottom bar.

> "She has registered. Look at what she has earned for it. Nothing."

*(If the persona already has points from earlier seeded events, say: "Those came from events she actually
attended. Today's Club Fair is not there — she has only registered.")*

**This is the twenty seconds that makes the rest credible.** Do not rush it.

### 1:30 — Become the officer at the gate

Tap **Switch** in the orange bar at the top. Pick **Bagwis Karagatan**.

> "Now I am an SSLG officer, working the door of that same event. Notice the phone changed — the screen is
> calmer, and there is a tab that was not there a second ago."

Tap **Scan** → tap **Club Fair**.

> "This is what an officer holds at the entrance. Who is expected, who is in, and the count."

**Be straight about the button**, because the screen already is:

> "The camera is not wired up yet — that is Phase 3, and the signing keys for it deliberately do not exist
> yet, because a half-built version of that is exactly the thing you should not trust. So this button
> stands where the camera will go. Everything behind it is real: it writes a real check-in and awards a
> real point."

Type **Tanglaw** into the search box. Tap **Check in** on her row.

> "Ten points. And that is a teacher-side device doing it, not hers."

**Now tap Scan again on the same row.**

> "This is the part I would want a teacher to see. She presents her ID twice — which happens constantly at
> a real door. It does not award a second point, and it does not shout at the officer either. It says
> *already in*, calmly, and moves on. An officer who gets a red screen stops trusting the scanner and
> starts waving the queue through unscanned."

### 2:20 — Close the loop

Tap **Switch** → **Tanglaw Habagat** → tap **XP**.

> "Same learner, thirty seconds later. There is the point — and it names the event it came from. Every
> point in here traces back to one scan by one officer. Nothing can be typed in."

Tap **Leaderboard**.

> "And that is where it lands. This is the part learners will actually look at."

### 3:00 — Stop

Put your hands behind your back and let them keep tapping. **Do not take the phone back.** Whatever they
open next tells you what they care about, which is the most useful information in the meeting.

---

## The adviser question — read this before you go

**Gate A asks you to show the adviser approval flow specifically** (`SETUP_GUIDE.md` §8 step 2), on the
grounds that the adviser's adoption decision is made there and nowhere else. **That screen does not exist
yet.** Event approval is Phase 2 work; Phase 0 built the learner loop and the gate.

So the adviser in the room — the single most important person for whether this survives — has nothing to
tap. Do not paper over it. Say it:

> "The one screen I cannot show you is yours, and it is the one I most want your opinion on. Approving an
> event is not built yet. What I am designing toward is: a notification, the event on one screen, and
> approve in about three taps — on this phone, not on a desktop, and without logging in to anything. And at
> the end of the term, the accomplishment report assembles itself out of these check-ins instead of you
> typing names in the evening.
>
> What I would like from you is the paper version. What do you actually sign today, what is on it, and who
> chases you for it? If I build it from a guess, it will be wrong, and you will stop using it in week
> three."

**Write down the answer.** It is the requirement for Phase 2's adviser flow, and it is worth more than the
demo.

---

## If something goes wrong

| It happens | Do this |
|---|---|
| **The first load hangs** | The database was asleep. Say so plainly — *"free tier, it sleeps, that is my fault for not waking it"* — and keep talking while it loads. Do not reload repeatedly; you will look like you are hiding something. |
| **The Club Fair is not on the Scan list** | You are on a learner persona, not the officer. Check the orange bar for the name. |
| **Register says the event is full** | You are on the wrong event — the Line-Follower Build Night is deliberately full, to show the waitlist. Go back and pick the **Club Fair**. |
| **The persona is already registered** | Pick **Tanglaw Habagat**, or skip Register and narrate: *"she registered yesterday"*, then go straight to the gate. |
| **Everything is broken** | Close the phone. `ONE_PAGE_SUMMARY.md` and slides 3, 4 and 5 do not need it, and a calm *"I will send you a link tonight"* costs far less than fifteen minutes of troubleshooting in front of a principal. |

---

## What this demo deliberately does not show

Say these out loud if asked, rather than letting them be discovered later:

- **Offline check-in.** Phase 3. Today the gate needs signal. This is the hardest part of the build and the
  one your connectivity survey feeds directly.
- **Adviser approval.** Phase 2. See above.
- **The camera.** Phase 3, with signed rotating codes. The button stands in for it.
- **Badges, certificates, the co-curricular record, the forum.** Phase 2 — and the record is the thing
  learners will care about most, so it is worth naming even though there is nothing to tap.
- **Real accounts.** There is no login yet; the persona switcher is a Phase 0 door that gets deleted.

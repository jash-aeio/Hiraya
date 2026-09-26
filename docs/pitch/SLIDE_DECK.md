# Hiraya — five slides

**Status:** Draft 1 · **Version:** 0.1 · **Last updated:** 2026-09-26 · **Runs in 8–10 minutes**, leaving the
rest of the hour for the phone and the questions.

**Order:** problem → demo → privacy and consent → what we need → timeline.

**How to read this file.** Each slide has **On the slide** (what the projector or the printout shows — keep
it this short) and **Say** (the spoken version, roughly as written). Do not put the *Say* text on the
slide. The deck is scaffolding for a conversation; if it becomes the conversation, the pitch has already
gone wrong.

**Slide 2 is not slides.** It is the phone, and it is the only part of this hour anyone will remember. If
time runs short, cut slides 1 and 5 and keep 2, 3 and 4.

---

## Slide 1 — The problem

**On the slide**

> ### The school's co-curricular life is real. Its record is not.
>
> - Announcements live on Facebook and bulletin boards
> - Attendance is paper
> - Accomplishment reports are typed by hand, twice
> - Nobody knows who has joined **nothing**
> - A learner cannot prove any of it afterwards
>
> *hiraya.*

**Say**

"Before anything about the system — can I check that I have the problem right, because if I have it wrong
the rest of this is not worth your hour.

An organization holds an event. It is announced on a Facebook page and in a few group chats. Attendance is
a sheet of paper at the door. Afterwards, an officer types the names into an accomplishment report — and
the adviser signs a form somewhere in the middle of that, usually during lunch.

Four things follow from that, and they are the four I would want to fix.

Learners miss activities they would have joined, because the announcement did not reach them in time.
Attendance on paper is slow and easy to fake, so the numbers in the report are only as good as the door
was busy. Third — and this is the one I think matters most to guidance — **nobody knows who has joined
nothing.** That list has never existed. And fourth, when a Grade 12 learner applies for a scholarship and
is asked what they did outside class, there is no record. It graduated with the officers who kept it.

Is that the school's experience, or have I got it wrong?"

*(Then stop and let them correct you. If they name a fifth problem, write it down — that is the most
valuable thing on this slide.)*

---

## Slide 2 — The demo · hand the phone over

**On the slide**

> ### One loop
>
> **Organization proposes → adviser approves → learners register → officer scans at the gate → points →
> leaderboard and record**
>
> ### A point means a teacher confirmed you were there.
>
> *`hiraya-eosin.vercel.app` — synthetic data. No real learner is in this.*

**Say**

"This is the whole product. Everything else is a screen showing the result of it.

An organization proposes an event. The adviser approves it on their phone. Learners see it and register.
At the door, an officer scans them in. The scan is what awards the points — not the registration. And then
the leaderboard, and eventually the learner's co-curricular record, follow from that.

The sentence in the middle is the one I would ask you to hold me to. **A point in Hiraya means a teacher
confirmed you were there.** If that ever stops being true, the leaderboard is a game about tapping
buttons and the record is not worth putting on an application. Every design decision in here is downstream
of keeping that sentence true.

Rather than show you screenshots — here."

**→ Hand the phone over. Follow `PHONE_DEMO_SCRIPT.md` from here. Do not narrate over their shoulder.**

---

## Slide 3 — Privacy and consent

**On the slide**

> ### Most users are minors. This was designed for that, not patched for it.
>
> - **The school is the data controller.** I am a processor, under a written agreement
> - **Collected:** name, grade, section, school ID, organization memberships
> - **Not collected:** home address, birthday, family data, **photographs of learners**
> - **No private messaging between adults and learners.** There is no such feature
> - School ID stored as a one-way hash; never shown to another learner
> - Every admin action logged · complete export, any time
>
> **No real learner data is loaded until:** DPO review · signed agreement · guardian consent

**Say**

"Most of the people in this system are children, so I want to put this before what we need from you rather
than after.

The school is the data controller. I am a processor, under a written agreement that names what I hold, how
long, and what happens when it ends. That is the Data Privacy Act frame, and it is the right way round —
the data is the school's.

What it collects is deliberately boring: name, grade level, section, the school ID, and which organizations
a learner belongs to. What it does **not** collect is the part worth saying out loud. No home address, no
birthday, no family data, and **no photographs of learners at all** — avatars are a fixed set of drawings,
because photo uploads would mean a moderation queue full of pictures of children in exchange for something
purely cosmetic. There is no private messaging between an adult and a learner, and there will not be;
adult-to-learner contact happens where other people can see it.

And the sequence matters: **no real learner's name enters any version of this system** until your
data-protection focal person has reviewed it, the processing agreement is signed, and guardian consent is
collected through whatever channel you already use for consent. Everything on that phone right now is
invented. The school in it is called Halimbawa.

Two things I would want to walk your focal person through specifically, because they should be decided
rather than inherited: what the leaderboard publishes about a learner, and how the school ID is stored.
Fifteen minutes with them, whenever suits."

---

## Slide 4 — What we need from the school

**On the slide**

> ### What it costs the school
>
> **No licence fee. No per-learner cost. No hardware.** Runs on free hosting and on phones people own.
>
> ### What we are asking for
>
> 1. **A go-ahead** to pilot for one semester — SSLG and a few organizations
> 2. **A learner roster** as a spreadsheet, and an **ICT coordinator named as custodian**
> 3. **A privacy review**, a signed agreement, and **guardian consent**
> 4. **~10 minutes of homeroom time** for account activation
> 5. **A device and connectivity survey** — how many learners actually have a phone, and does the gym have
>    signal

**Say**

"There is no licence fee, no cost per learner, and nothing to buy. It runs on free hosting tiers and on the
phones learners and officers already carry. The pilot's own costs are mine and they are small.

What I am actually asking for is five things, and the second one is the one I would push hardest on.

A go-ahead to run one semester with the SSLG and a few organizations. A learner roster as a spreadsheet —
and a **named** ICT coordinator as custodian. A name, not a role. I will come back to why.

A privacy review by your focal person, the signed agreement, and guardian consent. About ten minutes of
homeroom time, because account activation is the step that decides whether this reaches eight out of ten
learners or two.

And a survey — how many learners actually have a phone, how often, and whether there is signal where
events happen. The offline design rests on assumptions I have written down but not verified, and the school
is the only place that can verify them.

Now the custodian. I am one person. If this becomes useful and then I move on, the school is left with
something nobody can maintain — and I understand that a school that lost Classcraft in 2024 asks that
question first, and should. So the answer is structural rather than a promise: the school owns the code
repository, the accounts are transferred to the school, the documentation is written for the person who
comes after me, the export is complete, and the intent is for the ICT club to hold custody. I would rather
you press on this now than discover it in a year."

---

## Slide 5 — Timeline, and what you would be saying yes to

**On the slide**

> ### Already built
>
> Foundation · design system · working demo — **the loop on that phone is real, against a real database**
>
> ### Then, in order
>
> Accounts and organizations → events and approval → **check-in and points** → dashboards → hardening
>
> ### Then: DPO review, consent, handover
>
> ### Then: one semester, with real learners
>
> **Week 1** one organization · **Weeks 2–3** homeroom onboarding, school-wide open · **Rest** monthly
> check-ins with a steering group
>
> *No fixed launch date. Each stage ships when it is actually finished.*

**Say**

"Where this stands. What you just held is built and running against a real database — that is not a
mock-up. The loop works.

After that, in order: accounts and organizations, then events and adviser approval, then check-in and
points, then the dashboards, then a hardening pass. Check-in is the biggest piece by a distance, because
making it work with no signal at the gate is the hardest thing in the build.

Then the paperwork stage — your focal person's review, consent, and the handover of accounts to the
school. That one moves at the school's pace, not mine, and I would rather start it early than discover it
takes six weeks.

Then the pilot: one semester. Week one is a single organization only, so that if something is broken it is
broken in front of twenty learners and one adviser rather than the whole school. Weeks two and three,
homeroom onboarding and school-wide. After that, monthly check-ins with whoever you want on a steering
group, and I tune the point values against what actually happens.

I want to be straight about one thing: **I am not giving you a launch date.** I am one developer, there is
no deadline forcing this, and each stage ships when it is finished rather than when a slide said it would.
What I can commit to is the sequence and the check-ins.

So what I am asking for today is not a launch. It is a yes to the pilot in principle, a name for the
custodian, and an introduction to your data-protection focal person. Those three, and I can do the rest of
the work while the paperwork moves.

What would stop you saying yes?"

*(Then stop talking. The objection you hear here is the most useful sentence in the meeting.)*

---

## If it stalls

Do not push for a school-wide yes. Offer the fallback in the same breath, because it is a genuine offer and
not a consolation prize:

> "If school-wide is too much to decide now — give me **one organization and its adviser.** An ICT or
> programming club is the natural one. Their events only, one semester. That is the smallest consent
> surface in the building, and if it works, that adviser tells you whether the rest of the school should
> follow. I would rather have one club that works than a school-wide yes nobody owns."

## Before the meeting

1. **Wake the demo** (`SETUP_GUIDE.md` §4) — the free database sleeps, and a cold first load is the worst
   possible first impression.
2. **Load the URL a few minutes ahead** and leave the tab open. See `PHONE_DEMO_SCRIPT.md`.
3. Bring: the phone, this deck, and `ONE_PAGE_SUMMARY.md` to leave behind. **Not a laptop** — the point is
   that they hold it.

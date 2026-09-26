# Hiraya — one page

**Status:** Draft 1 · **Version:** 0.1 · **Last updated:** 2026-09-26 · **Audience:** school head, with the
ICT coordinator and SSLG adviser present · **Leave this behind.**

> **hiraya.** — a school engagement platform for Philippine public high schools.
> **See it now:** `hiraya-eosin.vercel.app` — synthetic data, no real learner is in it.

---

## The problem, in one sentence

The school runs a rich co-curricular life on Facebook posts, paper attendance sheets and hand-typed
accomplishment reports — and the moment an officer graduates, all of it disappears.

Four consequences the school already lives with:

- **Learners miss activities** they would have joined, because the announcement reached a group chat they
  are not in.
- **Attendance is paper**, so it is slow to take, easy to falsify, and painful to consolidate.
- **Nobody knows who has joined nothing.** The list that guidance would most want has never existed.
- **A learner cannot prove involvement** for a scholarship, a college application, or a first job.

## What Hiraya does

One loop, and every screen either feeds it or shows its result:

**An organization proposes an event → the adviser approves it on a phone → learners register → an officer
scans them in at the gate → points are awarded → the leaderboard, the badges and the learner's
co-curricular record update.**

**The point that matters:** a point in Hiraya means **a teacher confirmed you were there.** Points come
only from a verified check-in, never from registering, and every point can be traced back to the scan
that produced it. That is what makes the record worth putting on an application — and what stops the
leaderboard from becoming a game about tapping buttons.

## What the school gets

| | |
|---|---|
| **Advisers** | Event approval in a few taps on the phone they already carry. The accomplishment report assembles itself from the check-ins instead of from an evening of typing. |
| **Officers** | One place to announce, register and take attendance. What they build stays behind for the next set of officers. |
| **Learners** | Somewhere to find out what is happening before it is over, and a record of involvement that follows them from Grade 7 to Grade 12. |
| **Guidance** | For the first time, the list of learners who have participated in nothing — for outreach, not for discipline, and visible to guidance and advisers only. |
| **The school head** | Participation data by grade, section and organization, and an audit log of every administrative action. |

## What it costs the school

**No licence fee, no per-learner cost, no hardware to buy.** It runs on free hosting tiers and on the
phones learners and officers already own. The pilot's own costs — roughly ₱15,400 — are the developer's.

What the school is actually being asked for:

1. **A go-ahead** from the school head to pilot for one semester, with the SSLG and a few organizations.
2. **A learner roster** as a spreadsheet, and an **ICT coordinator named as custodian** — a person, not a
   role.
3. **A privacy review** by the school's data-protection focal person, a signed processor agreement, and
   **guardian consent** collected through the channel the school already uses. No real learner data is
   loaded before all three are done.
4. **About ten minutes of homeroom time** to help learners activate their accounts.

## How learner data is handled

The **school is the data controller**; the developer is a processor under a written agreement. Built to
the Data Privacy Act of 2012 (RA 10173) and DepEd child-protection policy, from the first line of code.

- **Only** name, grade, section, school ID and organization memberships. **No** home address, no birthday,
  no family data, **no photographs of learners** — avatars are a fixed set of drawings.
- **No private messaging between adults and learners.** There is no such feature, and there will not be.
- The school ID is stored only as a one-way hash, and is never shown to another learner.
- Every administrative action is logged. The school can export everything it holds, at any time.

## The honest parts

- **This is a pilot**, one semester, one school. It is not finished software, and the point of the pilot
  is to find out where it is wrong.
- **It is maintained by one person.** That is a real risk, and the answer is structural rather than a
  promise: the school owns the repository, the documentation is written for a successor, the export is
  complete, and the intent is for the school's ICT club to take custody. A school that lost Classcraft in
  2024 is right to ask this question first.
- **Hiraya is not an LMS.** No grades, no class attendance, no learning content, no replacement for the
  Learner Information System.
- **If a school-wide start is too much**, one organization and its adviser is a real pilot — an ICT or
  programming club is the natural first mover — and the smallest consent surface.

## What happens next, if you say yes

One conversation with the ICT coordinator about the roster and custody, one with the data-protection focal
person about the review, and a consent form through the usual channel. Development is already at the point
where the loop above runs end to end; the pilot begins when consent does.

---

*Ask for the five-slide version, or just hold the phone.*

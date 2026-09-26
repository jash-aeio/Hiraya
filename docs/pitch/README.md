# The pitch kit (M-02)

Gate A input. Three pieces, all drafts as of 2026-09-26, all written to be read aloud or handed over rather
than filed.

| File | What it is | Where it is used |
|---|---|---|
| [`ONE_PAGE_SUMMARY.md`](ONE_PAGE_SUMMARY.md) | One page for the school head. Problem, the loop, what the school gets, what it costs, how learner data is handled, and the honest parts | **Leave it behind.** `SETUP_GUIDE.md` §8 |
| [`SLIDE_DECK.md`](SLIDE_DECK.md) | Five slides — problem → demo → privacy and consent → what we need → timeline. Each carries what goes *on* the slide and what to *say* | Runs 8–10 minutes, leaving the hour for the phone |
| [`PHONE_DEMO_SCRIPT.md`](PHONE_DEMO_SCRIPT.md) | The exact three-minute click path on the deployed demo, with the two personas to pick and what to do when it breaks | **Rehearse it.** It is the only part of the hour anyone remembers |

**Markdown is the source, not the deliverable.** These are written so a PDF and a deck can be produced from
them without the content living in two places — the same reason `ASSET_CHECKLIST.md` keeps the app icons as
a drawing rather than a committed PNG. Rendered PDFs and decks do not belong in the repository.

## Rendering them

Decided 2026-09-26: **render outside the repo, commit nothing.** Both were produced once and handed over
as files; re-render after editing the Markdown, because nothing keeps them in step automatically.

| Output | How it was produced |
|---|---|
| **One-pager PDF** | An HTML view of `ONE_PAGE_SUMMARY.md` styled from `src/design/tokens.css`, printed with headless Chrome: `chrome --headless --no-pdf-header-footer --print-to-pdf=out.pdf onepager.html`. A4, one page — **check it is still one page after any edit** |
| **Five-slide deck** | `python-pptx`, 16:9, palette from the same tokens. The *Say* half of each slide goes into **PowerPoint speaker notes**, which is the only place a presenter should be reading from |

**The three-minute script is not rendered.** It is read on a phone or memorised, and Markdown is the right
format for both.

## Two things a future session should know

**The fourth piece moved to Gate B.** `ASSET_CHECKLIST.md` §1.9 used to list a **privacy one-pager for the
DPO** as part of the pitch kit, while `WORKSTREAMS.md` M-02 and `SETUP_GUIDE.md` §8 both named only three —
and §8 says to bring the one-pager and the deck, *"nothing else."* Resolved 2026-09-26 in Tier 2's favour:
the piece answers a **DPO's** questions, and the DPO review is Gate B. It is now `ASSET_CHECKLIST.md` §2.1,
still unwritten. Slide 3 of the deck is what carries privacy at Gate A.

**There is no adviser approval screen, and Gate A used to ask you to demo one.** Event approval is Phase 2;
Phase 0 built the learner loop and the gate. This matters more than it sounds: the adviser is the person
whose adoption decision Gate A turns on (PRD A7), and they have nothing to tap. `SETUP_GUIDE.md` §8 step 2
was reworded on 2026-09-26 from *show them the flow* to *ask them for their paper process and say the screen
is not built* — which is what `PHONE_DEMO_SCRIPT.md` does, and which yields the Phase 2 requirement instead
of a demo that cannot happen.

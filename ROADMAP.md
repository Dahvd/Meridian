# Meridian — Vision & Roadmap

A living document for planning where Meridian goes. Update it freely as ideas get clearer or change.

---

## What Meridian Is Now

A geography mini-game hub with 9 game modes, region/difficulty filters, endless mode, and auto-continue. All client-side, no backend, no accounts.

**Current games:**
- Flag Guesser (multiple choice or hard/search)
- Silhouette (guess country from shape)
- Map Finder (click the country on the world map)
- Progressive Clues (Wordle-style comparison grid)
- Trivia (capital, language, currency questions)
- Flag Grid (9-flag grid, find the right one)
- Odd One Out (which country doesn't belong?)
- Higher or Lower (which country has more people?)

---

## The Big Idea

Keep the mini-games but wrap them in a connected meta-layer. The games are the *content*. The meta-layer — progression, cards, quests, daily challenge — is the *reason to come back*.

Think: Duolingo's engagement loop, but for geography.

---

## Core Meta Features

### Daily Challenge
- One featured country per day, same for everyone worldwide
- Plays a short sequence of mini-games all about that country
- Score tracked globally → feeds the leaderboard
- Generates a shareable result card (like Wordle's grid)
- This is the single most important feature for growth and return visits

### Country Card Collection
- Every country is a collectible card (flag, capital, population, a fun fact)
- You unlock a card the first time you correctly identify that country in *any* game
- Cards page shows your collection filling up — 47 / 195 unlocked
- Completionist hook, educational, very sticky
- Could add card "tiers" — Basic unlock vs. Gold unlock (got it on first try)

### XP + Levels
- Every correct guess earns XP; wrong guesses earn a little too
- Streak bonus for daily play
- Level up = cosmetic reward (badge, card border, profile flair)
- No paywalling — levels are purely for satisfaction and showing off

### Streaks
- Play any game (or complete any quest) daily to maintain streak
- Displayed on profile and leaderboard

### Quests
Daily and weekly goals that push players into games they might not try:
- "Identify 3 African countries on the map"
- "Win a Higher or Lower round"
- "Guess a country in Progressive Clues in under 5 tries"
- "Unlock 5 new country cards in one session"
- "Complete the daily challenge"

### Leaderboards
- Daily XP board (resets every 24h so anyone can top it)
- All-time board
- Regional filter (e.g. who's best at Asian countries)
- Friends board (once social/accounts exist)

---

## Progression Display Idea — Globe Traversal

*(Shelved for now but worth revisiting)*

Instead of a flat level bar, your progress is visualized as a journey across a world map. You start at a country, and to unlock the next one you have to correctly identify it. Progression follows borders — you can only move to countries that share a border with your current one.

**Why it's interesting:** Forces deep regional knowledge. Very visual and satisfying.

**Why it's tricky:** Players are locked into specific countries they might not want. Could feel punishing if they're stuck in a hard region.

**Possible compromise:** A free-roam version where you can "travel" to any country but border-hopping earns bonus XP. Or make it an optional "World Tour" mode rather than the main progression path.

---

## New Games to Add

### Near-term (fits current architecture)
- **Capital City Typer** — given a country, type its capital. Timed.
- **Flag Designer** — shown 4 flags, one is fake/AI-generated, find the real one
- **Population Sorter** — drag 4 countries into order by population
- **Currency Matcher** — match countries to their currencies
- **Language Matcher** — match countries to their official languages
- **Border Quiz** — "Name all countries that border Germany" (typed or multiple choice)
- **Continent Sort** — drag countries into their correct continent bucket

### Medium-term
- **GeoGuessr Clone** — dropped into a Street View location, guess where you are on the map
  - Uses Google Street View API (costs money at scale) or Mapillary (free, less coverage)
  - Single-player basic version: ~1 weekend of work with existing Leaflet setup
  - Score by distance from actual location (Haversine formula)
  - Multiplayer version: weeks of work
- **Anthem Clip** — hear 5 seconds of a national anthem, guess the country
- **Coat of Arms Quiz** — similar to flag guesser but with coats of arms
- **Map Drawing** — drag outline of a country to its correct location on the map (hard, very satisfying)
- **Timeline** — put 4 historical events in chronological order

### Long-term / Experimental
- **Multiplayer Battle** — real-time 1v1, same question, first to answer wins the round (best of 7)
- **Team Tournaments** — async bracket competitions
- **Daily Streak Races** — compete with friends on who can keep a streak longest

---

## Technical Requirements by Phase

### Phase 1 — Polish (no backend needed)
- [ ] Daily challenge (client-side: seed today's date to pick the country deterministically)
- [ ] Shareable result card (canvas screenshot or CSS-based share card)
- [ ] Improve mobile layout
- [ ] Sound effects (correct/incorrect)
- [ ] Animations (card flip, confetti on streak)
- [ ] Add 2–3 new game types from the near-term list above

### Phase 2 — Accounts & Progression
- [ ] Auth (Supabase Auth or Clerk — both have free tiers)
- [ ] User profiles (username, avatar, level, streak)
- [ ] XP system stored in database
- [ ] Country card collection stored per user
- [ ] Streak tracking
- [ ] Backend: Supabase (Postgres + Auth + Realtime, free tier is plenty to start)

### Phase 3 — Social & Quests
- [ ] Quest system (daily + weekly, config-driven)
- [ ] Quest completion tracking
- [ ] Leaderboards (daily XP, all-time, by region)
- [ ] Friends / follow system
- [ ] Profile pages (public, shows card collection + stats)

### Phase 4 — Multiplayer
- [ ] Real-time 1v1 battle mode
- [ ] WebSockets via Supabase Realtime or Socket.io
- [ ] Lobby system (invite link or random matchmaking)
- [ ] Spectator mode for tournaments

### Phase 5 — GeoGuessr Clone
- [ ] Decide: Google Street View API vs Mapillary
- [ ] Location database (curated or random)
- [ ] Map pin + score-by-distance mechanic
- [ ] Round timer
- [ ] Multiplayer sync

---

## Monetization Options (once there's an audience)

| Model | Notes |
|---|---|
| Freemium | Free games, paid Pro for extra modes / no ads / bonus card cosmetics |
| Ads | Works at scale, annoying at small scale |
| One-time purchase | $2–5 "supporter" tier, removes ads + unlocks bonus content |
| Sell to media company | NYT, Duolingo, edtech startups buy games like this — needs DAU first |

Don't worry about monetization until there's a real daily active user base. Build the product first.

---

## Growth / Distribution Ideas

- Reddit: r/geography, r/webgames, r/geoguessr, r/MapPorn
- Twitter/X and TikTok: post shareable daily challenge results
- Teachers and geography classrooms (huge untapped market — make a "classroom mode")
- Product Hunt launch once the meta-layer is live
- Daily challenge = built-in reason for people to post about it every day

---

## Open Questions / Things to Decide

- What do you call the progression currency? XP? "Miles"? "Stamps"?
- Should the daily challenge be a fixed sequence of games or let the player choose?
- Free accounts with optional paid Pro, or fully free forever?
- Should country cards show a fun fact? Where do the facts come from?
- Globe traversal — optional mode or shelve it completely?
- GeoGuessr clone — build it as a separate game within Meridian or keep it out of scope?

---

## Rough Priority Order

1. Daily challenge + shareable result card ← biggest ROI, drives growth
2. 2–3 new game types (Capital Typer, Border Quiz, Population Sorter)
3. User accounts + streaks + XP
4. Country card collection
5. Leaderboards
6. Quests
7. Multiplayer battles
8. GeoGuessr clone

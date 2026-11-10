<div align="center">

# 🏁 Twisted Trails

### The maze is the track. Your commands are the kart.

**Navigate the twists. Outsmart the traps. Cross the finish line.**

[![Play online](https://img.shields.io/badge/PLAY%20ONLINE-Twisted%20Trails-b72828?style=for-the-badge&logo=googlechrome&logoColor=white)](https://ohil09.github.io/Maze-Game/)
[![Built with HTML, CSS and JavaScript](https://img.shields.io/badge/BUILT%20WITH-Vanilla%20Web-4ad253?style=for-the-badge)](#-under-the-hood)

<br />

<img src="photos/maze_preview.png" alt="Twisted Trails maze preview" width="720" />

</div>

---

## 🎮 Welcome to the Maze Kart League

Twisted Trails is a command-based maze puzzle game created as a **BCA Exhibition project**.
You are not steering with arrow keys. You are the strategist behind the wheel: build a
sequence of command cards, run your route, avoid collisions, and reach the real goal
before the timer runs out.

> **Think ahead. Move sharp. Chase the high score.**

---

## 🏆 Choose Your Race

| Mode | The challenge |
| --- | --- |
| **Normal Mode** | Find a route to the real goal. Explore freely, but watch out for fake goals hidden in some levels. |
| **Precision Mode** | Take the exact shortest path. Any detour counts as a wrong route and costs a chance. |

---

## 🧩 Your Command Deck

Build your solution using three command cards:

```text
┌─────────────────┐   ┌──────────────┐   ┌───────────────┐
│  Move Forward   │   │  Turn Left   │   │  Turn Right   │
└─────────────────┘   └──────────────┘   └───────────────┘
```

### How to play

1. Open the [home page](https://ohil09.github.io/Maze-Game/).
2. Pick **Normal Mode** or **Precision Mode**.
3. Drag command cards into the **Solution** column, or tap a card on mobile.
4. Arrange the cards in the order your character should perform them.
5. Hit **Run** and watch the route execute.
6. Use **Clear** to remove the current sequence or **Restart** to return to Level 1.
7. Beat all seven levels and finish with the highest score possible.

### Track rules

- Every level starts with **3 chances**.
- Hitting a wall or moving outside the maze costs one chance.
- Running out of time costs one chance.
- In Precision Mode, leaving the shortest path costs one chance.
- Complete the current level to unlock the next one.

---

## ⭐ What Is In The Garage?

- **7** progressively challenging maze levels
- Maze sizes ranging from `4x4` to `9x12`
- Drag-and-drop commands with tap support for smaller screens
- Countdown timer and per-level time limits
- Collision detection for walls and out-of-bounds movement
- Fake goals in Normal Mode
- Score calculation based on level, time, and moves
- Sound effects for countdowns, errors, wins, level-ups, and failures
- Responsive desktop and mobile layouts
- Congratulations and Game Over screens
- Per-level best scores saved in browser `localStorage`

---

## 🚦 Quick Start

### Option 1: Open the track directly

Open `index.html` in a modern web browser.

### Option 2: Start a local pit crew server

From the project folder, run:

```bash
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

No external framework, database, or build step is required.

---

## 🛠️ Under The Hood

| Technology | Role |
| --- | --- |
| **HTML5** | Page structure, game screens, and accessible controls |
| **CSS3** | Responsive layouts, animations, colors, and visual design |
| **Vanilla JavaScript** | Game state, movement, timers, scoring, and events |
| **Browser localStorage** | Per-level best score persistence |
| **HTML Audio** | Game sound effects |

The shared gameplay logic lives in [`js/engine.js`](js/engine.js), while the two
mode-specific race rules live in [`game_M.html`](game_M.html) and
[`game.html`](game.html).

---

## 🧠 Skills On The Starting Grid

This project was built to practise:

- Designing a complete interactive web application
- Managing game state with JavaScript
- Representing maze grids with arrays
- Handling drag-and-drop and click events
- Creating timers and animated actions
- Applying collision and path-validation logic
- Using `localStorage` for client-side persistence
- Building responsive interfaces for desktop and mobile
- Organising shared logic into a reusable game engine

---

## 🔧 Next Laps

- Procedurally generate unlimited mazes
- Add keyboard controls and touch swipe controls
- Add player profiles and global leaderboards
- Add selectable difficulty levels
- Add hints with a score penalty
- Improve accessibility and colour-blind-friendly themes
- Add unit tests for movement, scoring, and path validation

---

<div align="center">

### 🏁 Ready, set, solve!

Built by **Ohil Raj S** as an exhibition project demonstrating front-end
development, JavaScript programming, and game-design concepts.

</div>

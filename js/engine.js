/* ============================================================
   TWISTED TRAILS — Shared Game Engine
   ============================================================
   Provides: state management, rendering, timer, scoring,
   audio, drag-and-drop, modals, localStorage bests.

   Usage: Each game mode (Normal / Precision) includes this
   script, then calls MazeEngine.init(config) with its own
   LEVELS array and runAnimated() function.
   ============================================================ */

const MazeEngine = (() => {
  "use strict";

  /* ---- Configuration (set via init()) ---- */
  let CONFIG = {
    levels: [],
    bestKey: "maze_level_bests_v1",
    congratsUrl: "congrats_M.html",
    failedUrl: "failed_M.html",
    createSolItem: null,   // mode-specific solution item factory
    runAnimated: null,      // mode-specific execution logic
  };

  /* ---- State ---- */
  let curLevelIndex = 0;
  let totalScore = 0;
  let totalTimeTaken = 0;

  const state = {
    grid: [],
    size: { rows: 0, cols: 0 },
    player: { x: 0, y: 0, dir: 0 },  // dir: 0=right, 1=down, 2=left, 3=up
    start: { x: 0, y: 0 },
    goal: { x: 0, y: 0 },
    timeLeft: 0,
    timerId: null,
    chances: 3,
    levelTimeUsed: 0,
    isAnimating: false,
  };

  /* ---- DOM References (cached once) ---- */
  let refs = {};

  function cacheRefs() {
    refs = {
      grid:        document.getElementById("grid"),
      levelNumber: document.getElementById("levelNumber"),
      levelSize:   document.getElementById("levelSize"),
      timeLeft:    document.getElementById("timeLeft"),
      totalScore:  document.getElementById("totalScore"),
      levelLimit:  document.getElementById("levelLimit"),
      levelUsed:   document.getElementById("levelUsed"),
      chances:     document.getElementById("chances"),
      log:         document.getElementById("log"),
      solution:    document.getElementById("solution"),
      runBtn:      document.getElementById("runBtn"),
      clearBtn:    document.getElementById("clearBtn"),
      resetBtn:    document.getElementById("resetBtn"),
      nextBtn:     document.getElementById("nextBtn"),
      bestsBox:    document.getElementById("bestsBox"),
      bestTime:    document.getElementById("bestTime"),
      modal:       document.getElementById("modal"),
      modalTitle:  document.getElementById("modalTitle"),
      modalMsg:    document.getElementById("modalMsg"),
      modalOk:     document.getElementById("modalOk"),
      frame:       document.querySelector(".frame"),
    };
  }

  /* ---- Audio Manager ---- */
  const audio = {};

  function initAudio() {
    const names = ["beepSound", "errorSound", "levelUpSound", "failSound"];
    names.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.volume = 1.0;
        audio[id] = el;
      }
    });
  }

  function playSound(name) {
    const el = audio[name];
    if (!el) return;
    el.currentTime = 0;
    el.play().catch(() => {});
  }

  /* ---- Utility Functions ---- */
  function cloneGrid(g) {
    return g.map(r => r.slice());
  }

  function findMarker(grid, val) {
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] === val) return { x, y };
      }
    }
    return null;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function formatTime(sec) {
    const mm = Math.floor(sec / 60);
    const ss = sec % 60;
    return mm > 0 ? `${mm}m ${ss}s` : `${ss}s`;
  }

  /* ---- Local Bests ---- */
  function loadBests() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG.bestKey) || "{}");
    } catch (e) {
      return {};
    }
  }

  function saveBests(b) {
    localStorage.setItem(CONFIG.bestKey, JSON.stringify(b));
    updateBestsUI();
  }

  function updateBestsUI() {
    const b = loadBests();
    const hasData = Object.keys(b).length > 0;

    if (!hasData) {
      refs.bestsBox.innerHTML = '<div class="small">No bests yet</div>';
      if (refs.bestTime) refs.bestTime.textContent = "—";
      return;
    }

    let lines = "";
    for (let i = 0; i < CONFIG.levels.length; i++) {
      const key = "L" + (i + 1);
      if (b[key]) {
        lines += `<div>Level ${i + 1}: score ${b[key].score} — time ${formatTime(b[key].time)}</div>`;
      }
    }
    refs.bestsBox.innerHTML = lines || '<div class="small">No bests yet</div>';

    const curKey = "L" + (curLevelIndex + 1);
    if (refs.bestTime) {
      refs.bestTime.textContent = b[curKey] ? formatTime(b[curKey].time) : "—";
    }
  }

  /* ---- SVG Templates ---- */
  const PLAYER_SVG = '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 2 L19 21 L12 17 L5 21 Z" fill="#3f3f3f"/></svg>';

  const TROPHY_SVG = `<svg viewBox="0 0 32 32" width="100%" height="100%">
    <path fill="#FFD700" stroke="#B8860B" stroke-width="2" d="M22 4H10v4H6v4c0 4 3 7 7 7h6c4 0 7-3 7-7V8h-4V4z"/>
    <rect x="12" y="19" width="8" height="4" fill="#DAA520"/>
    <rect x="10" y="23" width="12" height="5" fill="#B8860B"/>
  </svg>`;

  const DIR_ROTATION = ["rotate(90deg)", "rotate(180deg)", "rotate(270deg)", "rotate(0deg)"];

  /* ---- Rendering ---- */
  let lastRenderedGrid = null;     // Track grid state for diffing
  let lastPlayerState = null;      // Track player state for diffing

  function renderGrid() {
    const { rows, cols } = state.size;
    const gap = 8;

    const availableWidth = Math.max(120, refs.frame.clientWidth - 40);
    const availableHeight = Math.max(120, refs.frame.clientHeight - 40);
    const cellSize = Math.floor(
      Math.min(
        (availableWidth - (cols - 1) * gap) / cols,
        (availableHeight - (rows - 1) * gap) / rows
      )
    );

    refs.grid.style.width = (cellSize * cols + (cols - 1) * gap) + "px";
    refs.grid.style.height = (cellSize * rows + (rows - 1) * gap) + "px";
    refs.grid.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
    refs.grid.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;
    refs.grid.innerHTML = "";

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const div = document.createElement("div");
        div.className = "cell";
        div.style.width = cellSize + "px";
        div.style.height = cellSize + "px";

        const v = (state.grid[y] && state.grid[y][x] !== undefined) ? state.grid[y][x] : 1;

        if (v === 1) div.classList.add("wall");
        if (v === 2) div.classList.add("start");

        // Trophy on goal (3) and fake goals (4, 5)
        if (v === 3 || v === 4 || v === 5) {
          const trophy = document.createElement("div");
          trophy.style.cssText = "width:90%;height:90%;display:flex;align-items:center;justify-content:center;pointer-events:none;";
          trophy.innerHTML = TROPHY_SVG;
          div.appendChild(trophy);
        }

        // Player overlay
        if (x === state.player.x && y === state.player.y) {
          div.classList.add("player-highlight");

          const charEl = document.createElement("div");
          charEl.style.cssText = "width:80%;height:80%;display:flex;align-items:center;justify-content:center;pointer-events:none;user-select:none;filter:drop-shadow(0 0 3px rgba(0,0,0,0.4));";
          charEl.style.transform = DIR_ROTATION[state.player.dir] || "rotate(0deg)";
          charEl.innerHTML = PLAYER_SVG;
          div.appendChild(charEl);
        }

        refs.grid.appendChild(div);
      }
    }

    // Save state for potential future diffing
    lastPlayerState = { x: state.player.x, y: state.player.y, dir: state.player.dir };
  }

  function updateHUD() {
    refs.levelNumber.textContent = curLevelIndex + 1;
    refs.levelSize.textContent = `${state.size.rows}×${state.size.cols}`;
    refs.timeLeft.textContent = `${state.timeLeft}s`;

    if (state.timeLeft <= 10) {
      refs.timeLeft.classList.add("blink");
    } else {
      refs.timeLeft.classList.remove("blink");
    }

    refs.totalScore.textContent = totalScore;
    refs.levelLimit.textContent = `${CONFIG.levels[curLevelIndex].timeLimit}s`;
    refs.chances.textContent = state.chances;
    refs.levelUsed.textContent = `${state.levelTimeUsed}s`;
  }

  function renderLevel() {
    renderGrid();
    updateHUD();
    updateBestsUI();
  }

  /* ---- Timer ---- */
  function startTimer() {
    stopTimer();
    state.timeLeft = CONFIG.levels[curLevelIndex].timeLimit;
    state.levelTimeUsed = 0;
    renderLevel();
    state.timerId = setInterval(() => {
      state.timeLeft--;
      state.levelTimeUsed++;

      // Only update HUD on tick (not full grid rebuild)
      updateHUD();

      if (state.timeLeft <= 10 && state.timeLeft > 0) {
        playSound("beepSound");
      }

      if (state.timeLeft <= 0) {
        stopTimer();
        onLevelFailedTime();
      }
    }, 1000);
  }

  function stopTimer() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  /* ---- Level Loading ---- */
  function loadLevel(index) {
    if (index < 0 || index >= CONFIG.levels.length) return;

    stopTimer();
    state.isAnimating = false;
    curLevelIndex = index;

    const lvl = CONFIG.levels[curLevelIndex];
    state.size = { rows: lvl.size.rows, cols: lvl.size.cols };
    state.grid = cloneGrid(lvl.grid);

    const s = findMarker(state.grid, 2);
    const g = findMarker(state.grid, 3);
    state.start = s || { x: 0, y: 0 };
    state.goal = g || { x: state.size.cols - 1, y: state.size.rows - 1 };

    state.player.x = state.start.x;
    state.player.y = state.start.y;
    state.player.dir = 0;

    refs.solution.innerHTML = "";
    refs.nextBtn.style.display = "none";
    writeLog(`Level ${curLevelIndex + 1} loaded. Place commands and Run.`);
    startTimer();
    renderLevel();
  }

  /* ---- Flash Wall Effect ---- */
  function flashWall(x, y) {
    if (x < 0 || y < 0 || x >= state.size.cols || y >= state.size.rows) return;
    const idx = y * state.size.cols + x;
    const cell = refs.grid.children[idx];
    if (!cell) return;
    const prev = cell.style.boxShadow;
    cell.style.boxShadow = "0 0 0 8px rgba(255,80,80,0.3) inset";
    setTimeout(() => { cell.style.boxShadow = prev; }, 350);
  }

  /* ---- UI Helpers ---- */
  function setControlsEnabled(enabled) {
    refs.runBtn.disabled = !enabled;
    refs.clearBtn.disabled = !enabled;
    refs.resetBtn.disabled = !enabled;
    refs.nextBtn.disabled = !enabled;
  }

  function highlightSolutionAt(index) {
    const items = Array.from(refs.solution.children);
    items.forEach((it, i) => it.classList.toggle("active", i === index));
  }

  let logLocked = false;
  function writeLog(txt, lockDuration = 1500) {
    if (logLocked) return;
    logLocked = true;
    refs.log.textContent = txt;
    setTimeout(() => { logLocked = false; }, lockDuration);
  }

  function showModal(title, html, cb) {
    refs.modalTitle.textContent = title;
    refs.modalMsg.innerHTML = html;
    refs.modal.style.display = "flex";
    refs.modalOk.onclick = () => {
      refs.modal.style.display = "none";
      if (cb) cb();
    };
  }

  /* ---- Scoring ---- */
  function onLevelComplete(stepsUsed) {
    stopTimer();
    playSound("levelUpSound");

    const levelNumber = curLevelIndex + 1;
    const levelBase = levelNumber * 200;
    const timeBonus = Math.max(0, state.timeLeft) * 15;
    const stepPenalty = stepsUsed * 8;
    const levelScore = Math.max(0, Math.round(levelBase + timeBonus - stepPenalty));

    totalScore += levelScore;
    state.chances = 3;
    refs.chances.textContent = state.chances;

    totalTimeTaken += (CONFIG.levels[curLevelIndex].timeLimit - state.timeLeft);
    writeLog(`🎉 Level ${levelNumber} complete! +${levelScore}`);
    refs.totalScore.textContent = totalScore;

    // Save best
    const b = loadBests();
    const key = "L" + levelNumber;
    const timeUsed = CONFIG.levels[curLevelIndex].timeLimit - state.timeLeft;
    if (!b[key] || levelScore > b[key].score || (levelScore === b[key].score && timeUsed < b[key].time)) {
      b[key] = { score: levelScore, time: timeUsed };
      saveBests(b);
    }

    if (curLevelIndex < CONFIG.levels.length - 1) {
      showModal(
        "Level Complete",
        `You finished Level ${levelNumber}. Score +${levelScore}. Click OK for next level.`,
        () => loadLevel(curLevelIndex + 1)
      );
    } else {
      playSound("levelUpSound");
      showModal(
        "All Levels Complete!",
        `Final Score: ${totalScore}<br>Total time taken: ${formatTime(totalTimeTaken)}.`,
        () => { window.location.href = CONFIG.congratsUrl; }
      );
    }
  }

  /* ---- Failure Handlers ---- */
  function onLevelFailedTime() {
    state.isAnimating = false;
    stopTimer();
    refs.solution.innerHTML = "";

    state.chances--;
    refs.chances.textContent = state.chances;
    renderLevel();

    if (state.chances <= 0) {
      showModal("Time Up", "You lost all chances.", () => onLevelFailed());
      return;
    }

    showModal(
      "Time Up",
      `You lost a chance (${state.chances} left).`,
      () => loadLevel(curLevelIndex)
    );
  }

  function onLevelFailed() {
    playSound("failSound");
    stopTimer();
    totalTimeTaken += CONFIG.levels[curLevelIndex].timeLimit;

    showModal(
      "Game Over",
      "You failed the game.<br>Click OK to continue.",
      () => { window.location.href = CONFIG.failedUrl; }
    );
  }

  /* ---- Solution Item Factory ---- */
  function defaultCreateSolItem(cmd) {
    const el = document.createElement("div");
    el.className = "sol-item";
    el.dataset.cmd = cmd;
    el.textContent = cmd === "move" ? "Move" : cmd === "left" ? "Left" : "Right";
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      el.remove();
    });
    return el;
  }

  /* ---- Drag & Drop + Click Wiring ---- */
  function wireCommandCards() {
    const cards = document.querySelectorAll(".card");
    const factory = CONFIG.createSolItem || defaultCreateSolItem;

    cards.forEach(card => {
      card.addEventListener("dragstart", e => {
        e.dataTransfer.setData("text/plain", card.dataset.cmd);
      });
      card.addEventListener("click", () => {
        refs.solution.appendChild(factory(card.dataset.cmd));
      });
    });

    refs.solution.addEventListener("dragover", e => {
      e.preventDefault();
      refs.solution.classList.add("drag-over");
    });

    refs.solution.addEventListener("dragleave", () => {
      refs.solution.classList.remove("drag-over");
    });

    refs.solution.addEventListener("drop", e => {
      e.preventDefault();
      refs.solution.classList.remove("drag-over");
      const cmd = e.dataTransfer.getData("text/plain");
      if (cmd) refs.solution.appendChild(factory(cmd));
    });
  }

  /* ---- Button Wiring ---- */
  function wireButtons() {
    refs.runBtn.addEventListener("click", () => {
      if (CONFIG.runAnimated) CONFIG.runAnimated();
    });

    refs.clearBtn.addEventListener("click", () => {
      if (state.isAnimating) return;
      refs.solution.innerHTML = "";
      writeLog("Solution cleared.");
    });

    refs.resetBtn.addEventListener("click", () => {
      if (state.isAnimating) return;
      showModal(
        "Restart Game?",
        "Are you sure you want to restart the entire game from Level 1?",
        () => resetGame()
      );
    });

    refs.nextBtn.addEventListener("click", () => {
      if (state.isAnimating) return;
      loadLevel(curLevelIndex + 1);
    });
  }

  function resetGame() {
    totalScore = 0;
    totalTimeTaken = 0;
    state.chances = 3;
    loadLevel(0);
  }

  /* ---- Public Init ---- */
  function init(config) {
    Object.assign(CONFIG, config);
    cacheRefs();
    initAudio();
    wireCommandCards();
    wireButtons();
    loadLevel(0);
  }

  /* ---- Public API ---- */
  return {
    init,
    // State access
    get state() { return state; },
    get curLevelIndex() { return curLevelIndex; },
    get totalScore() { return totalScore; },
    set totalScore(v) { totalScore = v; },
    get totalTimeTaken() { return totalTimeTaken; },
    set totalTimeTaken(v) { totalTimeTaken = v; },
    get CONFIG() { return CONFIG; },
    get refs() { return refs; },
    // Core functions
    loadLevel,
    renderLevel,
    renderGrid,
    updateHUD,
    startTimer,
    stopTimer,
    // Helpers
    cloneGrid,
    findMarker,
    sleep,
    formatTime,
    flashWall,
    setControlsEnabled,
    highlightSolutionAt,
    writeLog,
    showModal,
    playSound,
    // Game flow
    onLevelComplete,
    onLevelFailed,
    onLevelFailedTime,
    resetGame,
  };
})();

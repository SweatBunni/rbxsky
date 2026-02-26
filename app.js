const state = {
  balance: 1000,
  crash: {
    active: false,
    bet: 0,
    multiplier: 1,
    target: 1,
    timer: null,
  },
  mines: {
    active: false,
    bet: 0,
    picks: 0,
    multiplier: 1,
    minePositions: new Set(),
    safeRevealed: new Set(),
  },
};

const balanceDisplay = document.querySelector("#balanceDisplay");
const coinflipBet = document.querySelector("#coinflipBet");
const coinflipResult = document.querySelector("#coinflipResult");
const crashBet = document.querySelector("#crashBet");
const crashResult = document.querySelector("#crashResult");
const crashBar = document.querySelector("#crashBar");
const startCrashBtn = document.querySelector("#startCrash");
const cashoutCrashBtn = document.querySelector("#cashoutCrash");
const minesBet = document.querySelector("#minesBet");
const minesGrid = document.querySelector("#minesGrid");
const minesResult = document.querySelector("#minesResult");
const cashoutMinesBtn = document.querySelector("#cashoutMines");

function updateBalance() {
  balanceDisplay.textContent = `${state.balance.toFixed(2)} R$`;
}

function adjustBalance(amount) {
  state.balance += amount;
  updateBalance();
}

function getBetValue(input) {
  const amount = Number(input.value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (amount > state.balance) return null;
  return amount;
}

function message(element, text, tone = "neutral") {
  element.textContent = text;
  element.style.color =
    tone === "win" ? "var(--success)" : tone === "loss" ? "var(--danger)" : "var(--muted)";
}

document.querySelector("#quickDeposit").addEventListener("click", () => adjustBalance(500));
document.querySelector("#quickWithdraw").addEventListener("click", () => {
  if (state.balance >= 250) {
    adjustBalance(-250);
  }
});

document.querySelectorAll(".coinflipBtn").forEach((button) => {
  button.addEventListener("click", () => {
    const bet = getBetValue(coinflipBet);
    if (!bet) {
      message(coinflipResult, "Invalid bet or insufficient balance.", "loss");
      return;
    }

    adjustBalance(-bet);
    const result = Math.random() > 0.5 ? "heads" : "tails";
    const won = result === button.dataset.side;
    if (won) {
      adjustBalance(bet * 2);
      message(coinflipResult, `You won! It landed on ${result}. +${(bet * 2).toFixed(2)} R$`, "win");
    } else {
      message(coinflipResult, `You lost. It landed on ${result}. -${bet.toFixed(2)} R$`, "loss");
    }
  });
});

function resetCrashRound(text = "Waiting for next round...") {
  state.crash.active = false;
  clearInterval(state.crash.timer);
  state.crash.timer = null;
  state.crash.multiplier = 1;
  crashBar.style.width = "0%";
  startCrashBtn.disabled = false;
  cashoutCrashBtn.disabled = true;
  message(crashResult, text);
}

startCrashBtn.addEventListener("click", () => {
  if (state.crash.active) return;
  const bet = getBetValue(crashBet);
  if (!bet) {
    message(crashResult, "Invalid bet or insufficient balance.", "loss");
    return;
  }

  adjustBalance(-bet);
  state.crash.active = true;
  state.crash.bet = bet;
  state.crash.multiplier = 1;
  state.crash.target = Number((1.1 + Math.random() * 4.4).toFixed(2));
  startCrashBtn.disabled = true;
  cashoutCrashBtn.disabled = false;
  message(crashResult, `Round started. Target crash point hidden.`);

  state.crash.timer = setInterval(() => {
    state.crash.multiplier = Number((state.crash.multiplier + 0.03).toFixed(2));
    const pct = Math.min((state.crash.multiplier / 5) * 100, 100);
    crashBar.style.width = `${pct}%`;
    message(crashResult, `Current multiplier: ${state.crash.multiplier}x`);

    if (state.crash.multiplier >= state.crash.target) {
      resetCrashRound(`Crashed at ${state.crash.target}x. You lost ${state.crash.bet.toFixed(2)} R$.`);
      crashResult.style.color = "var(--danger)";
    }
  }, 100);
});

cashoutCrashBtn.addEventListener("click", () => {
  if (!state.crash.active) return;
  const winnings = state.crash.bet * state.crash.multiplier;
  adjustBalance(winnings);
  resetCrashRound(`Cashed out at ${state.crash.multiplier}x for +${winnings.toFixed(2)} R$.`);
  crashResult.style.color = "var(--success)";
});

function setupMinesGame() {
  minesGrid.innerHTML = "";
  state.mines.active = true;
  state.mines.picks = 0;
  state.mines.multiplier = 1;
  state.mines.safeRevealed.clear();
  state.mines.minePositions = new Set();
  while (state.mines.minePositions.size < 5) {
    state.mines.minePositions.add(Math.floor(Math.random() * 25));
  }

  for (let i = 0; i < 25; i += 1) {
    const tile = document.createElement("button");
    tile.className = "tile";
    tile.dataset.index = i;
    tile.addEventListener("click", onMineTileClick);
    minesGrid.appendChild(tile);
  }
  cashoutMinesBtn.disabled = false;
}

function endMinesGame(text, tone) {
  state.mines.active = false;
  cashoutMinesBtn.disabled = true;
  minesGrid.querySelectorAll(".tile").forEach((tile) => {
    tile.disabled = true;
    const idx = Number(tile.dataset.index);
    if (state.mines.minePositions.has(idx)) {
      tile.textContent = "✖";
      tile.classList.add("mine");
    }
  });
  message(minesResult, text, tone);
}

function onMineTileClick(event) {
  if (!state.mines.active) return;
  const tile = event.currentTarget;
  const idx = Number(tile.dataset.index);
  if (tile.disabled) return;
  tile.disabled = true;

  if (state.mines.minePositions.has(idx)) {
    tile.textContent = "✖";
    tile.classList.add("mine");
    endMinesGame(`Mine hit! You lost ${state.mines.bet.toFixed(2)} R$.`, "loss");
    return;
  }

  state.mines.picks += 1;
  state.mines.multiplier = Number((1 + state.mines.picks * 0.22).toFixed(2));
  tile.textContent = "◆";
  tile.classList.add("safe");
  message(minesResult, `Safe pick! Current cashout multiplier: ${state.mines.multiplier}x`);
}

document.querySelector("#newMinesGame").addEventListener("click", () => {
  const bet = getBetValue(minesBet);
  if (!bet) {
    message(minesResult, "Invalid bet or insufficient balance.", "loss");
    return;
  }

  if (state.mines.active) {
    minesResult.textContent = "Existing game replaced.";
  }
  state.mines.bet = bet;
  adjustBalance(-bet);
  setupMinesGame();
  message(minesResult, "Grid live. Reveal tiles and avoid mines.");
});

cashoutMinesBtn.addEventListener("click", () => {
  if (!state.mines.active) return;
  const payout = state.mines.bet * state.mines.multiplier;
  adjustBalance(payout);
  endMinesGame(`Cashed out at ${state.mines.multiplier}x for +${payout.toFixed(2)} R$.`, "win");
});

const leaderboard = [
  ["SkyKing", 7842],
  ["CloudRush", 6210],
  ["BetNova", 5813],
  ["PixelRBLX", 4970],
  ["MoonRake", 4628],
];

const leaderboardList = document.querySelector("#leaderboardList");
leaderboard.forEach(([name, amount], i) => {
  const li = document.createElement("li");
  li.innerHTML = `<span>#${i + 1} ${name}</span><strong>${amount.toLocaleString()} R$</strong>`;
  leaderboardList.appendChild(li);
});

const chatFeed = document.querySelector("#chatFeed");
const seedMessages = [
  ["SkyKing", "Just cashed out at 3.1x 🔥"],
  ["CloudRush", "Coinflip streak is insane!"],
  ["Nova", "Mines is paying today."],
];

function addChatMessage(user, text) {
  const line = document.createElement("div");
  line.className = "chat-msg";
  line.innerHTML = `<span>${user}:</span> ${text}`;
  chatFeed.appendChild(line);
  chatFeed.scrollTop = chatFeed.scrollHeight;
}

seedMessages.forEach(([user, text]) => addChatMessage(user, text));

document.querySelector("#chatForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.querySelector("#chatInput");
  const text = input.value.trim();
  if (!text) return;
  addChatMessage("You", text);
  input.value = "";
});

updateBalance();
resetCrashRound();

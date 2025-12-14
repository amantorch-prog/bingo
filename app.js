/* =========================================================
   TELEGRAM MINI APP – BINGO (FULL CLIENT)
   ========================================================= */

const tg = Telegram.WebApp;
tg.expand();

/* ---------------- PARAMETERS ---------------- */
const params = new URLSearchParams(location.search);
const room = parseInt(params.get("room") || "5");
const gameId = parseInt(params.get("game_id") || "1"); // backend provides real id
const telegramId = tg.initDataUnsafe.user.id;

/* ---------------- STATE ---------------- */
let ws;
let myCard = null;
let calledNumbers = [];
let recentCalls = [];
let banned = false;

/* ---------------- ELEMENTS ---------------- */
const prizeEl = document.getElementById("prize");
const balanceEl = document.getElementById("balance");
const calledCountEl = document.getElementById("called-count");
const stakeEl = document.getElementById("stake");

stakeEl.innerText = room;

/* =========================================================
   WEBSOCKET CONNECTION
   ========================================================= */

function connectWS() {
  ws = new WebSocket(`ws://127.0.0.1:8000/ws/${gameId}/${telegramId}`);

  ws.onmessage = (e) => {
    const data = JSON.parse(e.data);

    switch (data.type) {
      case "card":
        myCard = data.card;
        balanceEl.innerText = data.balance;
        renderCard();
        break;

      case "taken":
        markTakenCard(data.card_id);
        break;

      case "number":
        handleCalledNumber(data.value);
        break;

      case "banned":
        banned = true;
        alert("❌ False Bingo! You are banned for this round.");
        document.getElementById("bingo-btn").disabled = true;
        break;

      case "winner":
        showWinnerPopup(data);
        break;

      case "error":
        alert(data.msg);
        break;
    }
  };
}

connectWS();

/* =========================================================
   BUY PHASE TIMER (20s)
   ========================================================= */

let buyTime = 20;
const timerEl = document.getElementById("timer");

const buyTimer = setInterval(() => {
  buyTime--;
  timerEl.innerText = buyTime;

  if (buyTime <= 0) {
    clearInterval(buyTimer);
    document.getElementById("buy-phase").classList.add("hidden");
    document.getElementById("game").classList.remove("hidden");
  }
}, 1000);

/* =========================================================
   BINGO BOARD (1–1000)
   ========================================================= */

function openBoard() {
  const board = document.getElementById("board");
  const grid = document.getElementById("board-grid");
  board.classList.remove("hidden");
  grid.innerHTML = "";

  for (let i = 1; i <= 1000; i++) {
    const btn = document.createElement("button");
    btn.className = "card-btn";
    btn.innerText = i;
    btn.dataset.id = i;
    btn.onclick = () => buyCard(i, btn);
    grid.appendChild(btn);
  }
}

function closeBoard() {
  document.getElementById("board").classList.add("hidden");
}

function buyCard(cardId, btn) {
  if (myCard || banned) return;

  ws.send(JSON.stringify({
    type: "buy",
    card_id: cardId
  }));

  btn.classList.add("mine");
}

function markTakenCard(cardId) {
  const btn = document.querySelector(`.card-btn[data-id='${cardId}']`);
  if (btn && !btn.classList.contains("mine")) {
    btn.classList.add("taken");
  }
}

/* =========================================================
   CALLED NUMBERS HANDLING
   ========================================================= */

function handleCalledNumber(num) {
  calledNumbers.push(num);
  calledCountEl.innerText = calledNumbers.length;

  recentCalls.unshift(num);
  if (recentCalls.length > 4) recentCalls.pop();

  renderRecentCalls();
  updateCalledBoard(num);
}

function renderRecentCalls() {
  const div = document.getElementById("recent-calls");
  div.innerHTML = "";

  recentCalls.forEach((n, i) => {
    const el = document.createElement("div");
    el.innerText = formatNumber(n);
    el.className = i === 0 ? "current" : "recent";
    div.appendChild(el);
  });
}

/* =========================================================
   LEFT BOARD (CALLED NUMBERS TABLE)
   ========================================================= */

function renderCalledBoard() {
  const table = document.getElementById("called-table");
  table.innerHTML = "";

  const ranges = [
    [1, 15], [16, 30], [31, 45], [46, 60], [61, 75]
  ];

  for (let r = 0; r < 15; r++) {
    const tr = document.createElement("tr");

    ranges.forEach(([start, end]) => {
      const num = start + r;
      const td = document.createElement("td");
      if (num <= end) {
        td.innerText = num;
        td.dataset.num = num;
      }
      tr.appendChild(td);
    });

    table.appendChild(tr);
  }
}

function updateCalledBoard(num) {
  document
    .querySelectorAll(`[data-num='${num}']`)
    .forEach(td => td.classList.add("called"));
}

/* =========================================================
   PLAYER CARD RENDER
   ========================================================= */

function renderCard() {
  const table = document.getElementById("card-table");
  table.innerHTML = "";

  const header = ["B", "I", "N", "G", "O"];
  const trh = document.createElement("tr");
  header.forEach(h => {
    const th = document.createElement("td");
    th.innerText = h;
    trh.appendChild(th);
  });
  table.appendChild(trh);

  for (let r = 0; r < 5; r++) {
    const tr = document.createElement("tr");

    for (let c = 0; c < 5; c++) {
      const td = document.createElement("td");
      const val = myCard[c][r];
      td.innerText = val;

      if (val === "F") {
        td.classList.add("called");
      } else {
        td.onclick = () => td.classList.toggle("called");
      }

      tr.appendChild(td);
    }

    table.appendChild(tr);
  }
}

/* =========================================================
   BINGO CLAIM
   ========================================================= */

function claimBingo() {
  if (!myCard || banned) return;

  ws.send(JSON.stringify({
    type: "bingo"
  }));
}

/* =========================================================
   WINNER POPUP
   ========================================================= */

function showWinnerPopup(data) {
  const pop = document.getElementById("winner-popup");
  pop.innerHTML = `
    <h2>🎉 WINNER 🎉</h2>
    <p>${data.names}</p>
    <p>+${data.amount.toFixed(2)} birr</p>
  `;
  pop.classList.remove("hidden");

  setTimeout(() => {
    pop.classList.add("hidden");
  }, 10000);
}

/* =========================================================
   HELPERS
   ========================================================= */

function formatNumber(n) {
  if (n <= 15) return "B" + n;
  if (n <= 30) return "I" + n;
  if (n <= 45) return "N" + n;
  if (n <= 60) return "G" + n;
  return "O" + n;
}

/* =========================================================
   INIT
   ========================================================= */

renderCalledBoard();

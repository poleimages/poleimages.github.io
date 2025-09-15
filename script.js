// --- ⚡ Remplace par ta config Firebase ---
const firebaseConfig = {
  apiKey: "TON_API_KEY",
  authDomain: "TON_PROJECT.firebaseapp.com",
  projectId: "TON_PROJECT",
  storageBucket: "TON_PROJECT.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:xxx"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const COLLECTION = "kanban"; // nom Firestore

let board = [];
let currentEdit = null;

const boardEl = document.getElementById("board");
const modal = document.getElementById("modal");
const mTitle = document.getElementById("m-title");
const mStart = document.getElementById("m-start");
const mEnd = document.getElementById("m-end");
const mTeam = document.getElementById("m-team");
const mPriority = document.getElementById("m-priority");

// Charger depuis Firestore
async function loadData() {
  const snapshot = await db.collection(COLLECTION).get();
  board = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  render();
}

// Sauvegarder tout dans Firestore
async function saveData() {
  // Effacer et réécrire
  const snapshot = await db.collection(COLLECTION).get();
  const batch = db.batch();
  snapshot.forEach(doc => batch.delete(doc.ref));
  board.forEach(theme => {
    const ref = db.collection(COLLECTION).doc();
    batch.set(ref, theme);
  });
  await batch.commit();
  render();
}

// Rendu
function render() {
  boardEl.innerHTML = "";
  board.forEach((theme, tIndex) => {
    const themeEl = document.createElement("div");
    themeEl.className = "theme";

    const titleEl = document.createElement("div");
    titleEl.className = "theme-title";
    titleEl.textContent = theme.title;
    themeEl.appendChild(titleEl);

    const cols = document.createElement("div");
    cols.className = "theme-columns";

    ["À FAIRE","EN COURS","TERMINÉ"].forEach(status => {
      const colEl = document.createElement("div");
      colEl.className = "column";
      if(status==="À FAIRE") colEl.classList.add("column-a-faire");
      else if(status==="EN COURS") colEl.classList.add("column-en-cours");
      else if(status==="TERMINÉ") colEl.classList.add("column-termine");

      colEl.innerHTML = `<h2>${status}</h2>`;

      (theme[status] || []).forEach((task, i) => {
        const t = document.createElement("div");
        t.className = "task";
        t.innerHTML = `
          <span class="delete-task">✖</span>
          <div class="task-header">${task.title}</div>
          <div class="task-info">Équipe: ${task.team || "-"}</div>
          <div class="task-info"><span class="badge badge-${(task.priority||"Moyenne").toLowerCase()}">${task.priority||"Moyenne"}</span></div>
          <div class="task-dates">${task.start ? "Début: " + task.start : ""} ${task.end ? " | Fin: " + task.end : ""}</div>
        `;
        t.querySelector(".delete-task").addEventListener("click", e => {
          e.stopPropagation();
          if(confirm("Supprimer ce projet ?")) { theme[status].splice(i,1); saveData(); }
        });
        t.addEventListener("click", () => openModal(tIndex, status, i));
        colEl.appendChild(t);
      });

      const addBtn = document.createElement("button");
      addBtn.className="ghost";
      addBtn.textContent="+ PROJET";
      addBtn.addEventListener("click", () => {
        theme[status].push({ title:"Nouveau projet", start:"", end:"", team:"", priority:"Moyenne" });
        saveData();
      });
      colEl.appendChild(addBtn);

      cols.appendChild(colEl);
    });

    themeEl.appendChild(cols);
    boardEl.appendChild(themeEl);
  });
}

function openModal(themeIdx, status, taskIdx) {
  currentEdit = { themeIdx, status, taskIdx };
  const task = board[themeIdx][status][taskIdx];
  mTitle.value = task.title;
  mStart.value = task.start;
  mEnd.value = task.end;
  mTeam.value = task.team;
  mPriority.value = task.priority;
  modal.style.display = "flex";
}
function closeModal() { modal.style.display="none"; currentEdit=null; }

document.getElementById("modalSave").addEventListener("click", () => {
  if(!currentEdit) return closeModal();
  const {themeIdx,status,taskIdx}=currentEdit;
  const task=board[themeIdx][status][taskIdx];
  task.title=mTitle.value;
  task.start=mStart.value;
  task.end=mEnd.value;
  task.team=mTeam.value;
  task.priority=mPriority.value;
  saveData();
  closeModal();
});
document.getElementById("modalCancel").addEventListener("click", closeModal);
modal.addEventListener("click", e=>{if(e.target===modal) closeModal();});

document.getElementById("addThemeBtn").addEventListener("click", () => {
  board.push({ title:"NOUVEAU TYPE DE PROJET", "À FAIRE":[], "EN COURS":[], "TERMINÉ":[] });
  saveData();
});

// Démarrage
loadData();

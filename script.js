import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyByYuQSuqdmcUCG9ayEu3knUAn0g-0eTOU",
  authDomain: "poleimages-b5574.firebaseapp.com",
  projectId: "poleimages-b5574",
  storageBucket: "poleimages-b5574.firebasestorage.app",
  messagingSenderId: "864866327007",
  appId: "1:864866327007:web:5b7432c5e9464cab42cc6a"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const boardEl = document.getElementById("board");
const addThemeBtn = document.getElementById("addThemeBtn");
const modal = document.getElementById("modal");
const mTitle = document.getElementById("m-title");
const mStart = document.getElementById("m-start");
const mEnd = document.getElementById("m-end");
const mTeam = document.getElementById("m-team");
const mPriority = document.getElementById("m-priority");

let currentEdit = null;
let dragData = null;

// Ajouter un thème
addThemeBtn.addEventListener("click", async () => {
  await addDoc(collection(db, "kanban"), {
    title: "NOUVEAU TYPE DE PROJET",
    "À faire": [],
    "En cours": [],
    "Terminé": []
  });
  loadBoard();
});

// Charger le board
async function loadBoard() {
  boardEl.innerHTML = "";
  const snapshot = await getDocs(collection(db, "kanban"));
  snapshot.forEach(docSnap => {
    const theme = docSnap.data();
    const themeId = docSnap.id;

    const themeEl = document.createElement("div");
    themeEl.className = "theme";

    const titleEl = document.createElement("div");
    titleEl.className = "theme-title";
    titleEl.textContent = theme.title.toUpperCase();
    titleEl.addEventListener("click", async () => {
      const newTitle = prompt("Nouveau nom du type de projet :", theme.title);
      if(newTitle) {
        await updateDoc(doc(db,"kanban",themeId), { title: newTitle });
        loadBoard();
      }
    });
    themeEl.appendChild(titleEl);

    const cols = document.createElement("div");
    cols.className = "theme-columns";

    ["À faire","En cours","Terminé"].forEach(status=>{
      const colEl = document.createElement("div");
      colEl.className = "column";
      if(status==="À faire") colEl.classList.add("column-a-faire");
      else if(status==="En cours") colEl.classList.add("column-en-cours");
      else colEl.classList.add("column-termine");
      colEl.innerHTML = `<h2>${status.toUpperCase()}</h2>`;

      // Permet drop
      colEl.addEventListener("dragover", e => e.preventDefault());
      colEl.addEventListener("drop", async e => {
        if(!dragData) return;
        const {themeId: srcThemeId, status: srcStatus, index} = dragData;
        if(srcThemeId !== themeId) return; // juste pour le même thème
        const updated = {...theme};
        const [movedTask] = updated[srcStatus].splice(index,1);
        updated[status].push(movedTask);
        await updateDoc(doc(db,"kanban",themeId), updated);
        dragData = null;
        loadBoard();
      });

      (theme[status] || []).forEach((task,i)=>{
        const t = document.createElement("div");
        t.className = "task";
        t.setAttribute("draggable","true");
        t.innerHTML = `
          <span class="delete-task" title="Supprimer tâche">✖</span>
          <div class="task-header">${task.title.toUpperCase()}</div>
          <div class="task-info">Équipe: ${task.team || "-"}</div>
          <div class="task-info"><span class="badge badge-${(task.priority||"Moyenne").toLowerCase()}">${task.priority||"Moyenne"}</span></div>
          <div class="task-dates">${task.start ? "Début: "+task.start:""} ${task.end?"| Fin: "+task.end:""}</div>
        `;

        t.querySelector(".delete-task").addEventListener("click", async e=>{
          e.stopPropagation();
          if(confirm("Supprimer ce projet ?")) {
            const updated = {...theme};
            updated[status].splice(i,1);
            await updateDoc(doc(db,"kanban",themeId), updated);
            loadBoard();
          }
        });

        // Clic pour éditer
        t.addEventListener("click", ()=>{
          currentEdit = { themeId, status, index:i, task };
          mTitle.value = task.title;
          mStart.value = task.start;
          mEnd.value = task.end;
          mTeam.value = task.team;
          mPriority.value = task.priority;
          modal.style.display="flex";
        });

        // Drag start
        t.addEventListener("dragstart", ()=>{
          dragData = {themeId, status, index:i};
          t.classList.add("dragging");
        });
        t.addEventListener("dragend", ()=> t.classList.remove("dragging"));

        colEl.appendChild(t);
      });

      // Ajouter tâche
      const addBtn = document.createElement("button");
      addBtn.className="ghost";
      addBtn.textContent="+ PROJET";
      addBtn.addEventListener("click", async ()=>{
        const updated = {...theme};
        updated[status].push({title:"NOUVEAU PROJET", start:"", end:"", team:"", priority:"Moyenne"});
        await updateDoc(doc(db,"kanban",themeId), updated);
        loadBoard();
      });
      colEl.appendChild(addBtn);

      cols.appendChild(colEl);
    });

    themeEl.appendChild(cols);
    boardEl.appendChild(themeEl);
  });
}

// Modal actions
document.getElementById("modalSave").addEventListener("click", async ()=>{
  if(!currentEdit) return closeModal();
  const { themeId, status, index } = currentEdit;
  const task = {
    title: mTitle.value,
    start: mStart.value,
    end: mEnd.value,
    team: mTeam.value,
    priority: mPriority.value
  };
  const snapshot = await getDocs(collection(db,"kanban"));
  snapshot.forEach(async docSnap=>{
    if(docSnap.id===themeId){
      const updated = {...docSnap.data()};
      updated[status][index] = task;
      await updateDoc(doc(db,"kanban",themeId), updated);
    }
  });
  closeModal();
  loadBoard();
});

document.getElementById("modalCancel").addEventListener("click", closeModal);
modal.addEventListener("click", e=>{if(e.target===modal) closeModal();});
function closeModal(){ modal.style.display="none"; currentEdit=null; }

loadBoard();

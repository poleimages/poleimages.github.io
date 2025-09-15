import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// --- CONFIG FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyAaYmCxLn0aWSAWfww9fnJRvUGM9rt55vE",
  authDomain: "poleimages-8af23.firebaseapp.com",
  projectId: "poleimages-8af23",
  storageBucket: "poleimages-8af23.firebasestorage.app",
  messagingSenderId: "816254286601",
  appId: "1:816254286601:web:ee4e4e8238382fd3e5b1d8"
};

// --- INIT ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const COLLECTION = "kanban";

// DOM
const boardEl = document.getElementById("board");
const addThemeBtn = document.getElementById("addThemeBtn");
const modal = document.getElementById("modal");
const mTitle = document.getElementById("m-title");
const mStart = document.getElementById("m-start");
const mEnd = document.getElementById("m-end");
const mTeam = document.getElementById("m-team");
const mPriority = document.getElementById("m-priority");

let board = [];
let currentEdit = null;

// --- LOAD DATA ---
async function loadData() {
  const snapshot = await getDocs(collection(db, COLLECTION));
  board = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  render();
}

// --- SAVE SINGLE PROJECT ---
async function saveProject(project) {
  if (!project.id) {
    const ref = await addDoc(collection(db, COLLECTION), project);
    project.id = ref.id;
  } else {
    const ref = doc(db, COLLECTION, project.id);
    await updateDoc(ref, project);
  }
  await loadData();
}

// --- DELETE PROJECT ---
async function deleteProject(project) {
  if (!project.id) return;
  const ref = doc(db, COLLECTION, project.id);
  await deleteDoc(ref);
  await loadData();
}

// --- RENDER ---
function render() {
  boardEl.innerHTML = "";
  board.forEach(theme => {
    const themeEl = document.createElement("div");
    themeEl.className = "theme";

    const titleEl = document.createElement("div");
    titleEl.className = "theme-title";
    titleEl.textContent = theme.title.toUpperCase();
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

      const tasks = (theme[status] || []);
      tasks.forEach(task => {
        const t = document.createElement("div");
        t.className = "task";
        t.innerHTML = `
          <span class="delete-task">✖</span>
          <div class="task-header">${task.title}</div>
          <div class="task-info">Équipe: ${task.team || "-"}</div>
          <div class="task-info"><span class="badge badge-${(task.priority||"Moyenne").toLowerCase()}">${task.priority||"Moyenne"}</span></div>
          <div class="task-dates">${task.start ? "Début: "+task.start : ""} ${task.end ? " | Fin: "+task.end : ""}</div>
        `;
        t.querySelector(".delete-task").addEventListener("click", e=>{
          e.stopPropagation();
          if(confirm("Supprimer ce projet ?")) {
            deleteProject(task);
          }
        });
        t.addEventListener("click", ()=>openModal(task));
        colEl.appendChild(t);
      });

      const addBtn = document.createElement("button");
      addBtn.className="ghost";
      addBtn.textContent="+ PROJET";
      addBtn.addEventListener("click", async ()=>{
        const newProject = { title:"NOUVEAU PROJET", start:"", end:"", team:"", priority:"Moyenne", status };
        await saveProject(newProject);
      });
      colEl.appendChild(addBtn);

      cols.appendChild(colEl);
    });

    themeEl.appendChild(cols);
    boardEl.appendChild(themeEl);
  });
}

// --- MODAL ---
function openModal(task) {
  currentEdit = task;
  mTitle.value = task.title || "";
  mStart.value = task.start || "";
  mEnd.value = task.end || "";
  mTeam.value = task.team || "";
  mPriority.value = task.priority || "Moyenne";
  modal.style.display = "flex";
}

function closeModal() {
  modal.style.display = "none";
  currentEdit = null;
}

document.getElementById("modalSave").addEventListener("click", async ()=>{
  if(!currentEdit) return closeModal();
  currentEdit.title = mTitle.value;
  currentEdit.start = mStart.value;
  currentEdit.end = mEnd.value;
  currentEdit.team = mTeam.value;
  currentEdit.priority = mPriority.value;
  await saveProject(currentEdit);
  closeModal();
});
document.getElementById("modalCancel").addEventListener("click", closeModal);
modal.addEventListener("click", e=>{if(e.target===modal) closeModal();});

// --- ADD TYPE DE PROJET ---
addThemeBtn.addEventListener("click", async ()=>{
  const newTheme = { title:"NOUVEAU TYPE DE PROJET", "À FAIRE":[], "EN COURS":[], "TERMINÉ":[] };
  await saveProject(newTheme);
});

// --- START ---
loadData();

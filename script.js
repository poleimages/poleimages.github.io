// script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, addDoc, doc, updateDoc, getDocs } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyByYuQSuqdmcUCG9ayEu3knUAn0g-0eTOU",
  authDomain: "poleimages-b5574.firebaseapp.com",
  projectId: "poleimages-b5574",
  storageBucket: "poleimages-b5574.firebasestorage.app",
  messagingSenderId: "864866327007",
  appId: "1:864866327007:web:5b7432c5e9464cab42cc6a"
};

// Initialize Firebase
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
const checklistContainer = document.getElementById("checklistContainer");
const addChecklistBtn = document.getElementById("addChecklistBtn");

let currentEdit = null;
let dragData = null;

// Ajouter un nouveau type de projet
addThemeBtn.addEventListener("click", async () => {
  await addDoc(collection(db, "kanban"), {
    title: "NOUVEAU TYPE DE PROJET",
    "À FAIRE": [],
    "EN COURS": [],
    "TERMINE": []
  });
  loadBoard();
});

// Charger le board depuis Firestore
export async function loadBoard() {
  boardEl.innerHTML = "";
  const querySnap = await getDocs(collection(db, "kanban"));
  querySnap.forEach(docSnap => {
    const themeId = docSnap.id;
    const theme = docSnap.data();

    const themeEl = document.createElement("div");
    themeEl.className = "theme";

    const titleEl = document.createElement("div");
    titleEl.className = "theme-title";
    titleEl.textContent = theme.title.toUpperCase();
    titleEl.addEventListener("click", async () => {
      const newTitle = prompt("NOUVEAU NOM DU TYPE DE PROJET :", theme.title);
      if(newTitle){
        await updateDoc(doc(db, "kanban", themeId), { title: newTitle.toUpperCase() });
        loadBoard();
      }
    });
    themeEl.appendChild(titleEl);

    const cols = document.createElement("div");
    cols.className = "theme-columns";

    ["À FAIRE", "EN COURS", "TERMINE"].forEach(status => {
      const colEl = document.createElement("div");
      colEl.className = "column";
      if(status==="À FAIRE") colEl.classList.add("column-a-faire");
      else if(status==="EN COURS") colEl.classList.add("column-en-cours");
      else if(status==="TERMINE") colEl.classList.add("column-termine");

      colEl.innerHTML = `<h2>${status}</h2>`;

      theme[status].forEach((task, i) => {
        if(!task.checklist) task.checklist = [];
        const t = document.createElement("div");
        t.className = "task";
        t.setAttribute("draggable","true");
        t.innerHTML = `
          <span class="delete-task">✖</span>
          <div class="task-header">${task.title.toUpperCase()}</div>
          <div class="task-info">Équipe: ${task.team || "-"}</div>
          <div class="task-info"><span class="badge badge-${task.priority.toLowerCase()}">${task.priority}</span></div>
          <div class="task-dates">${task.start ? "DÉBUT: "+task.start : ""} ${task.end ? " | FIN: "+task.end : ""}</div>
          <div class="checklist-summary">${task.checklist.length} À FAIRE</div>
        `;

        // Supprimer tâche
        t.querySelector(".delete-task").addEventListener("click", async e => {
          e.stopPropagation();
          if(confirm("SUPPRIMER CE PROJET ?")){
            const updated = {...theme};
            updated[status].splice(i,1);
            await updateDoc(doc(db,"kanban",themeId), updated);
            loadBoard();
          }
        });

        // Éditer tâche
        t.addEventListener("click", ()=>openModal(themeId,status,i));

        // Drag & Drop
        t.addEventListener("dragstart", ()=>{ dragData={themeId,status,index:i}; });

        colEl.appendChild(t);
      });

      // Bouton ajouter projet
      const addBtn = document.createElement("button");
      addBtn.className="ghost";
      addBtn.textContent="+ PROJET";
      addBtn.addEventListener("click", async ()=>{
        const updated = {...theme};
        updated[status].push({
          title:"NOUVEAU PROJET",
          start:"",
          end:"",
          team:"",
          priority:"MOYENNE",
          checklist:[]
        });
        await updateDoc(doc(db,"kanban",themeId), updated);
        loadBoard();
      });
      colEl.appendChild(addBtn);

      // Définir zone drop
      colEl.addEventListener("dragover", e=>e.preventDefault());
      colEl.addEventListener("drop", async ()=>{
        if(!dragData) return;
        const srcTheme = await (await getDocs(collection(db,"kanban"))).docs.find(d=>d.id===dragData.themeId);
        const srcTask = srcTheme.data()[dragData.status][dragData.index];
        // Remove from source
        const updatedSrc = {...srcTheme.data()};
        updatedSrc[dragData.status].splice(dragData.index,1);
        await updateDoc(doc(db,"kanban",dragData.themeId), updatedSrc);

        // Add to destination
        const destTheme = {...theme};
        destTheme[status].push(srcTask);
        await updateDoc(doc(db,"kanban",themeId), destTheme);

        dragData = null;
        loadBoard();
      });

      cols.appendChild(colEl);
    });

    themeEl.appendChild(cols);
    boardEl.appendChild(themeEl);
  });
}

// Ouvrir modal
function openModal(themeId,status,index){
  currentEdit={themeId,status,index};
  (async()=>{
    const docSnap = await getDocs(collection(db,"kanban"));
    const themeData = docSnap.docs.find(d=>d.id===themeId).data();
    const task = themeData[status][index];

    mTitle.value = task.title;
    mStart.value = task.start;
    mEnd.value = task.end;
    mTeam.value = task.team;
    mPriority.value = task.priority;

    checklistContainer.innerHTML="";
    task.checklist.forEach(item=>{
      const div = document.createElement("div");
      div.className="checklist-item";
      div.innerHTML=`
        <input type="checkbox" ${item.done?'checked':''}>
        <input type="text" value="${item.text}">
        <span class="delete-check">✖</span>
      `;
      div.querySelector(".delete-check").addEventListener("click", ()=>div.remove());
      checklistContainer.appendChild(div);
    });

    modal.style.display="flex";
  })();
}

// Ajouter checklist
addChecklistBtn.addEventListener("click", ()=>{
  const div = document.createElement("div");
  div.className="checklist-item";
  div.innerHTML=`
    <input type="checkbox">
    <input type="text" value="">
    <span class="delete-check">✖</span>
  `;
  div.querySelector(".delete-check").addEventListener("click", ()=>div.remove());
  checklistContainer.appendChild(div);
});

// Enregistrer modal
document.getElementById("modalSave").addEventListener("click", async ()=>{
  if(!currentEdit) return;
  const {themeId,status,index}=currentEdit;
  const docRef = doc(db,"kanban",themeId);
  const docSnap = await getDocs(collection(db,"kanban"));
  const themeData = docSnap.docs.find(d=>d.id===themeId).data();
  const task = themeData[status][index];

  const newChecklist=[];
  checklistContainer.querySelectorAll(".checklist-item").forEach(div=>{
    newChecklist.push({
      done: div.querySelector('input[type="checkbox"]').checked,
      text: div.querySelector('input[type="text"]').value
    });
  });

  const updated = {...themeData};
  updated[status][index]={...task,
    title:mTitle.value,
    start:mStart.value,
    end:mEnd.value,
    team:mTeam.value,
    priority:mPriority.value,
    checklist:newChecklist
  };
  await updateDoc(docRef, updated);
  modal.style.display="none";
  loadBoard();
});

document.getElementById("modalCancel").addEventListener("click", ()=>modal.style.display="none");
modal.addEventListener("click", e=>{if(e.target===modal) modal.style.display="none";});

// Initial load
loadBoard();

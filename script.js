import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// --- Firebase config ---
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
const auth = getAuth(app);

// --- DOM Elements ---
const authContainer = document.getElementById("auth-container");
const appContainer = document.getElementById("app-container");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");
const authError = document.getElementById("authError");

const boardEl = document.getElementById("board");
const addThemeBtn = document.getElementById("addThemeBtn");
const modal = document.getElementById("modal");
const mTitle = document.getElementById("m-title");
const mStart = document.getElementById("m-start");
const mEnd = document.getElementById("m-end");
const mTeam = document.getElementById("m-team");
const mPriority = document.getElementById("m-priority");
const checklistContainer = document.getElementById("checklist-container");
const addChecklistBtn = document.getElementById("addChecklistBtn");

let currentEdit = null;
let dragData = null;
let currentUser = null;

// --- Auth Management ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user.email;
    userInfo.textContent = `Connecté: ${user.email}`;
    logoutBtn.style.display = "inline-block";
    authContainer.style.display = "none";
  } else {
    currentUser = null;
    userInfo.textContent = "Lecture seule";
    logoutBtn.style.display = "none";
  }
});

// Login
loginBtn.addEventListener("click", async () => {
  const email = loginEmail.value.trim();
  const password = loginPassword.value.trim();
  if (!email || !password) { authError.textContent = "Veuillez remplir tous les champs"; return; }
  try {
    await signInWithEmailAndPassword(auth, email, password);
    authError.textContent = "";
    authContainer.style.display = "none";
  } catch (error) {
    authError.textContent = "Email ou mot de passe incorrect";
  }
});

// Logout
logoutBtn.addEventListener("click", async () => { await signOut(auth); });

// Enter key login
loginPassword.addEventListener("keypress", (e) => { if(e.key==="Enter") loginBtn.click(); });

// --- Theme & Task Management ---
addThemeBtn.addEventListener("click", async () => {
  if(!currentUser) { authContainer.style.display="flex"; return; }
  await addDoc(collection(db,"kanban"), { title:"NOUVEAU TYPE DE PROJET", "À faire":[], "En cours":[], "Terminé":[] });
  loadBoard();
});

addChecklistBtn.addEventListener("click", () => {
  const div = document.createElement("div");
  div.className = "checklist-item";
  div.innerHTML = `<input type="checkbox"><input type="text" value=""><span class="delete-check">✖</span>`;
  div.querySelector(".delete-check").addEventListener("click", () => div.remove());
  checklistContainer.appendChild(div);
});

// --- Load Board ---
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
      if(!currentUser){ authContainer.style.display="flex"; return; }
      const newTitle = prompt("Nouveau nom du type de projet :", theme.title);
      if(newTitle){ await updateDoc(doc(db,"kanban",themeId), { title:newTitle }); loadBoard(); }
    });
    themeEl.appendChild(titleEl);

    const cols = document.createElement("div");
    cols.className = "theme-columns";

    ["À faire","En cours","Terminé"].forEach(status => {
      const colEl = document.createElement("div");
      colEl.className="column";
      if(status==="À faire") colEl.classList.add("column-a-faire");
      else if(status==="En cours") colEl.classList.add("column-en-cours");
      else colEl.classList.add("column-termine");
      colEl.innerHTML=`<h2>${status.toUpperCase()}</h2>`;

      colEl.addEventListener("dragover", e=>e.preventDefault());
      colEl.addEventListener("drop", async e=>{
        if(!currentUser){ authContainer.style.display="flex"; return; }
        if(!dragData) return;
        const { themeId: srcThemeId, status: srcStatus, index } = dragData;
        if(srcThemeId !== themeId) return;
        const updated = {...theme};
        const [movedTask] = updated[srcStatus].splice(index,1);
        movedTask.lastModifiedBy = currentUser;
        movedTask.lastModifiedAt = new Date().toLocaleString('fr-FR');
        updated[status].push(movedTask);
        await updateDoc(doc(db,"kanban",themeId), updated);
        dragData = null;
        loadBoard();
      });

      (theme[status] || []).forEach((task,i)=>{
        if(!task.checklist) task.checklist=[];
        const t = document.createElement("div");
        t.className = "task";
        t.setAttribute("draggable","true");

        const lastModified = task.lastModifiedBy ? 
          `<div class="last-modified">Modifié par ${task.lastModifiedBy}${task.lastModifiedAt?` le ${task.lastModifiedAt}`:''}</div>` : '';

        t.innerHTML = `
          <span class="delete-task" title="Supprimer tâche">✖</span>
          <div class="task-header">${task.title.toUpperCase()}</div>
          <div class="task-info">Équipe: ${task.team||"-"}</div>
          <div class="task-info"><span class="badge badge-${(task.priority||"MOYENNE").toLowerCase()}">${task.priority||"MOYENNE"}</span></div>
          <div class="task-dates">${task.start?"Début: "+task.start:""} ${task.end?"| Fin: "+task.end:""}</div>
          ${lastModified}
        `;

        // Checklist visible et modifiable directement
        const checklistDiv = document.createElement("div");
        checklistDiv.className = "checklist-on-card";
        task.checklist.forEach((item, idx)=>{
          const itemDiv = document.createElement("div");
          itemDiv.className="checklist-item";

          const checkbox = document.createElement("input");
          checkbox.type="checkbox";
          checkbox.checked = item.done;
          checkbox.addEventListener("change", async e=>{
            e.stopPropagation();
            if(!currentUser){ authContainer.style.display="flex"; loadBoard(); return; }
            const updated = {...theme};
            updated[status][i].checklist[idx].done = checkbox.checked;
            updated[status][i].lastModifiedBy = currentUser;
            updated[status][i].lastModifiedAt = new Date().toLocaleString('fr-FR');
            await updateDoc(doc(db,"kanban",themeId), updated);
            loadBoard();
          });

          const textSpan = document.createElement("span");
          textSpan.className="checklist-text";
          textSpan.textContent=item.text;

          const deleteSpan = document.createElement("span");
          deleteSpan.className="delete-check";
          deleteSpan.textContent="✖";
          deleteSpan.title="Supprimer cet élément";
          deleteSpan.addEventListener("click", async e=>{
            e.stopPropagation();
            if(!currentUser){ authContainer.style.display="flex"; loadBoard(); return; }
            if(confirm("Supprimer cet élément de la checklist ?")){
              const updated = {...theme};
              updated[status][i].checklist.splice(idx,1);
              updated[status][i].lastModifiedBy = currentUser;
              updated[status][i].lastModifiedAt = new Date().toLocaleString('fr-FR');
              await updateDoc(doc(db,"kanban",themeId), updated);
              loadBoard();
            }
          });

          itemDiv.appendChild(checkbox);
          itemDiv.appendChild(textSpan);
          itemDiv.appendChild(deleteSpan);
          checklistDiv.appendChild(itemDiv);
        });
        t.appendChild(checklistDiv);

        t.querySelector(".delete-task").addEventListener("click", async e=>{
          e.stopPropagation();
          if(!currentUser){ authContainer.style.display="flex"; return; }
          if(confirm("Supprimer ce projet ?")){
            const updated = {...theme};
            updated[status].splice(i,1);
            await updateDoc(doc(db,"kanban",themeId), updated);
            loadBoard();
          }
        });

        t.addEventListener("click", e=>{
          if(e.target.type==='checkbox'||e.target.classList.contains('delete-check')||e.target.classList.contains('delete-task')) return;
          if(!currentUser){ authContainer.style.display="flex"; return; }
          openModal(themeId,status,i);
        });

        t.addEventListener("dragstart", ()=>{
          if(!currentUser){ authContainer.style.display="flex"; return; }
          dragData = {themeId,status,index:i};
        });

        colEl.appendChild(t);
      });

      const addBtn = document.createElement("button");
      addBtn.className="ghost";
      addBtn.textContent="+ PROJET";
      addBtn.addEventListener("click", async ()=>{
        if(!currentUser){ authContainer.style.display="flex"; return; }
        const updated = {...theme};
        updated[status].push({title:"NOUVEAU PROJET", start:"", end:"", team:"", priority:"MOYENNE", checklist:[], lastModifiedBy:currentUser, lastModifiedAt: new Date().toLocaleString('fr-FR')});
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

// --- Modal Edition ---
function openModal(themeId,status,index){
  currentEdit={themeId,status,index};
  (async()=>{
    const docSnap = await getDocs(collection(db,"kanban"));
    const themeData = docSnap.docs.find(d=>d.id===themeId).data();
    const task = themeData[status][index];
    mTitle.value=task.title;
    mStart.value=task.start;
    mEnd.value=task.end;
    mTeam.value=task.team;
    mPriority.value=task.priority;

    checklistContainer.innerHTML="";
    task.checklist.forEach(item=>{
      const div = document.createElement("div");
      div.className="checklist-item";
      div.innerHTML=`<input type="checkbox" ${item.done?'checked':''}><input type="text" value="${item.text}"><span class="delete-check">✖</span>`;
      div.querySelector(".delete-check").addEventListener("click", ()=>div.remove());
      checklistContainer.appendChild(div);
    });

    modal.style.display="flex";
  })();
}

document.getElementById("modalSave").addEventListener("click", async ()=>{
  if(!currentEdit) return;
  if(!currentUser){ authContainer.style.display="flex"; return; }

  const {themeId,status,index} = currentEdit;
  const docSnap = await getDocs(collection(db,"kanban"));
  const themeData = docSnap.docs.find(d=>d.id===themeId).data();
  const task = themeData[status][index];

  const newChecklist=[];
  checklistContainer.querySelectorAll(".checklist-item").forEach(div=>{
    newChecklist.push({ done: div.querySelector('input[type="checkbox"]').checked, text: div.querySelector('input[type="text"]').value });
  });

  const updated = {...themeData};
  updated[status][index]={ ...task, title:mTitle.value, start:mStart.value, end:mEnd.value, team:mTeam.value, priority:mPriority.value, checklist:newChecklist, lastModifiedBy:currentUser, lastModifiedAt:new Date().toLocaleString('fr-FR') };

  await updateDoc(doc(db,"kanban",themeId), updated);
  modal.style.display="none";
  loadBoard();
});

document.getElementById("modalCancel").addEventListener("click", ()=>modal.style.display="none");
modal.addEventListener("click", e=>{if(e.target===modal) modal.style.display="none";});

loadBoard();

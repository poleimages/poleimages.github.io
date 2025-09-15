import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

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
const auth = getAuth(app);

// Elements
const boardEl = document.getElementById("board");
const addThemeBtn = document.getElementById("addThemeBtn");
const modal = document.getElementById("modal");
const loginModal = document.getElementById("loginModal");
const authStatus = document.getElementById("authStatus");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginError = document.getElementById("loginError");
const mTitle = document.getElementById("m-title");
const mStart = document.getElementById("m-start");
const mEnd = document.getElementById("m-end");
const mTeam = document.getElementById("m-team");
const mPriority = document.getElementById("m-priority");
const checklistContainer = document.getElementById("checklist-container");
const addChecklistBtn = document.getElementById("addChecklistBtn");

let currentEdit = null;
let dragData = null;
let isAuthenticated = false;

// Auth state management
onAuthStateChanged(auth, (user) => {
  isAuthenticated = !!user;
  updateAuthUI();
});

function updateAuthUI() {
  if (isAuthenticated) {
    authStatus.textContent = "Connecté - Mode édition";
    authStatus.className = "auth-status logged-in";
    loginBtn.style.display = "none";
    logoutBtn.style.display = "block";
    addThemeBtn.disabled = false;
    document.body.classList.remove("read-only");
  } else {
    authStatus.textContent = "Mode lecture seule";
    authStatus.className = "auth-status logged-out";
    loginBtn.style.display = "block";
    logoutBtn.style.display = "none";
    addThemeBtn.disabled = true;
    document.body.classList.add("read-only");
  }
}

function requireAuth(callback) {
  if (!isAuthenticated) {
    loginModal.style.display = "flex";
    return false;
  }
  callback();
  return true;
}

// Auth event listeners
loginBtn.addEventListener("click", () => {
  loginModal.style.display = "flex";
  loginEmail.focus();
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

document.getElementById("loginSubmit").addEventListener("click", async () => {
  const email = loginEmail.value;
  const password = loginPassword.value;
  
  if (!email || !password) {
    showLoginError("Veuillez remplir tous les champs");
    return;
  }
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginModal.style.display = "none";
    loginError.style.display = "none";
    loginEmail.value = "";
    loginPassword.value = "";
  } catch (error) {
    let errorMessage = "Erreur de connexion";
    if (error.code === "auth/user-not-found") {
      errorMessage = "Utilisateur non trouvé";
    } else if (error.code === "auth/wrong-password") {
      errorMessage = "Mot de passe incorrect";
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "Email invalide";
    } else if (error.code === "auth/too-many-requests") {
      errorMessage = "Trop de tentatives, réessayez plus tard";
    }
    showLoginError(errorMessage);
  }
});

document.getElementById("loginCancel").addEventListener("click", () => {
  loginModal.style.display = "none";
  loginError.style.display = "none";
});

loginModal.addEventListener("click", (e) => {
  if (e.target === loginModal) {
    loginModal.style.display = "none";
    loginError.style.display = "none";
  }
});

// Handle Enter key in login form
loginPassword.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    document.getElementById("loginSubmit").click();
  }
});

function showLoginError(message) {
  loginError.textContent = message;
  loginError.style.display = "block";
}

// Theme management
addThemeBtn.addEventListener("click", () => {
  requireAuth(async () => {
    await addDoc(collection(db,"kanban"), {
      title:"NOUVEAU TYPE DE PROJET",
      "À faire":[],
      "En cours":[],
      "Terminé":[]
    });
    loadBoard();
  });
});

// Checklist management
addChecklistBtn.addEventListener("click", () => {
  const div = document.createElement("div");
  div.className="checklist-item";
  div.innerHTML = `<input type="checkbox"><input type="text" value=""><span class="delete-check">✖</span>`;
  div.querySelector(".delete-check").addEventListener("click", ()=>div.remove());
  checklistContainer.appendChild(div);
});

// Load board
async function loadBoard(){
  boardEl.innerHTML="";
  const snapshot = await getDocs(collection(db,"kanban"));
  snapshot.forEach(docSnap=>{
    const theme = docSnap.data();
    const themeId = docSnap.id;

    const themeEl = document.createElement("div");
    themeEl.className="theme";

    const titleEl = document.createElement("div");
    titleEl.className="theme-title";
    titleEl.textContent=theme.title.toUpperCase();
    titleEl.addEventListener("click", () => {
      requireAuth(async () => {
        const newTitle = prompt("Nouveau nom du type de projet :", theme.title);
        if(newTitle){
          await updateDoc(doc(db,"kanban",themeId), { title:newTitle });
          loadBoard();
        }
      });
    });
    themeEl.appendChild(titleEl);

    const cols = document.createElement("div");
    cols.className="theme-columns";

    ["À faire","En cours","Terminé"].forEach(status=>{
      const colEl = document.createElement("div");
      colEl.className="column";
      if(status==="À faire") colEl.classList.add("column-a-faire");
      else if(status==="En cours") colEl.classList.add("column-en-cours");
      else colEl.classList.add("column-termine");
      colEl.innerHTML=`<h2>${status.toUpperCase()}</h2>`;

      colEl.addEventListener("dragover", e => {
        if (isAuthenticated) e.preventDefault();
      });
      
      colEl.addEventListener("drop", (e) => {
        if (!isAuthenticated) return;
        requireAuth(async () => {
          if(!dragData) return;
          const {themeId: srcThemeId, status: srcStatus, index} = dragData;
          if(srcThemeId!==themeId) return;
          const updated = {...theme};
          const [movedTask] = updated[srcStatus].splice(index,1);
          updated[status].push(movedTask);
          await updateDoc(doc(db,"kanban",themeId), updated);
          dragData=null;
          loadBoard();
        });
      });

      (theme[status] || []).forEach((task,i)=>{
        if(!task.checklist) task.checklist=[];
        const t = document.createElement("div");
        t.className="task";
        if (isAuthenticated) {
          t.setAttribute("draggable","true");
        }
        t.innerHTML=`
          <span class="delete-task" title="Supprimer tâche">✖</span>
          <div class="task-header">${task.title.toUpperCase()}</div>
          <div class="task-info">Équipe: ${task.team || "-"}</div>
          <div class="task-info"><span class="badge badge-${(task.priority||"MOYENNE").toLowerCase()}">${task.priority||"MOYENNE"}</span></div>
          <div class="task-dates">${task.start?"Début: "+task.start:""} ${task.end?"| Fin: "+task.end:""}</div>
        `;

        // Checklist display
        const checklistDiv = document.createElement("div");
        checklistDiv.className="checklist-on-card";
        task.checklist.forEach((item, idx)=>{
          const label = document.createElement("label");
          const checkbox = document.createElement("input");
          checkbox.type="checkbox";
          checkbox.checked = item.done;
          if (isAuthenticated) {
            checkbox.addEventListener("change", () => {
              requireAuth(async () => {
                const updated = {...theme};
                updated[status][i].checklist[idx].done = checkbox.checked;
                await updateDoc(doc(db,"kanban",themeId), updated);
              });
            });
          }
          const span = document.createTextNode(item.text);
          label.appendChild(checkbox);
          label.appendChild(span);
          checklistDiv.appendChild(label);
        });
        t.appendChild(checklistDiv);

        t.querySelector(".delete-task").addEventListener("click", (e) => {
          e.stopPropagation();
          requireAuth(async () => {
            if(confirm("Supprimer ce projet ?")){
              const updated={...theme};
              updated[status].splice(i,1);
              await updateDoc(doc(db,"kanban",themeId), updated);
              loadBoard();
            }
          });
        });

        t.addEventListener("click", () => {
          if (isAuthenticated) {
            openModal(themeId,status,i);
          }
        });

        if (isAuthenticated) {
          t.addEventListener("dragstart", ()=>{
            dragData={themeId,status,index:i};
          });
        }

        colEl.appendChild(t);
      });

      const addBtn = document.createElement("button");
      addBtn.className="ghost";
      addBtn.textContent="+ PROJET";
      addBtn.disabled = !isAuthenticated;
      addBtn.addEventListener("click", () => {
        requireAuth(async () => {
          const updated={...theme};
          updated[status].push({title:"NOUVEAU PROJET", start:"", end:"", team:"", priority:"MOYENNE", checklist:[]});
          await updateDoc(doc(db,"kanban",themeId), updated);
          loadBoard();
        });
      });
      colEl.appendChild(addBtn);

      cols.appendChild(colEl);
    });

    themeEl.appendChild(cols);
    boardEl.appendChild(themeEl);
  });
}

// Modal functions
function openModal(themeId,status,index){
  currentEdit={themeId,status,index};
  (async ()=>{
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
  const {themeId,status,index} = currentEdit;
  const docSnap = await getDocs(collection(db,"kanban"));
  const themeData = docSnap.docs.find(d=>d.id===themeId).data();
  const task = themeData[status][index];

  const newChecklist = [];
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

  await updateDoc(doc(db,"kanban",themeId), updated);
  modal.style.display="none";
  loadBoard();
});

document.getElementById("modalCancel").addEventListener("click", ()=>modal.style.display="none");
modal.addEventListener("click", e=>{if(e.target===modal) modal.style.display="none";});

// Initial load
document.body.classList.add("read-only"); // Commencer en mode lecture seule
loadBoard();
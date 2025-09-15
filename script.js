import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Config Firebase
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

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

let currentEdit = null;
let dragData = null;

// Authentification
loginBtn.addEventListener("click", async ()=>{
  const email=emailInput.value, password=passwordInput.value;
  try { await signInWithEmailAndPassword(auth,email,password); loadBoard(); }
  catch(err){ alert(err.message); }
});
logoutBtn.addEventListener("click", ()=>signOut(auth).then(()=>boardEl.innerHTML="").catch(console.error));

// Ajouter thème
addThemeBtn.addEventListener("click", async ()=>{
  const user=auth.currentUser; if(!user){alert("Connectez-vous!"); return;}
  await addDoc(collection(db,"kanban"),{
    title:"NOUVEAU TYPE DE PROJET",
    "À faire":[], "En cours":[], "Terminé":[],
    modifiedBy:user.email, modifiedAt:new Date().toISOString()
  });
  loadBoard();
});

// Charger board
async function loadBoard(){
  boardEl.innerHTML="";
  const snapshot = await getDocs(collection(db,"kanban"));
  snapshot.forEach(docSnap=>{
    const theme=docSnap.data(); const themeId=docSnap.id;
    const themeEl=document.createElement("div"); themeEl.className="theme";
    const titleEl=document.createElement("div"); titleEl.className="theme-title"; titleEl.textContent=theme.title.toUpperCase();
    titleEl.addEventListener("click", async ()=>{
      const newTitle=prompt("Nouveau nom du type de projet:",theme.title);
      if(newTitle){
        const user=auth.currentUser; if(!user){alert("Connectez-vous!"); return;}
        await updateDoc(doc(db,"kanban",themeId), { title:newTitle, modifiedBy:user.email, modifiedAt:new Date().toISOString() });
        loadBoard();
      }
    });
    themeEl.appendChild(titleEl);

    const cols=document.createElement("div"); cols.className="theme-columns";
    ["À faire","En cours","Terminé"].forEach(status=>{
      const colEl=document.createElement("div"); colEl.className="column";
      if(status==="À faire") colEl.classList.add("column-a-faire");
      else if(status==="En cours") colEl.classList.add("column-en-cours");
      else colEl.classList.add("column-termine");
      colEl.innerHTML=`<h2>${status.toUpperCase()}</h2>`;
      colEl.addEventListener("dragover", e=>e.preventDefault());
      colEl.addEventListener("drop", async e=>{
        if(!dragData) return;
        const {themeId:srcThemeId,status:srcStatus,index}=dragData;
        if(srcThemeId!==themeId) return;
        const updated={...theme};
        const [movedTask]=updated[srcStatus].splice(index,1);
        updated[status].push(movedTask);
        const user=auth.currentUser;
        if(!user){alert("Connectez-vous!"); return;}
        updated.modifiedBy=user.email; updated.modifiedAt=new Date().toISOString();
        await updateDoc(doc(db,"kanban",themeId),updated);
        dragData=null; loadBoard();
      });

      (theme[status]||[]).forEach((task,i)=>{
        if(!task.checklist) task.checklist=[];
        const t=document.createElement("div"); t.className="task"; t.setAttribute("draggable","true");
        let checklistHtml=task.checklist.map(c=>`<input type="checkbox" ${c.done?'checked':''} disabled> ${c.text}`).join("<br>");
        t.innerHTML=`
          <span class="delete-task" title="Supprimer tâche">✖</span>
          <div class="task-header">${task.title.toUpperCase()}</div>
          <div class="task-info">Équipe: ${task.team||"-"}</div>
          <div class="task-info"><span class="badge badge-${(task.priority||"MOYENNE").toLowerCase()}">${task.priority||"MOYENNE"}</span></div>
          <div class="task-dates">${task.start? "Début:"+task.start:""} ${task.end?"| Fin:"+task.end:""}</div>
          <div class="task-checklist">${checklistHtml}</div>
        `;
        t.querySelector(".delete-task").addEventListener("click", async e=>{
          e.stopPropagation();
          if(confirm("Supprimer ce projet ?")){
            const updated={...theme};
            updated[status].splice(i,1);
            const user=auth.currentUser; if(!user){alert("Connectez-vous!"); return;}
            updated.modifiedBy=user.email; updated.modifiedAt=new Date().toISOString();
            await updateDoc(doc(db,"kanban",themeId),updated);
            loadBoard();
          }
        });
        t.addEventListener("click", ()=>openModal(themeId,status,i,task));
        t.addEventListener("dragstart", ()=>{ dragData={themeId,status,index:i}; t.classList.add("dragging"); });
        t.addEventListener("dragend", ()=>t.classList.remove("dragging"));
        colEl.appendChild(t);
      });

      const addBtn=document.createElement("button"); addBtn.className="ghost"; addBtn.textContent="+ PROJET";
      addBtn.addEventListener("click", async ()=>{
        const user=auth.currentUser; if(!user){alert("Connectez-vous!"); return;}
        const updated={...theme};
        updated[status].push({title:"NOUVEAU PROJET",start:"",end:"",team:"",priority:"MOYENNE",checklist:[]});
        updated.modifiedBy=user.email; updated.modifiedAt=new Date().toISOString();
        await updateDoc(doc(db,"kanban",themeId),updated);
        loadBoard();
      });
      colEl.appendChild(addBtn); cols.appendChild(colEl);
    });

    themeEl.appendChild(cols); boardEl.appendChild(themeEl);
  });
}

// Modal
function openModal(themeId,status,index,task){
  currentEdit={themeId,status,index};
  mTitle.value=task.title; mStart.value=task.start; mEnd.value=task.end;
  mTeam.value=task.team; mPriority.value=task.priority;
  checklistContainer.innerHTML="";
  task.checklist.forEach(c=>{
    const div=document.createElement("div"); div.className="checklist-item";
    div.innerHTML=`<input type="checkbox" ${c.done?'checked':''}> <input type="text" value="${c.text}"> <span class="delete-check">✖</span>`;
    div.querySelector(".delete-check").addEventListener("click", ()=>div.remove());
    checklistContainer.appendChild(div);
  });
  modal.style.display="flex";
}
addChecklistBtn.addEventListener("click", ()=>{
  const div=document.createElement("div"); div.className="checklist-item";
  div.innerHTML=`<input type="checkbox"> <input type="text"> <span class="delete-check">✖</span>`;
  div.querySelector(".delete-check").addEventListener("click", ()=>div.remove());
  checklistContainer.appendChild(div);
});
document.getElementById("modalSave").addEventListener("click", async ()=>{
  if(!currentEdit) return closeModal();
  const {themeId,status,index}=currentEdit;
  const docRef=doc(db,"kanban",themeId);
  const snapshot = await getDocs(collection(db,"kanban"));
  const themeData = snapshot.docs.find(d=>d.id===themeId).data();
  const task=themeData[status][index];

  const newChecklist=[];
  checklistContainer.querySelectorAll(".checklist-item").forEach(div=>{
    newChecklist.push({done:div.querySelector('input[type="checkbox"]').checked,text:div.querySelector('input[type="text"]').value});
  });

  const updated={...themeData};
  const user=auth.currentUser; if(!user){alert("Connectez-vous!"); return;}
  updated[status][index]={...task,title:mTitle.value,start:mStart.value,end:mEnd.value,team:mTeam.value,priority:mPriority.value,checklist:newChecklist};
  updated.modifiedBy=user.email; updated.modifiedAt=new Date().toISOString();
  await updateDoc(docRef,updated);
  closeModal(); loadBoard();
});
document.getElementById("modalCancel").addEventListener("click", closeModal);
modal.addEventListener("click", e=>{if(e.target===modal) closeModal();});
function closeModal(){ modal.style.display="none"; currentEdit=null; }

auth.onAuthStateChanged(user=>{ if(user) loadBoard(); else boardEl.innerHTML=""; });

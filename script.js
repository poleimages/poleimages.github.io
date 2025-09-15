import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

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

const loginModal = document.getElementById("loginModal");
const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");

let currentEdit=null;
let dragData=null;

// Vérif si user est connecté
function requireAuth(action){
  if(auth.currentUser){ action(); }
  else{ loginModal.style.display="flex"; loginModal.dataset.pending=action; }
}

// Ajouter thème
addThemeBtn.addEventListener("click", ()=>requireAuth(async()=>{
  await addDoc(collection(db,"kanban"), { title:"NOUVEAU TYPE DE PROJET","À faire":[],"En cours":[],"Terminé":[] });
  loadBoard();
}));

// Charger board
async function loadBoard(){
  boardEl.innerHTML="";
  const snapshot=await getDocs(collection(db,"kanban"));
  snapshot.forEach(docSnap=>{
    const theme=docSnap.data();
    const themeId=docSnap.id;
    const themeEl=document.createElement("div");
    themeEl.className="theme";
    const titleEl=document.createElement("div");
    titleEl.className="theme-title";
    titleEl.textContent=theme.title.toUpperCase();
    themeEl.appendChild(titleEl);
    const cols=document.createElement("div");
    cols.className="theme-columns";
    ["À faire","En cours","Terminé"].forEach(status=>{
      const colEl=document.createElement("div");
      colEl.className="column";
      if(status==="À faire") colEl.classList.add("column-a-faire");
      else if(status==="En cours") colEl.classList.add("column-en-cours");
      else colEl.classList.add("column-termine");
      colEl.innerHTML=`<h2>${status.toUpperCase()}</h2>`;
      colEl.addEventListener("dragover",e=>e.preventDefault());
      colEl.addEventListener("drop",e=>requireAuth(async()=>{
        if(!dragData) return;
        const {themeId:srcThemeId,status:srcStatus,index}=dragData;
        if(srcThemeId!==themeId) return;
        const updated={...theme};
        const [moved]=updated[srcStatus].splice(index,1);
        updated[status].push(moved);
        updated.lastModifiedBy=auth.currentUser.email;
        await updateDoc(doc(db,"kanban",themeId),updated);
        dragData=null; loadBoard();
      }));
      (theme[status]||[]).forEach((task,i)=>{
        if(!task.checklist) task.checklist=[];
        const t=document.createElement("div");
        t.className="task"; t.setAttribute("draggable","true");
        let checklistHtml=task.checklist.map(item=>`<div><input type='checkbox' ${item.done?'checked':''} disabled> ${item.text}</div>`).join("");
        t.innerHTML=`<span class="delete-task">✖</span>
        <div class="task-header">${task.title.toUpperCase()}</div>
        <div class="task-info">Équipe: ${task.team||"-"}</div>
        <div class="task-info"><span class="badge badge-${(task.priority||"MOYENNE").toLowerCase()}">${task.priority||"MOYENNE"}</span></div>
        <div class="task-dates">${task.start?"Début: "+task.start:""} ${task.end?" | Fin: "+task.end:""}</div>
        <div class="task-checklist">${checklistHtml}</div>
        <div class="task-info">Dernier modif: ${task.lastModifiedBy||"-"}</div>`;
        t.querySelector(".delete-task").addEventListener("click",e=>{ e.stopPropagation(); requireAuth(async()=>{
          const updated={...theme};
          updated[status].splice(i,1);
          updated.lastModifiedBy=auth.currentUser.email;
          await updateDoc(doc(db,"kanban",themeId),updated);
          loadBoard();
        }); });
        t.addEventListener("click",()=>{
          currentEdit={themeId,status,index:i};
          mTitle.value=task.title; mStart.value=task.start; mEnd.value=task.end; mTeam.value=task.team; mPriority.value=task.priority;
          checklistContainer.innerHTML="";
          task.checklist.forEach(item=>{
            const div=document.createElement("div");
            div.className="checklist-item";
            div.innerHTML=`<input type="checkbox" ${item.done?'checked':''}><input type="text" value="${item.text}"><span class="delete-check">✖</span>`;
            div.querySelector(".delete-check").addEventListener("click",()=>div.remove());
            checklistContainer.appendChild(div);
          });
          modal.style.display="flex";
        });
        t.addEventListener("dragstart",()=>{ dragData={themeId,status,index:i}; });
        colEl.appendChild(t);
      });
      const addBtn=document.createElement("button");
      addBtn.className="ghost"; addBtn.textContent="+ PROJET";
      addBtn.addEventListener("click",()=>requireAuth(async()=>{
        const updated={...theme};
        updated[status].push({title:"NOUVEAU PROJET",start:"",end:"",team:"",priority:"MOYENNE",checklist:[],lastModifiedBy:auth.currentUser.email});
        await updateDoc(doc(db,"kanban",themeId),updated);
        loadBoard();
      }));
      colEl.appendChild(addBtn);
      cols.appendChild(colEl);
    });
    themeEl.appendChild(cols); boardEl.appendChild(themeEl);
  });
}

// Sauvegarde modale
document.getElementById("modalSave").addEventListener("click",()=>requireAuth(async()=>{
  if(!currentEdit) return;
  const {themeId,status,index}=currentEdit;
  const snapshot=await getDocs(collection(db,"kanban"));
  const docSnap=snapshot.docs.find(d=>d.id===themeId);
  if(docSnap){
    const themeData=docSnap.data();
    const task=themeData[status][index];
    const newChecklist=[];
    checklistContainer.querySelectorAll(".checklist-item").forEach(div=>{
      newChecklist.push({done:div.querySelector("input[type='checkbox']").checked,text:div.querySelector("input[type='text']").value});
    });
    const updated={...themeData};
    updated[status][index]={...task,title:mTitle.value,start:mStart.value,end:mEnd.value,team:mTeam.value,priority:mPriority.value,checklist:newChecklist,lastModifiedBy:auth.currentUser.email};
    await updateDoc(doc(db,"kanban",themeId),updated);
  }
  modal.style.display="none"; loadBoard();
}));
document.getElementById("modalCancel").addEventListener("click",()=>modal.style.display="none");
modal.addEventListener("click",e=>{ if(e.target===modal) modal.style.display="none"; });
addChecklistBtn.addEventListener("click",()=>{
  const div=document.createElement("div");
  div.className="checklist-item";
  div.innerHTML='<input type="checkbox"><input type="text"><span class="delete-check">✖</span>';
  div.querySelector(".delete-check").addEventListener("click",()=>div.remove());
  checklistContainer.appendChild(div);
});

// Auth modal
document.getElementById("loginSubmit").addEventListener("click",async()=>{
  try{
    await signInWithEmailAndPassword(auth,loginEmail.value,loginPassword.value);
    loginModal.style.display="none";
    if(loginModal.dataset.pending){ const fn=loginModal.dataset.pending; delete loginModal.dataset.pending; fn(); }
  }catch(e){ alert("Erreur login: "+e.message); }
});
document.getElementById("loginCancel").addEventListener("click",()=>loginModal.style.display="none");
loginModal.addEventListener("click",e=>{ if(e.target===loginModal) loginModal.style.display="none"; });

loadBoard();

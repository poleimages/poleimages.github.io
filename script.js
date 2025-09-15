const STORAGE_KEY="kanban_production";
let board=JSON.parse(localStorage.getItem(STORAGE_KEY))||[];
let currentEdit=null;
const boardEl=document.getElementById("board");
const modal=document.getElementById("modal");
const mTitle=document.getElementById("m-title");
const mStart=document.getElementById("m-start");
const mEnd=document.getElementById("m-end");
const mTeam=document.getElementById("m-team");
const mPriority=document.getElementById("m-priority");

function addTheme(){
  board.push({title:"NOUVEAU TYPE DE PROJET","À faire":[],"En cours":[],"Terminé":[]});
  save();
}

function render(){
  boardEl.innerHTML="";
  board.forEach((theme,tIndex)=>{
    const themeEl=document.createElement("div");
    themeEl.className="theme";
    const titleEl=document.createElement("div");
    titleEl.className="theme-title";
    titleEl.textContent=theme.title;
    titleEl.addEventListener("click",()=>{
      const newTitle=prompt("NOUVEAU NOM DU TYPE DE PROJET:",theme.title);
      if(newTitle){theme.title=newTitle;save();}
    });
    themeEl.appendChild(titleEl);
    const cols=document.createElement("div");
    cols.className="theme-columns";
    ["À faire","En cours","Terminé"].forEach(status=>{
      const colEl=document.createElement("div");
      colEl.className="column";
      if(status==="À faire")colEl.classList.add("column-a-faire");
      else if(status==="En cours")colEl.classList.add("column-en-cours");
      else colEl.classList.add("column-termine");
      colEl.innerHTML=`<h2>${status}</h2>`;
      theme[status].forEach((task,i)=>{
        if(!task.checklist)task.checklist=[];
        const t=document.createElement("div");
        t.className="task";
        t.innerHTML=`<span class='delete-task' title='Supprimer tâche'>✖</span><div class='task-header'>${task.title}</div><div class='task-info'>Équipe: ${task.team||'-'}</div><div class='task-info'><span class='badge badge-${(task.priority||'Moyenne').toLowerCase()}'>${task.priority||'Moyenne'}</span></div><div class='task-dates'>${task.start?"Début: "+task.start:""} ${task.end?" | Fin: "+task.end:""}</div><div class='checklist'></div><div class='add-check'>+ Ajouter case à cocher</div>`;
        const checklist=t.querySelector('.checklist');
        t.querySelector('.add-check').addEventListener('click',e=>{
          e.stopPropagation();
          const line=document.createElement('div');
          line.className='checklist-line';
          line.innerHTML=`<input type='checkbox'><input type='text' placeholder='Nouvelle tâche'><span class='delete-sub'>✖</span>`;
          line.querySelector('.delete-sub').addEventListener('click',()=>{checklist.removeChild(line);});
          checklist.appendChild(line);
        });
        t.querySelector('.delete-task').addEventListener('click',e=>{e.stopPropagation();if(confirm('SUPPRIMER CE PROJET ?')){theme[status].splice(i,1);save();}});
        t.addEventListener('click',()=>openModal(tIndex,status,i));
        colEl.appendChild(t);
      });
      const addBtn=document.createElement('button');
      addBtn.className='ghost';
      addBtn.textContent='+ PROJET';
      addBtn.addEventListener('click',()=>{theme[status].push({title:'NOUVEAU PROJET',start:'',end:'',team:'',priority:'Moyenne',checklist:[]});save();});
      colEl.appendChild(addBtn);
      cols.appendChild(colEl);
      new Sortable(colEl, {
  group: 'tasks',
  animation: 150,
  onEnd: evt => {
    const fromStatus = evt.from.querySelector('h2').textContent;
    const toStatus = evt.to.querySelector('h2').textContent;
    const themeIdx = tIndex; // thème courant
    const item = board[themeIdx][fromStatus].splice(evt.oldIndex, 1)[0];
    board[themeIdx][toStatus].splice(evt.newIndex, 0, item);
    save();
  }
});

    });
    themeEl.appendChild(cols);
    boardEl.appendChild(themeEl);
  });
}

function openModal(themeIdx,status,taskIdx){
  currentEdit={themeIdx,status,taskIdx};
  const task=board[themeIdx][status][taskIdx];
  mTitle.value=task.title;mStart.value=task.start;mEnd.value=task.end;mTeam.value=task.team;mPriority.value=task.priority;
  modal.style.display='flex';
}

function closeModal(){modal.style.display='none';currentEdit=null;}

document.getElementById('modalSave').addEventListener('click',()=>{
  if(!currentEdit)return closeModal();
  const {themeIdx,status,taskIdx}=currentEdit;
  const task=board[themeIdx][status][taskIdx];
  task.title=mTitle.value;task.start=mStart.value;task.end=mEnd.value;task.team=mTeam.value;task.priority=mPriority.value;
  save();closeModal();
});

document.getElementById('modalCancel').addEventListener('click',closeModal);
modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});

function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(board));render();}
render();
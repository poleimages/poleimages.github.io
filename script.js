document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "kanban-data";
  let board = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  let currentEdit = null;

  const boardEl = document.getElementById("board");
  const modal = document.getElementById("modal");

  const mTitle = document.getElementById("mTitle");
  const mStart = document.getElementById("mStart");
  const mEnd = document.getElementById("mEnd");
  const mTeam = document.getElementById("mTeam");
  const mPriority = document.getElementById("mPriority");

  document.getElementById("btnAddTheme").addEventListener("click", () => {
    board.push({ title:"NOUVEAU TYPE DE PROJET", "À faire":[], "En cours":[], "Terminé":[] });
    save();
  });

  document.getElementById("btnExport").addEventListener("click", () => {
    const dataStr = JSON.stringify(board, null, 2);
    const blob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kanban.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("btnReset").addEventListener("click", () => {
    if(confirm("Supprimer toutes les données ?")) {
      board = [];
      save();
    }
  });

  document.getElementById("importFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        board = JSON.parse(ev.target.result);
        save();
      } catch(err) {
        alert("Fichier JSON invalide");
      }
    };
    reader.readAsText(file);
  });

  function render() {
    boardEl.innerHTML = "";
    board.forEach((theme, tIndex) => {
      const themeEl = document.createElement("div");
      themeEl.className = "theme";

      const titleEl = document.createElement("div");
      titleEl.className = "theme-title";
      titleEl.textContent = theme.title;
      titleEl.onclick = () => {
        const newTitle = prompt("Nouveau nom du type :", theme.title);
        if(newTitle) { theme.title = newTitle.toUpperCase(); save(); }
      };
      themeEl.appendChild(titleEl);

      const cols = document.createElement("div");
      cols.className = "theme-columns";

      ["À faire","En cours","Terminé"].forEach(status => {
        const colEl = document.createElement("div");
        colEl.className = "column";
        colEl.dataset.status = status;
        if(status==="À faire") colEl.classList.add("column-a-faire");
        if(status==="En cours") colEl.classList.add("column-en-cours");
        if(status==="Terminé") colEl.classList.add("column-termine");

        const head = document.createElement("div");
        head.className="col-head";
        head.textContent=status.toUpperCase();
        colEl.appendChild(head);

        const list = document.createElement("div");
        list.className="tasks-list";
        theme[status].forEach((task,i) => {
          const t=document.createElement("div");
          t.className="task";
          t.innerHTML=`<span class="delete-task">✖</span>
          <div class="task-header">${task.title}</div>
          <div class="task-meta">Equipe: ${task.team||"-"} | ${task.priority||"Moyenne"}</div>
          <div class="task-meta">${task.start||""} ${task.end?(" - "+task.end):""}</div>`;
          t.querySelector(".delete-task").onclick = e => {
            e.stopPropagation();
            if(confirm("Supprimer ce projet ?")) {
              theme[status].splice(i,1);
              save();
            }
          };
          t.onclick = ()=> openModal(tIndex,status,i);
          list.appendChild(t);
        });
        colEl.appendChild(list);

        const addBtn = document.createElement("button");
        addBtn.className="ghost";
        addBtn.textContent="+ PROJET";
        addBtn.onclick=()=>{
          theme[status].push({title:"NOUVEAU PROJET",start:"",end:"",team:"",priority:"Moyenne"});
          save();
        };
        colEl.appendChild(addBtn);

        cols.appendChild(colEl);

        new Sortable(list,{
          group:"tasks",
          animation:150,
          onEnd:evt=>{
            const from=evt.from.closest(".column").dataset.status;
            const to=evt.to.closest(".column").dataset.status;
            const [moved]=board[tIndex][from].splice(evt.oldIndex,1);
            board[tIndex][to].splice(evt.newIndex,0,moved);
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
    mTitle.value=task.title;
    mStart.value=task.start;
    mEnd.value=task.end;
    mTeam.value=task.team;
    mPriority.value=task.priority;
    modal.style.display="flex";
  }
  function closeModal(){modal.style.display="none";currentEdit=null;}
  document.getElementById("modalSave").onclick=()=>{
    if(!currentEdit) return closeModal();
    const {themeIdx,status,taskIdx}=currentEdit;
    const task=board[themeIdx][status][taskIdx];
    task.title=mTitle.value.toUpperCase();
    task.start=mStart.value;
    task.end=mEnd.value;
    task.team=mTeam.value;
    task.priority=mPriority.value;
    save(); closeModal();
  };
  document.getElementById("modalCancel").onclick=closeModal;
  modal.addEventListener("click",e=>{if(e.target===modal) closeModal();});

  function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(board));render();}
  render();
});
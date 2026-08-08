import { db } from "./firebase.js";

import {
collection,
addDoc,
getDocs,
updateDoc,
doc
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


import {
uploadPlayerImage
}
from "./cloudinary.js";



// -----------------------
// OYUNCU STAT EKLE
// -----------------------

window.addStat = function(){

let container =
document.getElementById("statsContainer");


let div =
document.createElement("div");


div.className="stat";


div.innerHTML=`

<input class="statName" placeholder="Stat">

<input class="statValue" type="number" placeholder="90">

`;


container.appendChild(div);


};




// -----------------------
// OYUNCU KAYDET
// -----------------------

window.savePlayer = async function(){


let name =
document.getElementById("playerName").value;



let file =
document.getElementById("playerImage").files[0];



let image="";



if(file){

image =
await uploadPlayerImage(file);

}



let stats={};



document
.querySelectorAll(".stat")
.forEach(stat=>{


let n =
stat.querySelector(".statName").value;


let v =
stat.querySelector(".statValue").value;



if(n){

stats[n]=Number(v);

}


});





await addDoc(
collection(db,"players"),
{

name:name,

image:image,

stats:stats,

goals:0,

assists:0,

team:""

}

);



alert("Oyuncu eklendi");


loadPlayers();


};









// -----------------------
// OYUNCULAR
// -----------------------

async function loadPlayers(){


let area =
document.getElementById("playersList");


if(!area)return;



area.innerHTML="";



let select =
document.getElementById("statPlayer");



if(select){

select.innerHTML=
"<option>Oyuncu Seç</option>";

}



let snap =
await getDocs(
collection(db,"players")
);



snap.forEach(d=>{


let p=d.data();



area.innerHTML +=`

<div class="player-card">


<img src="${p.image || ''}">


<h3>
${p.name}
</h3>


<p>
Takım:
${p.team || "Yok"}
</p>


<p>
⚽ ${p.goals || 0} Gol
</p>


<p>
🅰 ${p.assists || 0} Asist
</p>


${Object.entries(p.stats || {})
.map(
([a,b])=>
`
<p>
${a}: ${b}
</p>
`
)
.join("")}



</div>

`;



if(select){

select.innerHTML +=`

<option value="${d.id}">
${p.name}
</option>

`;

}


});


}








// -----------------------
// TAKIM EKLE
// -----------------------

window.addTeam = async function(){


let name =
document.getElementById("teamName").value;



await addDoc(
collection(db,"teams"),
{

name:name,

points:0,

played:0,

wins:0,

draws:0,

losses:0

}

);


alert("Takım eklendi");


loadTeams();


};









// -----------------------
// TAKIMLAR
// -----------------------

async function loadTeams(){


let area =
document.getElementById("teamsList");


if(!area)return;



area.innerHTML="";



let snap =
await getDocs(
collection(db,"teams")
);



snap.forEach(d=>{


let t=d.data();



area.innerHTML+=`

<div class="player-card">


<h3>
${t.name}
</h3>


<p>
Puan:
${t.points}
</p>


<p>
Oynanan:
${t.played}
</p>


</div>


`;



});


}









// -----------------------
// GOL KRALLIĞI
// -----------------------

async function loadGoals(){


let area =
document.getElementById("goalList");


if(!area)return;



area.innerHTML="";



let players=[];



let snap =
await getDocs(
collection(db,"players")
);



snap.forEach(d=>{


players.push(d.data());


});



players.sort(
(a,b)=>
(b.goals||0)-(a.goals||0)
);



players.forEach((p,i)=>{


area.innerHTML+=`

<div class="player-card">

${i+1}.
${p.name}

⚽ ${p.goals||0}

</div>

`;

});


}









// -----------------------
// ASİST KRALLIĞI
// -----------------------

async function loadAssists(){


let area =
document.getElementById("assistList");


if(!area)return;



area.innerHTML="";



let players=[];



let snap =
await getDocs(
collection(db,"players")
);



snap.forEach(d=>{


players.push(d.data());


});



players.sort(
(a,b)=>
(b.assists||0)-(a.assists||0)
);



players.forEach((p,i)=>{


area.innerHTML+=`

<div class="player-card">

${i+1}.
${p.name}

🅰 ${p.assists||0}

</div>

`;

});


}








// -----------------------
// HIZLI STAT AKTAR
// -----------------------

window.transferStats = async function(){


let id =
document.getElementById("statPlayer").value;



let text =
document.getElementById("statText").value;



let stats={};



text
.split("\n")
.forEach(line=>{


let parts =
line.split(":");


if(parts.length===2){


stats[
parts[0].trim()
]
=
Number(
parts[1].trim()
);


}


});



await updateDoc(
doc(db,"players",id),
{

stats:stats

}

);



alert("Statlar güncellendi");


loadPlayers();


};







loadPlayers();

loadTeams();

loadGoals();

loadAssists();

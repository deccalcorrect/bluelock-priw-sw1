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




// ----------------
// STAT EKLEME
// ----------------


window.addStat = function(){


const container =
document.getElementById("statsContainer");


const div =
document.createElement("div");


div.className="stat";


div.innerHTML = `

<input class="statName" placeholder="Stat adı">

<input class="statValue" type="number" placeholder="Değer">

`;


container.appendChild(div);


};





// ----------------
// OYUNCU KAYDET
// ----------------


window.savePlayer = async function(){


const name =
document.getElementById("playerName").value;



const file =
document.getElementById("playerImage").files[0];



let image="";


if(file){

image =
await uploadPlayerImage(file);

}



let stats={};



const names =
document.querySelectorAll(".statName");


const values =
document.querySelectorAll(".statValue");



for(let i=0;i<names.length;i++){


if(names[i].value){


stats[names[i].value]
=
Number(values[i].value);


}


}




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









// ----------------
// OYUNCULARI GETİR
// ----------------


async function loadPlayers(){


const area =
document.getElementById("players");


area.innerHTML="";



const select =
document.getElementById("statPlayer");


select.innerHTML=
`<option>Oyuncu Seç</option>`;



const snap =
await getDocs(
collection(db,"players")
);



snap.forEach((d)=>{


let p=d.data();



area.innerHTML += `

<div class="player-card">


<img src="${p.image}">


<h3>${p.name}</h3>


<p>Takım: ${p.team || "Yok"}</p>


<p>⚽ Gol: ${p.goals}</p>


<p>🅰️ Asist: ${p.assists}</p>



${Object.entries(p.stats || {})
.map(([a,b])=>`

<p>
${a}: ${b}
</p>

`).join("")}


</div>

`;



select.innerHTML += `

<option value="${d.id}">
${p.name}
</option>

`;


});


}




// ----------------
// TAKIM EKLE
// ----------------


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







async function loadTeams(){


const area =
document.getElementById("teams");


area.innerHTML="";


const snap =
await getDocs(
collection(db,"teams")
);



snap.forEach(d=>{


let t=d.data();


area.innerHTML += `

<div class="player-card">

<h3>
${t.name}
</h3>


<p>
Puan: ${t.points}
</p>


<p>
Oynanan: ${t.played}
</p>


</div>

`;



});



}







// ----------------
// HIZLI STAT AKTAR
// ----------------



window.transferStats = async function(){


const id =
document.getElementById("statPlayer").value;



const text =
document.getElementById("statText").value;



let stats={};



text.split("\n")
.forEach(line=>{


let parts =
line.split(":");



if(parts.length===2){


stats[
parts[0].trim()
]
=
Number(
parts[1]
.trim()
);



}



});



await updateDoc(
doc(db,"players",id),
{

stats:stats

}

);



alert("Statlar aktarıldı");


loadPlayers();


};







loadPlayers();

loadTeams();

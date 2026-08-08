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


info:{


position:
document.getElementById("playerPosition").value,


team:
document.getElementById("playerTeam").value,


age:
document.getElementById("playerAge").value,


height:
document.getElementById("playerHeight").value,


weight:
document.getElementById("playerWeight").value


},



stats:stats,



goals:
Number(
document.getElementById("playerGoals").value
) || 0,



assists:
Number(
document.getElementById("playerAssists").value
) || 0


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

<div class="stats-box">

<h4>Performans</h4>

<p>
⚽ ${p.goals || 0} Gol
</p>

<p>
🅰️ ${p.assists || 0} Asist
</p>

</div>

<img src="${p.image || ''}">


<h3>
${p.name}
</h3>


<p>
📍 ${p.info?.position || "Pozisyon Yok"}
</p>


<p>
🏟 ${p.info?.team || "Takım Yok"}
</p>


<p>
🎂 Yaş:
${p.info?.age || "-"}
</p>


<p>
📏 Boy:
${p.info?.height || "-"}
</p>


<p>
⚖️ Kilo:
${p.info?.weight || "-"}
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


area.innerHTML +=`

<div class="fm-card">


<div class="fm-header">


<img class="fm-photo" src="${p.image || 'https://via.placeholder.com/150'}">


<div class="fm-info">

<h2>
${p.name}
</h2>


<h3>
${p.info?.position || "Pozisyon Yok"}
</h3>


<p>
🏟 ${p.info?.team || "Takım Yok"}
</p>


<div class="performance">

<span>
⚽ ${p.goals || 0}
</span>

<span>
🅰 ${p.assists || 0}
</span>


</div>


</div>


</div>





<div class="attribute-section">


<h3>
Teknik
</h3>


${Object.entries(p.stats || {})
.map(([stat,value])=>{


let color =
value >= 85 
? "#22c55e"
:
value >= 70
? "#eab308"
:
"#ef4444";


return `

<div class="attribute">


<div class="attribute-title">

<span>
${stat}
</span>


<strong>
${value}
</strong>


</div>


<div class="bar">


<div 
class="fill"
style="
width:${value}%;
background:${color};
">
</div>


</div>


</div>


`;


})
.join("")}


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

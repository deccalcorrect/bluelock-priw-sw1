import { db } from "./firebase.js";

import {
collection,
addDoc,
getDocs
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


import {
uploadPlayerImage
}
from "./cloudinary.js";



window.addStat = function(){


const container =
document.getElementById("statsContainer");


const div =
document.createElement("div");


div.className="stat";


div.innerHTML = `

<input class="statName" placeholder="Stat adı">

<input 
class="statValue"
type="number"
placeholder="Değer">

`;


container.appendChild(div);


}





window.savePlayer = async function(){


const name =
document.getElementById("playerName").value;



const file =
document.getElementById("playerImage").files[0];



let imageUrl = "";



if(file){

imageUrl =
await uploadPlayerImage(file);

}



const stats = {};



const statNames =
document.querySelectorAll(".statName");


const statValues =
document.querySelectorAll(".statValue");



for(let i=0;i<statNames.length;i++){


let key =
statNames[i].value.trim();


let value =
statValues[i].value;



if(key){

stats[key]=Number(value);

}


}



await addDoc(
collection(db,"players"),
{

name:name,

image:imageUrl,

stats:stats,

created:new Date()

}

);



alert("Oyuncu kaydedildi!");



loadPlayers();


}







async function loadPlayers(){


const area =
document.getElementById("players");



area.innerHTML="";



const snapshot =
await getDocs(
collection(db,"players")
);



snapshot.forEach((doc)=>{


const player =
doc.data();



area.innerHTML += `


<div class="player-card">


<img src="${player.image || ''}">


<h3>
${player.name}
</h3>


<div>

${Object.entries(player.stats || {})
.map(([k,v])=>`

<p>
<b>${k}</b> : ${v}
</p>

`).join("")}


</div>


</div>


`;


});


}



loadPlayers();

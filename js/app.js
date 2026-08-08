import { db } from "./firebase.js";

import {
collection,
addDoc,
getDocs,
updateDoc,
deleteDoc,
doc
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
uploadPlayerImage
}
from "./cloudinary.js";


// =====================
// STAT EKLEME
// =====================


window.addStat = function(){

let box =
document.getElementById("statsContainer");


let div =
document.createElement("div");


div.className="stat";


div.innerHTML=`

<input class="statName" placeholder="Stat">

<input 
class="statValue"
type="number"
placeholder="90">

`;


box.appendChild(div);

};





window.addPhysicalStat=function(){

let box =
document.getElementById("physicalContainer");


let div =
document.createElement("div");


div.className="stat";


div.innerHTML=`

<input 
class="physicalName"
placeholder="Çeviklik">


<input
class="physicalValue"
type="number"
placeholder="90">

`;


box.appendChild(div);


};





// =====================
// OYUNCU KAYDET
// =====================


window.savePlayer = async function(){


let image="";


let file =
document.getElementById("playerImage").files[0];


if(file){

image =
await uploadPlayerImage(file);

}



let stats={};


document
.querySelectorAll(".statName")
.forEach((x,i)=>{


let value =
document
.querySelectorAll(".statValue")[i]
.value;


if(x.value){

stats[x.value]=Number(value);

}


});





let physical={};



document
.querySelectorAll(".physicalName")
.forEach((x,i)=>{


let value =
document
.querySelectorAll(".physicalValue")[i]
.value;



if(x.value){

physical[x.value]=Number(value);

}


});





await addDoc(

collection(db,"players"),

{

name:
document.getElementById("playerName").value,


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


physical:physical,



goals:
Number(
document.getElementById("playerGoals").value
)||0,



assists:
Number(
document.getElementById("playerAssists").value
)||0


}

);



alert("Oyuncu kaydedildi");


loadPlayers();


};





// =====================
// OYUNCU LİSTELE
// =====================


async function loadPlayers(){


let area =
document.getElementById("playersList");


if(!area)
return;



area.innerHTML="";



let snap =
await getDocs(
collection(db,"players")
);



snap.forEach(d=>{


let p=d.data();



area.innerHTML += `


<div class="fm-card">


<div class="fm-header">


<img 
class="fm-photo"
src="${p.image || ''}">



<div>


<h2>
${p.name}
</h2>


<p>
📍 ${p.info?.position || "-"}
</p>


<p>
🏟 ${p.info?.team || "-"}
</p>


<p>
⚽ ${p.goals || 0}
Gol

🅰️ ${p.assists || 0}
Asist

</p>


</div>


</div>


<h3>
⚽ Oyuncu Statları
</h3>


${drawStats(p.stats)}



<h3>
💪 Fiziksel Statlar
</h3>


${drawStats(p.physical)}



<button onclick="editPlayer('${d.id}')">

✏️ Düzenle

</button>


<button onclick="deletePlayer('${d.id}')">

🗑 Sil

</button>



</div>


`;



});

}
import { db } from "./firebase.js";

import {
collection,
addDoc,
getDocs,
updateDoc,
deleteDoc,
doc
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
uploadPlayerImage
}
from "./cloudinary.js";


// =====================
// STAT EKLEME
// =====================


window.addStat = function(){

let box =
document.getElementById("statsContainer");


let div =
document.createElement("div");


div.className="stat";


div.innerHTML=`

<input class="statName" placeholder="Stat">

<input 
class="statValue"
type="number"
placeholder="90">

`;


box.appendChild(div);

};





window.addPhysicalStat=function(){

let box =
document.getElementById("physicalContainer");


let div =
document.createElement("div");


div.className="stat";


div.innerHTML=`

<input 
class="physicalName"
placeholder="Çeviklik">


<input
class="physicalValue"
type="number"
placeholder="90">

`;


box.appendChild(div);


};





// =====================
// OYUNCU KAYDET
// =====================


window.savePlayer = async function(){


let image="";


let file =
document.getElementById("playerImage").files[0];


if(file){

image =
await uploadPlayerImage(file);

}



let stats={};


document
.querySelectorAll(".statName")
.forEach((x,i)=>{


let value =
document
.querySelectorAll(".statValue")[i]
.value;


if(x.value){

stats[x.value]=Number(value);

}


});





let physical={};



document
.querySelectorAll(".physicalName")
.forEach((x,i)=>{


let value =
document
.querySelectorAll(".physicalValue")[i]
.value;



if(x.value){

physical[x.value]=Number(value);

}


});





await addDoc(

collection(db,"players"),

{

name:
document.getElementById("playerName").value,


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


physical:physical,



goals:
Number(
document.getElementById("playerGoals").value
)||0,



assists:
Number(
document.getElementById("playerAssists").value
)||0


}

);



alert("Oyuncu kaydedildi");


loadPlayers();


};





// =====================
// OYUNCU LİSTELE
// =====================


async function loadPlayers(){


let area =
document.getElementById("playersList");


if(!area)
return;



area.innerHTML="";



let snap =
await getDocs(
collection(db,"players")
);



snap.forEach(d=>{


let p=d.data();



area.innerHTML += `


<div class="fm-card">


<div class="fm-header">


<img 
class="fm-photo"
src="${p.image || ''}">



<div>


<h2>
${p.name}
</h2>


<p>
📍 ${p.info?.position || "-"}
</p>


<p>
🏟 ${p.info?.team || "-"}
</p>


<p>
⚽ ${p.goals || 0}
Gol

🅰️ ${p.assists || 0}
Asist

</p>


</div>


</div>


<h3>
⚽ Oyuncu Statları
</h3>


${drawStats(p.stats)}



<h3>
💪 Fiziksel Statlar
</h3>


${drawStats(p.physical)}



<button onclick="editPlayer('${d.id}')">

✏️ Düzenle

</button>


<button onclick="deletePlayer('${d.id}')">

🗑 Sil

</button>



</div>


`;



});

}

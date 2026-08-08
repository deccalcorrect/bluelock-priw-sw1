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


// =========================
// STAT EKLE
// =========================


window.addStat=function(){


const box=document.getElementById("statsContainer");


const div=document.createElement("div");


div.className="stat";


div.innerHTML=`

<input class="statName" placeholder="HIZ">

<input class="statValue" type="number" placeholder="90">

`;


box.appendChild(div);


};




// =========================
// FİZİKSEL STAT EKLE
// =========================


window.addPhysicalStat=function(){


const box=document.getElementById("physicalContainer");


const div=document.createElement("div");


div.className="stat";


div.innerHTML=`

<input class="physicalName" placeholder="ÇEVİKLİK">


<input class="physicalValue" type="number" placeholder="90">


`;


box.appendChild(div);


};





// =========================
// OYUNCU KAYDET
// =========================


window.savePlayer=async function(){



let image="";



const file=
document.getElementById("playerImage")
.files[0];



if(file){

image=
await uploadPlayerImage(file);

}




let stats={};



document.querySelectorAll(".statName")
.forEach((x,i)=>{


let value=
document.querySelectorAll(".statValue")[i].value;



if(x.value){

stats[x.value]=Number(value);

}


});





let physical={};



document.querySelectorAll(".physicalName")
.forEach((x,i)=>{


let value=
document.querySelectorAll(".physicalValue")[i].value;



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
Number(document.getElementById("playerGoals").value)||0,


assists:
Number(document.getElementById("playerAssists").value)||0


}


);



alert("Oyuncu eklendi");


loadPlayers();


};
// =========================
// OYUNCULARI GETİR
// =========================


async function loadPlayers(){


const area=
document.getElementById("playersList");


if(!area)
return;



area.innerHTML="";



const snap=
await getDocs(
collection(db,"players")
);



snap.forEach(d=>{


const p=d.data();



area.innerHTML+=`

<div class="fm-card">



<div class="fm-header">


<img 
class="fm-photo"
src="${p.image || 'https://via.placeholder.com/150'}">


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
🎂 ${p.info?.age || "-"}
</p>


</div>


</div>





<h3>
⚽ Oyuncu Statları
</h3>


${createStats(p.stats)}





<h3>
💪 Fiziksel Statlar
</h3>


${createStats(p.physical)}






<p>
⚽ Gol:
${p.goals || 0}
</p>


<p>
🅰 Asist:
${p.assists || 0}
</p>





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








// =========================
// STAT BAR
// =========================


function createStats(stats){


if(!stats)
return "";



return Object.entries(stats)

.map(([name,value])=>{


let color;


if(value>=85){

color="#22c55e";

}

else if(value>=70){

color="#eab308";

}

else{

color="#ef4444";

}



return `


<div class="attribute">


<div class="attribute-title">

<span>
${name}
</span>


<b>
${value}
</b>


</div>



<div class="bar">


<div class="fill"

style="
width:${value}%;
background:${color};
">

</div>


</div>


</div>



`;


})

.join("");

}







// =========================
// OYUNCU SİL
// =========================


window.deletePlayer=async function(id){



if(!confirm("Oyuncu silinsin mi?"))
return;



await deleteDoc(
doc(db,"players",id)
);



loadPlayers();


};







// =========================
// OYUNCU DÜZENLE
// =========================


window.editPlayer=async function(id){



let name=
prompt("Yeni oyuncu adı:");



if(!name)
return;



await updateDoc(

doc(db,"players",id),

{

name:name

}

);



loadPlayers();


};
// =========================
// TAKIM EKLE
// =========================


window.addTeam = async function(){


let name =
document.getElementById("teamName").value;



let logo =
document.getElementById("teamLogo").value;




if(!name){

alert("Takım adı gir");

return;

}



await addDoc(

collection(db,"teams"),

{


name:name,


logo:logo,


points:0,


played:0,


wins:0,


draws:0,


losses:0


}


);



alert("Takım oluşturuldu");


loadTeams();


};








// =========================
// TAKIMLAR
// =========================


async function loadTeams(){



let area =
document.getElementById("teamsList");



if(!area)
return;



area.innerHTML="";



let snap =
await getDocs(
collection(db,"teams")
);



snap.forEach(d=>{


let t=d.data();



area.innerHTML+=`

<div class="fm-card">



<img 

src="${t.logo || ''}"

style="
width:80px;
height:80px;
object-fit:contain;
">


<h2>

${t.name}

</h2>



<p>

🏆 Puan:
${t.points}

</p>



<p>

🟢 Galibiyet:
${t.wins}

</p>



<p>

🟡 Beraberlik:
${t.draws}

</p>



<p>

🔴 Mağlubiyet:
${t.losses}

</p>



</div>

`;



});


}









// =========================
// GOL KRALLIĞI
// =========================


async function loadGoals(){


let area=
document.getElementById("goalList");


if(!area)
return;



area.innerHTML="";



let players=[];



let snap=
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


<div class="fm-card">


<h3>

${i+1}. ${p.name}

</h3>


<p>

⚽ ${p.goals || 0} Gol

</p>


</div>


`;



});



}









// =========================
// ASİST KRALLIĞI
// =========================


async function loadAssists(){


let area=
document.getElementById("assistList");



if(!area)
return;



area.innerHTML="";



let players=[];



let snap=
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


<div class="fm-card">


<h3>

${i+1}. ${p.name}

</h3>


<p>

🅰 ${p.assists || 0} Asist

</p>


</div>


`;



});


}









// =========================
// HIZLI STAT AKTAR
// =========================


window.transferStats=async function(){


let id=
document.getElementById("statPlayer").value;



let text=
document.getElementById("statText").value;



let stats={};



text
.split("\n")
.forEach(line=>{


let parts=
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



alert("Statlar aktarıldı");


loadPlayers();


};






// =========================
// TAKIM DROPDOWN
// =========================


async function loadTeamSelect(){


let select =
document.getElementById("playerTeam");


if(!select)
return;



select.innerHTML=
`
<option>
Takım Seç
</option>
`;



let snap =
await getDocs(
collection(db,"teams")
);



snap.forEach(d=>{


let t=d.data();



select.innerHTML += `


<option value="${t.name}">

${t.name}

</option>


`;



});


}

// =========================
// BAŞLAT
// =========================


loadPlayers();

loadTeams();

loadGoals();

loadAssists();

loadTeamSelect();

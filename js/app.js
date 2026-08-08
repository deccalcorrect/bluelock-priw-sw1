// =====================================
// BLUEL0CK PRIW SW
// APP.JS NEW SYSTEM
// 1/3
// =====================================

import { uploadPlayerImage } from "./cloudinary.js";

import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    setDoc,
    getDoc
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


import {
    uploadPlayerImage
}
from "./cloudinary.js";



// =====================================
// ADMIN SİSTEMİ
// =====================================


const urlParams =
new URLSearchParams(
    window.location.search
);


const ADMIN_PASSWORD =
"bluelock2026";


let isAdmin =
urlParams.get("admin") === ADMIN_PASSWORD;



console.log(
    "Admin:",
    isAdmin
);





// =====================================
// GLOBAL VERİ
// =====================================


let playersCache = [];

let teamsCache = [];





// =====================================
// ANA SAYFA SAYACLARI
// =====================================


async function loadDashboard(){


    const playerBox =
    document.querySelector(
        "#home .cards .box:nth-child(2) p"
    );


    const teamBox =
    document.querySelector(
        "#home .cards .box:nth-child(1) p"
    );



    if(!playerBox || !teamBox)
    return;



    const players =
    await getDocs(
        collection(db,"players")
    );



    const teams =
    await getDocs(
        collection(db,"teams")
    );



    playerBox.innerHTML =
    players.size;



    teamBox.innerHTML =
    teams.size;


}







// =====================================
// STAT EKLE
// =====================================


window.addStat = function(){



    const box =
    document.getElementById(
        "statsContainer"
    );


    if(!box)
    return;




    const div =
    document.createElement(
        "div"
    );


    div.className =
    "stat";



    div.innerHTML = `


    <input
    class="statName"
    placeholder="Stat adı"
    >


    <input
    class="statValue"
    type="number"
    placeholder="Değer"
    >


    `;



    box.appendChild(div);


};






// =====================================
// FİZİKSEL STAT EKLE
// =====================================


window.addPhysicalStat=function(){



    const box =
    document.getElementById(
        "physicalContainer"
    );


    if(!box)
    return;



    const div =
    document.createElement(
        "div"
    );



    div.className =
    "stat";



    div.innerHTML = `


    <input

    class="physicalName"

    placeholder="Fiziksel özellik"

    >



    <input

    class="physicalValue"

    type="number"

    placeholder="Değer"

    >


    `;



    box.appendChild(div);


};







// =====================================
// TAKIM DROPDOWN
// =====================================


async function loadTeamSelect(){



    const select =
    document.getElementById(
        "playerTeam"
    );



    if(!select)
    return;



    select.innerHTML = `

    <option value="">
    Takım seç
    </option>

    `;




    const snap =
    await getDocs(
        collection(db,"teams")
    );



    snap.forEach((d)=>{


        const team =
        d.data();



        select.innerHTML += `


        <option value="${d.id}">

        ${team.name}

        </option>


        `;


    });



}








// =====================================
// BAŞLANGIÇ HAZIRLIK
// =====================================


async function init(){


    await loadDashboard();


    await loadTeamSelect();



}



init();
// =====================================
// OYUNCU KAYDET
// =====================================


window.savePlayer = async function(){



    let image = "";



    const file =
    document
    .getElementById("playerImage")
    .files[0];



    if(file){

        image =
        await uploadPlayerImage(file);

    }






    let stats = {};



    document
    .querySelectorAll(".statName")
    .forEach((item,index)=>{


        const value =
        document
        .querySelectorAll(".statValue")[index]
        .value;



        if(item.value){


            stats[item.value]
            =
            Number(value);


        }


    });








    let physical = {};



    document
    .querySelectorAll(".physicalName")
    .forEach((item,index)=>{


        const value =
        document
        .querySelectorAll(".physicalValue")[index]
        .value;



        if(item.value){


            physical[item.value]
            =
            Number(value);


        }


    });








    const teamSelect =
    document.getElementById(
        "playerTeam"
    );



    let teamId = "";

    let teamName = "";



    if(teamSelect){


        teamId =
        teamSelect.value;



        teamName =
        teamSelect.options[
            teamSelect.selectedIndex
        ].text;


    }







    await addDoc(

        collection(db,"players"),

        {


            name:
            document
            .getElementById("playerName")
            .value,



            image:image,



            teamId:teamId,


            teamName:teamName,




            info:{


                position:
                document
                .getElementById("playerPosition")
                .value,



                age:
                document
                .getElementById("playerAge")
                .value,



                height:
                document
                .getElementById("playerHeight")
                .value,



                weight:
                document
                .getElementById("playerWeight")
                .value


            },






            stats:stats,



            physical:physical,



            matches:0,



            goals:0,



            assists:0,



            yellowCards:0,



            redCards:0,



            createdAt:
            new Date()


        }


    );





    alert(
    "Oyuncu oluşturuldu"
    );



    loadPlayers();


};








// =====================================
// OYUNCU LİSTESİ
// =====================================


async function loadPlayers(){



    const area =
    document.getElementById(
        "playersList"
    );



    if(!area)
    return;





    area.innerHTML = "";



    playersCache = [];





    const snap =
    await getDocs(
        collection(db,"players")
    );





    snap.forEach((d)=>{


        playersCache.push({

            id:d.id,

            ...d.data()

        });



    });







    playersCache.forEach((p)=>{



        area.innerHTML += `


        <div

        class="playerCard"

        onclick="openPlayer('${p.id}')"

        >




            <img

            src="${p.image || ''}"

            class="playerImage"

            >





            <h3>

            ${p.name}

            </h3>





            <p>

            ${p.info?.position || "-"}

            </p>






            <p>

            🏟 ${p.teamName || "Takımsız"}

            </p>






            <div>


            ⚽ ${p.goals || 0}


            🅰️ ${p.assists || 0}


            </div>




        </div>


        `;



    });



}










// =====================================
// OYUNCU PROFİL AÇ
// =====================================


window.openPlayer =
async function(id){



    const player =
    playersCache.find(
        p=>p.id===id
    );



    if(!player)
    return;





    let modal =
    document.getElementById(
        "playerModal"
    );



    if(!modal){


        modal =
        document.createElement(
            "div"
        );


        modal.id =
        "playerModal";


        document.body.appendChild(
            modal
        );


    }






    modal.innerHTML = `



    <div class="playerProfile">



        <button onclick="closePlayer()">

        X

        </button>





        <img

        src="${player.image || ''}"

        >





        <h1>

        ${player.name}

        </h1>





        <h3>

        ${player.teamName || "Takımsız"}

        </h3>





        <p>

        Mevki:

        ${player.info?.position || "-"}

        </p>




        <p>

        Yaş:

        ${player.info?.age || "-"}

        </p>




        <p>

        Boy:

        ${player.info?.height || "-"}

        </p>




        <p>

        Kilo:

        ${player.info?.weight || "-"}

        </p>





        <hr>





        <h3>

        Sezon

        </h3>



        ⚽ ${player.goals || 0} Gol

        <br>

        🅰️ ${player.assists || 0} Asist

        <br>

        🎮 ${player.matches || 0} Maç




        <h3>

        Statlar

        </h3>



        ${createProfileStats(player.stats)}





    </div>


    `;



    modal.style.display =
    "block";



};






window.closePlayer =
function(){


    const modal =
    document.getElementById(
        "playerModal"
    );


    if(modal)

    modal.style.display =
    "none";


};







function createProfileStats(stats){


    if(!stats)
    return "";



    return Object
    .entries(stats)
    .map(([name,value])=>{


        return `


        <div>

        ${name}

        :

        ${value}

        %

        </div>


        `;


    })
    .join("");

}
// =====================================
// OYUNCU KAYDET
// =====================================


window.savePlayer = async function(){



    let image = "";



    const file =
    document
    .getElementById("playerImage")
    .files[0];



    if(file){

        image =
        await uploadPlayerImage(file);

    }






    let stats = {};



    document
    .querySelectorAll(".statName")
    .forEach((item,index)=>{


        const value =
        document
        .querySelectorAll(".statValue")[index]
        .value;



        if(item.value){


            stats[item.value]
            =
            Number(value);


        }


    });








    let physical = {};



    document
    .querySelectorAll(".physicalName")
    .forEach((item,index)=>{


        const value =
        document
        .querySelectorAll(".physicalValue")[index]
        .value;



        if(item.value){


            physical[item.value]
            =
            Number(value);


        }


    });








    const teamSelect =
    document.getElementById(
        "playerTeam"
    );



    let teamId = "";

    let teamName = "";



    if(teamSelect){


        teamId =
        teamSelect.value;



        teamName =
        teamSelect.options[
            teamSelect.selectedIndex
        ].text;


    }







    await addDoc(

        collection(db,"players"),

        {


            name:
            document
            .getElementById("playerName")
            .value,



            image:image,



            teamId:teamId,


            teamName:teamName,




            info:{


                position:
                document
                .getElementById("playerPosition")
                .value,



                age:
                document
                .getElementById("playerAge")
                .value,



                height:
                document
                .getElementById("playerHeight")
                .value,



                weight:
                document
                .getElementById("playerWeight")
                .value


            },






            stats:stats,



            physical:physical,



            matches:0,



            goals:0,



            assists:0,



            yellowCards:0,



            redCards:0,



            createdAt:
            new Date()


        }


    );





    alert(
    "Oyuncu oluşturuldu"
    );



    loadPlayers();


};








// =====================================
// OYUNCU LİSTESİ
// =====================================


async function loadPlayers(){



    const area =
    document.getElementById(
        "playersList"
    );



    if(!area)
    return;





    area.innerHTML = "";



    playersCache = [];





    const snap =
    await getDocs(
        collection(db,"players")
    );





    snap.forEach((d)=>{


        playersCache.push({

            id:d.id,

            ...d.data()

        });



    });







    playersCache.forEach((p)=>{



        area.innerHTML += `


        <div

        class="playerCard"

        onclick="openPlayer('${p.id}')"

        >




            <img

            src="${p.image || ''}"

            class="playerImage"

            >





            <h3>

            ${p.name}

            </h3>





            <p>

            ${p.info?.position || "-"}

            </p>






            <p>

            🏟 ${p.teamName || "Takımsız"}

            </p>






            <div>


            ⚽ ${p.goals || 0}


            🅰️ ${p.assists || 0}


            </div>




        </div>


        `;



    });



}










// =====================================
// OYUNCU PROFİL AÇ
// =====================================


window.openPlayer =
async function(id){



    const player =
    playersCache.find(
        p=>p.id===id
    );



    if(!player)
    return;





    let modal =
    document.getElementById(
        "playerModal"
    );



    if(!modal){


        modal =
        document.createElement(
            "div"
        );


        modal.id =
        "playerModal";


        document.body.appendChild(
            modal
        );


    }






    modal.innerHTML = `



    <div class="playerProfile">



        <button onclick="closePlayer()">

        X

        </button>





        <img

        src="${player.image || ''}"

        >





        <h1>

        ${player.name}

        </h1>





        <h3>

        ${player.teamName || "Takımsız"}

        </h3>





        <p>

        Mevki:

        ${player.info?.position || "-"}

        </p>




        <p>

        Yaş:

        ${player.info?.age || "-"}

        </p>




        <p>

        Boy:

        ${player.info?.height || "-"}

        </p>




        <p>

        Kilo:

        ${player.info?.weight || "-"}

        </p>





        <hr>





        <h3>

        Sezon

        </h3>



        ⚽ ${player.goals || 0} Gol

        <br>

        🅰️ ${player.assists || 0} Asist

        <br>

        🎮 ${player.matches || 0} Maç




        <h3>

        Statlar

        </h3>



        ${createProfileStats(player.stats)}





    </div>


    `;



    modal.style.display =
    "block";



};






window.closePlayer =
function(){


    const modal =
    document.getElementById(
        "playerModal"
    );


    if(modal)

    modal.style.display =
    "none";


};







function createProfileStats(stats){


    if(!stats)
    return "";



    return Object
    .entries(stats)
    .map(([name,value])=>{


        return `


        <div>

        ${name}

        :

        ${value}

        %

        </div>


        `;


    })
    .join("");

}
window.saveTeam = async function(){


    const name =
    document.getElementById("teamName").value;


    const logo =
    document.getElementById("teamLogo").value;



    if(!name){

        alert("Takım adı gir");

        return;

    }



    try{


        await setDoc(

            doc(
                db,
                "teams",
                Date.now().toString()
            ),

            {

                name:name,

                logo:logo || "",

                createdAt:
                new Date(),

                points:0,

                wins:0,

                draws:0,

                losses:0,

                goals:0,

                conceded:0

            }

        );



        alert(
            "Takım oluşturuldu"
        );



        document.getElementById("teamName").value="";
        document.getElementById("teamLogo").value="";



        loadTeams();



    }

    catch(error){

        alert(
            error.message
        );

    }


}

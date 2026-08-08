// =====================================
// BLUELOCK PANEL FINAL APP.JS
// 1/10
// =====================================


// FIREBASE

import { db } from "./firebase.js";

import { uploadPlayerImage } from "./cloudinary.js";


import {

collection,

addDoc,

getDocs,

getDoc,

doc,

updateDoc,

deleteDoc,

query,

orderBy

}

from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";




// =====================================
// YETKİ SİSTEMİ
// =====================================


const urlParams =
new URLSearchParams(
    window.location.search
);


const adminPassword =
urlParams.get("admin");



const isAdmin =
adminPassword === "bluelock2026";



window.isAdmin =
isAdmin;




console.log(

isAdmin

?

"ADMIN AKTİF"

:

"ZİYARETÇİ MODU"

);







// =====================================
// GENEL YARDIMCILAR
// =====================================


function value(id){


    const el =
    document.getElementById(id);


    if(!el)
    return "";


    return el.value.trim();


}





function number(id){


    const v =
    value(id);



    return Number(v || 0);


}







function set(id,val){


    const el =
    document.getElementById(id);


    if(el){

        el.value = val;

    }


}





function clear(id){


    const el =
    document.getElementById(id);



    if(el){

        el.value = "";

    }


}








// =====================================
// DASHBOARD
// =====================================



async function updateDashboard(){


    const players =
    await getDocs(

        collection(
            db,
            "players"
        )

    );



    const teams =
    await getDocs(

        collection(
            db,
            "teams"
        )

    );



    const p =
    document.getElementById(
        "playerCount"
    );



    const t =
    document.getElementById(
        "teamCount"
    );



    if(p)
    p.innerText =
    players.size;



    if(t)
    t.innerText =
    teams.size;



}

// =====================================
// STAT SİSTEMİ
// FINAL 2/10
// =====================================



window.addStat = function(){


    const area =
    document.getElementById(
        "statsContainer"
    );



    if(!area)
    return;



    const row =
    document.createElement(
        "div"
    );


    row.className =
    "statRow";



    row.innerHTML = `


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



    area.appendChild(row);



};










// =====================================
// FİZİKSEL ÖZELLİK SİSTEMİ
// =====================================



window.addPhysical = function(){



    const area =
    document.getElementById(
        "physicalContainer"
    );



    if(!area)
    return;




    const row =
    document.createElement(
        "div"
    );



    row.className =
    "physicalRow";



    row.innerHTML = `


    <input

    class="physicalName"

    placeholder="Özellik"

    >



    <input

    class="physicalValue"

    type="number"

    placeholder="Değer"

    >



    `;



    area.appendChild(row);



};









// =====================================
// STATLARI TOPLA
// =====================================



function collectStats(){



    const stats = {};



    document
    .querySelectorAll(
        ".statRow"
    )
    .forEach(row=>{


        const name =
        row.querySelector(
            ".statName"
        )
        ?.value;



        const val =
        row.querySelector(
            ".statValue"
        )
        ?.value;




        if(name){


            stats[name] =
            Number(val || 0);


        }



    });



    return stats;


}









// =====================================
// FİZİKSEL STATLARI TOPLA
// =====================================



function collectPhysical(){



    const physical = {};



    document
    .querySelectorAll(
        ".physicalRow"
    )
    .forEach(row=>{


        const name =
        row.querySelector(
            ".physicalName"
        )
        ?.value;



        const val =
        row.querySelector(
            ".physicalValue"
        )
        ?.value;





        if(name){


            physical[name] =
            Number(val || 0);


        }



    });



    return physical;


}









// =====================================
// OYUNCU KAYIT HAZIRLIK
// =====================================



async function createPlayerData(){



    let image = "";



    const file =
    document.getElementById(
        "playerImage"
    );



    if(
        file &&
        file.files[0]
    ){


        image =
        await uploadPlayerImage(
            file.files[0]
        );


    }





    const team =
    document.getElementById(
        "playerTeam"
    );



    let teamId = "";

    let teamName = "";



    if(
        team &&
        team.value
    ){


        teamId =
        team.value;



        teamName =
        team.options[
            team.selectedIndex
        ]
        .text;


    }







    return {


        name:
        value(
            "playerName"
        ),



        image:image,



        teamId:teamId,


        teamName:teamName,



        info:{


            position:
            value(
                "playerPosition"
            ),



            age:
            value(
                "playerAge"
            ),



            height:
            value(
                "playerHeight"
            ),



            weight:
            value(
                "playerWeight"
            )


        },



        stats:
        collectStats(),



        physical:
        collectPhysical(),



        matches:0,


        goals:0,


        assists:0,


        yellowCards:0,


        redCards:0,



        createdAt:
        new Date()



    };



}
// =====================================
// OYUNCU KAYDET
// FINAL 3/10
// =====================================



window.savePlayer = async function(){



    try{


        const player =
        await createPlayerData();



        if(!player.name){


            alert(
                "Oyuncu adı gir"
            );


            return;


        }






        await addDoc(


            collection(
                db,
                "players"
            ),


            player


        );






        alert(
            "Oyuncu eklendi"
        );



        clear(
            "playerName"
        );



        if(typeof loadPlayers === "function"){

            loadPlayers();

        }



        if(typeof updateDashboard === "function"){

            updateDashboard();

        }




    }



    catch(error){



        console.error(
            error
        );


        alert(
            error.message
        );



    }



};









// =====================================
// OYUNCU GETİR
// =====================================



async function getPlayer(id){



    const ref =
    doc(
        db,
        "players",
        id
    );



    const snap =
    await getDoc(ref);



    if(!snap.exists()){

        return null;

    }



    return {

        id:id,

        ...snap.data()

    };


}









// =====================================
// OYUNCU DÜZENLEME
// ZİYARETÇİ + ADMİN
// =====================================



window.editPlayer = async function(id){



    const player =
    await getPlayer(id);



    if(!player)
    return;





    const modal =
    document.getElementById(
        "playerEditModal"
    );



    const box =
    document.getElementById(
        "playerEditArea"
    );



    if(!modal || !box)
    return;







    box.innerHTML = `



    <h2>

    ${player.name}

    Düzenle

    </h2>





    <input

    id="editName"

    value="${player.name || ""}"

    placeholder="İsim"

    >





    <input

    id="editPosition"

    value="${player.info?.position || ""}"

    placeholder="Mevki"

    >





    <input

    id="editAge"

    value="${player.info?.age || ""}"

    placeholder="Yaş"

    >





    <input

    id="editHeight"

    value="${player.info?.height || ""}"

    placeholder="Boy"

    >





    <input

    id="editWeight"

    value="${player.info?.weight || ""}"

    placeholder="Kilo"

    >






    <button

    onclick="savePlayerEdit('${id}')"

    >

    Kaydet

    </button>


    `;





    modal.style.display =
    "flex";



};









// =====================================
// DÜZENLEMEYİ KAYDET
// =====================================



window.savePlayerEdit = async function(id){



    try{



        const ref =
        doc(
            db,
            "players",
            id
        );



        const snap =
        await getDoc(ref);



        if(!snap.exists())
        return;



        const old =
        snap.data();







        await updateDoc(

            ref,

            {


                name:
                value(
                    "editName"
                ),



                info:{


                    position:
                    value(
                        "editPosition"
                    ),



                    age:
                    value(
                        "editAge"
                    ),



                    height:
                    value(
                        "editHeight"
                    ),



                    weight:
                    value(
                        "editWeight"
                    )



                }



            }


        );






        alert(
            "Oyuncu güncellendi"
        );



        document
        .getElementById(
            "playerEditModal"
        )
        .style.display="none";



        if(typeof loadPlayers==="function"){

            loadPlayers();

        }




    }



    catch(error){


        console.error(error);


        alert(
            error.message
        );


    }



};
// =====================================
// OYUNCU KAYDET
// FINAL 3/10
// =====================================



window.savePlayer = async function(){



    try{


        const player =
        await createPlayerData();



        if(!player.name){


            alert(
                "Oyuncu adı gir"
            );


            return;


        }






        await addDoc(


            collection(
                db,
                "players"
            ),


            player


        );






        alert(
            "Oyuncu eklendi"
        );



        clear(
            "playerName"
        );



        if(typeof loadPlayers === "function"){

            loadPlayers();

        }



        if(typeof updateDashboard === "function"){

            updateDashboard();

        }




    }



    catch(error){



        console.error(
            error
        );


        alert(
            error.message
        );



    }



};









// =====================================
// OYUNCU GETİR
// =====================================



async function getPlayer(id){



    const ref =
    doc(
        db,
        "players",
        id
    );



    const snap =
    await getDoc(ref);



    if(!snap.exists()){

        return null;

    }



    return {

        id:id,

        ...snap.data()

    };


}









// =====================================
// OYUNCU DÜZENLEME
// ZİYARETÇİ + ADMİN
// =====================================



window.editPlayer = async function(id){



    const player =
    await getPlayer(id);



    if(!player)
    return;





    const modal =
    document.getElementById(
        "playerEditModal"
    );



    const box =
    document.getElementById(
        "playerEditArea"
    );



    if(!modal || !box)
    return;







    box.innerHTML = `



    <h2>

    ${player.name}

    Düzenle

    </h2>





    <input

    id="editName"

    value="${player.name || ""}"

    placeholder="İsim"

    >





    <input

    id="editPosition"

    value="${player.info?.position || ""}"

    placeholder="Mevki"

    >





    <input

    id="editAge"

    value="${player.info?.age || ""}"

    placeholder="Yaş"

    >





    <input

    id="editHeight"

    value="${player.info?.height || ""}"

    placeholder="Boy"

    >





    <input

    id="editWeight"

    value="${player.info?.weight || ""}"

    placeholder="Kilo"

    >






    <button

    onclick="savePlayerEdit('${id}')"

    >

    Kaydet

    </button>


    `;





    modal.style.display =
    "flex";



};









// =====================================
// DÜZENLEMEYİ KAYDET
// =====================================



window.savePlayerEdit = async function(id){



    try{



        const ref =
        doc(
            db,
            "players",
            id
        );



        const snap =
        await getDoc(ref);



        if(!snap.exists())
        return;



        const old =
        snap.data();







        await updateDoc(

            ref,

            {


                name:
                value(
                    "editName"
                ),



                info:{


                    position:
                    value(
                        "editPosition"
                    ),



                    age:
                    value(
                        "editAge"
                    ),



                    height:
                    value(
                        "editHeight"
                    ),



                    weight:
                    value(
                        "editWeight"
                    )



                }



            }


        );






        alert(
            "Oyuncu güncellendi"
        );



        document
        .getElementById(
            "playerEditModal"
        )
        .style.display="none";



        if(typeof loadPlayers==="function"){

            loadPlayers();

        }




    }



    catch(error){


        console.error(error);


        alert(
            error.message
        );


    }



};
// =====================================
// OYUNCU LİSTELEME
// FINAL 4/10
// =====================================



window.loadPlayers = async function(){



    const area =
    document.getElementById(
        "playersList"
    );



    if(!area)
    return;



    area.innerHTML = "";




    const snap =
    await getDocs(

        collection(
            db,
            "players"
        )

    );






    snap.forEach((item)=>{


        const p =
        item.data();




        area.innerHTML += `


        <div

        class="playerCard"

        onclick="openPlayer('${item.id}')"

        >



            <div class="playerImageBox">


                <img

                src="${p.image || 'https://via.placeholder.com/200'}"

                >


            </div>





            <h3>

            ${p.name}

            </h3>




            <p>

            ${p.teamName || "Takımsız"}

            </p>





            <div class="playerStats">


                ⚽ ${p.goals || 0}


                🅰️ ${p.assists || 0}


                🏟 ${p.matches || 0}



            </div>



        </div>


        `;



    });



};









// =====================================
// OYUNCU PROFİL PANELİ
// =====================================



window.openPlayer = async function(id){



    const player =
    await getPlayer(id);



    if(!player)
    return;





    const modal =
    document.getElementById(
        "playerModal"
    );



    const box =
    document.getElementById(
        "playerDetail"
    );




    if(!modal || !box)
    return;








    box.innerHTML = `



    <div class="bluelockProfile">


        <img

        class="bigPlayerImage"

        src="${player.image || ''}"

        >





        <h1>

        ${player.name}

        </h1>





        <h3>

        ${player.teamName || "Takımsız"}

        </h3>






        <div class="profileStats">


            <div>

            ⚽

            <span>

            ${player.goals || 0}

            </span>

            Gol

            </div>




            <div>

            🅰️

            <span>

            ${player.assists || 0}

            </span>

            Asist

            </div>





            <div>

            🏟

            <span>

            ${player.matches || 0}

            </span>

            Maç

            </div>





        </div>








        <hr>





        <h3>

        Oyuncu Bilgileri

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

        Özel Statlar

        </h3>





        <div class="customStats">


        ${
            Object.entries(
                player.stats || {}
            )
            .map(
                ([key,val])=>`

                <div>

                ${key}

                :

                ${val}

                </div>

                `
            )
            .join("")
        }



        </div>






        <button

        onclick="editPlayer('${id}')"

        >

        Oyuncuyu Düzenle

        </button>







        ${
            isAdmin

            ?

            `


            <button

            onclick="deletePlayer('${id}')"

            >

            Oyuncuyu Sil

            </button>


            `

            :

            ""

        }







    </div>



    `;






    modal.style.display =
    "flex";



};
// =====================================
// TAKIM SİSTEMİ
// FINAL 6/10
// =====================================



window.loadTeams = async function(){


    const area =
    document.getElementById(
        "teamsList"
    );



    if(!area)
    return;




    area.innerHTML = "";



    const snap =
    await getDocs(

        collection(
            db,
            "teams"
        )

    );





    snap.forEach(item=>{


        const team =
        item.data();




        area.innerHTML += `


        <div

        class="teamCard"

        onclick="openTeam('${item.id}')"

        >



            ${
            team.logo

            ?

            `

            <img

            src="${team.logo}"

            >

            `

            :

            ""

            }





            <h3>

            ${team.name}

            </h3>





            <p>

            🏆 ${team.points || 0}

            Puan

            </p>





            <p>

            ⚽ ${team.goals || 0}

            Gol

            </p>




        </div>



        `;



    });



};









// =====================================
// TAKIM DETAY
// =====================================



window.openTeam = async function(id){



    const ref =
    doc(
        db,
        "teams",
        id
    );



    const snap =
    await getDoc(ref);



    if(!snap.exists())
    return;




    const team =
    snap.data();




    const modal =
    document.getElementById(
        "teamModal"
    );



    const box =
    document.getElementById(
        "teamDetail"
    );



    if(!modal || !box)
    return;






    box.innerHTML = `



    <img

    src="${team.logo || ''}"

    >




    <h2>

    ${team.name}

    </h2>





    <p>

    🏆 Puan:

    ${team.points || 0}

    </p>




    <p>

    ✅ Galibiyet:

    ${team.wins || 0}

    </p>




    <p>

    🤝 Beraberlik:

    ${team.draws || 0}

    </p>




    <p>

    ❌ Mağlubiyet:

    ${team.losses || 0}

    </p>




    <p>

    ⚽ Attığı Gol:

    ${team.goals || 0}

    </p>




    <p>

    🥅 Yediği Gol:

    ${team.conceded || 0}

    </p>





    <button

    onclick="editTeam('${id}')"

    >

    Takımı Düzenle

    </button>






    ${
        isAdmin

        ?

        `

        <button

        onclick="deleteTeam('${id}')"

        >

        Takımı Sil

        </button>

        `

        :

        ""

    }



    `;





    modal.style.display =
    "flex";



};









// =====================================
// TAKIM DÜZENLE
// =====================================



window.editTeam = async function(id){



    const ref =
    doc(
        db,
        "teams",
        id
    );



    const snap =
    await getDoc(ref);



    if(!snap.exists())
    return;




    const team =
    snap.data();




    const name =
    prompt(
        "Takım adı",
        team.name
    );



    if(!name)
    return;





    await updateDoc(

        ref,

        {


            name:name


        }

    );





    loadTeams();



};









// =====================================
// TAKIM SİL
// SADECE ADMIN
// =====================================



window.deleteTeam = async function(id){



    if(!isAdmin){


        alert(
            "Yetkin yok"
        );


        return;


    }






    const ok =
    confirm(
        "Takım silinsin mi?"
    );



    if(!ok)
    return;





    await deleteDoc(

        doc(
            db,
            "teams",
            id
        )

    );





    loadTeams();


    updateDashboard();



};
// =====================================
// LİG SİSTEMİ
// FINAL 7/10
// =====================================



async function getTeamsData(){



    const snap =
    await getDocs(

        collection(
            db,
            "teams"
        )

    );



    const teams = [];



    snap.forEach(item=>{


        teams.push({

            id:item.id,

            ...item.data()

        });


    });



    return teams;



}









// =====================================
// PUAN TABLOSU
// =====================================



window.loadLeagueTable = async function(){



    const area =
    document.getElementById(
        "leagueTable"
    );



    if(!area)
    return;



    let teams =
    await getTeamsData();





    teams.sort(

        (a,b)=>{


            if(
                (b.points || 0)
                !==
                (a.points || 0)
            ){


                return (

                    (b.points || 0)

                    -

                    (a.points || 0)

                );


            }




            return (

                (b.goals || 0)

                -

                (a.goals || 0)

            );


        }

    );







    area.innerHTML = "";





    teams.forEach(

        (team,index)=>{



            area.innerHTML += `



            <div class="leagueRow">


                <span>

                ${index+1}

                </span>



                <strong>

                ${team.name}

                </strong>




                <span>

                ${team.points || 0}

                P

                </span>




                <span>

                ${team.wins || 0}

                G

                </span>



                <span>

                ${team.draws || 0}

                B

                </span>



                <span>

                ${team.losses || 0}

                M

                </span>




                <span>

                ${team.goals || 0}

                :

                ${team.conceded || 0}

                </span>



            </div>


            `;



        }


    );



};









// =====================================
// MAÇ SONUCU GİRME
// =====================================



window.addMatchResult = async function(){



    const home =
    value(
        "homeTeam"
    );



    const away =
    value(
        "awayTeam"
    );



    const homeGoals =
    Number(
        value(
            "homeGoals"
        )
    );



    const awayGoals =
    Number(
        value(
            "awayGoals"
        )
    );



    if(
        !home ||
        !away
    ){

        alert(
            "Takım seç"
        );


        return;

    }






    const homeRef =
    doc(
        db,
        "teams",
        home
    );



    const awayRef =
    doc(
        db,
        "teams",
        away
    );






    const homeSnap =
    await getDoc(
        homeRef
    );



    const awaySnap =
    await getDoc(
        awayRef
    );





    if(
        !homeSnap.exists()
        ||
        !awaySnap.exists()
    )
    return;





    const h =
    homeSnap.data();



    const a =
    awaySnap.data();







    let hPoints =
    h.points || 0;



    let aPoints =
    a.points || 0;






    let hWins =
    h.wins || 0;



    let aWins =
    a.wins || 0;



    let hDraws =
    h.draws || 0;



    let aDraws =
    a.draws || 0;



    let hLoss =
    h.losses || 0;



    let aLoss =
    a.losses || 0;








    if(
        homeGoals >
        awayGoals
    ){


        hPoints += 3;


        hWins++;

        aLoss++;


    }

    else if(

        homeGoals <
        awayGoals

    ){


        aPoints += 3;


        aWins++;

        hLoss++;


    }

    else{


        hPoints += 1;

        aPoints += 1;


        hDraws++;

        aDraws++;


    }







    await updateDoc(

        homeRef,

        {


            points:hPoints,


            wins:hWins,


            draws:hDraws,


            losses:hLoss,



            goals:
            (h.goals || 0)
            +
            homeGoals,



            conceded:
            (h.conceded || 0)
            +
            awayGoals


        }


    );







    await updateDoc(

        awayRef,

        {


            points:aPoints,


            wins:aWins,


            draws:aDraws,


            losses:aLoss,



            goals:
            (a.goals || 0)
            +
            awayGoals,



            conceded:
            (a.conceded || 0)
            +
            homeGoals


        }


    );






    loadLeagueTable();


    loadTeams();



};
// =====================================
// MAÇ GEÇMİŞİ SİSTEMİ
// FINAL 8/10
// =====================================





window.saveMatchHistory = async function(data){



    await addDoc(


        collection(
            db,
            "matches"
        ),


        {


            ...data,


            createdAt:
            new Date()


        }


    );



};









// =====================================
// MAÇ LİSTESİ
// =====================================



window.loadMatches = async function(){



    const area =
    document.getElementById(
        "matchesList"
    );



    if(!area)
    return;




    area.innerHTML = "";




    const snap =
    await getDocs(

        collection(
            db,
            "matches"
        )

    );





    snap.forEach(item=>{


        const match =
        item.data();




        area.innerHTML += `



        <div class="matchCard">



            <h3>

            ${match.homeName}

            -

            ${match.awayName}

            </h3>





            <strong>

            ${match.homeGoals}

            :

            ${match.awayGoals}

            </strong>



        </div>



        `;



    });



};









// =====================================
// GOL KRALLIĞI GELİŞTİRME
// =====================================



window.renderGoalKing = async function(){



    const area =
    document.getElementById(
        "goalKing"
    );



    if(!area)
    return;




    const players =
    await getPlayersRanking();





    players.sort(

        (a,b)=>

        (b.goals || 0)

        -

        (a.goals || 0)

    );





    if(players.length){


        const top =
        players[0];



        area.innerHTML = `


        <div class="kingCard">


        👑 Gol Kralı


        <h2>

        ${top.name}

        </h2>



        ⚽

        ${top.goals || 0}

        Gol


        </div>


        `;



    }



};









// =====================================
// ASİST KRALLIĞI GELİŞTİRME
// =====================================



window.renderAssistKing = async function(){



    const area =
    document.getElementById(
        "assistKing"
    );



    if(!area)
    return;




    const players =
    await getPlayersRanking();





    players.sort(

        (a,b)=>

        (b.assists || 0)

        -

        (a.assists || 0)

    );






    if(players.length){



        const top =
        players[0];



        area.innerHTML = `


        <div class="kingCard">


        👑 Asist Kralı



        <h2>

        ${top.name}

        </h2>



        🅰️

        ${top.assists || 0}

        Asist



        </div>


        `;



    }



};









// =====================================
// BLUELOCK PLAYERS KART SİSTEMİ
// =====================================



function calculateRating(player){



    let rating = 50;



    rating +=
    (player.goals || 0)
    *
    2;



    rating +=
    (player.assists || 0)
    *
    2;




    rating +=
    (player.matches || 0);



    if(rating > 99){

        rating = 99;

    }



    return rating;



}









window.getPlayerCardData = function(player){



    return {



        name:
        player.name,



        image:
        player.image,



        team:
        player.teamName,



        position:
        player.info?.position,



        rating:
        calculateRating(player),



        goals:
        player.goals || 0,



        assists:
        player.assists || 0,



        stats:
        player.stats || {}



    };



};
// =====================================
// BAŞLATMA SİSTEMİ
// FINAL 9/10
// =====================================







function applyPermissions(){



    const adminOnly =
    document.querySelectorAll(
        ".adminOnly"
    );



    adminOnly.forEach(el=>{


        if(isAdmin){


            el.style.display =
            "";


        }

        else{


            el.style.display =
            "none";


        }



    });



}









// =====================================
// TAKIM SEÇİMLERİNİ DOLDUR
// =====================================



window.loadTeamSelect = async function(){



    const select =
    document.getElementById(
        "playerTeam"
    );



    if(!select)
    return;




    select.innerHTML = `


    <option value="">


    Takım Seç


    </option>


    `;





    const teams =
    await getTeamsData();





    teams.forEach(team=>{


        select.innerHTML += `


        <option value="${team.id}">


        ${team.name}


        </option>


        `;



    });



};









// =====================================
// MAÇ TAKIM SEÇİMLERİ
// =====================================



window.loadMatchTeams = async function(){



    const selects = [


        "homeTeam",


        "awayTeam"


    ];



    const teams =
    await getTeamsData();





    selects.forEach(id=>{



        const select =
        document.getElementById(id);



        if(!select)
        return;





        select.innerHTML = `


        <option value="">


        Takım


        </option>


        `;





        teams.forEach(team=>{



            select.innerHTML += `


            <option value="${team.id}">


            ${team.name}


            </option>


            `;


        });





    });




};









// =====================================
// TÜM SİSTEMİ YÜKLE
// =====================================



async function startApp(){



    console.log(
        "BlueLock Panel Başlatılıyor..."
    );





    applyPermissions();





    if(
        typeof updateDashboard
        ===
        "function"
    ){

        await updateDashboard();

    }





    if(
        typeof loadPlayers
        ===
        "function"
    ){

        await loadPlayers();

    }





    if(
        typeof loadTeams
        ===
        "function"
    ){

        await loadTeams();

    }





    if(
        typeof loadTeamSelect
        ===
        "function"
    ){

        await loadTeamSelect();

    }





    if(
        typeof loadMatchTeams
        ===
        "function"
    ){

        await loadMatchTeams();

    }





    if(
        typeof loadLeagueTable
        ===
        "function"
    ){

        await loadLeagueTable();

    }





    if(
        typeof loadMatches
        ===
        "function"
    ){

        await loadMatches();

    }





    if(
        typeof loadGoalRanking
        ===
        "function"
    ){

        await loadGoalRanking();

    }





    if(
        typeof loadAssistRanking
        ===
        "function"
    ){

        await loadAssistRanking();

    }





    if(
        typeof renderGoalKing
        ===
        "function"
    ){

        await renderGoalKing();

    }





    if(
        typeof renderAssistKing
        ===
        "function"
    ){

        await renderAssistKing();

    }





    console.log(
        "BlueLock Panel Hazır"
    );



}









window.addEventListener(

"load",

()=>{


    startApp();



});









// =====================================
// MODAL KAPATMA GENEL
// =====================================



window.closeModal = function(id){



    const modal =
    document.getElementById(id);



    if(modal){


        modal.style.display =
        "none";


    }



};
// =====================================
// FINAL TEMİZLİK VE SON BAĞLANTILAR
// FINAL 10/10
// =====================================







// =====================================
// OYUNCU SİLME
// SADECE ADMIN
// =====================================



window.deletePlayer = async function(id){



    if(!isAdmin){


        alert(
            "Bu işlem için admin yetkisi gerekli"
        );


        return;


    }






    const confirmDelete =
    confirm(
        "Oyuncu tamamen silinsin mi?"
    );



    if(!confirmDelete)
    return;






    await deleteDoc(

        doc(
            db,
            "players",
            id
        )

    );






    closeModal(
        "playerModal"
    );



    loadPlayers();


    updateDashboard();



};









// =====================================
// OYUNCU GOL / ASİST / MAÇ MANUEL GÜNCELLE
// =====================================



window.updatePlayerStats = async function(id){



    const ref =
    doc(
        db,
        "players",
        id
    );



    const snap =
    await getDoc(ref);



    if(!snap.exists())
    return;




    await updateDoc(

        ref,

        {


            goals:
            Number(
                value(
                    "editGoals"
                )
                ||
                0
            ),



            assists:
            Number(
                value(
                    "editAssists"
                )
                ||
                0
            ),



            matches:
            Number(
                value(
                    "editMatches"
                )
                ||
                0
            ),



            yellowCards:
            Number(
                value(
                    "editYellow"
                )
                ||
                0
            ),



            redCards:
            Number(
                value(
                    "editRed"
                )
                ||
                0
            )



        }


    );





    openPlayer(id);


};









// =====================================
// TAKIM İSTATİSTİK GÜNCELLE
// =====================================



window.updateTeamStats = async function(id){



    if(!isAdmin){


        alert(
            "Yetkin yok"
        );


        return;


    }






    const ref =
    doc(
        db,
        "teams",
        id
    );



    await updateDoc(

        ref,

        {



            points:
            Number(
                value(
                    "editTeamPoints"
                )
                ||
                0
            ),



            wins:
            Number(
                value(
                    "editTeamWins"
                )
                ||
                0
            ),



            draws:
            Number(
                value(
                    "editTeamDraws"
                )
                ||
                0
            ),



            losses:
            Number(
                value(
                    "editTeamLosses"
                )
                ||
                0
            ),



            goals:
            Number(
                value(
                    "editTeamGoals"
                )
                ||
                0
            ),



            conceded:
            Number(
                value(
                    "editTeamConceded"
                )
                ||
                0
            )



        }


    );






    loadTeams();


    loadLeagueTable();



};









// =====================================
// TAKIM SİLME
// =====================================



window.deleteTeam = async function(id){



    if(!isAdmin){


        alert(
            "Yetkin yok"
        );


        return;


    }





    const ok =
    confirm(
        "Takım silinsin mi?"
    );



    if(!ok)
    return;






    await deleteDoc(

        doc(
            db,
            "teams",
            id
        )

    );





    closeModal(
        "teamModal"
    );



    loadTeams();


    updateDashboard();



};









// =====================================
// TÜM MODALLARI KAPAT
// =====================================



window.closeAllModals = function(){



    document
    .querySelectorAll(
        ".modal"
    )
    .forEach(modal=>{


        modal.style.display =
        "none";


    });



};









// =====================================
// GÜVENLİK KONTROLÜ
// =====================================



window.getPermission = function(){


    return {


        admin:
        isAdmin,



        canAddPlayer:
        true,



        canEditPlayer:
        true,



        canDeletePlayer:
        isAdmin,



        canDeleteTeam:
        isAdmin



    };


};








console.log(
    "BLUELOCK FINAL APP.JS YÜKLENDİ"
);
// =====================================
// FINAL APP FIX 11/12
// EKSİK TEMEL FONKSİYONLAR
// =====================================



// =====================================
// VALUE YARDIMCI FONKSİYONU
// =====================================


window.value = function(id){

    const el =
    document.getElementById(id);


    return el ? el.value : "";

};









// =====================================
// ADMIN KONTROL
// =====================================



window.isAdmin =
window.isAdmin || false;



function checkAdmin(){


    const params =
    new URLSearchParams(
        window.location.search
    );



    if(
        params.get("admin")
        ===
        "bluelock2026"
    ){


        window.isAdmin = true;


    }



}



checkAdmin();









// =====================================
// OYUNCU KAYDET
// =====================================



window.savePlayer = async function(){



    const name =
    value(
        "playerName"
    );



    if(!name){


        alert(
            "Oyuncu adı gerekli"
        );


        return;


    }






    let imageURL = "";



    const fileInput =
    document.getElementById(
        "playerImage"
    );



    if(
        fileInput &&
        fileInput.files[0]
    ){


        // Storage bağlantısı varsa burası çalışacak
        // Yoksa boş geçecek


        try{


            const file =
            fileInput.files[0];



            const storageRef =
            ref(
                storage,
                "players/"
                +
                Date.now()
                +
                "_"
                +
                file.name
            );



            await uploadBytes(
                storageRef,
                file
            );



            imageURL =
            await getDownloadURL(
                storageRef
            );


        }

        catch(e){


            console.log(
                "Fotoğraf yüklenemedi",
                e
            );


        }


    }









    await addDoc(

        collection(
            db,
            "players"
        ),


        {


            name:name,


            image:imageURL,



            team:value(
                "playerTeam"
            ),



            info:{


                position:
                value(
                    "playerPosition"
                ),


                age:
                value(
                    "playerAge"
                ),


                height:
                value(
                    "playerHeight"
                ),


                weight:
                value(
                    "playerWeight"
                )


            },



            goals:0,


            assists:0,


            matches:0,



            createdAt:
            new Date()



        }


    );






    alert(
        "Oyuncu kaydedildi"
    );



    loadPlayers();



    updateDashboard();



};









// =====================================
// DASHBOARD SAYACLARI
// =====================================



window.updateDashboard =
async function(){



    const playerSnap =
    await getDocs(

        collection(
            db,
            "players"
        )

    );



    const teamSnap =
    await getDocs(

        collection(
            db,
            "teams"
        )

    );





    const playerCount =
    document.getElementById(
        "playerCount"
    );



    const teamCount =
    document.getElementById(
        "teamCount"
    );





    if(playerCount){


        playerCount.innerHTML =
        playerSnap.size;


    }




    if(teamCount){


        teamCount.innerHTML =
        teamSnap.size;


    }






    const perm =
    document.getElementById(
        "permissionText"
    );



    if(perm){


        perm.innerHTML =

        window.isAdmin

        ?

        "Admin"

        :

        "Ziyaretçi";


    }



};
// =====================================
// FINAL APP FIX 12/12
// SON BAĞLANTILAR VE EKSİK FONKSİYONLAR
// =====================================



// =====================================
// TAKIM KAYDET
// =====================================



window.saveTeam = async function(){



    const name =
    value(
        "teamName"
    );



    const logo =
    value(
        "teamLogo"
    );



    if(!name){


        alert(
            "Takım adı gerekli"
        );


        return;


    }






    await addDoc(


        collection(
            db,
            "teams"
        ),


        {


            name:name,


            logo:logo,


            points:0,


            wins:0,


            draws:0,


            losses:0,


            goals:0,


            conceded:0,



            createdAt:
            new Date()



        }


    );






    alert(
        "Takım oluşturuldu"
    );



    loadTeams();


    loadTeamSelect();


    updateDashboard();



};









// =====================================
// OYUNCU DÜZENLEME PANELİ
// =====================================



window.editPlayer = async function(id){



    const modal =
    document.getElementById(
        "playerEditModal"
    );



    const area =
    document.getElementById(
        "playerEditArea"
    );



    if(!modal || !area)
    return;





    const snap =
    await getDoc(

        doc(
            db,
            "players",
            id
        )

    );



    if(!snap.exists())
    return;




    const p =
    snap.data();




    window.currentPlayerId =
    id;





    area.innerHTML = `



    <h2>
    ${p.name}
    Düzenle
    </h2>



    <input

    id="editPlayerName"

    value="${p.name || ""}"

    >



    <input

    id="editPlayerPosition"

    value="${p.info?.position || ""}"

    >



    <input

    id="editPlayerAge"

    value="${p.info?.age || ""}"

    >




    <button onclick="savePlayerEdit('${id}')">

    Kaydet

    </button>



    `;





    modal.style.display =
    "flex";



};









window.savePlayerEdit =
async function(id){



    await updateDoc(


        doc(
            db,
            "players",
            id
        ),



        {


            name:
            value(
                "editPlayerName"
            ),



            info:{


                position:
                value(
                    "editPlayerPosition"
                ),



                age:
                value(
                    "editPlayerAge"
                )


            }



        }


    );






    alert(
        "Oyuncu güncellendi"
    );



    closeModal(
        "playerEditModal"
    );



    loadPlayers();



};









// =====================================
// BLUELOCK KART RENDER
// =====================================



window.renderPlayerCard =
function(player){



    const area =
    document.getElementById(
        "playerCardPreview"
    );



    if(!area)
    return;






    const rating =
    calculateRating(
        player
    );





    area.innerHTML += `



    <div class="card">



    <img src="${player.image || ''}">



    <h2>

    ${player.name}

    </h2>



    <h1>

    ${rating}

    ⭐

    </h1>




    <p>

    ⚽ ${player.goals || 0}

    |

    🅰️ ${player.assists || 0}

    </p>




    <p>

    ${player.info?.position || "-"}

    </p>



    </div>



    `;



};









// =====================================
// GENEL YENİLEME
// =====================================



window.refreshAll =
async function(){



    await loadPlayers();



    await loadTeams();



    await loadLeagueTable();



    await loadMatches();



    await updateDashboard();



};









console.log(
"BLUELOCK FINAL FIX 12/12 TAMAMLANDI"
);

import { db } from "./firebase.js";

import { uploadPlayerImage } from "./cloudinary.js";


import {

collection,

addDoc,

getDocs,

doc,

getDoc,

setDoc,

updateDoc,

deleteDoc,

orderBy,

query

}

from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";




// ============================
// ADMIN SİSTEMİ
// ============================


const params =
new URLSearchParams(
    window.location.search
);


const adminCode =
params.get("admin");



const isAdmin =
adminCode === "bluelock2026";



window.isAdmin = isAdmin;





if(isAdmin){

    console.log(
        "ADMIN MOD AKTİF"
    );

}







// ============================
// YARDIMCI
// ============================



function value(id){

    const el =
    document.getElementById(id);


    return el ? el.value.trim() : "";

}





function clear(id){

    const el =
    document.getElementById(id);


    if(el){

        el.value="";

    }

}
// ============================
// OYUNCU EKLEME
// ============================


window.savePlayer = async function(){


    try{


        const name =
        value("playerName");



        if(!name){

            alert(
                "Oyuncu adı gir"
            );

            return;

        }





        let image = "";



        const file =
        document
        .getElementById("playerImage")
        ?.files[0];



        if(file){

            image =
            await uploadPlayerImage(file);

        }





        const stats = {};



        document
        .querySelectorAll(".statName")
        .forEach(
            (el,index)=>{


                if(el.value){


                    const val =
                    document
                    .querySelectorAll(".statValue")
                    [index]
                    .value;



                    stats[el.value]
                    =
                    Number(val);


                }


            }
        );






        const physical = {};



        document
        .querySelectorAll(".physicalName")
        .forEach(
            (el,index)=>{


                if(el.value){


                    const val =
                    document
                    .querySelectorAll(".physicalValue")
                    [index]
                    .value;



                    physical[el.value]
                    =
                    Number(val);


                }


            }
        );







        const teamSelect =
        document.getElementById(
            "playerTeam"
        );



        let teamId = "";

        let teamName = "";



        if(teamSelect && teamSelect.value){


            teamId =
            teamSelect.value;


            teamName =
            teamSelect.options[
                teamSelect.selectedIndex
            ].text;


        }







        await addDoc(

            collection(
                db,
                "players"
            ),

            {


                name:name,


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




        clear("playerName");


    }


    catch(error){


        console.error(error);


        alert(
            error.message
        );


    }


};
// ============================
// TAKIM SİSTEMİ
// ============================



window.saveTeam = async function(){



    try{


        const name =
        value("teamName");



        const logo =
        value("teamLogo");




        if(!name){


            alert(
                "Takım adı gir"
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



        clear("teamName");

        clear("teamLogo");



        loadTeams();

        loadTeamSelect();



    }



    catch(error){


        console.error(error);


        alert(
            error.message
        );


    }



};









// ============================
// TAKIM LİSTESİ
// ============================


async function loadTeams(){



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





    snap.forEach((item)=>{


        const team =
        item.data();



        area.innerHTML += `


        <div class="teamCard">


            <img

            src="${team.logo || ''}"

            >



            <h3>

            ${team.name}

            </h3>



            <p>

            🏆 ${team.points || 0}

            puan

            </p>



        </div>


        `;


    });



}









// ============================
// OYUNCU TAKIM DROPDOWN
// ============================


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

        collection(
            db,
            "teams"
        )

    );






    snap.forEach((item)=>{


        const team =
        item.data();



        select.innerHTML += `


        <option value="${item.id}">

        ${team.name}

        </option>


        `;


    });



}
// ============================
// OYUNCU LİSTESİ
// ============================



async function loadPlayers(){



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



            <img 
            src="${p.image || 'https://via.placeholder.com/150'}"
            >




            <h3>

            ${p.name}

            </h3>




            <p>

            ${p.info?.position || "Mevki yok"}

            </p>




            <div>


            ⚽ ${p.goals || 0}

            🅰️ ${p.assists || 0}


            </div>



        </div>


        `;



    });



}









// ============================
// GOL KRALLIĞI
// ============================



async function loadGoals(){



    const area =
    document.getElementById(
        "goalList"
    );



    if(!area)
    return;





    area.innerHTML="";





    const snap =
    await getDocs(

        collection(
            db,
            "players"
        )

    );





    let players=[];



    snap.forEach((item)=>{


        players.push(
            item.data()
        );


    });






    players.sort(

        (a,b)=>

        (b.goals || 0)

        -

        (a.goals || 0)

    );





    players.forEach((p,index)=>{


        area.innerHTML += `


        <div class="ranking">


        ${index+1}.

        ${p.name}

        ⚽

        ${p.goals || 0}


        </div>


        `;



    });



}









// ============================
// ASİST KRALLIĞI
// ============================



async function loadAssists(){



    const area =
    document.getElementById(
        "assistList"
    );



    if(!area)
    return;




    area.innerHTML="";





    const snap =
    await getDocs(

        collection(
            db,
            "players"
        )

    );




    let players=[];



    snap.forEach((item)=>{


        players.push(
            item.data()
        );


    });






    players.sort(

        (a,b)=>

        (b.assists || 0)

        -

        (a.assists || 0)

    );






    players.forEach((p,index)=>{


        area.innerHTML += `


        <div class="ranking">


        ${index+1}.

        ${p.name}

        🅰️

        ${p.assists || 0}


        </div>


        `;



    });



}









// ============================
// PUAN TABLOSU
// ============================



async function loadTable(){



    const area =
    document.getElementById(
        "tableList"
    );



    if(!area)
    return;




    area.innerHTML="";





    const snap =
    await getDocs(

        collection(
            db,
            "teams"
        )

    );





    let teams=[];




    snap.forEach((item)=>{


        teams.push(
            item.data()
        );


    });





    teams.sort(

        (a,b)=>

        (b.points || 0)

        -

        (a.points || 0)

    );






    teams.forEach((team,index)=>{


        area.innerHTML += `


        <tr>


        <td>

        ${index+1}

        </td>



        <td>

        ${team.name}

        </td>



        <td>

        ${team.points || 0}

        </td>



        </tr>


        `;



    });



}
// ============================
// OYUNCU PROFİLİ
// ============================


window.openPlayer = async function(id){



    const modal =
    document.getElementById(
        "playerModal"
    );



    const area =
    document.getElementById(
        "playerDetail"
    );



    if(!modal || !area)
    return;




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



    const p =
    snap.data();





    area.innerHTML = `



    <img

    src="${p.image || 'https://via.placeholder.com/200'}"

    class="profileImage"

    >




    <h2>

    ${p.name}

    </h2>




    <p>

    Mevki:

    ${p.info?.position || "-"}

    </p>




    <p>

    Yaş:

    ${p.info?.age || "-"}

    </p>



    <p>

    Boy:

    ${p.info?.height || "-"}

    </p>



    <p>

    Kilo:

    ${p.info?.weight || "-"}

    </p>




    <hr>



    <h3>

    İstatistik

    </h3>



    <p>

    ⚽ Gol:

    ${p.goals || 0}

    </p>



    <p>

    🅰️ Asist:

    ${p.assists || 0}

    </p>




    <h3>

    Özel Statlar

    </h3>


    <pre>

${JSON.stringify(
    p.stats || {},
    null,
    2
)}

    </pre>



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



    `;




    modal.style.display =
    "flex";



};








window.closePlayer = function(){



    const modal =
    document.getElementById(
        "playerModal"
    );


    if(modal){

        modal.style.display =
        "none";

    }


};









// ============================
// OYUNCU SİLME
// SADECE ADMIN
// ============================



window.deletePlayer = async function(id){



    if(!isAdmin){

        alert(
            "Yetkin yok"
        );

        return;

    }



    const ok =
    confirm(
        "Oyuncu silinsin mi?"
    );



    if(!ok)
    return;




    await deleteDoc(

        doc(
            db,
            "players",
            id
        )

    );




    alert(
        "Oyuncu silindi"
    );



    closePlayer();


    loadPlayers();


};









// ============================
// BAŞLANGIÇ
// ============================



window.addEventListener(
"load",
()=>{


    loadPlayers();


    loadTeams();


    loadTeamSelect();


    loadGoals();


    loadAssists();


    loadTable();



});

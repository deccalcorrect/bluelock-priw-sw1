import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    getDoc
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    uploadPlayerImage
}
from "./cloudinary.js";




// =====================================
// AKTİF KULLANICI
// =====================================

let currentUser = null;

let isAdmin = false;




// =====================================
// KULLANICI KONTROLÜ
// =====================================

async function checkUser(){


    const uid =
    localStorage.getItem("uid");



    if(!uid){

        console.log("Giriş yapılmamış");

        return;

    }



    const userRef =
    doc(db,"users",uid);



    const snap =
    await getDoc(userRef);



    if(snap.exists()){


        currentUser = {

            id:uid,

            ...snap.data()

        };



        isAdmin =
        currentUser.role === "admin";



        console.log(
            "Kullanıcı:",
            currentUser
        );


    }


}





// =====================================
// STAT EKLE
// =====================================


window.addStat=function(){



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



    div.className="stat";



    div.innerHTML=`

        <input 
        class="statName"
        placeholder="Stat adı">


        <input 
        class="statValue"
        type="number"
        min="0"
        max="100"
        placeholder="Değer">

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



    div.className="stat";



    div.innerHTML=`

        <input
        class="physicalName"
        placeholder="Fiziksel özellik">


        <input
        class="physicalValue"
        type="number"
        min="0"
        max="100"
        placeholder="Değer">


    `;



    box.appendChild(div);



};






// =====================================
// ADMIN KONTROLÜ
// =====================================


function requireAdmin(){


    if(!isAdmin){


        alert(
        "Bu işlem için admin yetkisi gerekiyor."
        );


        return false;


    }



    return true;


}







// =====================================
// SAYFA BAŞLANGICI
// =====================================


checkUser();
// =====================================
// TAKIM EKLE
// =====================================

window.addTeam = async function(){


    if(!requireAdmin())
    return;



    const name =
    document
    .getElementById("teamName")
    .value;



    const logo =
    document
    .getElementById("teamLogo")
    .value;



    if(!name){


        alert(
        "Takım adı giriniz"
        );


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


            losses:0,


            createdAt:
            new Date()


        }


    );



    alert(
    "Takım oluşturuldu"
    );



    loadTeams();


    loadTeamSelect();


};









// =====================================
// OYUNCU KAYDET
// =====================================


window.savePlayer = async function(){



    if(!currentUser){


        alert(
        "Önce giriş yapmalısınız"
        );


        return;

    }





    let image="";



    const file =
    document
    .getElementById("playerImage")
    .files[0];



    if(file){


        image =
        await uploadPlayerImage(file);


    }







    let stats={};



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








    let physical={};



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
    document
    .getElementById("playerTeam");



    let teamId="";

    let teamName="";





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


            userId:
            currentUser.id,



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



            goals:0,



            assists:0,



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
// OYUNCULARI GETİR
// =====================================

async function loadPlayers(){


    const area =
    document.getElementById(
        "playersList"
    );



    if(!area)
    return;



    area.innerHTML="";




    const snap =
    await getDocs(
        collection(db,"players")
    );





    snap.forEach((d)=>{


        const p =
        d.data();



        const id =
        d.id;





        // -----------------------------
        // YETKİ KONTROLÜ
        // -----------------------------


        let canEdit=false;



        if(isAdmin){

            canEdit=true;

        }
        else if(
            p.userId === currentUser?.id
        ){

            canEdit=true;

        }







        area.innerHTML += `


        <div class="playerCard">



            <img

            src="${p.image || ''}"

            class="playerImage"

            >



            <h3>
            ${p.name}
            </h3>



            <p>
            Mevki:
            ${p.info?.position || "-"}
            </p>



            <p>
            Takım:
            ${p.teamName || "Takımsız"}
            </p>




            <p>
            ⚽ ${p.goals || 0}
            Gol
            </p>



            <p>
            🅰️ ${p.assists || 0}
            Asist
            </p>




            <div class="stats">


            ${createStats(p.stats)}


            </div>




            ${
            canEdit

            ?

            `

            <button
            onclick="editPlayer('${id}')">

            ✏️ Düzenle

            </button>



            <button
            onclick="deletePlayer('${id}')">

            🗑 Sil

            </button>


            `

            :

            ""

            }



        </div>


        `;



    });


}









// =====================================
// STAT BAR OLUŞTUR
// =====================================


function createStats(stats){



    if(!stats)
    return "";




    return Object
    .entries(stats)
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


        <div class="statBox">


            <span>

            ${name}

            :

            ${value}


            </span>



            <div class="bar">


                <div

                style="
                width:${value}%;
                background:${color};
                height:10px;
                "

                >

                </div>


            </div>



        </div>


        `;



    })
    .join("");

}










// =====================================
// OYUNCU SİL
// =====================================


window.deletePlayer = async function(id){



    if(!isAdmin){


        alert(
        "Oyuncu silme yetkiniz yok"
        );


        return;

    }




    if(
    !confirm(
    "Oyuncu silinsin mi?"
    )
    )
    return;





    await deleteDoc(

        doc(
        db,
        "players",
        id
        )

    );



    loadPlayers();



};









// =====================================
// OYUNCU DÜZENLE
// =====================================


window.editPlayer =
async function(id){



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



    const player =
    snap.data();





    const newName =
    prompt(
    "Oyuncu adı:",
    player.name
    );





    if(!newName)
    return;





    await updateDoc(

        ref,

        {

            name:newName

        }

    );




    loadPlayers();


};
// =====================================
// TAKIMLARI GETİR
// =====================================

async function loadTeams(){


    const area =
    document.getElementById(
        "teamsList"
    );



    if(!area)
    return;



    area.innerHTML="";





    const teamSnap =
    await getDocs(
        collection(db,"teams")
    );





    const playerSnap =
    await getDocs(
        collection(db,"players")
    );







    teamSnap.forEach((teamDoc)=>{



        const team =
        teamDoc.data();



        const teamId =
        teamDoc.id;





        let players=[];





        playerSnap.forEach((playerDoc)=>{


            const player =
            playerDoc.data();



            if(
            player.teamId === teamId
            ){

                players.push(player);

            }


        });







        area.innerHTML += `


        <div class="teamCard">


            <img

            src="${team.logo || ''}"

            class="teamLogo"

            >



            <h2>

            ${team.name}

            </h2>




            <p>
            🏆 Puan:
            ${team.points || 0}
            </p>



            <p>
            Oynanan:
            ${team.played || 0}
            </p>



            <p>
            🟢 ${team.wins || 0}
            Galibiyet
            </p>



            <p>
            🟡 ${team.draws || 0}
            Beraberlik
            </p>



            <p>
            🔴 ${team.losses || 0}
            Mağlubiyet
            </p>





            <h3>
            Kadro
            </h3>



            ${
                players.length

                ?

                players
                .map(p=>`

                    <div>

                    ${p.name}

                    -

                    ${p.info?.position || ""}

                    </div>


                `)
                .join("")


                :

                "<p>Kadro boş</p>"

            }






            ${
            isAdmin

            ?

            `

            <button

            onclick="
            updateTeamScore('${teamId}')
            "

            >

            Puan Güncelle

            </button>


            `

            :

            ""

            }



        </div>


        `;



    });



}









// =====================================
// TAKIM PUAN GÜNCELLE
// =====================================


window.updateTeamScore =
async function(id){



    if(!requireAdmin())
    return;





    const points =
    prompt(
    "Yeni puan:"
    );



    if(points===null)
    return;





    await updateDoc(

        doc(
        db,
        "teams",
        id
        ),

        {


            points:
            Number(points)


        }

    );



    loadTeams();



};











// =====================================
// OYUNCU TAKIM DROPDOWN
// =====================================


async function loadTeamSelect(){



    const select =
    document.getElementById(
        "playerTeam"
    );



    if(!select)
    return;





    select.innerHTML =
    `

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


        <option

        value="${d.id}"

        >

        ${team.name}

        </option>


        `;


    });



}
// =====================================
// GOL KRALLIĞI
// =====================================

async function loadGoals(){


    const area =
    document.getElementById(
        "goalList"
    );



    if(!area)
    return;




    area.innerHTML="";




    const players=[];



    const snap =
    await getDocs(
        collection(db,"players")
    );




    snap.forEach((d)=>{


        players.push({

            id:d.id,

            ...d.data()

        });


    });





    players.sort(
        (a,b)=>
        (b.goals||0)
        -
        (a.goals||0)
    );





    players.forEach((p,index)=>{


        area.innerHTML += `


        <div>

        ${index+1}.

        ${p.name}


        ⚽

        ${p.goals || 0}


        </div>


        `;


    });



}









// =====================================
// ASİST KRALLIĞI
// =====================================

async function loadAssists(){


    const area =
    document.getElementById(
        "assistList"
    );



    if(!area)
    return;




    area.innerHTML="";




    const players=[];



    const snap =
    await getDocs(
        collection(db,"players")
    );





    snap.forEach((d)=>{


        players.push({

            id:d.id,

            ...d.data()

        });


    });





    players.sort(
        (a,b)=>
        (b.assists||0)
        -
        (a.assists||0)
    );






    players.forEach((p,index)=>{


        area.innerHTML += `


        <div>

        ${index+1}.

        ${p.name}


        🅰️

        ${p.assists || 0}


        </div>


        `;


    });



}









// =====================================
// ADMIN GOL / ASİST GÜNCELLEME
// =====================================


window.updatePlayerStats =
async function(id){



    if(!requireAdmin())
    return;





    const goals =
    prompt(
    "Gol sayısı:"
    );



    const assists =
    prompt(
    "Asist sayısı:"
    );





    await updateDoc(

        doc(
        db,
        "players",
        id
        ),

        {


            goals:
            Number(goals),


            assists:
            Number(assists)


        }


    );





    loadGoals();

    loadAssists();

    loadPlayers();



};










// =====================================
// HIZLI STAT AKTAR
// =====================================

window.transferStats =
async function(){



    if(!requireAdmin())
    return;





    const id =
    document
    .getElementById(
        "statPlayer"
    )
    .value;





    const text =
    document
    .getElementById(
        "statText"
    )
    .value;





    let stats={};





    text
    .split("\n")
    .forEach(line=>{


        const parts =
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

        doc(
        db,
        "players",
        id
        ),

        {

            stats:stats

        }

    );





    alert(
    "Statlar güncellendi"
    );



    loadPlayers();



};









// =====================================
// BAŞLAT
// =====================================


async function startApp(){


    await checkUser();



    loadPlayers();


    loadTeams();


    loadGoals();


    loadAssists();


    loadTeamSelect();



}



startApp();

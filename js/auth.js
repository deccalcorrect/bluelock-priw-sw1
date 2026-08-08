import { db, auth } from "./firebase.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


import {
    doc,
    setDoc,
    getDoc
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";




// Firebase Auth başlat






// =====================================
// REGISTER
// =====================================


window.register = async function(){


    const username =
    document.getElementById("username").value;



    const email =
    document.getElementById("email").value;



    const password =
    document.getElementById("password").value;





    if(
        !username ||
        !email ||
        !password
    ){

        alert("Tüm alanları doldur");

        return;

    }





    try{


        const result =
        await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );



        const user =
        result.user;





        await setDoc(

            doc(
                db,
                "users",
                user.uid
            ),

            {

                username:username,

                email:email,

                role:"user",

                createdAt:
                new Date()

            }

        );





        alert(
            "Kayıt başarılı"
        );



        window.location.href =
        "login.html";




    }
    catch(error){


        alert(
            error.message
        );


    }


};









// =====================================
// LOGIN
// =====================================


window.login = async function(){



    const email =
    document.getElementById("email").value;



    const password =
    document.getElementById("password").value;





    if(
        !email ||
        !password
    ){

        alert(
            "Email ve şifre gir"
        );

        return;

    }





    try{


        const result =
        await signInWithEmailAndPassword(

            auth,

            email,

            password

        );





        const user =
        result.user;






        localStorage.setItem(

            "uid",

            user.uid

        );






        alert(
            "Giriş başarılı"
        );





        window.location.href =
        "index.html";



    }
    catch(error){


        alert(
            error.message
        );


    }



};

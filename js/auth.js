import { app, db } from "./firebase.js";

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

const auth = getAuth(app);



// =====================================
// REGISTER
// =====================================

window.register = async function(){


    const username =
    document.getElementById("username").value.trim();


    const email =
    document.getElementById("email").value.trim();


    const password =
    document.getElementById("password").value.trim();



    if(!username || !email || !password){

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

                username: username,

                email: email,

                role: "user",

                createdAt: new Date()

            }

        );



        alert("Kayıt başarılı");


        window.location.href =
        "login.html";


    }

    catch(error){


        console.log(
            "REGISTER ERROR:",
            error
        );


        alert(

            error.code +
            "\n\n" +
            error.message

        );


    }


};





// =====================================
// LOGIN
// =====================================

window.login = async function(){



    const email =
    document.getElementById("email").value.trim();


    const password =
    document.getElementById("password").value.trim();



    if(!email || !password){

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


        console.log(
            "LOGIN ERROR:",
            error
        );


        alert(

            error.code +
            "\n\n" +
            error.message

        );


    }


};

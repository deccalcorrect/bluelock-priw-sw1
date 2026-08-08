import { initializeApp }
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";


import {
getFirestore
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


import {
getAuth
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";



const firebaseConfig = {

apiKey: "AIzaSyBqwg0Z4FamOfbRqQYG4cpfnD3souVU8E",

authDomain:
"bluelock-3f153.firebaseapp.com",

projectId:
"bluelock-3f153",

storageBucket:
"bluelock-3f153.firebasestorage.app",

messagingSenderId:
"406394448785",

appId:
"1:406394448785:web:874c0d975ae7da36948830"

};



const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

export { app };


export const auth =
getAuth(app);

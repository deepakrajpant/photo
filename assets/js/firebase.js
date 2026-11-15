import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js';
const firebaseConfig={apiKey:'AIzaSyDK1wwahwoJxNAH_Iats2wrSMUA42jVhSI',authDomain:'loksewa-2083.firebaseapp.com',projectId:'loksewa-2083',storageBucket:'loksewa-2083.firebasestorage.app',messagingSenderId:'484441818228',appId:'1:484441818228:web:fb43d456131cd40ec1fd21',measurementId:'G-D5RTD5R7B4'};
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
export {app,auth,db};

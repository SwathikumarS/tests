// TODO: Replace with your actual Firebase Project Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBhpNseU3qYU5-a-KyvOUfPIPBhh9Wef58",
    authDomain: "makkaldms.firebaseapp.com",
    projectId: "makkaldms",
    storageBucket: "makkaldms.firebasestorage.app",
    messagingSenderId: "878587018046",
    appId: "1:878587018046:web:c785a8abf4b2e4caba4a6f",
    measurementId: "G-CYMC2XPES6"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

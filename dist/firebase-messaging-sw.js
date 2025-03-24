// Scripts for firebase and firebase messaging
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js",
);

// Initialize the Firebase app in the service worker by passing the generated config
const firebaseConfig = {
  apiKey: "AIzaSyBDT_A3ZtBacna-ZMyMIKj_Gis5V0yn29A",
  authDomain: "fleetflow-ncg.firebaseapp.com",
  projectId: "fleetflow-ncg",
  storageBucket: "fleetflow-ncg.firebasestorage.app",
  messagingSenderId: "638823613072",
  appId: "1:638823613072:web:a1b098b77a2dd9eae1ce15",
};

// Error handling for Firebase initialization
try {
  firebase.initializeApp(firebaseConfig);

  // Retrieve firebase messaging
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage(function (payload) {
    console.log("Received background message ", payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: "/vite.svg",
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (error) {
  console.error("Error initializing Firebase in service worker:", error);
}

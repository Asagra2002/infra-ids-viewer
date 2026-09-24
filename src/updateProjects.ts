import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAqY2BCKmyB6SdaKbdaqhWGlXhE1Qyki2U",
  authDomain: "infra-ids-viewer.firebaseapp.com",
  projectId: "infra-ids-viewer",
  storageBucket: "infra-ids-viewer.firebasestorage.app",
  messagingSenderId: "274036403604",
  appId: "1:274036403604:web:46b088a3470a61ea4e3381"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Single preloaded project in infra-ids-viewer
const PROJECT_IDS = {
  bridge: 'rVY8PWGeY7XWl7kQHYrY',
};

async function updateProjects() {
  try {
    await updateDoc(doc(db, 'projects', PROJECT_IDS.bridge), {
      ifcFilePath: '/assets/IFC example/demo-bridge-so201-hameenlinna.ifc'
    });
    console.log('Bridge project updated successfully');
  } catch (error) {
    console.error('Error updating projects:', error);
  }
}

updateProjects();

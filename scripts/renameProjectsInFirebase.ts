/**
 * List / rename projects in Firestore (infra-ids-viewer).
 *
 * Usage:
 *   npx ts-node scripts/renameProjectsInFirebase.ts
 */

const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, updateDoc } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyAqY2BCKmyB6SdaKbdaqhWGlXhE1Qyki2U",
  authDomain: "infra-ids-viewer.firebaseapp.com",
  projectId: "infra-ids-viewer",
  storageBucket: "infra-ids-viewer.firebasestorage.app",
  messagingSenderId: "274036403604",
  appId: "1:274036403604:web:46b088a3470a61ea4e3381",
};

const RENAMES: Record<string, string> = {
  // "rVY8PWGeY7XWl7kQHYrY": "Hämeenlinna Bridge SO201",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listProjects() {
  const snapshot = await getDocs(collection(db, "projects"));
  console.log("\n--- Projects in Firestore (infra-ids-viewer) ---\n");
  snapshot.docs.forEach((d) => {
    const data = d.data();
    console.log(`  ID: ${d.id}`);
    console.log(`  name: ${data.name ?? "(no name)"}`);
    console.log(`  ifcFilePath: ${data.ifcFilePath ?? "(none)"}`);
    console.log(`  ---`);
  });
}

async function applyRenames() {
  const entries = Object.entries(RENAMES);
  if (entries.length === 0) {
    await listProjects();
    return;
  }
  for (const [id, newName] of entries) {
    const ref = doc(db, "projects", id);
    await updateDoc(ref, { name: newName });
    console.log(`Updated ${id} → name: "${newName}"`);
  }
}

async function main() {
  try {
    if (Object.keys(RENAMES).length === 0) {
      await listProjects();
    } else {
      await applyRenames();
    }
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

main();

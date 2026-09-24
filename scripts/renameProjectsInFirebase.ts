/**
 * Script para renombrar proyectos en Firestore (ids-validator-cdmx).
 *
 * Uso:
 * 1. Ejecutar primero sin RENAMES para ver IDs y nombres actuales:
 *    npx ts-node scripts/renameProjectsInFirebase.ts
 * 2. Editar RENAMES abajo con los IDs y nombres deseados (los que tenían en bim-dev-app).
 * 3. Ejecutar de nuevo para aplicar los cambios:
 *    npx ts-node scripts/renameProjectsInFirebase.ts
 */

const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, updateDoc } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyCme7-CMyYjwQ9lTbNhFkiauUtVlyhT3qg",
  authDomain: "ids-validator-cdmx.firebaseapp.com",
  projectId: "ids-validator-cdmx",
  storageBucket: "ids-validator-cdmx.firebasestorage.app",
  messagingSenderId: "287922141193",
  appId: "1:287922141193:web:f02e803c72797f3fd820d8",
};

// Mapeo: id del documento en Firestore → nombre que debe tener (como en bim-dev-app)
// Rellena los IDs después de ejecutar el script una vez para ver los IDs actuales.
// Nombres que tenían antes en bim-dev-app:
//   - Proyecto oficina (ARK_NordicLCA_Office_Concrete): "Office"
//   - Proyecto vivienda (ARK_NordicLCA_Housing_Timber): "Housing"
const RENAMES: Record<string, string> = {
  // "ID_DOC_1": "Office",
  // "ID_DOC_2": "Housing",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listProjects() {
  const snapshot = await getDocs(collection(db, "projects"));
  console.log("\n--- Proyectos en Firestore (ids-validator-cdmx) ---\n");
  snapshot.docs.forEach((d) => {
    const data = d.data();
    console.log(`  ID: ${d.id}`);
    console.log(`  name: ${data.name ?? "(sin nombre)"}`);
    console.log(`  ---`);
  });
  console.log("\nCopia los IDs arriba y rellena RENAMES en el script, luego ejecuta de nuevo.\n");
}

async function applyRenames() {
  const entries = Object.entries(RENAMES);
  if (entries.length === 0) {
    console.log("RENAMES está vacío. Ejecutando solo listado de proyectos.\n");
    await listProjects();
    return;
  }
  for (const [id, newName] of entries) {
    const ref = doc(db, "projects", id);
    await updateDoc(ref, { name: newName });
    console.log(`Actualizado ${id} → name: "${newName}"`);
  }
  console.log("\nHecho.\n");
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

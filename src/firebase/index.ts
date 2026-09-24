// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  deleteDoc, 
  updateDoc, 
  addDoc,
  CollectionReference 
} from "firebase/firestore";
import { IProject } from "../class/Project";

// Firebase configuration (infra-ids-viewer)
const firebaseConfig = {
  apiKey: "AIzaSyAqY2BCKmyB6SdaKbdaqhWGlXhE1Qyki2U",
  authDomain: "infra-ids-viewer.firebaseapp.com",
  projectId: "infra-ids-viewer",
  storageBucket: "infra-ids-viewer.firebasestorage.app",
  messagingSenderId: "274036403604",
  appId: "1:274036403604:web:46b088a3470a61ea4e3381"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const firestoreDB = getFirestore(app);

// Function to get a collection reference
export function getCollection<T>(path: string) {
  return collection(firestoreDB, path) as CollectionReference<T>;
}

// Function to delete a document by its ID
export async function deleteDocument(collectionPath: string, id: string) {
  try {
    const docRef = doc(firestoreDB, `${collectionPath}/${id}`);
    await deleteDoc(docRef);
    console.log(`Document with ID ${id} deleted successfully`);
  } catch (error) {
    console.error("Error deleting document: ", error);
  }
}

// Function to update a document with new data
export async function updateDocument<T extends Record<string, any>>(collectionPath: string, id: string, data: T) {
  try {
    const docRef = doc(firestoreDB, `${collectionPath}/${id}`);
    await updateDoc(docRef, data);
    console.log(`Document with ID ${id} updated successfully`);
  } catch (error) {
    console.error("Error updating document: ", error);
  }
}

// Function to add a new document to a collection
export async function addDocument<T extends Record<string, any>>(collectionPath: string, data: T) {
  try {
    const docRef = await addDoc(getCollection(collectionPath), data);
    console.log("Document added with ID: ", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error adding document: ", error);
    throw new Error("Failed to add document");
  }
}

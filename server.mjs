import express from "express";
import admin from "firebase-admin";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Lấy đường dẫn chính xác đến file JSON
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../admin/fitnessworkoutapp-601c0-firebase-adminsdk-at40n-106574e8a2.json"))
);

// Initialize Firebase Admin SDK với đúng storage bucket
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "fitnessworkoutapp-601c0.appspot.com",
});

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint xóa user
app.delete("/deleteUser/:uid", async (req, res) => {
  const { uid } = req.params;
  console.log(`Received request to delete user with UID: ${uid}`);

  try {
    console.log("UID", uid);

    // Lấy thông tin user từ Firestore
    const userDocRef = admin.firestore().collection("users").doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return res.status(404).send({ error: "User not found." });
    }

    const userImagePath = `profile_images/${uid}.jpg`;

    // Xóa ảnh trên Firebase Storage
    const bucket = admin.storage().bucket();
    await bucket.file(userImagePath).delete();
    console.log(`Deleted image at path: ${userImagePath}`);

    // Xóa user khỏi Firebase Auth
    await admin.auth().deleteUser(uid);

    // Xóa document khỏi Firestore
    await userDocRef.delete();

    res.status(200).send({ message: "User deleted successfully." });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).send({ error: "Unable to delete user." });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

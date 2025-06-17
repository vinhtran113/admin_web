import { collection, getDocs } from "firebase/firestore";
import { db } from "@/services/firebase";

const getIngredients = async () => {
  try {
    const ingredientsCol = collection(db, "Ingredients");
    const snapshot = await getDocs(ingredientsCol);

    const ingredientsList = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        if (data.name && data.image) {
          return {
            id: doc.id,
            name: data.name,
            image: data.image,
            nutri: data.nutri
              ? data.nutri
              : {
                  calories: data.caloriesPerUnit ?? 0,
                  carb: 0,
                  fat: 0,
                  protein: 0,
                },
            unit: data.unit,
          };
        }
        return null;
      })
      .filter((ingredient) => ingredient !== null);

    return ingredientsList;
  } catch (error) {
    console.error("Error fetching ingredients: ", error);
    throw new Error("Failed to fetch ingredients");
  }
};

export default getIngredients;
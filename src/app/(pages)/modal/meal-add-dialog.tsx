import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  IconButton,
  Box,
  Typography,
  Snackbar,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Checkbox,
  FormControlLabel,
  Grid,
  Autocomplete,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import { collection, setDoc, doc, getDocs } from "firebase/firestore";
import { db } from "@/services/firebase";
import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
} from "firebase/storage";

type Category =
  | "main dish"
  | "side dish"
  | "fast food"
  | "beverage"
  | "dessert"
  | "bakery & snacks";
type Level = "Improve Shape" | "Lean & Tone" | "Lose a Fat";
type Size = "Easy" | "Medium" | "Hard";

interface Ingredient {
  name: string;
  amount: number;
  nutri: Nutri;
}

interface MealIngredient {
  name: string;
  amount: number;
}

interface Nutri {
  calories: number;
  carb: number;
  fat: number;
  protein: number;
}

export interface Meal {
  id: string;
  name: string;
  category: Category[];
  description: string;
  image: string;
  ingredients: MealIngredient[];
  level: Level[];
  nutri: Nutri;
  recipe: { [step: string]: { detail: string } };
  recommend: ("breakfast" | "lunch" | "dinner" | "snacks")[];
  size: Size;
  time: number;
  health_risks?: string[];
}

interface AlertState {
  message: string;
  severity: "success" | "error" | "warning" | "info";
  visible: boolean;
}

interface AddNewPopupProps {
  open: boolean;
  onClose: () => void;
  onMealAdded: () => void;
  refresh?: boolean;
  type: "add" | "edit";
  initialData: Meal | null;
}

const AddNewPopup: React.FC<AddNewPopupProps> = ({
  open,
  onClose,
  type,
  onMealAdded,
  initialData,
}) => {
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [name, setName] = useState(initialData?.name || "");
  const [category, setCategory] = useState<Category[]>([]);
  const [description, setDescription] = useState("");
  const [nutri, setNutri] = useState<Nutri>({
    calories: 0,
    carb: 0,
    fat: 0,
    protein: 0,
  });
  const [recipe, setRecipe] = useState<{ [step: string]: { detail: string } }>(
    {}
  );
  const [recommend, setRecommend] = useState<
    ("breakfast" | "lunch" | "dinner" | "snacks")[]
  >([]);
  const [size, setSize] = useState<Size>("Easy");
  const [time, setTime] = useState<number>(0);

  const [level, setLevel] = useState<Level[]>([]);
  const [ingredients, setIngredients] = useState<
    { id: string; name: string; nutri: Nutri }[]
  >([]);
  const [selectedIngredients, setSelectedIngredients] = useState<Ingredient[]>(
    []
  );
  const CATEGORY_LABELS: Record<Category, string> = {
    "main dish": "Món chính",
    "side dish": "Món phụ",
    "fast food": "Đồ ăn nhanh",
    beverage: "Đồ uống",
    dessert: "Tráng miệng",
    "bakery & snacks": "Bánh & Ăn vặt",
  };
  const LEVEL_LABELS: Record<Level, string> = {
    "Improve Shape": "Cải thiện vóc dáng",
    "Lean & Tone": "Săn chắc cơ thể",
    "Lose a Fat": "Giảm mỡ",
  };
  type HealthRisk =
    | "Hypertension"
    | "Diabetes"
    | "Cardiovascular disease"
    | "Osteoarthritis"
    | "Asthma"
    | "Obesity"
    | "Chronic kidney disease"
    | "Chronic respiratory disease";

  const HEALTH_RISK_LABELS: Record<HealthRisk, string> = {
    Hypertension: "Tăng huyết áp",
    Diabetes: "Tiểu đường",
    "Cardiovascular disease": "Bệnh tim mạch",
    Osteoarthritis: "Thoái hóa khớp",
    Asthma: "Hen suyễn",
    Obesity: "Béo phì",
    "Chronic kidney disease": "Bệnh thận mãn tính",
    "Chronic respiratory disease": "Bệnh hô hấp mãn tính",
  };
  const [selectedHealthRisks, setSelectedHealthRisks] = useState<HealthRisk[]>(
    []
  );
  const [ingredientCount, setIngredientCount] = useState(0);
  const [stepCount, setStepCount] = useState(0);
  const [steps, setSteps] = useState<string[]>([]);
  const [alert, setAlert] = useState<AlertState>({
    message: "",
    severity: "error",
    visible: false,
  });

  const showAlert = (
    message: string,
    severity: "success" | "error" | "warning" | "info"
  ) => {
    setAlert({ message, severity, visible: true });
  };

  useEffect(() => {
    // Lấy danh sách nguyên liệu từ collection Ingredients
    const fetchIngredients = async () => {
      try {
        const snapshot = await getDocs(collection(db, "Ingredients"));
        setIngredients(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            name: doc.data().name,
            nutri: doc.data().nutri || {
              calories: 0,
              carb: 0,
              fat: 0,
              protein: 0,
            },
          }))
        );
      } catch (error) {
        console.error("Error fetching ingredients:", error);
      }
    };
    fetchIngredients();
  }, []);

  useEffect(() => {
    if (open && type === "edit" && initialData) {
      setName(initialData.name);
      setAvatar(initialData.image);
      setCategory(initialData.category);
      setDescription(initialData.description);
      setNutri(initialData.nutri);
      setRecommend(initialData.recommend);
      setSize(initialData.size);
      setTime(Number(initialData.time));
      setLevel(initialData.level || []);
      // Map lại để bổ sung nutri
      setSelectedIngredients(
        (initialData.ingredients || []).map((item) => {
          const found = ingredients.find((ing) => ing.name === item.name);
          return {
            name: item.name,
            amount: item.amount,
            nutri: found
              ? found.nutri
              : { calories: 0, carb: 0, fat: 0, protein: 0 },
          };
        })
      );
      setIngredientCount(initialData.ingredients?.length || 0);

      // Recipe
      const recipeObj = initialData.recipe || {};
      setRecipe(recipeObj);
      const stepArr = Object.keys(recipeObj)
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => recipeObj[key].detail);
      setSteps(stepArr);
      setStepCount(stepArr.length);

      setSelectedHealthRisks(
        (initialData.health_risks || []).filter((risk): risk is HealthRisk =>
          Object.keys(HEALTH_RISK_LABELS).includes(risk as HealthRisk)
        )
      );
    } else if (open && type === "add") {
      // Reset tất cả state khi mở dialog ở chế độ thêm mới
      resetFields();
    }
    // eslint-disable-next-line
  }, [open, type, initialData, ingredients]);

  useEffect(() => {
    // Cập nhật recipe object mỗi khi steps thay đổi
    const recipeObj: { [step: string]: { detail: string } } = {};
    steps.forEach((step, idx) => {
      recipeObj[(idx + 1).toString()] = { detail: step };
    });
    setRecipe(recipeObj);
  }, [steps]);

  const resetFields = () => {
    setName("");
    setAvatar(null);
    setCategory([]);
    setDescription("");
    setNutri({ calories: 0, carb: 0, fat: 0, protein: 0 });
    setRecipe({});
    setRecommend([]);
    setSize("Easy");
    setTime(0);
    setLevel([]);
    setSelectedIngredients([]);
    setIngredientCount(0);
    setStepCount(0); // Thêm dòng này để luôn reset stepCount về 0
    setSteps([]); // Nên reset luôn steps về mảng rỗng
    setSelectedHealthRisks([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        setAlert({
          visible: true,
          message: "Invalid file type. Please upload an image.",
          severity: "error",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (result.startsWith("data:image")) {
          setAvatar(result);
        } else {
          setAlert({
            visible: true,
            message: "Invalid image format. Please upload a valid image.",
            severity: "error",
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLevelChange = (levelValue: Level) => {
    setLevel((prev) =>
      prev.includes(levelValue)
        ? prev.filter((l) => l !== levelValue)
        : [...prev, levelValue]
    );
  };

  const handleIngredientCountChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const count = parseInt(e.target.value, 10);
    if (!isNaN(count) && count >= 0) {
      setIngredientCount(count);
      setSelectedIngredients((prev) => {
        const arr = [...prev];
        while (arr.length < count)
          arr.push({
            name: "",
            amount: 0,
            nutri: { calories: 0, carb: 0, fat: 0, protein: 0 }, // Thêm nutri mặc định
          });
        while (arr.length > count) arr.pop();
        return arr;
      });
    } else {
      setIngredientCount(0);
      setSelectedIngredients([]);
    }
  };

  const handleIngredientChange = (
    idx: number,
    field: "name" | "amount",
    value: string
  ) => {
    setSelectedIngredients((prev) => {
      const arr = [...prev];
      if (field === "name") {
        const found = ingredients.find((ing) => ing.name === value);
        arr[idx] = {
          ...arr[idx],
          name: value,
          nutri: found
            ? found.nutri
            : { calories: 0, carb: 0, fat: 0, protein: 0 },
        };
      } else {
        arr[idx] = { ...arr[idx], [field]: Number(value) };
      }
      return arr;
    });
  };

  const totalNutri = selectedIngredients.reduce(
    (acc, ing) => {
      const qty = Number(ing.amount) || 0;
      acc.calories += (ing.nutri?.calories || 0) * qty;
      acc.carb += (ing.nutri?.carb || 0) * qty;
      acc.fat += (ing.nutri?.fat || 0) * qty;
      acc.protein += (ing.nutri?.protein || 0) * qty;
      return acc;
    },
    { calories: 0, carb: 0, fat: 0, protein: 0 }
  );

  const handleStepCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = parseInt(e.target.value, 10);
    if (!isNaN(count) && count >= 0) {
      setStepCount(count);
      setSteps((prev) => {
        const arr = [...prev];
        while (arr.length < count) arr.push("");
        while (arr.length > count) arr.pop();
        return arr;
      });
    } else {
      setStepCount(0);
      setSteps([]);
    }
  };

  const handleStepChange = (idx: number, value: string) => {
    setSteps((prev) => {
      const arr = [...prev];
      arr[idx] = value;
      return arr;
    });
  };

  const handleClose = () => {
    resetFields();
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setAlert({
        visible: true,
        message: "Vui lòng nhập tên món ăn!",
        severity: "error",
      });
      return;
    }
    if (category.length === 0) {
      setAlert({
        visible: true,
        message: "Vui lòng chọn ít nhất 1 loại món ăn!",
        severity: "error",
      });
      return;
    }
    if (level.length === 0) {
      setAlert({
        visible: true,
        message: "Vui lòng chọn ít nhất 1 cấp độ bài tập!",
        severity: "error",
      });
      return;
    }
    if (recommend.length === 0) {
      setAlert({
        visible: true,
        message:
          "Vui lòng chọn ít nhất 1 thời điểm ăn (Ăn sáng, trưa, tối, vặt)!",
        severity: "error",
      });
      return;
    }
    if (ingredientCount <= 0) {
      setAlert({
        visible: true,
        message: "Vui lòng nhập số nguyên liệu lớn hơn 0!",
        severity: "error",
      });
      return;
    }
    if (
      selectedIngredients.some(
        (ing) => !ing.name.trim() || !ing.amount || ing.amount <= 0
      )
    ) {
      setAlert({
        visible: true,
        message:
          "Vui lòng chọn tên và số lượng cho tất cả nguyên liệu (số lượng > 0)!",
        severity: "error",
      });
      return;
    }
    if (stepCount <= 0) {
      setAlert({
        visible: true,
        message: "Vui lòng nhập số bước công thức lớn hơn 0!",
        severity: "error",
      });
      return;
    }
    if (steps.some((step) => !step.trim())) {
      setAlert({
        visible: true,
        message: "Vui lòng nhập đầy đủ các bước công thức!",
        severity: "error",
      });
      return;
    }
    if (!description.trim()) {
      setAlert({
        visible: true,
        message: "Vui lòng nhập mô tả món ăn!",
        severity: "error",
      });
      return;
    }
    if (!time || time <= 0) {
      setAlert({
        visible: true,
        message: "Vui lòng nhập thời gian chế biến hợp lệ!",
        severity: "error",
      });
      return;
    }

    setLoading(true);
    let imageUrl = initialData?.image || "";
    // Tạo object recipe đúng định dạng
    const recipeObj: { [step: string]: { detail: string } } = {};
    steps.forEach((step, idx) => {
      recipeObj[(idx + 1).toString()] = { detail: step };
    });
    if (avatar && avatar.startsWith("data:image")) {
      try {
        const storage = getStorage();
        const storageRef = ref(storage, `meal_image/${name}.png`);
        await uploadString(storageRef, avatar, "data_url");
        imageUrl = await getDownloadURL(storageRef);
      } catch (error) {
        setLoading(false);
        setAlert({
          visible: true,
          message: "Tải hình lên thất bại",
          severity: "error",
        });
        return;
      }
    }
    try {
      const mealDocRef = doc(collection(db, "Meals"), name);

      const mealData: Meal = {
        id: initialData?.id || mealDocRef.id || name,
        name,
        category,
        description,
        image: imageUrl,
        ingredients: selectedIngredients.map(({ name, amount }) => ({
          name,
          amount,
        })),
        level,
        nutri: totalNutri,
        recipe: recipeObj,
        recommend,
        size,
        time,
        health_risks: selectedHealthRisks,
      };

      await setDoc(mealDocRef, mealData);
      setAlert({
        visible: true,
        message: "Lưu món ăn thành công",
        severity: "success",
      });
      onMealAdded();
      setTimeout(() => {
        resetFields();
        onClose();
      }, 2000);
    } catch (error) {
      setAlert({
        visible: true,
        message: "Lưu món ăn thất bại",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        style: {
          width: "1100px",
          position: "absolute",
          zIndex: 1300,
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
        {type === "add" ? "Thêm mới món ăn" : "Chỉnh sửa món ăn"}
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{ position: "absolute", right: 16, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ overflowY: "auto", overflowX: "hidden" }}>
        {loading && (
          <Box display="flex" justifyContent="center" padding={2}>
            <CircularProgress />
          </Box>
        )}

        <Box display="flex" flexDirection="row" gap="20px" padding="16px">
          <Box display="flex" flexDirection="column" width="35%" gap="20px">
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              height="280px"
              border="1px solid #E5E5E5"
              borderRadius="10px"
              padding="16px"
            >
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                border="1px dashed #F4F6F8"
                borderRadius="100%"
                width={200}
                height={200}
                position="relative"
              >
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  border="2px dashed #F4F6F8"
                  width={170}
                  height={170}
                  borderRadius="100%"
                >
                  {avatar ? (
                    <>
                      <img
                        src={avatar}
                        alt="avatar"
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "50%",
                        }}
                      />
                      <label
                        htmlFor="edit-avatar"
                        style={{
                          position: "absolute",
                          top: "120px",
                          right: "10px",
                          border: "1px solid white",
                          borderRadius: "100%",
                          background: "#F4F6F8",
                        }}
                      >
                        <IconButton component="span">
                          <PhotoCameraIcon sx={{ color: "#A7B1BC" }} />
                        </IconButton>
                      </label>
                      <input
                        accept="image/*"
                        style={{ display: "none" }}
                        id="edit-avatar"
                        type="file"
                        onChange={handleFileChange}
                      />
                    </>
                  ) : (
                    <>
                      <input
                        accept="image/*"
                        style={{ display: "none" }}
                        id="upload-avatar"
                        type="file"
                        onChange={handleFileChange}
                      />
                      <label htmlFor="upload-avatar">
                        <IconButton component="span">
                          <AddAPhotoIcon sx={{ fontSize: 25 }} />
                        </IconButton>
                      </label>
                      <Typography
                        align="center"
                        sx={{ fontSize: "14px", color: "#72808d" }}
                      >
                        Tải hình món ăn
                      </Typography>
                    </>
                  )}
                </Box>
              </Box>
              <Typography
                align="center"
                sx={{ marginTop: "20px", fontSize: "14px", color: "#72808d" }}
              >
                *.jpeg, *.jpg, *.png. <br />
                Tối đa 100 KB
              </Typography>

              <Box sx={{ px: 1, pt: 6 }}>
                <Typography fontWeight={600} mb={1}>
                  Loại món ăn
                </Typography>
                <Grid container spacing={1}>
                  {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
                    <Grid item xs={6} key={cat}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={category.includes(cat)}
                            onChange={(e) => {
                              setCategory((prev) =>
                                e.target.checked
                                  ? [...prev, cat]
                                  : prev.filter((c) => c !== cat)
                              );
                            }}
                          />
                        }
                        label={
                          <span
                            style={{
                              wordBreak: "break-word",
                              whiteSpace: "normal",
                            }}
                          >
                            {CATEGORY_LABELS[cat]}
                          </span>
                        }
                        sx={{ ml: 0, minWidth: 170 }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>

              <Box sx={{ px: 1, pt: 6 }}>
                <Typography fontWeight={600} mb={1} color="#f57c00">
                  Không phù hợp với người
                </Typography>
                <Grid container spacing={1}>
                  {(Object.keys(HEALTH_RISK_LABELS) as HealthRisk[]).map(
                    (risk) => (
                      <Grid item xs={6} key={risk}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={selectedHealthRisks.includes(risk)}
                              onChange={() =>
                                setSelectedHealthRisks((prev) =>
                                  prev.includes(risk)
                                    ? prev.filter((r) => r !== risk)
                                    : [...prev, risk]
                                )
                              }
                              sx={{
                                color: "#f57c00",
                                "&.Mui-checked": { color: "#f57c00" },
                              }}
                            />
                          }
                          label={HEALTH_RISK_LABELS[risk]}
                          sx={{ ml: 0, minWidth: 170 }}
                        />
                      </Grid>
                    )
                  )}
                </Grid>
              </Box>
            </Box>
          </Box>

          <Box
            display="flex"
            flexDirection="column"
            width="65%"
            border="1px solid #eaeaea"
            borderRadius="10px"
            padding="4px"
          >
            <Box
              display="flex"
              flexDirection="row"
              justifyContent="space-between"
              gap="20px"
              padding="8px"
            >
              <TextField
                margin="dense"
                label="Tên món ăn"
                fullWidth
                required
                variant="outlined"
                size="small"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <TextField
                margin="dense"
                label="Số Nguyên liệu"
                type="number"
                value={ingredientCount}
                onChange={handleIngredientCountChange}
                variant="outlined"
                size="small"
              />
            </Box>

            <Box>
              {selectedIngredients.map((ingredient, idx) => {
                // Lấy danh sách nguyên liệu chưa chọn ở vị trí khác
                const availableIngredients = ingredients.filter(
                  (ing) =>
                    ing.name === ingredient.name ||
                    !selectedIngredients.some(
                      (sel, selIdx) => selIdx !== idx && sel.name === ing.name
                    )
                );
                return (
                  <Box
                    key={idx}
                    display="flex"
                    flexDirection="row"
                    alignItems="center"
                    gap={2}
                    mb={1}
                    padding="8px"
                  >
                    <FormControl
                      variant="outlined"
                      size="small"
                      sx={{ width: 440 }}
                    >
                      <Autocomplete
                        options={availableIngredients}
                        getOptionLabel={(option) => option.name}
                        value={
                          availableIngredients.find(
                            (ing) => ing.name === ingredient.name
                          ) || null
                        }
                        onChange={(_, newValue) => {
                          handleIngredientChange(
                            idx,
                            "name",
                            newValue ? newValue.name : ""
                          );
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={`Nguyên liệu thứ ${idx + 1}`}
                            size="small"
                          />
                        )}
                        isOptionEqualToValue={(option, value) =>
                          option.name === value.name
                        }
                      />
                    </FormControl>
                    <TextField
                      type="number"
                      inputProps={{ min: 0 }}
                      label="Số lượng"
                      variant="outlined"
                      size="small"
                      value={ingredient.amount}
                      onChange={(e) =>
                        handleIngredientChange(idx, "amount", e.target.value)
                      }
                      sx={{ width: 158 }}
                    />
                  </Box>
                );
              })}
            </Box>

            <TextField
              margin="dense"
              label="Số bước công thức"
              type="number"
              value={stepCount}
              onChange={handleStepCountChange}
              variant="outlined"
              size="small"
              sx={{ padding: "8px" }}
            />
            <Box padding={"0px 8px"}>
              {steps.map((step, idx) => (
                <TextField
                  key={idx}
                  label={` Bước ${idx + 1} `}
                  fullWidth
                  margin="dense"
                  size="small"
                  value={step}
                  onChange={(e) => handleStepChange(idx, e.target.value)}
                />
              ))}
            </Box>
            <Box display="flex" gap={2} padding="8px">
              <TextField
                label="Mô tả"
                fullWidth
                margin="dense"
                size="small"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                sx={{ flex: 2 }}
                multiline
                rows={6}
              />
              <Box padding="8px" sx={{ flex: 1 }}>
                <Typography variant="subtitle1">Cấp độ bài tập: </Typography>
                <FormControl component="fieldset">
                  {(
                    ["Improve Shape", "Lean & Tone", "Lose a Fat"] as Level[]
                  ).map((levelOption) => (
                    <FormControlLabel
                      key={levelOption}
                      control={
                        <Checkbox
                          checked={level.includes(levelOption as Level)}
                          onChange={() =>
                            handleLevelChange(levelOption as Level)
                          }
                        />
                      }
                      label={LEVEL_LABELS[levelOption]}
                    />
                  ))}
                </FormControl>
              </Box>
            </Box>
            <Box display="flex" gap={2} padding="0px 8px">
              <FormControl fullWidth margin="dense" size="small">
                <InputLabel id="size-label">Độ khó</InputLabel>
                <Select
                  labelId="size-label"
                  value={size}
                  label="Độ khó"
                  onChange={(e) => setSize(e.target.value as Size)}
                >
                  <MenuItem value="Easy">Dễ</MenuItem>
                  <MenuItem value="Medium">Vừa</MenuItem>
                  <MenuItem value="Hard">Khó</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Thời gian (phút)"
                fullWidth
                margin="dense"
                size="small"
                type="number"
                inputProps={{ min: 0 }}
                value={time}
                onChange={(e) => setTime(Number(e.target.value))}
              />
            </Box>
            <Box display="flex" gap={2} mt={1} sx={{ padding: "0px 8px" }}>
              <TextField
                label="Calo"
                type="number"
                size="small"
                value={Number(totalNutri.calories).toFixed(0)}
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="Tinh bột"
                type="number"
                size="small"
                value={Number(totalNutri.carb).toFixed(2)}
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="Chất béo"
                type="number"
                size="small"
                value={Number(totalNutri.fat).toFixed(2)}
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="Chất đạm"
                type="number"
                size="small"
                value={Number(totalNutri.protein).toFixed(2)}
                InputProps={{ readOnly: true }}
              />
            </Box>

            <Box sx={{ padding: "0px 8px" }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={recommend.includes("breakfast")}
                    onChange={(e) => {
                      setRecommend((prev) =>
                        e.target.checked
                          ? [...prev, "breakfast"]
                          : prev.filter((item) => item !== "breakfast")
                      );
                    }}
                  />
                }
                label="Ăn sáng"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={recommend.includes("lunch")}
                    onChange={(e) => {
                      setRecommend((prev) =>
                        e.target.checked
                          ? [...prev, "lunch"]
                          : prev.filter((item) => item !== "lunch")
                      );
                    }}
                  />
                }
                label="Ăn trưa"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={recommend.includes("dinner")}
                    onChange={(e) => {
                      setRecommend((prev) =>
                        e.target.checked
                          ? [...prev, "dinner"]
                          : prev.filter((item) => item !== "dinner")
                      );
                    }}
                  />
                }
                label="Ăn tối"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={recommend.includes("snacks")}
                    onChange={(e) => {
                      setRecommend((prev) =>
                        e.target.checked
                          ? [...prev, "snacks"]
                          : prev.filter((item) => item !== "snacks")
                      );
                    }}
                  />
                }
                label="Ăn vặt"
              />
            </Box>
          </Box>
        </Box>

        <Box display="flex" justifyContent="flex-end" padding="10px">
          <Button
            onClick={handleSave}
            color="primary"
            variant="contained"
            disabled={loading}
            sx={{ width: "100px" }}
          >
            Lưu
          </Button>
        </Box>
        {/* Snackbar for Alerts */}
        <Snackbar
          open={alert.visible}
          autoHideDuration={2000}
          onClose={() => setAlert((prev) => ({ ...prev, visible: false }))}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert
            onClose={() => setAlert((prev) => ({ ...prev, visible: false }))}
            severity={alert.severity}
          >
            {alert.message}
          </Alert>
        </Snackbar>
      </DialogContent>
    </Dialog>
  );
};

export default AddNewPopup;

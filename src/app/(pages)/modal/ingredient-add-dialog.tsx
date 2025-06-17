"use client";

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
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from "@mui/material";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import CloseIcon from "@mui/icons-material/Close";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
} from "firebase/storage";
import { doc, setDoc, updateDoc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/services/firebase";

interface AddPopupProps {
  open: boolean;
  onClose: () => void;
  type: "add" | "edit";
  onIngredientAdded: () => void;
  id?: string;
  name?: string;
  image?: string;
  refresh?: boolean;
  nutri?: { calories: number; carb: number; fat: number; protein: number };
  unit?: string;
}

interface AlertState {
  message: string;
  severity: "success" | "error";
  visible: boolean;
}

const IngredientAddDialog: React.FC<AddPopupProps> = ({
  open,
  onClose,
  type,
  onIngredientAdded,
  id,
  name: initialName,
  image: initialImage,
  nutri: initialNutri, // Thêm dòng này
  unit: initialUnit,
}) => {
  const [name, setName] = useState(initialName || "");
  const [error, setError] = useState<string>("");
  const [caloriesError, setCaloriesError] = useState<string>("");
  const [nutri, setNutri] = useState({
    calories: 0,
    carb: 0,
    fat: 0,
    protein: 0,
  });
  const [unit, setUnit] = useState<"g" | "ml" | "item">("g");
  const [avatar, setAvatar] = useState<string | null>(initialImage || null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<AlertState>({
    message: "",
    severity: "error",
    visible: false,
  });

  const showAlert = (message: string, severity: "success" | "error") => {
    setAlert({ message, severity, visible: true });
  };

  useEffect(() => {
    if (open) {
      if (type === "edit" && id) {
        const fetchData = async () => {
          const docRef = doc(db, "Ingredients", id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setName(data.name);
            setAvatar(data.image);
            setNutri(
              data.nutri || { calories: 0, carb: 0, fat: 0, protein: 0 }
            );
            setUnit(data.unit);
          } else {
            showAlert("Không tìm thấy dữ liệu", "error");
          }
        };
        fetchData();
      } else {
        setName("");
        setAvatar(null);
        setNutri({ calories: 0, carb: 0, fat: 0, protein: 0 });
        setUnit("g");
      }
    }
  }, [open, type, id]);

  const handleClose = () => {
    setName("");
    setAvatar(null);
    setNutri({ calories: 0, carb: 0, fat: 0, protein: 0 });
    setUnit("g");
    setError("");
    setCaloriesError("");
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateInputs = () => {
    setCaloriesError("");
    if (!name) {
      showAlert("Vui lòng nhập đầy đủ thông tin!", "error");
      return false;
    }
    if (nutri.calories < 0) {
      setCaloriesError("Calories > 0");
      return false;
    }
    if (!avatar) {
      showAlert("Vui lòng tải ảnh nguyên liệu!", "error");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    const storage = getStorage();
    let imgURL: string | null = null;

    try {
      if (type === "add") {
        // Kiểm tra tồn tại trước khi upload ảnh
        const docRef = doc(db, "Ingredients", name);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          showAlert("Thêm nguyên liệu không thành công", "error");
          setError("Nguyên liệu đã tồn tại!");
          setLoading(false);
          return;
        }

        // Chỉ upload ảnh nếu chưa tồn tại
        if (avatar && avatar.startsWith("data:")) {
          const storageRef = ref(storage, `meal_image/${name}.jpg`);
          await uploadString(storageRef, avatar, "data_url");
          imgURL = await getDownloadURL(storageRef);
        } else {
          imgURL = avatar;
        }

        const ingredientData = {
          name,
          nutri,
          unit,
          image: imgURL,
        };

        await setDoc(docRef, ingredientData);
        showAlert("Thêm nguyên liệu thành công!", "success");
        onIngredientAdded();
      } else {
        const docRef = doc(db, "Ingredients", id || name);
        const ingredientData = {
          name,
          nutri,
          unit,
          image: avatar,
        };
        const oldName = initialName;
        if (name !== oldName) {
          const newDocRef = doc(db, "Ingredients", name);
          await setDoc(newDocRef, ingredientData);
          await deleteDoc(doc(db, "Ingredients", id!));
        } else {
          await updateDoc(docRef, ingredientData);
        }
        showAlert("Cập nhật nguyên liệu thành công!", "success");
      }
    } catch (err) {
      console.error("Lỗi khi lưu dữ liệu:", err);
      showAlert("Có lỗi xảy ra khi lưu dữ liệu!", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>
        {type === "add" ? "Thêm nguyên liệu" : "Chỉnh sửa nguyên liệu"}
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{ position: "absolute", right: 16, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {loading && (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress />
          </Box>
        )}

        <Box display="flex" flexDirection="column" gap={2} p={2}>
          {/* Ảnh */}
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            border="1px solid #E5E5E5"
            borderRadius="10px"
            p={2}
          >
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              border="2px dashed #F4F6F8"
              borderRadius="100%"
              width={200}
              height={200}
              position="relative"
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
                      objectFit: "cover",
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
                    Tải hình nguyên liệu
                  </Typography>
                </>
              )}
            </Box>
            <Typography
              align="center"
              sx={{ mt: 2, fontSize: "14px", color: "#72808d" }}
            >
              *.jpeg, *.jpg, *.png. Tối đa 100 KB
            </Typography>
          </Box>

          {/* Tên */}
          <TextField
            label="Tên nguyên liệu"
            fullWidth
            required
            variant="outlined"
            size="small"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            error={!!error}
            helperText={error}
          />

          <Box display="flex" gap={2} mt={1}>
            <TextField
              label="Calories"
              type="number"
              size="small"
              value={nutri.calories}
              inputProps={{ min: 0 }}
              error={!!caloriesError}
              helperText={caloriesError}
              onChange={(e) => {
                const val = e.target.value.replace(/^0+/, "");
                setNutri((n) => ({
                  ...n,
                  calories: val === "" ? 0 : Number(val),
                }));
                setCaloriesError("");
              }}
            />
            <TextField
              label="Carb"
              type="number"
              size="small"
              value={nutri.carb}
              inputProps={{ min: 0 }}
              onChange={(e) => {
                const val = e.target.value.replace(/^0+/, "");
                setNutri((n) => ({
                  ...n,
                  carb: val === "" ? 0 : Number(val),
                }));
              }}
            />
            <TextField
              label="Fat"
              type="number"
              size="small"
              value={nutri.fat}
              inputProps={{ min: 0 }}
              onChange={(e) => {
                const val = e.target.value.replace(/^0+/, "");
                setNutri((n) => ({
                  ...n,
                  fat: val === "" ? 0 : Number(val),
                }));
              }}
            />
            <TextField
              label="Protein"
              type="number"
              size="small"
              value={nutri.protein}
              inputProps={{ min: 0 }}
              onChange={(e) => {
                const val = e.target.value.replace(/^0+/, "");
                setNutri((n) => ({
                  ...n,
                  protein: val === "" ? 0 : Number(val),
                }));
              }}
            />
          </Box>

          {/* Đơn vị */}
          <FormControl fullWidth size="small">
            <InputLabel id="unit-label">Đơn vị</InputLabel>
            <Select
              labelId="unit-label"
              value={unit}
              label="Đơn vị"
              onChange={(e) => setUnit(e.target.value as "g" | "ml" | "item")}
            >
              <MenuItem value="g">Gram (g)</MenuItem>
              <MenuItem value="ml">Mililit (ml)</MenuItem>
              <MenuItem value="item">Cái/ Quả</MenuItem>
            </Select>
          </FormControl>

          {/* Nút lưu */}
          <Box display="flex" justifyContent="flex-end" pt={2}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              disabled={loading}
            >
              Lưu
            </Button>
          </Box>
        </Box>

        {/* Snackbar */}
        <Snackbar
          open={alert.visible}
          autoHideDuration={2000}
          onClose={() => {
            setAlert((prev) => ({ ...prev, visible: false }));
            if (alert.severity === "success") {
              handleClose(); // Đóng dialog khi thông báo thành công đã ẩn
              onIngredientAdded();
            }
          }}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert
            onClose={() => {
              setAlert((prev) => ({ ...prev, visible: false }));
              if (alert.severity === "success") {
                handleClose();
              }
            }}
            severity={alert.severity}
          >
            {alert.message}
          </Alert>
        </Snackbar>
      </DialogContent>
    </Dialog>
  );
};

export default IngredientAddDialog;

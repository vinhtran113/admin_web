import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  IconButton,
  TablePagination,
  Snackbar,
  Alert,
  TextField,
  Grid,
  Avatar,
  Box,
  MenuItem,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import CustomDeleteDialog from "@/app/(pages)/modal/delete-dialog";
import AddNewPopup, { Meal } from "@/app/(pages)/modal/meal-add-dialog";
import { getStorage, ref, deleteObject } from "firebase/storage";
import MealReviewDialog from "@/app/(pages)/modal/meal-review-dialog";
import MessageIcon from "@mui/icons-material/Message";
import Badge from "@mui/material/Badge";
import {
  doc,
  deleteDoc,
  getDoc,
  getFirestore,
  collection,
  getDocs,
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { db } from "@/services/firebase";

// Thêm type mở rộng ở đầu file (sau import { Meal } ...)
type MealWithUnreplied = Meal & { unrepliedCount: number };

interface MealTableProps {
  refresh: boolean;
}

const MealTable: React.FC<MealTableProps> = ({ refresh }) => {
  const [meals, setMeals] = useState<MealWithUnreplied[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState<string[]>([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [mealToEdit, setMealToEdit] = useState<Meal | null>(null);
  const [openReviewDialog, setOpenReviewDialog] = useState(false);
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);

  const CATEGORY_OPTIONS = [
    "main dish",
    "side dish",
    "fast food",
    "beverage",
    "dessert",
    "bakery & snacks",
  ] as const;

  const CATEGORY_LABELS: Record<(typeof CATEGORY_OPTIONS)[number], string> = {
    "main dish": "Món chính",
    "side dish": "Món phụ",
    "fast food": "Đồ ăn nhanh",
    beverage: "Đồ uống",
    dessert: "Tráng miệng",
    "bakery & snacks": "Bánh & Ăn vặt",
  };

  const [alert, setAlert] = useState<{
    message: string;
    severity: "success" | "error";
    visible: boolean;
  }>({
    message: "",
    severity: "error",
    visible: false,
  });
  const [filters, setFilters] = useState({
    name: "",
    category: "",
  });

  const showAlert = (message: string, severity: "success" | "error") => {
    setAlert({ message, severity, visible: true });
  };

  const fetchMeals = async () => {
    try {
      const mealsCol = collection(db, "Meals");
      const mealSnapshot = await getDocs(mealsCol);

      // Lấy unrepliedCount cho từng meal
      const mealsWithCount = await Promise.all(
        mealSnapshot.docs.map(async (docSnap) => {
          const d = docSnap.data();
          // Đếm số review chưa được admin reply
          const reviewsCol = collection(db, "Meals", docSnap.id, "Reviews");
          const reviewsSnap = await getDocs(reviewsCol);
          let unrepliedCount = 0;
          reviewsSnap.forEach((reviewDoc) => {
            const review = reviewDoc.data();
            // BỎ QUA review bị ẩn khi đếm unrepliedCount
            if (
              (!review.adminReply || !review.adminReply.comment) &&
              !review.hidden // chỉ đếm review chưa trả lời và KHÔNG bị ẩn
            ) {
              unrepliedCount++;
            }
          });

          return {
            id: docSnap.id,
            name: d.name || "",
            category: d.category || [],
            description: d.description || "",
            image: d.image || "",
            ingredients: d.ingredients || [],
            level: d.level || [],
            nutri: d.nutri || { calories: 0, carb: 0, fat: 0, protein: 0 },
            recipe: d.recipe || {},
            recommend: d.recommend || [],
            size: d.size || "",
            time: d.time || 0,
            health_risks: d.health_risks || [],
            unrepliedCount,
          } as MealWithUnreplied;
        })
      );
      setMeals(mealsWithCount);
    } catch (error) {
      console.error("Failed to fetch meals:", error);
      showAlert("Failed to fetch meals", "error");
    }
  };

  useEffect(() => {
    fetchMeals();
  }, [refresh]);

  // Filter handler
  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFilters((prevFilters) => ({
      ...prevFilters,
      [name]: value,
    }));
    setPage(0); // Reset page về đầu khi filter
  };

  const filteredMeals = meals.filter((meal) => {
    const matchName = meal.name
      .toLowerCase()
      .includes(filters.name.toLowerCase());
    const matchCategory =
      !filters.category ||
      (meal.category &&
        meal.category.includes(
          filters.category as (typeof CATEGORY_OPTIONS)[number]
        ));
    return matchName && matchCategory;
  });

  // Phân trang
  const paginatedMeals = filteredMeals.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const isSelected = (id: string) => selected.includes(id);

  const handleCheckboxClick = (
    event: React.ChangeEvent<HTMLInputElement>,
    id: string
  ) => {
    const newSelected = isSelected(id)
      ? selected.filter((selectedId) => selectedId !== id)
      : [...selected, id];
    setSelected(newSelected);
  };

  const handleOpenAdd = (id: string) => {
    const meal = meals.find((i) => i.id === id);
    if (meal) {
      setMealToEdit(meal);
      setOpenAdd(true);
    }
  };

  const handleCloseOpenAdd = () => {
    setOpenAdd(false);
    setMealToEdit(null);
    fetchMeals();
  };

  const handleMealAdded = () => {
    setOpenAdd(false);
    setMealToEdit(null);
    fetchMeals();
  };

  const handleDeleteSelected = async () => {
    const storage = getStorage();
    const db = getFirestore();

    try {
      for (const mealId of selected) {
        const mealDocRef = doc(db, "Meals", mealId);
        const docSnap = await getDoc(mealDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const imageURL = data.image;

          await deleteDoc(mealDocRef);

          if (imageURL) {
            try {
              const imageRef = ref(storage, imageURL);
              await deleteObject(imageRef);
              console.log(`Deleted image for meal ${mealId}`);
            } catch (error) {
              if (
                (error as FirebaseError).code === "storage/object-not-found"
              ) {
                console.log(`Image for meal ${mealId} not found`);
              } else {
                console.error(
                  `Error deleting image for meal ${mealId}:`,
                  error
                );
                showAlert(`Error deleting image for meal ${mealId}`, "error");
              }
            }
          }
        } else {
          console.log(`Meal with ID ${mealId} does not exist.`);
          showAlert(`Meal with ID ${mealId} does not exist.`, "error");
        }
      }

      showAlert("Xóa thành công", "success");
      setSelected([]);
      fetchMeals();
    } catch (error) {
      console.error("Error deleting meals:", error);
      showAlert(`Failed to delete meals:`, "error");
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenReviewDialog = (mealId: string) => {
    setSelectedMealId(mealId);
    setOpenReviewDialog(true);
  };

  return (
    <Paper
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
        borderRadius: "8px",
      }}
    >
      <TableContainer
        sx={{ flexGrow: 1, overflow: "auto" }}
      >
        <Table sx={{ width: "100%" }} aria-label="meals table">
          <TableHead sx={{ background: "#f4f6f8" }}>
            <TableRow>
              <TableCell padding="checkbox" sx={{ borderBottom: "none" }} />
              <TableCell sx={{ borderBottom: "none" }}></TableCell>
              <TableCell
                sx={{
                  fontWeight: "bold",
                  padding: "4px 8px",
                  width: "25%",
                  borderBottom: "none",
                }}
              >
                Tên món ăn
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: "bold",
                  padding: "4px 8px",
                  width: "20%",
                  borderBottom: "none",
                }}
              >
                Calories
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: "bold",
                  padding: "4px 8px",
                  width: "30%",
                  borderBottom: "none",
                }}
              >
                Loại món ăn
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell />
              <TableCell>
                <TextField
                  size="small"
                  sx={{ background: "white" }}
                  fullWidth
                  name="name"
                  value={filters.name}
                  onChange={handleFilterChange}
                  placeholder="Tìm tên món ăn"
                />
              </TableCell>
              <TableCell />
              <TableCell>
                <TextField
                  size="small"
                  sx={{ background: "white" }}
                  fullWidth
                  select
                  name="category"
                  value={filters.category}
                  onChange={handleFilterChange}
                  placeholder="Chọn loại món ăn"
                >
                  <MenuItem value="">Tất cả</MenuItem>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </MenuItem>
                  ))}
                </TextField>
              </TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedMeals.length > 0 ? (
              paginatedMeals.map((meal) => (
                <TableRow
                  key={meal.id}
                  sx={{
                    height: "45px",
                    "&:hover": { backgroundColor: "#f1f1f1" },
                  }}
                >
                  <TableCell padding="checkbox">
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Checkbox
                        checked={isSelected(meal.id)}
                        onChange={(event) => handleCheckboxClick(event, meal.id)}
                      />
                      <IconButton onClick={() => handleOpenAdd(meal.id)}>
                        <EditIcon />
                      </IconButton>
                      {/* <IconButton
                        color="primary"
                        onClick={() => handleOpenReviewDialog(meal.id)}
                        sx={{ ml: 1 }}
                      >
                        <Badge
                          badgeContent={meal.unrepliedCount}
                          color="error"
                          overlap="circular"
                          anchorOrigin={{
                            vertical: "top",
                            horizontal: "right",
                          }}
                        >
                          <MessageIcon />
                        </Badge>
                      </IconButton> */}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Avatar
                      sx={{ height: "40px", width: "40px", overflow: "hidden" }}
                      imgProps={{
                        style: {
                          objectFit: "contain",
                          width: "100%",
                          height: "100%",
                        },
                      }}
                      src={meal.image}
                      alt="Avatar"
                    />
                  </TableCell>
                  <TableCell>{meal.name}</TableCell>
                  <TableCell>{meal.nutri?.calories ?? ""}</TableCell>
                  <TableCell>
                    {(meal.category || [])
                      .map(
                        (cat) =>
                          CATEGORY_LABELS[
                            cat as (typeof CATEGORY_OPTIONS)[number]
                          ] || cat
                      )
                      .join(", ")}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: "center" }}>
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Grid
        container
        alignItems="center"
        justifyContent="space-between"
        sx={{ padding: 2 }}
      >
        <Grid item>
          {/* <IconButton
            sx={{
              color: "#919eab",
              marginLeft: "10px",
              gap: "10px",
              fontSize: "14px",
            }}
          >
            <FileDownloadOutlinedIcon />
            Export Data
          </IconButton> */}
        </Grid>
        <Grid item>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={filteredMeals.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Grid>
      </Grid>
      <AddNewPopup
        open={openAdd}
        onClose={handleCloseOpenAdd}
        type="edit"
        onMealAdded={handleMealAdded}
        initialData={mealToEdit}
      />
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
      <CustomDeleteDialog
        open={selected.length > 0}
        handleClose={() => setSelected([])}
        quantity={selected.length}
        onDelete={handleDeleteSelected}
      />
      <MealReviewDialog
        open={openReviewDialog}
        onClose={() => {
          setOpenReviewDialog(false);
          fetchMeals(); // Gọi reload khi đóng dialog
        }}
        mealId={selectedMealId}
      />
    </Paper>
  );
};

export default MealTable;

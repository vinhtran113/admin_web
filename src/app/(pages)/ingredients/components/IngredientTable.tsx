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
import AddNewPopup from "@/app/(pages)/modal/ingredient-add-dialog";
import getIngredients from "@/app/core/hooks/getIngredients";
import { getStorage, ref, deleteObject } from "firebase/storage";
import { doc, deleteDoc, getDoc, getFirestore } from "firebase/firestore";
import { FirebaseError } from "firebase/app";

interface Ingredient {
  id: string;
  name: string;
  image: string;
  nutri: { calories: number; carb: number; fat: number; protein: number };
  unit: string;
}

interface IngredientRaw {
  id: string;
  name: string;
  image: string;
  nutri?: { calories: number; carb: number; fat: number; protein: number };
  caloriesPerUnit?: number;
  unit: string;
}

interface IngredientsTableProps {
  refresh: boolean;
}

const IngredientTable: React.FC<IngredientsTableProps> = ({ refresh }) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState<string[]>([]);
  const [openAdd, setOpenAdd] = useState(false);
    const [openSnackbar, setOpenSnackbar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ingredientToEdit, setIngredientToEdit] = useState<Ingredient | null>(null);
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
    calories: "",
    unit: "",
  });

  const showAlert = (message: string, severity: "success" | "error") => {
    setAlert({ message, severity, visible: true });
  };

  const fetchIngredients = async () => {
    try {
      const ingredientsData: IngredientRaw[] = await getIngredients();
    const mapped = ingredientsData.map((item) => ({
      ...item,
      nutri: item.nutri
        ? item.nutri
        : {
            calories: item.caloriesPerUnit ?? 0,
            carb: 0,
            fat: 0,
            protein: 0,
          },
    }));
    setIngredients(mapped);
    } catch (error) {
      console.error("Failed to fetch ingredients:", error);
      showAlert("Failed to fetch ingredients", "error");
    }
  };

  useEffect(() => {
    fetchIngredients();
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

  // Lọc dữ liệu theo filter
  const filteredIngredients = ingredients.filter((ingredient) => {
    const matchName = ingredient.name
      .toLowerCase()
      .includes(filters.name.toLowerCase());
    const matchCalories =
      !filters.calories ||
      ingredient.nutri?.calories
        .toString()
        .includes(filters.calories.toString());
    const matchUnit =
      !filters.unit ||
      ingredient.unit.toLowerCase().includes(filters.unit.toLowerCase());
    return matchName && matchCalories && matchUnit;
  });

  // Phân trang
  const paginatedIngredients = filteredIngredients.slice(
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
    const ingredient = ingredients.find((i) => i.id === id);
    if (ingredient) {
      setIngredientToEdit(ingredient);
      setOpenAdd(true);
    }
  };

  const handleCloseOpenAdd = () => {
    setOpenAdd(false);
    setIngredientToEdit(null);
    fetchIngredients();
  };

  const handleIngredientAdded = () => {
    setOpenAdd(false);
    setIngredientToEdit(null);
    fetchIngredients();
  };

const handleDeleteSelected = async () => {
  setLoading(true);
  const storage = getStorage();
  const db = getFirestore();

  try {
    for (const ingredientId of selected) {
      const ingredientDocRef = doc(db, "Ingredients", ingredientId); 
      const docSnap = await getDoc(ingredientDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const imageURL = data.image; 

        await deleteDoc(ingredientDocRef);

        if (imageURL) {
          // Nếu bạn lưu đường dẫn file trong storage, hãy sửa lại ref cho đúng
          try {
            const imageRef = ref(storage, imageURL);
            await deleteObject(imageRef);
            console.log(`Deleted image for ingredient ${ingredientId}`);
          } catch (error) {
            if (
              (error as FirebaseError).code === "storage/object-not-found"
            ) {
              console.log(`Image for ingredient ${ingredientId} not found`);
            } else {
              console.error(
                `Error deleting image for ingredient ${ingredientId}:`,
                error
              );
              showAlert(`Error deleting image for ingredient ${ingredientId}`, "error");
            }
          }
        }
      } else {
        console.log(`Ingredient with ID ${ingredientId} does not exist.`);
        showAlert(`Ingredient with ID ${ingredientId} does not exist.`, "error");
      }
    }

    showAlert("Xóa thành công", "success");
    setOpenSnackbar(true);
    setSelected([]);
    fetchIngredients();
  } catch (error) {
    console.error("Error deleting ingredients:", error);
    showAlert(`Failed to delete ingredients:`, "error");
    setOpenSnackbar(true);
  } finally {
    setLoading(false);
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
        <Table sx={{ width: "100%" }} aria-label="ingredients table">
          <TableHead sx={{ background: "#f4f6f8" }}>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>Image</TableCell>
              <TableCell
                sx={{
                  fontWeight: "bold",
                  padding: "4px 8px",
                  width: "25%",
                  borderBottom: "none",
                }}
              >
                Tên nguyên liệu
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: "bold",
                  padding: "4px 8px",
                  width: "20%",
                  borderBottom: "none",
                }}
              >
                Calories/Unit
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: "bold",
                  padding: "4px 8px",
                  width: "20%",
                  borderBottom: "none",
                }}
              >
                Đơn vị
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
                  placeholder="Tìm tên"
                />
              </TableCell>
              <TableCell>
                <TextField
                  size="small"
                  sx={{ background: "white" }}
                  fullWidth
                  name="calories"
                  value={filters.calories}
                  onChange={handleFilterChange}
                  placeholder="Tìm calo"
                />
              </TableCell>
              <TableCell>
                <TextField
                  size="small"
                  sx={{ background: "white" }}
                  fullWidth
                  select
                  name="unit"
                  value={filters.unit}
                  onChange={handleFilterChange}
                  placeholder="Tìm đơn vị"
                >
                  <MenuItem value="">Tất cả</MenuItem>
                  <MenuItem value="g">g</MenuItem>
                  <MenuItem value="ml">ml</MenuItem>
                  <MenuItem value="item">Cái/ Quả</MenuItem>
                 </TextField>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedIngredients.length > 0 ? (
              paginatedIngredients.map((ingredient) => (
                <TableRow
                  key={ingredient.id}
                  sx={{
                    height: "45px",
                    "&:hover": { backgroundColor: "#f1f1f1" },
                  }}
                >
                  <TableCell padding="checkbox">
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Checkbox
                        checked={isSelected(ingredient.id)}
                        onChange={(event) =>
                          handleCheckboxClick(event, ingredient.id)
                        }
                      />
                      <IconButton onClick={() => handleOpenAdd(ingredient.id)}>
                        <EditIcon />
                      </IconButton>
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
                      src={ingredient.image}
                      alt="Avatar"
                    />
                  </TableCell>
                  <TableCell>{ingredient.name}</TableCell>
                  <TableCell>{ingredient.nutri?.calories ?? ""}</TableCell>
                  <TableCell>
                    {ingredient.unit === "item" ? "Cái/ Quả" : ingredient.unit}
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
            count={filteredIngredients.length}
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
        onIngredientAdded={handleIngredientAdded}
        id={ingredientToEdit?.id}
        name={ingredientToEdit?.name}
        image={ingredientToEdit?.image}
        nutri={ingredientToEdit?.nutri}
        unit={ingredientToEdit?.unit}
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
    </Paper>
  );
};

export default IngredientTable;
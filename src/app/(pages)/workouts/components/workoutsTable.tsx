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
  MenuItem,
  Grid,
  Box,
  Avatar,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import CustomDeleteDialog from "@/app/(pages)/modal/delete-dialog";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/services/firebase";
import MessageIcon from "@mui/icons-material/Message";
import Badge from "@mui/material/Badge";
import AddNewPopup from "@/app/(pages)/modal/workout-add-dialog";
import { getStorage, ref, deleteObject } from "firebase/storage";
import { getDoc } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import WorkoutReviewDialog from "@/app/(pages)/modal/workout-review-dialog";

interface AlertState {
  message: string;
  severity: "success" | "error" | "warning" | "info";
  visible: boolean;
}

type Level = "Improve Shape" | "Lean & Tone" | "Lose a Fat";

interface Workout {
  id: string;
  name: string;
  exercise_list: Record<string, string>;
  level: Level[];
  pic: string;
  tool: string[];
  health_risks?: string[];
  unrepliedCount?: number;
}

const getWorkouts = async (): Promise<Workout[]> => {
  try {
    const workoutsCol = collection(db, "Workouts");
    const workoutSnapshot = await getDocs(workoutsCol);
    const workouts = await Promise.all(
      workoutSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        const exerciseListObject: Record<string, string> =
          data.exercise_list || {};
        const levels: Level[] = (data.level || []).filter((level: string) =>
          ["Improve Shape", "Lean & Tone", "Lose a Fat"].includes(level)
        ) as Level[];
        const unrepliedCount = await getUnrepliedCount(doc.id); // Lấy số comment chưa reply
        return {
          id: doc.id,
          name: data.name || "Unnamed Workout",
          exercise_list: exerciseListObject,
          level: levels,
          pic: data.pic || "",
          tool: data.tool || [],
          health_risks: data.health_risks || [],
          unrepliedCount, // Gán vào đây
        };
      })
    );
    return workouts;
  } catch (error) {
    console.error("Error fetching workouts:", error);
    throw new Error("Could not fetch workouts");
  }
};

const getTools = async (): Promise<Record<string, string>> => {
  try {
    const toolsCol = collection(db, "Tools");
    const toolSnapshot = await getDocs(toolsCol);
    const toolsMap: Record<string, string> = {};
    toolSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      toolsMap[doc.id] = data.pic || ""; // Assuming pic field exists
    });
    return toolsMap;
  } catch (error) {
    console.error("Error fetching tools:", error);
    throw new Error("Could not fetch tools");
  }
};

const getUnrepliedCount = async (workoutId: string): Promise<number> => {
  const reviewsCol = collection(db, `Workouts/${workoutId}/Reviews`);
  const snapshot = await getDocs(reviewsCol);
  return snapshot.docs.filter((doc) => {
    const d = doc.data();
    // Chỉ tính những comment KHÔNG bị ẩn và chưa được admin reply
    return (!d.hidden) && (!d.adminReply?.comment || !d.adminReply.comment.trim());
  }).length;
};

const WorkoutsTable: React.FC<{ refresh: boolean }> = ({ refresh }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [rows, setRows] = useState<Workout[]>([]);
  const [filteredRows, setFilteredRows] = useState<Workout[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [workoutToEdit, setWorkoutToEdit] = useState<Workout | null>(null);
  const [alert, setAlert] = useState<AlertState>({
    message: "",
    severity: "error",
    visible: false,
  });
  const [filters, setFilters] = useState({ name: "", level: "All" });
  const [toolsMap, setToolsMap] = useState<Record<string, string>>({});
  const [openReviewDialog, setOpenReviewDialog] = useState(false);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(
    null
  );

  const showAlert = (
    message: string,
    severity: "success" | "error" | "warning" | "info"
  ) => {
    setAlert({ message, severity, visible: true });
  };

  const fetchRows = async () => {
    try {
      const workouts = await getWorkouts();
      setRows(workouts);
      setFilteredRows(workouts);
      setTotalRows(workouts.length);
    } catch (error) {
      console.error("Cannot fetch workouts:", error);
      showAlert("Cannot fetch workouts.", "error");
    }
  };

  const fetchTools = async () => {
    try {
      const tools = await getTools();
      setToolsMap(tools);
    } catch (error) {
      console.error("Cannot fetch tools:", error);
      showAlert("Cannot fetch tools.", "error");
    }
  };

  useEffect(() => {
    fetchRows();
    fetchTools();
  }, [refresh]);

  useEffect(() => {
    const result = rows.filter((row) => {
      const matchesName = row.name
        .toLowerCase()
        .includes(filters.name.toLowerCase());
      const matchesLevel =
        filters.level === "All" || row.level.includes(filters.level as Level);
      return matchesName && matchesLevel;
    });

    setFilteredRows(result);
    setTotalRows(result.length);
  }, [filters, rows]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleDeleteSelected = async () => {
    setLoading(true);
    const storage = getStorage();
    const errors: string[] = [];
    try {
      await Promise.all(
        selected.map(async (id) => {
          const workoutDoc = doc(db, "Workouts", id);
          const docSnap = await getDoc(workoutDoc);

          if (docSnap.exists()) {
            const data = docSnap.data();
            const picURL = data.pic;

            // Delete document from Firestore
            await deleteDoc(workoutDoc);

            // Delete image from Firebase Storage
            if (picURL) {
              const imageRef = ref(storage, picURL);

              try {
                await deleteObject(imageRef);
                console.log(`Deleted image for workout ${id}`);
              } catch (error) {
                if (
                  (error as FirebaseError).code === "storage/object-not-found"
                ) {
                  console.log(`Image for workout ${id} not found`);
                } else {
                  console.error(
                    `Error deleting image for workout ${id}:`,
                    error
                  );
                  errors.push(`Error deleting image for workout ${id}`);
                }
              }
            }
          } else {
            console.log(`Workout with ID ${id} does not exist.`);
            errors.push(`Workout with ID ${id} does not exist.`);
          }
        })
      );

      if (errors.length > 0) {
        showAlert(`Some errors occurred: ${errors.join(", ")}`, "warning");
      } else {
        showAlert("Deleted selected workouts.", "success");
      }

      setSelected([]);
      fetchRows();
    } catch (error) {
      console.error("Error deleting workouts:", error);
      showAlert("Error deleting workouts.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = (id: string) => {
    const workout = rows.find((row) => row.id === id);
    if (workout) {
      setWorkoutToEdit(workout);
      setOpenAdd(true);
    } else {
      console.error(`Workout with ID: ${id} not found.`);
    }
  };

  const handleOpenReviewDialog = (workoutId: string) => {
    setSelectedWorkoutId(workoutId);
    setOpenReviewDialog(true);
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
        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
        width: "100%",
        borderRadius: "8px",
      }}
    >
      <TableContainer
        sx={{ flexGrow: 1, maxHeight: "120vh", overflow: "auto" }}
      >
        <Table sx={{ width: "100%" }} aria-label="workouts table">
          <TableHead sx={{ background: "#f4f6f8" }}>
            <TableRow>
              <TableCell
                padding="checkbox"
                sx={{ width: "5%", borderBottom: "none" }}
              />
              <TableCell sx={{ width: "5%", borderBottom: "none" }} />
              <TableCell sx={{ width: "15%", borderBottom: "none" }}>
                Tên nhóm bài tập
              </TableCell>
              <TableCell sx={{ width: "35%", borderBottom: "none" }}>
                Cấp độ
              </TableCell>
              <TableCell sx={{ width: "30%", borderBottom: "none" }}>
                Dụng cụ
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell />
              <TableCell />
              <TableCell>
                <TextField
                  size="small"
                  fullWidth
                  name="name"
                  value={filters.name}
                  onChange={(e) =>
                    setFilters({ ...filters, name: e.target.value })
                  }
                />
              </TableCell>
              <TableCell>
                <TextField
                  size="small"
                  select
                  fullWidth
                  name="level"
                  value={filters.level}
                  onChange={(e) =>
                    setFilters({ ...filters, level: e.target.value })
                  }
                >
                  <MenuItem value="All">All</MenuItem>
                  <MenuItem value="Improve Shape">Cải thiện vóc dáng</MenuItem>
                  <MenuItem value="Lean & Tone">Săn chắc và thon gọn</MenuItem>
                  <MenuItem value="Lose a Fat">
                    Giảm cân
                  </MenuItem>
                </TextField>
              </TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row) => (
                <TableRow key={row.id}>
                  <TableCell padding="checkbox">
                    <Box sx={{ display: "flex" }}>
                      <Checkbox
                        checked={selected.includes(row.id)}
                        onChange={(event) => {
                          const newSelected = selected.includes(row.id)
                            ? selected.filter((id) => id !== row.id)
                            : [...selected, row.id];
                          setSelected(newSelected);
                        }}
                      />
                      <IconButton onClick={() => handleOpenAdd(row.id)}>
                        <EditIcon />
                      </IconButton>
                      {/* <IconButton
                        color="primary"
                        onClick={() => handleOpenReviewDialog(row.id)}
                        sx={{ ml: 1 }}
                      >
                        <Badge
                          badgeContent={row.unrepliedCount}
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
                      src={row.pic}
                      alt="Avatar"
                      sx={{ height: 40, width: 40 }}
                    />
                  </TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.level.join(", ")}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      {row.tool.map((toolId) => (
                        <img
                          key={toolId}
                          src={toolsMap[toolId]} // Use toolsMap to get the image URL
                          alt="Tool"
                          style={{
                            width: "40px",
                            height: "40px",
                            objectFit: "contain",
                          }}
                        />
                      ))}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            {filteredRows.length === 0 && (
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
            count={totalRows}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Grid>
      </Grid>
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
      <AddNewPopup
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        type="edit"
        onWorkoutAdded={fetchRows}
        initialData={workoutToEdit}
      />
      <WorkoutReviewDialog
        open={openReviewDialog}
        onClose={() => {
          setOpenReviewDialog(false);
          fetchRows(); // Gọi lại khi đóng dialog
        }}
        workoutId={selectedWorkoutId}
      />
    </Paper>
  );
};

export default WorkoutsTable;

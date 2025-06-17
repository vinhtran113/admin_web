import React, { useState, useEffect } from "react";
import { Table, TableHead, TableRow, TableCell, TableBody, IconButton, Badge, Avatar, Box, TablePagination } from "@mui/material";
import MessageIcon from "@mui/icons-material/Message";
import WorkoutReviewDialog from "@/app/(pages)/modal/workout-review-dialog";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/services/firebase";

interface WorkoutWithUnreplied {
  id: string;
  name: string;
  image?: string;
  unrepliedCount: number;
}

interface WorkoutReviewTableProps {
  onReload: () => void;
  refresh: number;
}

const WorkoutReviewTable: React.FC<WorkoutReviewTableProps> = ({ onReload, refresh }) => {
  const [workouts, setWorkouts] = useState<WorkoutWithUnreplied[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);

  // Thêm state phân trang
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const fetchWorkouts = async () => {
      const snap = await getDocs(collection(db, "Workouts"));
      const workoutsWithCount: WorkoutWithUnreplied[] = await Promise.all(
        snap.docs.map(async (docSnap) => {
          const d = docSnap.data();
          const reviewsCol = collection(db, "Workouts", docSnap.id, "Reviews");
          const reviewsSnap = await getDocs(reviewsCol);
          let unrepliedCount = 0;
          reviewsSnap.forEach((reviewDoc) => {
            const review = reviewDoc.data();
            if (
              (!review.adminReply || !review.adminReply.comment) &&
              !review.hidden
            ) {
              unrepliedCount++;
            }
          });
          return {
            id: docSnap.id,
            name: d.name || "",
            image: d.pic || d.image || "",
            unrepliedCount,
          };
        })
      );
      setWorkouts(workoutsWithCount);
    };
    fetchWorkouts();
  }, [refresh]);

  const handleOpen = (id: string) => {
    setSelectedWorkoutId(id);
    setOpen(true);
  };

  // Phân trang
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedWorkouts = [...workouts]
    .sort((a, b) => b.unrepliedCount - a.unrepliedCount)
    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Tên nhóm bài tập</TableCell>
            <TableCell>Hành động</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedWorkouts.map(workout => (
            <TableRow key={workout.id}>
              <TableCell>
                <Box display="flex" alignItems="center">
                  <Avatar
                    src={workout.image}
                    alt={workout.name}
                    sx={{ width: 40, height: 40, bgcolor: "#f4f6f8", mr: 2 }}
                    variant="rounded"
                  />
                  <span style={{ fontWeight: 500 }}>{workout.name}</span>
                </Box>
              </TableCell>
              <TableCell>
                <IconButton color="primary" onClick={() => handleOpen(workout.id)}>
                  <Badge
                    badgeContent={workout.unrepliedCount}
                    color="error"
                    overlap="circular"
                    anchorOrigin={{
                      vertical: "top",
                      horizontal: "right",
                    }}
                  >
                    <MessageIcon />
                  </Badge>
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={workouts.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
      <WorkoutReviewDialog open={open} onClose={() => { setOpen(false); setSelectedWorkoutId(null); onReload(); }} workoutId={selectedWorkoutId} onReplied={onReload} />
    </>
  );
};

export default WorkoutReviewTable;
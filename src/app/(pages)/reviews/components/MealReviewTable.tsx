import React, { useState, useEffect } from "react";
import { Table, TableHead, TableRow, TableCell, TableBody, IconButton, Badge, Avatar, Box, TablePagination } from "@mui/material";
import MessageIcon from "@mui/icons-material/Message";
import MealReviewDialog from "@/app/(pages)/modal/meal-review-dialog";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/services/firebase";

interface MealWithUnreplied {
  id: string;
  name: string;
  image?: string;
  unrepliedCount: number;
}

interface MealReviewTableProps {
  onReload: () => void;
  refresh: number;
}

const MealReviewTable: React.FC<MealReviewTableProps> = ({ onReload, refresh }) => {
  const [meals, setMeals] = useState<MealWithUnreplied[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);

  // Thêm state phân trang
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const fetchMeals = async () => {
      const snap = await getDocs(collection(db, "Meals"));
      const mealsWithCount: MealWithUnreplied[] = await Promise.all(
        snap.docs.map(async (docSnap) => {
          const d = docSnap.data();
          const reviewsCol = collection(db, "Meals", docSnap.id, "Reviews");
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
            image: d.image || "",
            unrepliedCount,
          };
        })
      );
      setMeals(mealsWithCount);
    };
    fetchMeals();
  }, [refresh]);

  const handleOpen = (id: string) => {
    setSelectedMealId(id);
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

  const paginatedMeals = [...meals]
    .sort((a, b) => b.unrepliedCount - a.unrepliedCount)
    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Tên món ăn</TableCell>
            <TableCell>Hành động</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedMeals.map(meal => (
            <TableRow key={meal.id}>
              <TableCell>
                <Box display="flex" alignItems="center">
                  <Avatar
                    src={meal.image}
                    alt={meal.name}
                    sx={{ width: 40, height: 40, bgcolor: "#f4f6f8", mr: 2 }}
                    variant="rounded"
                  />
                  <span style={{ fontWeight: 500 }}>{meal.name}</span>
                </Box>
              </TableCell>
              <TableCell>
                <IconButton color="primary" onClick={() => handleOpen(meal.id)}>
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
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={meals.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
      <MealReviewDialog open={open} onClose={() => { setOpen(false); setSelectedMealId(null); onReload(); }} mealId={selectedMealId} onReplied={onReload} />
    </>
  );
};

export default MealReviewTable;
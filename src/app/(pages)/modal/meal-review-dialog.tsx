import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Avatar,
  TextField,
  Typography,
  Card,
  CardContent,
  Divider,
  Stack,
  Fade,
  IconButton,
} from "@mui/material";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/services/firebase";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ReplyIcon from "@mui/icons-material/Reply";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import getUsers from "@/app/core/hooks/getUsers";
import CloseIcon from "@mui/icons-material/Close";

interface Props {
  open: boolean;
  onClose: () => void;
  mealId: string | null;
  onReplied?: () => void; // thêm dòng này
}

interface Review {
  userComment: string;
  adminComment: string;
  userId: string;
  userAvatar?: string;
  userFullName?: string;
  updatedAt?: Timestamp | Date | null;
  adminReplyDate?: Timestamp | Date | null;
  mediaUrls?: string[];
  hidden?: boolean; // Thêm dòng này
}

const fetchReviews = async (
  mealId: string,
  userMap: Record<string, { pic: string; fname: string; lname: string }>
) => {
  const reviewsCol = collection(db, `Meals/${mealId}/Reviews`);
  const snapshot = await getDocs(reviewsCol);
  return snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      userComment: d.comment || "",
      adminComment: d.adminReply?.comment || "",
      userId: d.uid || doc.id,
      updatedAt: d.updatedAt ? d.updatedAt.toDate?.() || d.updatedAt : null,
      adminReplyDate: d.adminReply?.date
        ? d.adminReply.date.toDate?.() || d.adminReply.date
        : null,
      userAvatar: userMap[d.uid || doc.id]?.pic || "",
      userFullName: `${userMap[d.uid || doc.id]?.fname || ""} ${
        userMap[d.uid || doc.id]?.lname || ""
      }`,
      mediaUrls: Array.isArray(d.mediaUrls) ? d.mediaUrls : [],
      hidden: d.hidden || false,
    };
  });
};

const MealReviewDialog: React.FC<Props> = ({ open, onClose, mealId, onReplied }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [replyingReview, setReplyingReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");
  const [editingAdminReview, setEditingAdminReview] = useState<Review | null>(
    null
  );
  const [editAdminText, setEditAdminText] = useState("");
  const [userMap, setUserMap] = useState<
    Record<string, { pic: string; fname: string; lname: string }>
  >({});

  // Tách hàm reloadReviews
  const reloadReviews = async () => {
    if (!mealId) return;
    setLoading(true);
    const users = await getUsers();
    const userMapObj: Record<string, { pic: string; fname: string; lname: string }> = {};
    users.forEach((u) => {
      userMapObj[u.uid] = { pic: u.pic, fname: u.fname, lname: u.lname };
    });
    setUserMap(userMapObj);
    const data = await fetchReviews(mealId, userMapObj);
    setReviews(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!mealId || !open) return;
    reloadReviews();
    // eslint-disable-next-line
  }, [mealId, open]);

  // Các hàm xử lý
  const handleReply = (review: Review) => {
    setReplyingReview(review);
    setReplyText("");
  };

  const handleSendReply = async (review: Review) => {
    if (!mealId) return;
    const reviewDoc = doc(db, `Meals/${mealId}/Reviews`, review.userId);
    await updateDoc(reviewDoc, {
      adminReply: {
        comment: replyText,
        date: new Date(),
      },
    });
    setReplyingReview(null);
    setReplyText("");
    reloadReviews();
    onReplied?.(); // gọi callback reload
  };

  const handleEditAdmin = async (review: Review) => {
    if (!mealId) return;
    const reviewDoc = doc(db, `Meals/${mealId}/Reviews`, review.userId);
    await updateDoc(reviewDoc, {
      adminReply: {
        comment: editAdminText,
        date: new Date(),
      },
    });
    setEditingAdminReview(null);
    setEditAdminText("");
    reloadReviews();
    onReplied?.();
  };

  const handleDeleteAdminReply = async (review: Review) => {
    if (!mealId) return;
    const reviewDoc = doc(db, `Meals/${mealId}/Reviews`, review.userId);
    await updateDoc(reviewDoc, {
      adminReply: {
        comment: "",
        date: null,
      },
    });
    reloadReviews();
    onReplied?.();
  };

  const handleToggleHidden = async (review: Review) => {
    if (!mealId) return;
    const reviewDoc = doc(db, `Meals/${mealId}/Reviews`, review.userId);
    await updateDoc(reviewDoc, { hidden: !review.hidden });
    reloadReviews();
    onReplied?.();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          boxShadow: "0 8px 32px rgba(25, 118, 210, 0.18)",
          border: "1px solid #1976d2",
          background: "linear-gradient(135deg, #f7fafd 0%, #e3f2fd 100%)",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          Phản hồi người dùng & Admin
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
            transition: "color 0.2s",
            "&:hover": {
              color: "#e53935", // Màu đỏ khi hover
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: "#f7fafd" }}>
        {loading && (
          <Box textAlign="center" py={4}>
            <Typography color="primary">Đang tải...</Typography>
          </Box>
        )}
        {!loading && reviews.length === 0 && (
          <Box textAlign="center" py={4}>
            <Typography color="text.secondary">
              Không có phản hồi nào.
            </Typography>
          </Box>
        )}
        <Stack spacing={3}>
          {reviews.map((review) => (
            <Card
              key={review.userId}
              variant="outlined"
              sx={{
                borderRadius: 3,
                boxShadow: review.hidden ? 1 : 4,
                transition: "box-shadow 0.3s",
                position: "relative",
                border: review.hidden ? "1px dashed #aaa" : "1px solid #1976d2",
                background: review.hidden ? "#f5f5f5" : "#fff",
                "&:hover": {
                  boxShadow: 8,
                  borderColor: "#1565c0",
                },
              }}
            >
              <CardContent sx={{ position: "relative" }}>
                {/* Nội dung comment */}
                <Box
                  sx={{
                    opacity: review.hidden ? 0.4 : 1, // chỉ làm mờ phần nội dung
                    pointerEvents: review.hidden ? "none" : "auto",
                    transition: "opacity 0.5s",
                  }}
                >
                  {/* User info */}
                  <Box display="flex" alignItems="center" mb={1}>
                    <Avatar
                      src={review.userAvatar}
                      sx={{
                        mr: 2,
                        width: 48,
                        height: 48,
                        border: "2px solid #1976d2",
                        boxShadow: 2,
                        bgcolor: "#fff",
                      }}
                    />
                    <Box>
                      <Typography fontWeight={700} color="#1976d2">
                        {review.userFullName || "User"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {review.updatedAt &&
                          `Gửi lúc: ${
                            review.updatedAt instanceof Timestamp
                              ? review.updatedAt.toDate().toLocaleString()
                              : review.updatedAt.toLocaleString()
                          }`}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography sx={{ mb: 1, ml: 6 }}>
                    {review.userComment || <i>Chưa có bình luận</i>}
                  </Typography>
                  {/* Media */}
                  {review.mediaUrls && review.mediaUrls.length > 0 && (
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 2,
                        mt: 1,
                        ml: 6,
                      }}
                    >
                      {review.mediaUrls.map((url, idx) => {
                        const fileName = decodeURIComponent(
                          url.split("%2F").pop()?.split("?")[0] || ""
                        );
                        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(
                          fileName
                        );
                        const isVideo = /\.(mp4|webm|ogg)$/i.test(fileName);
                        return (
                          <Box key={idx}>
                            {isImage && (
                              <img
                                src={url}
                                alt={`media-${idx}`}
                                style={{
                                  maxWidth: 120,
                                  maxHeight: 120,
                                  borderRadius: 8,
                                }}
                              />
                            )}
                            {isVideo && (
                              <video
                                src={url}
                                controls
                                style={{
                                  maxWidth: 180,
                                  maxHeight: 120,
                                  borderRadius: 8,
                                }}
                              />
                            )}
                            {!isImage && !isVideo && (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                File đính kèm
                              </a>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                  {/* Nút reply cho user comment */}
                  <Box ml={6} mb={2}>
                    <Button
                      size="small"
                      startIcon={<ReplyIcon />}
                      variant="text"
                      onClick={() => handleReply(review)}
                      sx={{ textTransform: "none" }}
                      disabled={replyingReview?.userId === review.userId}
                    >
                      Reply
                    </Button>
                  </Box>
                  <Divider
                    sx={{ my: 2, borderColor: "#1976d2", opacity: 0.2 }}
                  />
                  {/* Admin reply */}
                  <Box ml={6}>
                    <Box display="flex" alignItems="center">
                      <Typography fontWeight={600} color="primary">
                        Admin
                      </Typography>
                      {/* Icon edit chỉ hiện khi chưa ở chế độ edit */}
                      {editingAdminReview?.userId !== review.userId && !!review.adminComment && (
                        <>
                          <IconButton
                            size="small"
                            color="primary"
                            sx={{ ml: 1 }}
                            onClick={() => {
                              setEditingAdminReview(review);
                              setEditAdminText(review.adminComment || "");
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            sx={{ ml: 1 }}
                            onClick={async () => {
                              if (!mealId) return;
                              const reviewDoc = doc(
                                db,
                                `Meals/${mealId}/Reviews`,
                                review.userId
                              );
                              await updateDoc(reviewDoc, {
                                adminReply: {
                                  comment: "",
                                  date: null,
                                },
                              });
                              // Reload reviews...
                              setLoading(true);
                              const reviewsCol = collection(
                                db,
                                `Meals/${mealId}/Reviews`
                              );
                              const snapshot = await getDocs(reviewsCol);
                              const reviewsData = snapshot.docs.map((doc) => {
                                const d = doc.data();
                                return {
                                  userComment: d.comment || "",
                                  adminComment: d.adminReply?.comment || "",
                                  userId: d.uid || doc.id,
                                  updatedAt: d.updatedAt
                                    ? d.updatedAt.toDate?.() || d.updatedAt
                                    : null,
                                  adminReplyDate: d.adminReply?.date
                                    ? d.adminReply.date.toDate?.() ||
                                      d.adminReply.date
                                    : null,
                                  mediaUrls: Array.isArray(d.mediaUrls)
                                    ? d.mediaUrls
                                    : [],
                                  hidden: d.hidden || false,
                                };
                              });
                              setReviews(
                                reviewsData.map((r) => ({
                                  ...r,
                                  userAvatar: userMap[r.userId]?.pic || "",
                                  userFullName: `${
                                    userMap[r.userId]?.fname || ""
                                  } ${userMap[r.userId]?.lname || ""}`,
                                  mediaUrls: r.mediaUrls, // Đảm bảo giữ lại mediaUrls!
                                  hidden: r.hidden,
                                }))
                              );
                              setLoading(false);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </Box>
                    {/* Nếu đang edit thì hiện TextField, ngược lại hiện comment */}
                    {editingAdminReview?.userId === review.userId ? (
                      <Box mt={1}>
                        <TextField
                          fullWidth
                          size="small"
                          value={editAdminText}
                          onChange={(e) => setEditAdminText(e.target.value)}
                          placeholder="Sửa phản hồi của admin..."
                          multiline
                          minRows={2}
                        />
                        <Box display="flex" gap={1} mt={1}>
                          <Button
                            size="small"
                            variant="contained"
                            disabled={!editAdminText.trim()} // Disable nếu không có nội dung
                            onClick={async () => {
                              if (!mealId) return;
                              const reviewDoc = doc(
                                db,
                                `Meals/${mealId}/Reviews`,
                                review.userId
                              );
                              await updateDoc(reviewDoc, {
                                adminReply: {
                                  comment: editAdminText,
                                  date: new Date(),
                                },
                              });
                              setEditingAdminReview(null);
                              setEditAdminText("");
                              // Reload reviews...
                              setLoading(true);
                              const reviewsCol = collection(
                                db,
                                `Meals/${mealId}/Reviews`
                              );
                              const snapshot = await getDocs(reviewsCol);
                              const reviewsData = snapshot.docs.map((doc) => {
                                const d = doc.data();
                                return {
                                  userComment: d.comment || "",
                                  adminComment: d.adminReply?.comment || "",
                                  userId: d.uid || doc.id,
                                  updatedAt: d.updatedAt
                                    ? d.updatedAt.toDate?.() || d.updatedAt
                                    : null,
                                  adminReplyDate: d.adminReply?.date
                                    ? d.adminReply.date.toDate?.() ||
                                      d.adminReply.date
                                    : null,
                                  mediaUrls: Array.isArray(d.mediaUrls)
                                    ? d.mediaUrls
                                    : [], // BỔ SUNG DÒNG NÀY!
                                  hidden: d.hidden || false,
                                };
                              });
                              setReviews(
                                reviewsData.map((r) => ({
                                  ...r,
                                  userAvatar: userMap[r.userId]?.pic || "",
                                  userFullName: `${
                                    userMap[r.userId]?.fname || ""
                                  } ${userMap[r.userId]?.lname || ""}`,
                                  mediaUrls: r.mediaUrls, // Đảm bảo giữ lại mediaUrls!
                                  hidden: r.hidden,
                                }))
                              );
                              setLoading(false);
                            }}
                          >
                            Lưu
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="secondary"
                            onClick={() => setEditingAdminReview(null)}
                          >
                            Hủy
                          </Button>
                        </Box>
                      </Box>
                    ) : (
                      <>
                        <Typography sx={{ mb: 0.5 }}>
                          {review.adminComment || <i>Chưa có phản hồi</i>}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {review.adminReplyDate &&
                            `Trả lời lúc: ${
                              review.adminReplyDate instanceof Timestamp
                                ? review.adminReplyDate
                                    .toDate()
                                    .toLocaleString()
                                : review.adminReplyDate.toLocaleString()
                            }`}
                        </Typography>
                      </>
                    )}
                  </Box>
                  {/* Form trả lời */}
                  <Box>
                    {replyingReview?.userId === review.userId && (
                      <Box mt={2}>
                        <TextField
                          fullWidth
                          size="small"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Nhập phản hồi..."
                          multiline
                          minRows={2}
                          sx={{
                            bgcolor: "#f5faff",
                            borderRadius: 2,
                            mt: 1,
                            mb: 1,
                            "& .MuiOutlinedInput-root": {
                              "& fieldset": {
                                borderColor: "#1976d2",
                              },
                              "&:hover fieldset": {
                                borderColor: "#1565c0",
                              },
                            },
                          }}
                        />
                        <Box display="flex" gap={1} mt={1}>
                          <Button
                            size="small"
                            variant="contained"
                            disabled={!replyText.trim()}
                            onClick={() => handleSendReply(review)}
                          >
                            Gửi phản hồi
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="secondary"
                            onClick={() => setReplyingReview(null)}
                          >
                            Hủy
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>
                {/* Nút Ẩn/Hiện luôn nằm ngoài Box này để luôn click được */}
                <Box
                  ml="auto"
                  sx={{ position: "absolute", top: 12, right: 12, zIndex: 2 }}
                >
                  <Button
                    size="small"
                    color={review.hidden ? "primary" : "error"}
                    variant="contained"
                    sx={{
                      minWidth: 36,
                      borderRadius: 2,
                      boxShadow: 1,
                      fontWeight: 600,
                      textTransform: "none",
                      bgcolor: review.hidden ? "#1976d2" : "#e53935",
                      "&:hover": {
                        bgcolor: review.hidden ? "#1565c0" : "#b71c1c",
                      },
                      opacity: 1, // luôn hiện rõ nút này
                    }}
                    startIcon={
                      review.hidden ? <VisibilityIcon /> : <VisibilityOffIcon />
                    }
                    onClick={async () => {
                      if (!mealId) return;
                      const reviewDoc = doc(
                        db,
                        `Meals/${mealId}/Reviews`,
                        review.userId
                      );
                      await updateDoc(reviewDoc, { hidden: !review.hidden });
                      reloadReviews();
                    }}
                  >
                    {review.hidden ? "Hiện" : "Ẩn"}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default MealReviewDialog;

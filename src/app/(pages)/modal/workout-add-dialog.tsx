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
  Slide,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import { collection, setDoc, doc } from "firebase/firestore";
import { db } from "@/services/firebase";
import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
} from "firebase/storage";
import getExercises from "@/app/core/hooks/getExercises";
import getTools from "@/app/core/hooks/getTools";
import { TransitionProps } from "@mui/material/transitions";

interface Workout {
  id?: string; // Đảm bảo rằng thuộc tính này có thể là tùy chọn hoặc bắt buộc theo logic của bạn
  name: string;
  exercise_list: Record<string, string>;
  level: Level[];
  pic: string;
  tool: string[];
  health_risks?: string[];
}

type Level = "Improve Shape" | "Lean & Tone" | "Lose a Fat";

interface AlertState {
  message: string;
  severity: "success" | "error" | "warning" | "info";
  visible: boolean;
}

interface AddNewPopupProps {
  open: boolean;
  onClose: () => void;
  onWorkoutAdded: () => void;
  refresh?: boolean;
  type: "add" | "edit";
  initialData: Workout | null;
}

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const AddNewPopup: React.FC<AddNewPopupProps> = ({
  open,
  onClose,
  type,
  onWorkoutAdded,
  initialData,
}) => {
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [name, setName] = useState(initialData?.name || "");
  const [exerciseCount, setExerciseCount] = useState(0);
  const [steps, setSteps] = useState<Record<string, string>>({}); // Cập nhật thành map
  const [selectedLevels, setSelectedLevels] = useState<Level[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [tools, setTools] = useState<{ id: string; name: string }[]>([]);
  const [alert, setAlert] = useState<AlertState>({
    message: "",
    severity: "error",
    visible: false,
  });
  const [exercises, setExercises] = useState<{ id: string; title: string }[]>(
    []
  );
  const [selectedHealthRisks, setSelectedHealthRisks] = useState<HealthRisk[]>(
    []
  );

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

  const LEVEL_LABELS: Record<Level, string> = {
    "Improve Shape": "Cải thiện vóc dáng",
    "Lean & Tone": "Săn chắc và thon gọn",
    "Lose a Fat": "Giảm cân",
  };

  const showAlert = (
    message: string,
    severity: "success" | "error" | "warning" | "info"
  ) => {
    setAlert({ message, severity, visible: true });
  };

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const exerciseList = await getExercises();
        setExercises(
          exerciseList.map((exercise) => ({
            id: exercise.id,
            title: exercise.name,
          }))
        );
      } catch (error) {
        console.error("Error fetching exercises:", error);
      }
    };

    const fetchTools = async () => {
      try {
        const toolsList = await getTools();
        setTools(toolsList);
      } catch (error) {
        console.error("Error fetching tools:", error);
      }
    };

    fetchExercises();
    fetchTools();
  }, []);

  useEffect(() => {
    if (open && type === "edit" && initialData) {
      setName(initialData.name);
      setAvatar(initialData.pic); // Đặt lại avatar từ initialData
      setSteps(initialData.exercise_list);
      setSelectedLevels(initialData.level || []);
      setSelectedTools(initialData.tool || []);
      setExerciseCount(Object.keys(initialData.exercise_list).length);
      console.log("Firestore health_risks:", initialData.health_risks);
      setSelectedHealthRisks(
        (initialData.health_risks || []).filter((risk): risk is HealthRisk =>
          Object.keys(HEALTH_RISK_LABELS).includes(risk)
        )
      );
    } else if (open && type === "add") {
      resetFields();
    }
  }, [open, type, initialData]);

  const resetFields = () => {
    setName("");
    setAvatar(null);
    setSteps({});
    setSelectedLevels([]);
    setSelectedTools([]);
    setExerciseCount(0);
    setSelectedHealthRisks([]); // <-- thêm dòng này
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const file = e.target.files[0];

      // Kiểm tra nếu file không phải là hình ảnh
      if (!file.type.startsWith("image/")) {
        setAlert({
          visible: true,
          message: "Invalid file type. Please upload an image.",
          severity: "error",
        });
        return;
      }

      // Đọc file và chuyển đổi sang base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;

        // Đảm bảo rằng file là một chuỗi data:image hợp lệ
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

      reader.readAsDataURL(file); // Chuyển đổi file sang base64 (data_url)
    }
  };

  const handleStepChange = (key: string, value: string) => {
    setSteps((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleExerciseCountChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const count = parseInt(e.target.value, 10);
    if (!isNaN(count) && count >= 0) {
      setExerciseCount(count);
      const newSteps: Record<string, string> = {};
      for (let i = 0; i < count; i++) {
        newSteps[i.toString()] = steps[i.toString()] || ""; // Giữ giá trị từ map
      }
      setSteps(newSteps);
    } else {
      setExerciseCount(0);
      setSteps({});
    }
  };

  const handleSave = async () => {
    setLoading(true);

    let picUrl = initialData?.pic || ""; // Giữ nguyên ảnh cũ nếu không có ảnh mới

    // Upload ảnh mới nếu có
    if (avatar && avatar.startsWith("data:image")) {
      try {
        const storage = getStorage();
        const storageRef = ref(storage, `workout_image/${name}.png`);
        await uploadString(storageRef, avatar, "data_url");
        picUrl = await getDownloadURL(storageRef);
      } catch (error) {
        setLoading(false);
        showAlert("tải hình lên thất bại", "error");

        return;
      }
    }

    // Tiếp tục lưu dữ liệu khác
    try {
      const workoutData: Workout = {
        name,
        exercise_list: steps,
        level: selectedLevels,
        pic: picUrl,
        tool: selectedTools.length > 0 ? selectedTools : [],
        health_risks: selectedHealthRisks,
      };

      let workoutDocRef;
      if (type === "edit" && initialData?.id) {
        workoutDocRef = doc(db, "Workouts", initialData.id); // Cập nhật đúng document cũ
      } else {
        workoutDocRef = doc(collection(db, "Workouts"), name); // Thêm mới
      }
      await setDoc(workoutDocRef, workoutData);

      showAlert(
        type === "edit" ? "Chỉnh sửa bài tập thành công" : "Thêm mới bài tập thành công",
        "success"
      );

      onWorkoutAdded();

      setTimeout(() => {
        resetFields();
        onClose();
      }, 2000);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error saving workout:", error.message);
        showAlert("Lưu bài tập thất bại", "error");
      } else {
        console.error("Error saving workout:", error);
        showAlert("Lưu bài tập thất bại", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const getFilteredExercises = (selectedTitles: string[]) => {
    return exercises.filter(
      (exercise) => !selectedTitles.includes(exercise.title)
    );
  };

  const handleLevelChange = (level: Level) => {
    setSelectedLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  const handleToolChange = (toolId: string) => {
    setSelectedTools((prev) =>
      prev.includes(toolId)
        ? prev.filter((id) => id !== toolId)
        : [...prev, toolId]
    );
  };

  const handleHealthRiskChange = (risk: HealthRisk) => {
    setSelectedHealthRisks((prev) =>
      prev.includes(risk) ? prev.filter((r) => r !== risk) : [...prev, risk]
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      TransitionComponent={Transition}
      PaperProps={{
        style: {
          width: "1100px",
          position: "absolute",
          zIndex: 1300,
          overflow: "hidden",
          borderRadius: 16, // Bo góc lớn hơn
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)", // Đổ bóng đẹp hơn
          background: "linear-gradient(135deg, #f8fafc 0%, #e3e7ed 100%)", // Gradient nhẹ
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
        {type === "add" ? "Thêm mới bài tập" : "Chỉnh sửa bài tập"}
        <IconButton
          aria-label="close"
          onClick={onClose}
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
              height="360px"
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
                width={150}
                height={150}
                position="relative"
              >
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  border="2px dashed #F4F6F8"
                  width={150}
                  height={150}
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
                        Tải hình bài tập
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
            </Box>
          </Box>

          <Box
            display="flex"
            flexDirection="column"
            width="85%"
            border="1px solid #eaeaea"
            borderRadius="16px"
            padding="16px"
            bgcolor="#f9fbfd"
            boxShadow="0 2px 8px rgba(0,0,0,0.04)"
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
                label="Tên nhóm bài tập"
                fullWidth
                required
                variant="outlined"
                size="small"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <TextField
                margin="dense"
                label="Chọn số lượng bài tập"
                type="number"
                value={exerciseCount}
                onChange={handleExerciseCountChange}
                variant="outlined"
                size="small"
              />
            </Box>

            <Box>
              {Object.entries(steps).map(([key, step]) => (
                <Box key={key} display="flex" flexDirection="column">
                  <FormControl variant="outlined" size="small" margin="normal">
                    <InputLabel id={`exercise-select-label-${key}`}>
                      Bài tập thứ {parseInt(key)}
                    </InputLabel>
                    <Select
                      labelId={`exercise-select-label-${key}`}
                      value={step || ""}
                      onChange={(e) => handleStepChange(key, e.target.value)}
                      label={`Bài tập thứ ${parseInt(key) + 1}`}
                    >
                      {step && (
                        <MenuItem value={step} key={`selected-${step}`}>
                          {step}
                        </MenuItem>
                      )}
                      {getFilteredExercises(Object.values(steps)).map(
                        (exercise) => (
                          <MenuItem key={exercise.id} value={exercise.title}>
                            {exercise.title}
                          </MenuItem>
                        )
                      )}
                    </Select>
                    <FormHelperText sx={{ color: step ? "inherit" : "red" }}>
                      {step ? "" : "* Chọn một bài tập"}
                    </FormHelperText>
                  </FormControl>
                </Box>
              ))}
            </Box>

            {/* Đặt 3 phần này vào bên trong Box cha */}
            <Box
              display="flex"
              flexDirection="row"
              gap={2}
              justifyContent="space-between"
              mb={2}
            >
              {/* Cấp độ bài tập */}
              <Box
                flex={1}
                bgcolor="#e3f2fd"
                borderRadius={2}
                boxShadow="0 2px 8px rgba(33,150,243,0.08)"
                p={2}
                mr={1}
                minWidth={240}
              >
                <Typography
                  variant="subtitle1"
                  fontWeight={600}
                  color="#1976d2"
                  mb={1}
                >
                  Cấp độ bài tập
                </Typography>
                <FormControl component="fieldset">
                  {(
                    ["Improve Shape", "Lean & Tone", "Lose a Fat"] as Level[]
                  ).map((level) => (
                    <FormControlLabel
                      key={level}
                      control={
                        <Checkbox
                          checked={selectedLevels.includes(level)}
                          onChange={() => handleLevelChange(level)}
                          sx={{
                            color: "#1976d2",
                            "&.Mui-checked": { color: "#1976d2" },
                          }}
                        />
                      }
                      label={LEVEL_LABELS[level]}
                    />
                  ))}
                </FormControl>
              </Box>

              {/* Công cụ sử dụng */}
              <Box
                flex={1}
                bgcolor="#f1f8e9"
                borderRadius={2}
                boxShadow="0 2px 8px rgba(76,175,80,0.08)"
                p={2}
                mx={1}
                minWidth={180}
              >
                <Typography
                  variant="subtitle1"
                  fontWeight={600}
                  color="#388e3c"
                  mb={1}
                >
                  Công cụ sử dụng
                </Typography>
                <FormControl component="fieldset">
                  {tools.map((tool) => (
                    <FormControlLabel
                      key={tool.id}
                      control={
                        <Checkbox
                          checked={selectedTools.includes(tool.id)}
                          onChange={() => handleToolChange(tool.id)}
                          sx={{
                            color: "#388e3c",
                            "&.Mui-checked": { color: "#388e3c" },
                          }}
                        />
                      }
                      label={tool.name}
                    />
                  ))}
                </FormControl>
              </Box>

              {/* Bài tập không phù hợp với người mắc bệnh */}
              <Box
                flex={1.2}
                bgcolor="#fff3e0"
                borderRadius={2}
                boxShadow="0 2px 8px rgba(255,152,0,0.08)"
                p={2}
                ml={1}
                minWidth={240}
              >
                <Typography
                  variant="subtitle1"
                  fontWeight={600}
                  color="#f57c00"
                  mb={1}
                >
                  Không phù hợp với người:
                </Typography>
                <FormControl component="fieldset">
                  {(Object.keys(HEALTH_RISK_LABELS) as HealthRisk[]).map(
                    (risk) => (
                      <FormControlLabel
                        key={risk}
                        control={
                          <Checkbox
                            checked={selectedHealthRisks.includes(risk)}
                            onChange={() => handleHealthRiskChange(risk)}
                            sx={{
                              color: "#f57c00",
                              "&.Mui-checked": { color: "#f57c00" },
                            }}
                          />
                        }
                        label={HEALTH_RISK_LABELS[risk]}
                      />
                    )
                  )}
                </FormControl>
              </Box>
            </Box>

            <Box display="flex" justifyContent="flex-end" padding="10px">
              <Button
                onClick={handleSave}
                color="primary"
                variant="contained"
                disabled={loading}
                sx={{
                  width: "120px",
                  fontWeight: 600,
                  borderRadius: 8,
                  boxShadow: "0 2px 8px rgba(25, 118, 210, 0.15)",
                  transition: "all 0.2s",
                  "&:hover": {
                    background: "#1565c0",
                    transform: "translateY(-2px) scale(1.04)",
                    boxShadow: "0 6px 24px rgba(25, 118, 210, 0.18)",
                  },
                }}
              >
                {loading ? (
                  <CircularProgress size={22} color="inherit" />
                ) : (
                  "Lưu"
                )}
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
                onClose={() =>
                  setAlert((prev) => ({ ...prev, visible: false }))
                }
                severity={alert.severity}
                sx={{
                  borderRadius: 2,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  fontWeight: 500,
                }}
              >
                {alert.message}
              </Alert>
            </Snackbar>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default AddNewPopup;

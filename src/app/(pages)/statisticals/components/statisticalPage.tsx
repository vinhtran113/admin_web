import React, { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  CssBaseline,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
  IconButton,
} from "@mui/material";
import { Refresh as RefreshIcon } from "@mui/icons-material";
import Layout from "@/app/core/components/ui/layout";
import getUsers from "@/app/core/hooks/getUsers";
import { PieChart } from "@mui/x-charts/PieChart";
import { BarChart } from "@mui/x-charts/BarChart";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/services/firebase";

const StatisticalPage: React.FC = () => {
  const [refreshTable, setRefreshTable] = useState(false);
  const [genderData, setGenderData] = useState({
    Male: 0,
    Female: 0,
  });
  const [heightData, setHeightData] = useState({
    Male: 0,
    Female: 0,
  });
  const [weightData, setWeightData] = useState({
    Male: 0,
    Female: 0,
  });
  const [levelCounts, setLevelCounts] = useState({
    "Improve Shape": 0,
    "Lean & Tone": 0,
    "Lose a Fat": 0,
  });
  const [topRatedMeals, setTopRatedMeals] = useState<
    { name: string; avgRating: number }[]
  >([]);
  const [diseaseCounts, setDiseaseCounts] = useState<{ [key: string]: number }>(
    {}
  );

  const LEVEL_LABELS: Record<string, string> = {
    "Improve Shape": "Cải thiện vóc dáng",
    "Lean & Tone": "Săn chắc và thon gọn",
    "Lose a Fat": "Giảm cân",
  };

  const HEALTH_RISK_LABELS: Record<string, string> = {
    "Hypertension": "Tăng huyết áp",
    "Diabetes": "Tiểu đường",
    "Cardiovascular disease": "Tim mạch",
    "Osteoarthritis": "Thoái hóa khớp",
    "Asthma": "Hen suyễn",
    "Obesity": "Béo phì",
    "Chronic kidney disease": "Bệnh thận",
    "Chronic respiratory disease": "Bệnh hô hấp",
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const users = await getUsers();

        // Thống kê giới tính
        const maleCount = users.filter((user) => user.gender === "Male").length;
        const femaleCount = users.filter(
          (user) => user.gender === "Female"
        ).length;
        setGenderData({ Male: maleCount, Female: femaleCount });

        // Tính chiều cao trung bình
        const maleHeights = users
          .filter(
            (user) => user.gender === "Male" && !isNaN(Number(user.height))
          )
          .map((user) => Number(user.height));

        const femaleHeights = users
          .filter(
            (user) => user.gender === "Female" && !isNaN(Number(user.height))
          )
          .map((user) => Number(user.height));

        setHeightData({
          Male: maleHeights.length
            ? parseFloat(
                (
                  maleHeights.reduce((a, b) => a + b, 0) / maleHeights.length
                ).toFixed(2)
              )
            : 0,
          Female: femaleHeights.length
            ? parseFloat(
                (
                  femaleHeights.reduce((a, b) => a + b, 0) /
                  femaleHeights.length
                ).toFixed(2)
              )
            : 0,
        });

        // Tính cân nặng trung bình
        const maleWeights = users
          .filter(
            (user) => user.gender === "Male" && !isNaN(Number(user.weight))
          )
          .map((user) => Number(user.weight));

        const femaleWeights = users
          .filter(
            (user) => user.gender === "Female" && !isNaN(Number(user.weight))
          )
          .map((user) => Number(user.weight));

        setWeightData({
          Male: maleWeights.length
            ? parseFloat(
                (
                  maleWeights.reduce((a, b) => a + b, 0) / maleWeights.length
                ).toFixed(2)
              )
            : 0,
          Female: femaleWeights.length
            ? parseFloat(
                (
                  femaleWeights.reduce((a, b) => a + b, 0) /
                  femaleWeights.length
                ).toFixed(2)
              )
            : 0,
        });

        // Thống kê mức độ
        const newLevelCounts = {
          "Improve Shape": 0,
          "Lean & Tone": 0,
          "Lose a Fat": 0,
        };

        users.forEach((user) => {
          if (user.level === "Improve Shape")
            newLevelCounts["Improve Shape"] += 1;
          if (user.level === "Lean & Tone") newLevelCounts["Lean & Tone"] += 1;
          if (user.level === "Lose a Fat") newLevelCounts["Lose a Fat"] += 1;
        });

        setLevelCounts(newLevelCounts);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, [refreshTable]);

  useEffect(() => {
    const fetchTopRatedMeals = async () => {
      try {
        const mealsSnap = await getDocs(collection(db, "Meals"));
        const mealRatings: { name: string; avgRating: number }[] = [];

        for (const mealDoc of mealsSnap.docs) {
          const mealData = mealDoc.data();
          const reviewsSnap = await getDocs(
            collection(db, "Meals", mealDoc.id, "Reviews")
          );
          let total = 0;
          let count = 0;
          reviewsSnap.forEach((reviewDoc) => {
            const review = reviewDoc.data();
            if (typeof review.rating === "number") {
              total += review.rating;
              count++;
            }
          });
          if (count > 0) {
            mealRatings.push({
              name: mealData.name || mealDoc.id,
              avgRating: parseFloat((total / count).toFixed(2)),
            });
          }
        }

        // Sắp xếp giảm dần và lấy top 5
        mealRatings.sort((a, b) => b.avgRating - a.avgRating);
        setTopRatedMeals(mealRatings.slice(0, 5));
      } catch (e) {
        console.error("Error fetching top rated meals", e);
      }
    };
    fetchTopRatedMeals();
  }, [refreshTable]);

  useEffect(() => {
    const fetchDiseaseStats = async () => {
      const usersSnap = await getDocs(collection(db, "users"));
      const counts: { [key: string]: number } = {};
      Object.keys(HEALTH_RISK_LABELS).forEach((key) => (counts[key] = 0));
      usersSnap.forEach((doc) => {
        const data = doc.data();
        if (Array.isArray(data.medical_history)) {
          data.medical_history.forEach((disease: string) => {
            if (counts[disease] !== undefined) counts[disease]++;
          });
        }
      });
      setDiseaseCounts(counts);
    };
    fetchDiseaseStats();
  }, [refreshTable]);

  // Dữ liệu cho biểu đồ
  const pieData = [
    { id: "Male", value: genderData.Male },
    { id: "Female", value: genderData.Female },
  ];

  const barData = [
    {
      id: "Height",
      data: [heightData.Male, heightData.Female],
      color: "#02B2AF",
    },
    {
      id: "Weight",
      data: [weightData.Male, weightData.Female],
      color: "#2E96FF",
    },
  ];

  const topMealBarData = [
    {
      id: "Món ăn",
      data: topRatedMeals.map((meal) => meal.avgRating),
      color: "#ff9800",
    },
  ];
  const topMealNames = topRatedMeals.map((meal) => meal.name);

  const diseaseNames = Object.keys(HEALTH_RISK_LABELS);

  const diseaseBarData = [
    {
      id: "Bệnh lý",
      data: diseaseNames.map((k) => diseaseCounts[k] || 0),
      color: "#e91e63",
    },
  ];
  const levelChartData = [
    {
      id: "Improve Shape",
      value: levelCounts["Improve Shape"],
      label: LEVEL_LABELS["Improve Shape"],
    },
    {
      id: "Lean & Tone",
      value: levelCounts["Lean & Tone"],
      label: LEVEL_LABELS["Lean & Tone"],
    },
    {
      id: "Lose a Fat",
      value: levelCounts["Lose a Fat"],
      label: LEVEL_LABELS["Lose a Fat"],
    },
  ];

  const totalUsers = genderData.Male + genderData.Female;

  const pieParams = {
    height: 250,
    margin: { right: 5 },
    colors: ["#3f51b5", "#f50057"],
    slotProps: { legend: { hidden: true }, tooltip: { show: true } },
  };

  return (
    <Layout>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "background.default",
          py: 4,
          px: { xs: 1, md: 4 },
        }}
      >
        <Box
          sx={{
            maxWidth: 1400,
            mx: "auto",
            bgcolor: "#fff",
            borderRadius: 4,
            boxShadow: "0 8px 32px rgba(255, 255, 255, 0.08)",
            p: { xs: 2, md: 4 },
          }}
        >
          <Typography
            sx={{
              fontSize: { xs: "22px", md: "32px" },
              fontWeight: "bold",
              color: "#1976d2",
              mb: 4,
              textAlign: "center",
              letterSpacing: 1,
            }}
          >
            📊 Thống kê tổng quan hệ thống
          </Typography>
          <Grid container spacing={4}>
            {/* Giới tính */}
            <Grid item xs={12} md={6}>
              <Paper
                elevation={6}
                sx={{
                  p: 3,
                  borderRadius: 4,
                  background:
                    "linear-gradient(120deg, #f5f7fa 0%, #c3cfe2 100%)",
                  boxShadow: "0 4px 24px rgba(33,150,243,0.08)",
                  height: "100%",
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  mb={2}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Avatar sx={{ bgcolor: "#3f51b5" }}>👤</Avatar>
                    <Typography variant="h6" color="text.primary">
                      Thống kê giới tính
                    </Typography>
                  </Stack>
                  <IconButton
                    color="primary"
                    onClick={() => setRefreshTable((prev) => !prev)}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <PieChart series={[{ data: pieData }]} {...pieParams} />
                <Stack
                  direction="row"
                  spacing={2}
                  mt={2}
                  justifyContent="center"
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        bgcolor: "#3f51b5",
                        borderRadius: "50%",
                        mr: 1,
                      }}
                    />
                    <Typography variant="body1">
                      Nam: {genderData.Male}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        bgcolor: "#f50057",
                        borderRadius: "50%",
                        mr: 1,
                      }}
                    />
                    <Typography variant="body1">
                      Nữ: {genderData.Female}
                    </Typography>
                  </Box>
                </Stack>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  mt={2}
                  textAlign="center"
                >
                  Tổng số người dùng: <b>{totalUsers}</b>
                </Typography>
              </Paper>
            </Grid>

            {/* Chiều cao & cân nặng */}
            <Grid item xs={12} md={6}>
              <Paper
                elevation={6}
                sx={{
                  p: 3,
                  borderRadius: 4,
                  background:
                    "linear-gradient(120deg, #fdfbfb 0%, #ebedee 100%)",
                  boxShadow: "0 4px 24px rgba(33,150,243,0.08)",
                  height: "100%",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                  <Avatar sx={{ bgcolor: "#2E96FF" }}>📏</Avatar>
                  <Typography variant="h6" color="text.primary">
                    So sánh Chiều cao & Cân nặng trung bình
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <BarChart
                    xAxis={[{ scaleType: "band", data: ["Nam", "Nữ"] }]}
                    series={barData}
                    width={400}
                    height={250}
                  />
                </Box>
                <Stack
                  direction="row"
                  spacing={2}
                  mt={2}
                  justifyContent="center"
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        bgcolor: "#02B2AF",
                        borderRadius: "50%",
                        mr: 1,
                      }}
                    />
                    <Typography variant="body1">Chiều cao</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        bgcolor: "#2E96FF",
                        borderRadius: "50%",
                        mr: 1,
                      }}
                    />
                    <Typography variant="body1">Cân nặng</Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>

            {/* Mục tiêu luyện tập */}
            <Grid item xs={12} md={6}>
              <Paper
                elevation={6}
                sx={{
                  p: 3,
                  borderRadius: 4,
                  background:
                    "linear-gradient(120deg, #f5f7fa 0%, #c3cfe2 100%)",
                  boxShadow: "0 4px 24px rgba(33,150,243,0.08)",
                  height: "100%",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                  <Avatar sx={{ bgcolor: "#43a047" }}>🎯</Avatar>
                  <Typography variant="h6" color="text.primary">
                    Thống kê mục tiêu luyện tập
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <PieChart
                  series={[{ data: levelChartData }]}
                  height={220}
                  colors={["#1976d2", "#43a047", "#fbc02d"]}
                  slotProps={{ legend: { hidden: true } }}
                />
                <Stack
                  direction="row"
                  spacing={2}
                  mt={2}
                  justifyContent="center"
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        bgcolor: "#1976d2",
                        borderRadius: "50%",
                        mr: 1,
                      }}
                    />
                    <Typography variant="body2">
                      {LEVEL_LABELS["Improve Shape"]}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        bgcolor: "#43a047",
                        borderRadius: "50%",
                        mr: 1,
                      }}
                    />
                    <Typography variant="body2">
                      {LEVEL_LABELS["Lean & Tone"]}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        bgcolor: "#fbc02d",
                        borderRadius: "50%",
                        mr: 1,
                      }}
                    />
                    <Typography variant="body2">
                      {LEVEL_LABELS["Lose a Fat"]}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>

            {/* Top món ăn rating cao */}
            <Grid item xs={12} md={12}>
              <Paper
                elevation={6}
                sx={{
                  p: 3,
                  borderRadius: 4,
                  background:
                    "linear-gradient(120deg, #fdfbfb 0%, #ebedee 100%)",
                  boxShadow: "0 4px 24px rgba(255,152,0,0.08)",
                  height: "100%",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                  <Avatar sx={{ bgcolor: "#ff9800" }}>🍽️</Avatar>
                  <Typography variant="h6" color="text.primary">
                    Top 5 món ăn có rating cao nhất
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <BarChart
                  xAxis={[{ scaleType: "band", data: topMealNames }]}
                  series={topMealBarData}
                  width={500}
                  height={300}
                />
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  mt={2}
                  textAlign="center"
                >
                  Rating trung bình của từng món ăn (tối đa 5 sao)
                </Typography>
              </Paper>
            </Grid>

            {/* Thống kê bệnh lý */}
            <Grid item xs={12}>
              <Paper
                elevation={6}
                sx={{
                  p: 3,
                  borderRadius: 4,
                  background:
                    "linear-gradient(120deg, #f5f7fa 0%, #c3cfe2 100%)",
                  boxShadow: "0 4px 24px rgba(233,30,99,0.08)",
                  height: "100%",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                  <Avatar sx={{ bgcolor: "#e91e63" }}>🩺</Avatar>
                  <Typography variant="h6" color="text.primary">
                    Thống kê bệnh lý phổ biến của người dùng
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <BarChart
                  xAxis={[
                    {
                      scaleType: "band",
                      data: diseaseNames.map((k) => HEALTH_RISK_LABELS[k] || k),
                    },
                  ]}
                  series={diseaseBarData}
                  width={1000}
                  height={300}
                />
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  mt={2}
                  textAlign="center"
                >
                  Số lượng người dùng đang gặp từng bệnh lý
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Layout>
  );
};

export default StatisticalPage;

import React, { useState } from "react";
import {
  Tabs,
  Tab,
  Box,
  Typography,
  CssBaseline,
  Card,
  CardContent,
  AppBar,
  useTheme,
  Fade,
} from "@mui/material";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import MealReviewTable from "@/app/(pages)/reviews/components/MealReviewTable";
import WorkoutReviewTable from "@/app/(pages)/reviews/components/WorkoutReviewTable";
import Layout from "@/app/core/components/ui/layout";

const ReviewManagerPage: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const theme = useTheme();

  const handleReload = () => setRefresh((r) => r + 1);

  return (
    <Layout>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "background.default", // giống statisticalPage
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
            💬 Quản lý bình luận
          </Typography>
          <Card
            elevation={6}
            sx={{
              borderRadius: 4,
              background: "linear-gradient(120deg, #e3f2fd 0%, #f7fafd 100%)",
              boxShadow: "0 4px 24px rgba(33,150,243,0.10)",
              p: { xs: 1, md: 3 },
            }}
          >
            <CardContent>
              <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                variant="fullWidth"
                sx={{
                  mb: 3,
                  ".MuiTabs-indicator": {
                    height: 4,
                    borderRadius: 2,
                    bgcolor: "#1976d2",
                  },
                }}
              >
                <Tab
                  icon={<RestaurantIcon sx={{ color: "#ff7043" }} />}
                  iconPosition="start"
                  label={
                    <Typography fontWeight={700} fontSize={18}>
                      Bình luận món ăn
                    </Typography>
                  }
                  sx={{
                    minHeight: 56,
                    borderRadius: 3,
                    mx: 1,
                    "&.Mui-selected": {
                      bgcolor: "#e3f2fd",
                      color: "#1976d2",
                    },
                  }}
                />
                <Tab
                  icon={<FitnessCenterIcon sx={{ color: "#43a047" }} />}
                  iconPosition="start"
                  label={
                    <Typography fontWeight={700} fontSize={18}>
                      Bình luận nhóm bài tập
                    </Typography>
                  }
                  sx={{
                    minHeight: 56,
                    borderRadius: 3,
                    mx: 1,
                    "&.Mui-selected": {
                      bgcolor: "#e3f2fd",
                      color: "#1976d2",
                    },
                  }}
                />
              </Tabs>
              <Fade in={tab === 0} timeout={400} unmountOnExit>
                <Box hidden={tab !== 0}>
                  <MealReviewTable onReload={handleReload} refresh={refresh} />
                </Box>
              </Fade>
              <Fade in={tab === 1} timeout={400} unmountOnExit>
                <Box hidden={tab !== 1}>
                  <WorkoutReviewTable onReload={handleReload} refresh={refresh} />
                </Box>
              </Fade>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Layout>
  );
};

export default ReviewManagerPage;
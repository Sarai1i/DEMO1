import React, { useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config";

const LoadingPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkProcessingStatus = setInterval(async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/processing_status`);
        console.log("📡 حالة المعالجة الحالية:", response.data.status);

        if (response.data.status === "done") {
          console.log("✅ OCR اكتمل! التوجيه إلى /review");
          clearInterval(checkProcessingStatus);
          navigate("/review");
        }
      } catch (error) {
        console.error("❌ خطأ أثناء التحقق من حالة المعالجة:", error);
      }
    }, 3000);

    return () => clearInterval(checkProcessingStatus);
  }, [navigate]);

  return (
    <div style={styles.page}>
      <div style={styles.loaderContainer}>
        <h2 style={styles.title}>جاري معالجة الملف...</h2>
        <p style={styles.text}>يرجى الانتظار حتى يتم استخراج النصوص.</p>

        {/* الدائرة المتحركة */}
        <div style={styles.spinner}></div>
      </div>
    </div>
  );
};

// ✅ **تصميم CSS محسن**
const styles = {
  page: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "linear-gradient(135deg, #e3f2fd, #f0f4f8)",
    fontFamily: "'Noto Naskh Arabic', serif",
  },
  loaderContainer: {
    backgroundColor: "#fff",
    padding: "40px",
    borderRadius: "15px",
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.1)",
    textAlign: "center",
    width: "400px",
    animation: "pulse 2s infinite",
  },
    title: {
    fontSize: "24px",
    color: "#002147",
    marginBottom: "15px",
  },
  text: {
    fontSize: "16px",
    color: "#555",
    marginBottom: "30px",
  },
  spinner: {
    border: "6px solid rgba(255, 255, 255, 0.3)", /* شفافية خفيفة */
    borderTop: "6px solid #1B2A4E", /* كحلي */
    borderRadius: "50%",
    width: "70px",
    height: "70px",
    margin: "20px auto",
    animation: "spin 1s ease-in-out infinite",
  }
  };

export default LoadingPage;

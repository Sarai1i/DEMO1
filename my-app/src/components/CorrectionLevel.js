import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config";

const CorrectionLevel = () => {
  const [wordCounts, setWordCounts] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWordCounts = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/word_counts`);
        console.log("📡 البيانات المسترجعة من /word_counts:", response.data);
        setWordCounts(response.data);
      } catch (error) {
        console.error("❌ خطأ أثناء جلب word_counts:", error);
        setError("❌ فشل تحميل البيانات!");
      } finally {
        setLoading(false);
      }
    };

    fetchWordCounts();
  }, []);

  // ✅ إضافة `handleSelection` بالشكل الصحيح
  const handleSelection = async (level) => {
    setSelectedLevel(level);

    try {
      const response = await axios.post(`${API_BASE_URL}/submit_correction_level`, { level });

      if (response.status === 200 && response.data.next) {
        console.log("✅ تم إرسال مستوى التصحيح بنجاح، سيتم التوجيه إلى:", response.data.next);
        navigate(response.data.next); // ✅ التوجيه إلى "/review"
      } else {
        console.error("❌ استجابة غير متوقعة من السيرفر:", response.data);
      }
    } catch (error) {
      console.error("❌ خطأ أثناء إرسال مستوى التصحيح:", error);
      alert("حدث خطأ أثناء إرسال مستوى التصحيح.");
    }
  };

  if (loading) return <h2 style={styles.loadingText}>⌛ جاري تحميل البيانات...</h2>;
  if (error) return <h2 style={styles.loadingText}>{error}</h2>;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>عدد الكلمات غير الدقيقة في الملف: {wordCounts.level_80} كلمة</h2>
      <p style={styles.subtitle}>ما مستوى التدقيق الذي ترغب في تطبيقه؟</p>

      <div style={styles.buttonContainer}>
        <button
          style={selectedLevel === "low" ? styles.selectedButton : styles.button}
          onClick={() => handleSelection("low")}  // ✅ إصلاح الخطأ هنا
        >
          منخفض
          <span style={styles.wordCount}>{wordCounts.level_30} كلمة</span>
        </button>

        <button
          style={selectedLevel === "medium" ? styles.selectedButton : styles.button}
          onClick={() => handleSelection("medium")}  // ✅ إصلاح الخطأ هنا
        >
          متوسط
          <span style={styles.wordCount}>{wordCounts.level_50} كلمة</span>
        </button>

        <button
          style={selectedLevel === "high" ? styles.selectedButton : styles.button}
          onClick={() => handleSelection("high")}  // ✅ إصلاح الخطأ هنا
        >
          شامل جميع الملف
          <span style={styles.wordCount}>{wordCounts.level_80} كلمة</span>
        </button>
      </div>
    </div>
  );
};

// ✅ **تحسينات التصميم**
const styles = {
  container: {
    width: "600px",
    margin: "auto",
    textAlign: "center",
    padding: "20px",
    borderRadius: "10px",
    backgroundColor: "#f9f9f9",
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
  },
  title: {
    fontSize: "22px",
    color: "#005b69",
    marginBottom: "10px",
  },
  subtitle: {
    fontSize: "18px",
    color: "#444",
    marginBottom: "20px",
  },
  buttonContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    alignItems: "center",
  },
  button: {
    width: "80%",
    backgroundColor: "#e0e0e0",
    color: "#333",
    padding: "15px",
    fontSize: "16px",
    borderRadius: "8px",
    cursor: "pointer",
    border: "none",
    transition: "0.3s",
  },
  selectedButton: {
    width: "80%",
    backgroundColor: "#007bff",
    color: "white",
    padding: "15px",
    fontSize: "16px",
    borderRadius: "8px",
    cursor: "pointer",
    border: "none",
    transition: "0.3s",
  },
  wordCount: {
    display: "block",
    fontSize: "14px",
    color: "#666",
    marginTop: "5px",
  },
  loadingText: {
    textAlign: "center",
    fontSize: "20px",
    color: "#666",
  },
};

export default CorrectionLevel;

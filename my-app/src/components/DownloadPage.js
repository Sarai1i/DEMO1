import React from "react";
import API_BASE_URL from "../config";

const DownloadPage = () => {
  const handleDownload = () => {
    // ربط مع Flask API لتحميل الملف المصحح
    const fileUrl = `${API_BASE_URL}/download_corrected`; // استدعاء الـ API باستخدام المتغير الديناميكي
    window.open(fileUrl, "_blank"); // فتح الرابط في نافذة جديدة لبدء التنزيل
  };

  return (
    <div style={styles.container}>
      <h1>🎉 تم الانتهاء من تصحيح جميع الكلمات!</h1>
      <button style={styles.button} onClick={handleDownload}>
        ⬇️ تنزيل الملف المصحح
      </button>
    </div>
  );
};

const styles = {
  container: { textAlign: "center", marginTop: "50px" },
  button: {
    padding: "15px 30px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
};

export default DownloadPage;

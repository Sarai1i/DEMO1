import React, { useState, useEffect } from "react";
import axios from "axios";

const DownloadFile = ({ progress }) => {
  const [correctionsComplete, setCorrectionsComplete] = useState(false);

  useEffect(() => {
    if (progress === 100) {
      setCorrectionsComplete(true);
    }
  }, [progress]);

  const downloadCorrectedFile = () => {
    window.open("http://127.0.0.1:5000/download_corrected", "_blank");
  };

  return (
    <div style={styles.container}>
      {correctionsComplete && (
        <button style={styles.downloadButton} onClick={downloadCorrectedFile}>
          ⬇️ تحميل الملف المصحح
        </button>
      )}
    </div>
  );
};

// ✅ **تصميم احترافي**
const styles = {
  container: {
    textAlign: "center",
    marginTop: "20px",
  },
  downloadButton: {
    padding: "12px 25px",
    fontSize: "18px",
    fontWeight: "bold",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    transition: "0.3s",
  },
};

export default DownloadFile;

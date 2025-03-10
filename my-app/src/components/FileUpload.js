import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config";

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setUploadStatus("");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert("يرجى اختيار ملف!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadStatus("جارٍ الرفع...");
      await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUploadStatus("تم رفع الملف بنجاح! جاري المعالجة...");
      navigate("/loading");
    } catch (error) {
      setUploadStatus("فشل رفع الملف!");
      console.error("Upload error:", error);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setUploadStatus("");
    }
  };

  return (
<div className="hero-section">
  <div className="hero-content">
    <h1 className="hero-title">منصة فلك للمدونات اللغوية</h1>
    <p className="hero-subtitle">
      منصة تقنية تجمع المدونات اللغوية، وتتيح للباحثين وعلماء البيانات دراسة الظواهر اللغوية، وتطوير تقنيات الذكاء الاصطناعي.
    </p>
  </div>
      {/* ✅ وضع أداة رفع الملفات ضمن `file-upload-container` للتحكم في موقعها */}
      <div className="file-upload-container">
        <div
          className="card p-4 shadow-sm"
          style={{
            maxWidth: "500px",
            width: "100%",
            borderRadius: "10px",
            fontFamily: "Lama Sans",
          }}
        >
          <h4
            className="text-center text-primary mb-3"
            style={{
              fontFamily: "Lama Sans",
              fontWeight: "bold",
            }}
          >
            التعرف البصري على النصوص
          </h4>

          <div
            className={`border p-4 mb-3 text-center ${
              dragActive ? "border-primary bg-light" : "border-secondary"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              borderStyle: "dashed",
              borderRadius: "5px",
              cursor: "pointer",
              fontFamily: "Lama Sans",
            }}
          >
            <p className="fw-bold text-dark">اسحب وأفلت الملف هنا أو اختره من جهازك</p>
            <input
  id="fileInput"
  type="file"
  accept=".pdf,.png,.jpeg"
  className="form-control mt-2"
  onChange={handleFileChange}
  style={{ direction: "rtl" }} // يضمن أن النص يظهر بالعربية
/>
<label htmlFor="fileInput" className="custom-file-label">
</label>
          </div>

          {file && <p className="text-success fw-bold text-center">{file.name}</p>}

          <button
            className={`btn w-100 ${file ? "btn-primary" : "btn-secondary"}`}
            onClick={handleUpload}
            disabled={!file}
            style={{
              fontFamily: "Lama Sans",
              fontWeight: "bold",
            }}
          >
            رفع الملف
          </button>

          <p className="mt-3 text-center text-muted" style={{ fontFamily: "Lama Sans" }}>
            {uploadStatus}
          </p>
        </div>
      </div>
    </div>
  );

};

export default FileUpload;

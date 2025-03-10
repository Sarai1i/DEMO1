import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import API_BASE_URL from "../config";
import { useNavigate } from "react-router-dom";

const ReviewPage = () => {
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [highlightedBox, setHighlightedBox] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [selectedWordIndex, setSelectedWordIndex] = useState(null);
  const [correctionProgress, setCorrectionProgress] = useState(0);
  const imageRef = useRef(null);
  const [totalFileHighlightedWords, setTotalFileHighlightedWords] = useState(0); // جميع الكلمات المظللة عند التحميل
  const [correctedWords, setCorrectedWords] = useState(0); // عدد الكلمات المصححة
  const [totalHighlightedWords, setTotalHighlightedWords] = useState(0);
  const [correctedHighlightedWords, setCorrectedHighlightedWords] = useState(0);

  const navigate = useNavigate();

  const [filename, setFilename] = useState(""); // ✅ إضافة حالة لتخزين اسم الملف

  useEffect(() => {
    const fetchTextData = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/review`);
        setPages(response.data.pages);
        setFilename(response.data.original_file); // ✅ حفظ اسم الملف عند تحميل البيانات

        // حساب الكلمات المظللة عند التحميل
        const highlightedCount = response.data.pages.reduce((acc, page) => {
          return acc + page.text.filter(word => word.highlighted).length;
        }, 0);

        setTotalHighlightedWords(highlightedCount);

      } catch (error) {
        console.error("❌ خطأ في تحميل بيانات المراجعة:", error);
      }
    };
    fetchTextData();
  }, []);




  if (pages.length === 0) {
    return <h2> جاري تحميل النصوص...</h2>;
  }

  const fetchSuggestions = async (word, event, wordIndex) => {
    try {
      const rect = event.target.getBoundingClientRect();
      setPopupPosition({
        top: rect.bottom + window.scrollY || 0,
        left: rect.left + window.scrollX || 0,
      });

      const geminiResponse = await axios.post(`${API_BASE_URL}/get_gemini_suggestion`, { word });
      const corpusResponse = await axios.post(`${API_BASE_URL}/get_corpus_suggestions`, { text: word });

      setSuggestions([
        geminiResponse.data.gemini_suggestion,
        ...corpusResponse.data.corpus_suggestions.map(s => s.word),
      ]);

      setShowSuggestions(true);
      setInputValue(word);
      setSelectedWordIndex(wordIndex);
    } catch (error) {
      console.error("❌ خطأ أثناء جلب الاقتراحات:", error);
    }
  };

  const handleWordClick = (wordData, event, index) => {
    fetchSuggestions(wordData.word, event, index);

    if (imageRef.current) {
      const imageRect = imageRef.current.getBoundingClientRect();
      const scaleX = imageRect.width / (wordData.bounding_box.original_width || 1);
      const scaleY = imageRect.height / (wordData.bounding_box.original_height || 1);

      setHighlightedBox({
        x: wordData.bounding_box.x * scaleX,
        y: wordData.bounding_box.y * scaleY,
        w: wordData.bounding_box.w * scaleX,
        h: wordData.bounding_box.h * scaleY,
      });
    }
  };


  const updateProgress = () => {
    const correctedCount = pages.reduce((acc, page) => {
      return acc + page.text.filter(word => word.corrected && word.wasHighlighted).length;
    }, 0);

    setCorrectedHighlightedWords(correctedCount);

    if (totalHighlightedWords > 0) {
      const progress = Math.round((correctedCount / totalHighlightedWords) * 100);
      setCorrectionProgress(progress);

      if (progress === 100) {
        submitCorrectionsToServer().then(() => {
          navigate("/download");
        });
      }
    } else {
      setCorrectionProgress(100);
    }
  };










  const handleCorrection = async (correction) => {
    if (!correction.trim() || selectedWordIndex === null) return;

    const updatedPages = [...pages];
    const wordData = updatedPages[currentPage].text[selectedWordIndex];

    // تحديث النص المصحح في الواجهة الأمامية
    updatedPages[currentPage].text[selectedWordIndex] = {
      ...wordData,
      word: correction,
      highlighted: false,
      wasHighlighted: true,
      corrected: true
    };

    setPages(updatedPages);
    setShowSuggestions(false);
    setHighlightedBox(null);
    updateProgress();
    goToNextWord();

    // 🛠️ **إرسال التصحيح إلى الباك-إند لحفظه في قاعدة البيانات**
    try {
      const correctionData = {
        filename: filename, // ✅ استخدام اسم الملف الديناميكي
        original_word: wordData.word,
        corrected_word: correction,
        page_number: currentPage + 1,
        word_index: selectedWordIndex
      };

      console.log("📤 إرسال التصحيح إلى الباك-إند:", correctionData);

      const response = await axios.post(`${API_BASE_URL}/save_correction`, correctionData);

      console.log("✅ تم حفظ التصحيح في الباك-إند:", response.data);
    } catch (error) {
      console.error("❌ خطأ أثناء حفظ التصحيح في قاعدة البيانات:", error);
    }
  };





  const handleMarkCorrect = () => {
    if (selectedWordIndex === null) return;

    const updatedPages = [...pages];
    updatedPages[currentPage].text[selectedWordIndex] = {
      ...updatedPages[currentPage].text[selectedWordIndex],
      highlighted: false,
      wasHighlighted: true,
      corrected: true
    };

    setPages(updatedPages);
    setShowSuggestions(false);
    setHighlightedBox(null);
    updateProgress();
    goToNextWord();
  };





  const submitCorrectionsToServer = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/submit_corrections`, {
        corrections: pages
      });
      console.log("✅ التصحيحات تم إرسالها بنجاح:", response.data);
    } catch (error) {
      console.error("❌ خطأ أثناء إرسال التصحيحات:", error);
    }
  };



  const goToNextWord = () => {
    if (pages && pages[currentPage] && pages[currentPage].text) {
      let nextIndex = selectedWordIndex + 1;
      while (nextIndex < pages[currentPage].text.length && !pages[currentPage].text[nextIndex].highlighted) {
        nextIndex++;
      }

      if (nextIndex < pages[currentPage].text.length) {
        setSelectedWordIndex(nextIndex);
        setShowSuggestions(false);
      } else {
        goToNextPage();
      }
    }
  };

  const goToNextPage = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
      setSelectedWordIndex(0);
      setShowSuggestions(false);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
      setSelectedWordIndex(0);
      setShowSuggestions(false);
    }
  };


  return (
    <div style={styles.container}>
      <h2> مراجعة النصوص وتصحيح الكلمات</h2>

      {/* شريط التقدم */}
      <div style={styles.progressBarContainer}>
  <div style={{ ...styles.progressBar, width: `${correctionProgress}%` }}>
    {correctionProgress}%
  </div>
</div>



      <div style={styles.splitView}>
        <div style={styles.fileContainer}>
          <h3> الملف الأصلي</h3>
          <div style={{ position: "relative" }}>
            <img
              ref={imageRef}
              src={`${API_BASE_URL}/uploads/original_page_${currentPage + 1}.png`}
              alt="الملف الأصلي"
              style={styles.image}
            />
            {highlightedBox && (
              <div
                style={{
                  position: "absolute",
                  top: highlightedBox.y,
                  left: highlightedBox.x,
                  width: highlightedBox.w,
                  height: highlightedBox.h,
                  border: "2px solid red",
                  backgroundColor: "rgba(255, 0, 0, 0.3)",
                  pointerEvents: "none",
                }}
              />
            )}
          </div>
        </div>

        <div style={styles.textBox}>
          <h3> النص المستخرج</h3>
          <p>
            {pages[currentPage].text.map((word, index) => (
              <span
                key={index}
                onClick={(event) => handleWordClick(word, event, index)}
                style={word.highlighted ? styles.lowConfidenceHighlight : styles.normalWord}
              >
                {word.word}{" "}
              </span>
            ))}
          </p>
        </div>
      </div>

      {/* نافذة الاقتراحات */}
      {showSuggestions && (
  <div style={{ ...styles.suggestionBox, top: popupPosition.top, left: popupPosition.left }}>
    <div style={styles.suggestionList}>
      {suggestions.map((s, idx) => (
        <label key={idx} style={styles.suggestionItem}>
          <input
            type="radio"
            name="suggestion"
            value={s}
            onChange={() => setInputValue(s)}
            style={styles.radioButton}
          />
          {s}
        </label>
      ))}
    </div>

    {/* ✅ مربع إدخال يدوي للتصحيح */}
    <input
      type="text"
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      placeholder="أدخل التصحيح يدويًا..."
      style={styles.inputField}
    />

    {/* ✅ أزرار التصحيح */}
    <div style={styles.buttonContainer}>
  <button
    style={styles.button}
    onMouseEnter={(e) => {
      e.target.style.backgroundColor = "#ffffff"; /* ✅ يجعل الزر أفتح */
      e.target.style.color = "#000"; /* ✅ يجعل النص أغمق */
    }}
    onMouseLeave={(e) => {
      e.target.style.backgroundColor = "#f8f9fa";
      e.target.style.color = "#333";
    }}
    onClick={() => handleCorrection(inputValue)}
  >
    تصحيح
  </button>
  <button
    style={styles.button}
    onMouseEnter={(e) => {
      e.target.style.backgroundColor = "#ffffff"; /* ✅ يجعل الزر أفتح */
      e.target.style.color = "#000"; /* ✅ يجعل النص أغمق */
    }}
    onMouseLeave={(e) => {
      e.target.style.backgroundColor = "#f8f9fa";
      e.target.style.color = "#333";
    }}
    onClick={handleMarkCorrect}
  >
    الكلمة صحيحة
  </button>
</div>

  </div>
)}


      {/* أزرار التنقل بين الصفحات */}
      <div style={styles.navigation}>
  <button style={styles.navButton} onClick={goToPreviousPage} disabled={currentPage === 0}>
    ⬅ الصفحة السابقة
  </button>
  <span style={styles.pageInfo}> الصفحة {currentPage + 1} من {pages.length} </span>
  <button style={styles.navButton} onClick={goToNextPage} disabled={currentPage === pages.length - 1}>
    الصفحة التالية ➡
  </button>
</div>

    </div>
  );
};

// ✅ *تحسين التصميم مع شريط التقدم*
const styles = {
  container: {
    width: "90%",
    margin: "auto",
    textAlign: "center",
    padding: "20px",
    fontFamily: "Lama Sans, sans-serif",
    background: "#f5f7fa",
  },
  progressBarContainer: {
    width: "100%",
    height: "12px",
    backgroundColor: "#e0e0e0",
    borderRadius: "6px",
    margin: "20px 0",
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    background: "linear-gradient(to right, #1B2A4E, #007bff)",
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
    borderRadius: "6px",
    transition: "width 0.5s ease-in-out",
    lineHeight: "12px",
    fontSize: "14px",
  },
  splitView: {
    display: "flex",
    justifyContent: "space-between",
    gap: "30px",
    marginTop: "20px",
  },
  fileContainer: {
    width: "48%",
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
    textAlign: "right",
    border: "1px solid #ddd",
  },
  textBox: {
    width: "48%",
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
    textAlign: "right",
    border: "1px solid #ddd",
  },
  image: {
    width: "100%",
    height: "auto",
    borderRadius: "8px",
  },
  lowConfidenceHighlight: {
    backgroundColor: "#ffeb3b",
    padding: "3px 6px",
    borderRadius: "5px",
    cursor: "pointer",
    transition: "background 0.3s ease",
  },
  normalWord: {
    color: "#333",
    cursor: "pointer",
  },
  suggestionBox: {
    position: "absolute",
    backgroundColor: "#fff",
    padding: "15px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
    borderRadius: "8px",
    zIndex: 1000,
    border: "1px solid #ddd",
    fontFamily: "Lama Sans, sans-serif",
    width: "250px",
    textAlign: "right",
  },
  suggestionList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "10px",
  },
  suggestionItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    padding: "6px",
    borderRadius: "5px",
    transition: "background 0.2s ease",
  },
  radioButton: {
    margin: "0",
    cursor: "pointer",
  },
  inputField: {
    width: "100%",
    padding: "8px",
    border: "1px solid #ddd",
    borderRadius: "5px",
    fontSize: "14px",
  },
  buttonContainer: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "10px",
  },
  button: {
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid #ddd", /* ✅ زر بسيط */
    cursor: "pointer",
    fontSize: "14px",
    backgroundColor: "#f8f9fa", /* ✅ لون خلفية فاتح */
    color: "#333",
    transition: "background 0.2s ease, color 0.2s ease",
  },
  buttonHover: {
    backgroundColor: "#ffffff", /* ✅ افتح اللون عند تمرير الفأرة */
    color: "#000", /* ✅ لون النص يصبح أغمق */
  },  correctButton: {
    backgroundColor: "#007bff",
    color: "#fff",
  },
  correctButtonHover: {
    backgroundColor: "#0056b3",
  },
  fixButton: {
    backgroundColor: "#28a745",
    color: "#fff",
  },
  fixButtonHover: {
    backgroundColor: "#218838",
  },
  navButton: {
    padding: "12px 24px",
    borderRadius: "8px",
    backgroundColor: "#007bff",
    color: "#fff",
    cursor: "pointer",
    border: "none",
    transition: "0.3s ease",
    fontSize: "16px",
  },
  navButtonDisabled: {
    backgroundColor: "#ccc",
    cursor: "not-allowed",
  },
  navigation: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "20px",
    marginTop: "30px",
  },
  navButton: {
    padding: "12px 18px",
    borderRadius: "25px",
    border: "none",
    fontSize: "16px",
    fontWeight: "bold",
    backgroundColor: "#13836E", /* ✅ لون أخضر هادئ */
    color: "#fff",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
  },
  navButtonHover: {
    backgroundColor: "#0f6b58", /* ✅ لون أخضر غامق عند التمرير */
  },
  pageInfo: {
    fontSize: "16px",
    fontWeight: "bold",
    color: "#333",
  },

};

export default ReviewPage;

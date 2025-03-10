from flask import Flask, request, jsonify, send_from_directory, send_file, redirect, url_for, session
import os
import json
import threading
from ocr_model import configure_tesseract, ocr_with_highlighting
from flask_cors import CORS
import requests
import google.generativeai as genai
from pymongo import MongoClient
import gridfs
import io


app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# تكوين Gemini API
API_KEY = "AIzaSyCappIvb1i9kxr08FWYo4Py3d2vLMrQbg0"
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel("gemini-2.0-flash")

app.secret_key = "super_secret_key_123"




# تكوين Tesseract
TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
configure_tesseract(TESSERACT_PATH)

# متغيرات المعالجة
processing_complete = False
ocr_results = []
original_file_name = ""

# مجلدات التخزين
UPLOAD_FOLDER = "uploads"
OUTPUT_FOLDER = "corrected_files"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# ملفات التصحيحات
corrections_file = os.path.join(OUTPUT_FOLDER, "corrections.json")
corrected_text_file = os.path.join(OUTPUT_FOLDER, "corrected_text.txt")

CORPUS_FILTER_API_URL = "http://127.0.0.1:9090/correct"

# تكوين MongoDB

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/ocr_database")
client = MongoClient(MONGO_URI)
db = client["ocr_database"]
fs = gridfs.GridFS(db)  # GridFS لتخزين الملفات الكبيرة



files_collection = db["files"]
corrected_words_collection = db["corrected_words"]  # مجموعة الكلمات المصححة


def get_gemini_suggestion(word):
    """إرسال الكلمة إلى Gemini API للحصول على التصحيح الذكي"""
    try:
        prompt = f"""أنت مساعد ذكي متخصص في تصحيح النصوص العربية المستخرجة عبر OCR.
        - قم فقط بتصحيح الأخطاء الإملائية والنحوية.
        - لا تضف أي تعليق، فقط أعد النص المصحح بدون أي تغييرات غير ضرورية.
        - لا تكرر التعليمات، ولا تطرح أسئلة، ولا تطلب أي شيء، فقط أعد النص المصحح مباشرة.

        **النص الأصلي:** {word}

        **النص المصحح:**"""

        response = model.generate_content(prompt,
                                          generation_config=genai.types.GenerationConfig(
                                              temperature=0.1,  # جعل الاستجابة أكثر دقة وأقل إبداعًا
                                              max_output_tokens=100  # تقليل عدد الرموز لتجنب الإجابات الطويلة
                                          ))

        return response.text.strip() if response and response.text else word  # استخراج التصحيح فقط
    except Exception as e:
        print(f"❌ خطأ في Gemini API: {e}")
        return word
def get_corpus_filter_suggestions(text, threshold=50, top_n=5):
    """
    استدعاء Corpus API وتحليل التصحيحات الممكنة.
    """
    try:
        payload = {
            "text": text,
            "threshold": threshold,
            "top_n": top_n
        }
        headers = {
            "accept": "application/json",
            "Content-Type": "application/json"
        }

        response = requests.post(CORPUS_FILTER_API_URL, json=payload, headers=headers)

        print("🔍 إرسال الطلب إلى Corpus API:", payload)  # طباعة الطلب
        print("🔍 استجابة Corpus API:", response.status_code, response.text)  # طباعة الاستجابة

        if response.status_code == 200:
            data = response.json()

            # استخراج التصحيحات من الحقل الصحيح
            corrections = []
            if text in data:
                for suggestion in data[text]:
                    corrections.append({
                        "word": suggestion["word"],
                        "score": float(suggestion["score"]),  # تحويل score إلى عدد عشري
                        "freq": suggestion["freq"]
                    })

            return corrections
        else:
            print(f"❌ خطأ في Corpus API {response.status_code}: {response.text}")
            return []
    except Exception as e:
        print(f"❌ خطأ أثناء الاتصال بـ Corpus API: {e}")
        return []

@app.route("/")
def home():
    return jsonify({"message": "API تعمل بنجاح!"})


@app.route("/upload", methods=["POST"])
def upload_file():
    """رفع ملف وحفظه في GridFS ثم تشغيل OCR"""
    global processing_complete, ocr_results, original_file_name
    processing_complete = False

    if "file" not in request.files:
        return jsonify({"error": "يرجى رفع ملف"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "لم يتم اختيار ملف"}), 400

    allowed_extensions = {"pdf", "png", "jpg", "jpeg"}
    if not file.filename.lower().endswith(tuple(allowed_extensions)):
        return jsonify({"error": "صيغة الملف غير مدعومة"}), 400

    original_file_name = file.filename
    file_id = fs.put(file.read(), filename=original_file_name)

    # حفظ بيانات الملف الأصلي في قاعدة البيانات وربطه بالـ OCR لاحقًا
    file_entry = {
        "filename": original_file_name,
        "file_id": file_id,
        "ocr_file_id": None,  # سيتم تحديثه لاحقًا بعد تنفيذ OCR
        "ocr_results": None
    }
    file_doc = files_collection.insert_one(file_entry)
    file_entry["_id"] = file_doc.inserted_id

    # تشغيل OCR في الخلفية
    threading.Thread(target=process_ocr, args=(file_entry,)).start()

    return jsonify({"message": "تم رفع الملف بنجاح!", "file_id": str(file_id)})



def process_ocr(file_entry):
    """ تشغيل OCR على الملف الأصلي وحفظ النتائج في قاعدة البيانات و GridFS """
    global processing_complete, ocr_results

    # استخراج الملف الأصلي من GridFS
    file_id = file_entry["file_id"]
    file_data = fs.get(file_id).read()

    # حفظ الملف مؤقتًا لاستخدامه مع OCR
    temp_file_path = os.path.join(app.config["UPLOAD_FOLDER"], file_entry["filename"])
    with open(temp_file_path, "wb") as f:
        f.write(file_data)

    print(f"📂 تحميل الملف من GridFS: {file_entry['filename']}")

    # تشغيل OCR
    ocr_results = ocr_with_highlighting(temp_file_path, UPLOAD_FOLDER)

    # ✅ تحويل النص المستخرج إلى ملف نصي
    ocr_text = "\n".join([" ".join([word["word"] for word in page["text"]]) for page in ocr_results])

    # 🔹 حفظ النص كملف OCR داخل GridFS
    ocr_file_id = fs.put(ocr_text.encode("utf-8"), filename=f"ocr_{file_entry['filename']}.txt")

    # 🔹 تحديث قاعدة البيانات وربط ملف OCR بالملف الأصلي
    files_collection.update_one(
        {"_id": file_entry["_id"]},
        {"$set": {"ocr_file_id": ocr_file_id, "ocr_results": ocr_results}}
    )

    processing_complete = True
    print(f"✅ OCR تم بنجاح، ID: {ocr_file_id} مرتبط بالملف الأصلي ID: {file_id}")


@app.route("/review", methods=["GET"])
def review_page():
    """إرجاع بيانات النص المستخرج واسم الملف الأصلي"""
    global processing_complete, ocr_results, original_file_name

    if not processing_complete:
        return jsonify({"status": "processing"}), 202  # ✅ تحديث الاستجابة في حالة المعالجة

    if not ocr_results:
        return jsonify({"error": "❌ لا توجد بيانات OCR متاحة!"}), 404  # ✅ خطأ إذا لم يكن هناك نتائج

    return jsonify({
        "pages": ocr_results,  # ✅ إرسال جميع البيانات
        "original_file": original_file_name,
        "file_url": f"http://127.0.0.1:5000/uploads/{original_file_name}"
    })
@app.route("/get_gemini_suggestion", methods=["POST"])
def get_gemini_suggestion_api():
    """إرجاع تصحيح Gemini لكلمة معينة"""
    data = request.json
    word = data.get("word", "")

    gemini_suggestion = get_gemini_suggestion(word)

    return jsonify({
        "gemini_suggestion": gemini_suggestion
    })

@app.route("/get_corpus_suggestions", methods=["POST"])
def get_corpus_suggestions_api():
    """
    استدعاء Corpus API عبر Flask API وإرجاع التصحيحات.
    """
    data = request.json
    text = data.get("text", "").strip()

    if not text:
        return jsonify({"error": "❌ النص المرسل فارغ!"}), 400

    try:
        payload = {
            "text": text,
            "threshold": 50,
            "top_n": 5
        }
        headers = {
            "accept": "application/json",
            "Content-Type": "application/json"
        }

        print(f"🔍 إرسال الطلب إلى Corpus API: {payload}")
        response = requests.post(CORPUS_FILTER_API_URL, json=payload, headers=headers)

        print(f"🔍 استجابة Corpus API: {response.status_code} - {response.text}")

        if response.status_code == 200:
            data = response.json()

            if text in data and isinstance(data[text], list):
                corrections = [
                    {
                        "word": suggestion["word"],
                        "score": float(suggestion["score"]),
                        "freq": suggestion["freq"]
                    }
                    for suggestion in data[text] if suggestion["word"] != text  # ✅ استبعاد الكلمات المطابقة
                ]
                return jsonify({"corpus_suggestions": corrections})

        return jsonify({"corpus_suggestions": []})

    except Exception as e:
        print(f"❌ خطأ أثناء الاتصال بـ Corpus API: {e}")
        return jsonify({"error": f"❌ خطأ أثناء الاتصال بـ Corpus API: {e}"}), 500

@app.route("/processing_status", methods=["GET"])
def processing_status():
    """إرجاع حالة المعالجة."""
    global processing_complete
    try:
        return jsonify({"status": "done" if processing_complete else "processing"})
    except NameError:
        return jsonify({"status": "processing"})  # ✅ تأمين الحالة الافتراضية

@app.route("/uploads/<filename>", methods=["GET"])
def uploaded_file(filename):
    """إرجاع الملفات المرفوعة"""
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

from datetime import datetime

from datetime import datetime

from datetime import datetime

@app.route("/submit_corrections", methods=["POST"])
def submit_corrections():
    """حفظ تصحيحات المستخدم في قاعدة البيانات بعد التحقق منها."""

    print("\n✅ Received request to submit corrections.")

    data = request.json
    print(f"📥 Received Data: {json.dumps(data, ensure_ascii=False, indent=4)}")

    if not data or "filename" not in data or "corrections" not in data:
        print("❌ ERROR: Missing filename or corrections in request!")
        return jsonify({"error": "❌ Missing filename or corrections!"}), 400

    filename = data["filename"]
    corrections = data["corrections"]

    print(f"📂 Processing corrections for file: {filename}")

    if not filename or not corrections:
        print("❌ ERROR: Filename or corrections list is empty!")
        return jsonify({"error": "❌ Filename or corrections list is empty!"}), 400

    inserted_count = 0

    for page in corrections:
        page_number = page.get("page_number")
        text_data = page.get("text", [])

        for word_data in text_data:
            original_word = word_data.get("word", "").strip()
            corrected_word = word_data.get("corrected_word", "").strip()
            word_index = word_data.get("index")

            if original_word and corrected_word and original_word != corrected_word:
                correction_entry = {
                    "filename": filename,
                    "page_number": page_number,
                    "word_index": word_index,
                    "original_word": original_word,
                    "corrected_word": corrected_word,
                    "timestamp": datetime.utcnow()
                }

                try:
                    corrected_words_collection.insert_one(correction_entry)
                    inserted_count += 1
                    print(f"✅ Inserted Correction: {correction_entry}")
                except Exception as e:
                    print(f"❌ ERROR: Failed to insert correction -> {e}")
                    return jsonify({"error": f"❌ Failed to save correction: {e}"}), 500

    if inserted_count == 0:
        print("❌ ERROR: No corrections were inserted!")
        return jsonify({"error": "❌ No corrections were inserted!"}), 400

    return jsonify({"message": f"✅ Successfully saved {inserted_count} corrections!"}), 200




@app.route("/word_counts")
def word_counts():
    """إرجاع عدد الكلمات التي تحتاج إلى تصحيح بناءً على مستوى الثقة"""
    global ocr_results

    if not ocr_results:
        return jsonify({"level_30": 0, "level_50": 0, "level_80": 0})

    count_30, count_50, count_80 = 0, 0, 0

    for page in ocr_results:
        for word_data in page.get("text", []):
            confidence = word_data.get("confidence", 0)
            if confidence <= 30:
                count_30 += 1
            if confidence <= 50:
                count_50 += 1
            if confidence <= 80:
                count_80 += 1

    return jsonify({"level_30": count_30, "level_50": count_50, "level_80": count_80})

@app.route("/download_corrected", methods=["GET"])
def download_corrected():
    """تنزيل النص المصحح"""
    global ocr_results

    if not ocr_results:
        return jsonify({"error": "❌ لا توجد نتائج OCR متاحة!"}), 404

    # تجميع النص المصحح
    corrected_text = []
    for page in ocr_results:
        page_text = " ".join([word["word"] for word in page.get("text", [])])  # تجميع النص كسطر واحد لكل صفحة
        corrected_text.append(page_text)

    # كتابة النص المصحح إلى ملف
    with open(corrected_text_file, "w", encoding="utf-8") as f:
        f.write("\n\n".join(corrected_text))

    # إرسال الملف للتنزيل
    return send_file(corrected_text_file, as_attachment=True, download_name="corrected_text.txt", mimetype="text/plain")

#دالة إضافية لأسترجاع الملف من قاعدة البيانات
@app.route("/get_file/<file_id>/<file_type>", methods=["GET"])
def get_file(file_id, file_type):
    """استرجاع الملفات الأصلية أو ملفات OCR من GridFS"""
    try:
        file = fs.get(file_id)
        if file_type == "ocr":
            return send_file(BytesIO(file.read()), as_attachment=True, download_name=file.filename, mimetype="text/plain")
        else:
            return send_file(BytesIO(file.read()), as_attachment=True, download_name=file.filename)
    except gridfs.NoFile:
        return jsonify({"error": "❌ الملف غير موجود!"}), 404

@app.route("/list_files", methods=["GET"])
def list_files():
    """إرجاع قائمة الملفات الأصلية مع ملفات OCR المرتبطة بها"""
    files = []
    for entry in files_collection.find():
        files.append({
            "file_id": str(entry["file_id"]),
            "ocr_file_id": str(entry["ocr_file_id"]) if entry["ocr_file_id"] else None,
            "original_file_url": f"http://127.0.0.1:5000/get_file/{entry['file_id']}/original",
            "ocr_file_url": f"http://127.0.0.1:5000/get_file/{entry['ocr_file_id']}/ocr" if entry["ocr_file_id"] else None
        })

    return jsonify({"files": files})

@app.route("/get_corrections/<filename>", methods=["GET"])
def get_corrections(filename):
    """إرجاع جميع التصحيحات المحفوظة لملف معين"""
    corrections = list(corrected_words_collection.find({"filename": filename}, {"_id": 0}))
    return jsonify({"corrections": corrections})
@app.route("/save_correction", methods=["POST"])
def save_correction():
    """حفظ كل كلمة يتم تصحيحها فورًا في قاعدة البيانات"""
    try:
        data = request.json
        print("\n📥 البيانات المستلمة لحفظ التصحيح:", json.dumps(data, ensure_ascii=False, indent=4))

        filename = data.get("filename", "").strip()
        original_word = data.get("original_word", "").strip()
        corrected_word = data.get("corrected_word", "").strip()
        page_number = data.get("page_number", None)
        word_index = data.get("word_index", None)

        # ✅ تحقق من صحة البيانات
        if not filename or not original_word or not corrected_word or original_word == corrected_word:
            print("❌ البيانات غير صالحة!")
            return jsonify({"error": "❌ البيانات غير صالحة!"}), 400

        # ✅ إدراج أو تحديث التصحيح في قاعدة البيانات
        correction_entry = {
            "filename": filename,
            "page_number": page_number,
            "word_index": word_index,
            "original_word": original_word,
            "corrected_word": corrected_word,
            "timestamp": datetime.utcnow()
        }

        result = corrected_words_collection.update_one(
            {
                "filename": filename,
                "page_number": page_number,
                "word_index": word_index
            },
            {"$set": correction_entry},
            upsert=True  # ✅ إدخال جديد إذا لم يكن موجودًا مسبقًا
        )

        print(f"✅ تم حفظ التصحيح في قاعدة البيانات: {correction_entry}")
        print(f"📊 تحديثات قاعدة البيانات - matched: {result.matched_count}, modified: {result.modified_count}")

        return jsonify({"message": "✅ تم حفظ التصحيح بنجاح!"}), 200

    except Exception as e:
        print(f"❌ خطأ أثناء حفظ التصحيح: {e}")
        return jsonify({"error": f"❌ خطأ أثناء حفظ التصحيح: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
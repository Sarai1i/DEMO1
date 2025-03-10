import os
import json
import requests
from pdf2image import convert_from_path
from PIL import Image, ImageDraw
import cv2
import numpy as np
import pytesseract

# API URLs - استبدلها بالروابط الفعلية
GEMINI_API_URL = "https://api.gemini.com/correct"  # استبدل برابط API الصحيح
CORPUS_FILTER_API_URL = "http://127.0.0.1:9090/correct"  # API Tool Filtering

def configure_tesseract(tesseract_path):
    """ضبط مسار Tesseract OCR"""
    pytesseract.pytesseract.tesseract_cmd = tesseract_path


def get_gemini_suggestion(word):
    """إرسال الكلمة إلى Gemini API للحصول على التصحيح الذكي"""
    try:
        response = requests.post(GEMINI_API_URL, json={"word": word})
        if response.status_code == 200:
            return response.json().get("suggestion", word)
    except Exception as e:
        print(f"❌ خطأ في Gemini API: {e}")
    return word

def get_corpus_filter_suggestions(text, threshold=50, top_n=20):
    """إرسال الكلمة إلى Corpus Filter API للحصول على اقتراحات التصحيح"""
    try:
        payload = {"text": text, "threshold": threshold, "top_n": top_n}
        headers = {"accept": "application/json", "Content-Type": "application/json"}
        response = requests.post(CORPUS_FILTER_API_URL, json=payload, headers=headers)

        if response.status_code == 200:
            return response.json().get("corrections", [])  # قائمة بالتصحيحات المقترحة
    except Exception as e:
        print(f"❌ خطأ في Corpus Filter API: {e}")
    return []

def preprocess_image(image):
    """تحويل الصورة إلى أبيض وأسود لتحسين دقة OCR"""
    image = np.array(image)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, 128, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
    return binary

def highlight_low_confidence_words(image, data, confidence_threshold=80):
    """تمييز الكلمات منخفضة الثقة بمستطيلات صفراء"""
    draw = ImageDraw.Draw(image)
    for i, word in enumerate(data['text']):
        if word.strip():
            try:
                confidence = int(data['conf'][i]) if data['conf'][i] not in [None, ""] else 0
                x, y, w, h = data['left'][i], data['top'][i], data['width'][i], data['height'][i]

                if confidence < confidence_threshold and confidence >= 0:
                    draw.rectangle([x, y, x + w, y + h], outline="yellow", width=3)
            except (ValueError, IndexError) as e:
                print(f"❌ خطأ أثناء تمييز الكلمات: {e}")
    return image

def extract_text_with_confidence(data, confidence_threshold=80, image_width=0, image_height=0):
    """تحليل النصوص وإرجاع الكلمات مع التصحيحات والإحداثيات"""
    extracted_text = []
    for i, word in enumerate(data['text']):
        if word.strip():
            confidence = int(data['conf'][i]) if data['conf'][i] not in [None, ""] else 0
            extracted_text.append({
                "word": word,
                "confidence": confidence,
                "highlighted": confidence < confidence_threshold,  # ✅ تحديد الكلمات منخفضة الثقة
                "bounding_box": {  # ✅ إضافة حدود الكلمة وإرجاع أبعاد الصورة
                    "x": data["left"][i],
                    "y": data["top"][i],
                    "w": data["width"][i],
                    "h": data["height"][i],
                    "original_width": image_width,  
                    "original_height": image_height
                }
            })
    return extracted_text

def ocr_with_highlighting(pdf_path, upload_folder, confidence_threshold=80):
    """تحليل النصوص من PDF وإضافة تمييز للكلمات منخفضة الثقة"""
    try:
        print(f"📂 تحميل PDF من: {pdf_path}")
        images = convert_from_path(pdf_path)

        if not images:
            print("❌ لم يتم العثور على صفحات في ملف PDF!")
            return []

        pages_data = []
        for page_num, image in enumerate(images, start=1):
            print(f"📄 معالجة الصفحة {page_num}...")

            # الحصول على أبعاد الصورة الأصلية
            image_width, image_height = image.size

            # حفظ الصورة الأصلية
            original_image_path = f"original_page_{page_num}.png"
            full_original_path = os.path.join(upload_folder, original_image_path)
            image.save(full_original_path)

            # معالجة الصورة لزيادة الدقة
            binary_image = preprocess_image(image)

            # استخدام pytesseract لاستخراج البيانات
            data = pytesseract.image_to_data(
                Image.fromarray(binary_image),
                output_type=pytesseract.Output.DICT,
                lang="ara+eng"
            )

            # إنشاء نسخة من الصورة مع الكلمات منخفضة الثقة المظللة
            highlighted_image_path = f"highlighted_page_{page_num}.png"
            full_highlighted_path = os.path.join(upload_folder, highlighted_image_path)
            highlighted_image = highlight_low_confidence_words(image, data, confidence_threshold)
            highlighted_image.save(full_highlighted_path)

            # استخراج النصوص مع إحداثياتها الدقيقة
            extracted_text = extract_text_with_confidence(data, confidence_threshold, image_width, image_height)

            pages_data.append({
                "page_number": page_num,
                "original_image": original_image_path,
                "highlighted_image": highlighted_image_path,
                "text": extracted_text
            })

        print(f"✅ تمت معالجة {len(pages_data)} صفحة بنجاح!")
        return pages_data

    except Exception as e:
        print(f"❌ خطأ أثناء تنفيذ OCR: {e}")
        return []

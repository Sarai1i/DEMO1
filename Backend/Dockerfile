# استخدم Python 3.9 كأساس
FROM python:3.11

# تعيين مجلد العمل داخل الحاوية
WORKDIR /app


RUN apt-get update && apt-get install -y libgl1-mesa-glx

# نسخ ملفات المشروع إلى داخل الحاوية
COPY . .


RUN pip install --upgrade pip

# تثبيت المتطلبات
RUN pip install --no-cache-dir -r requirements.txt

# فتح المنفذ الذي يعمل عليه Flask
EXPOSE 5000

# تشغيل التطبيق
CMD ["python", "app.py"]

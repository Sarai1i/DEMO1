# 🟢 بناء تطبيق React
FROM node:18 AS build
WORKDIR /app

# نسخ ملفات الـ package.json وتثبيت الحزم
COPY package.json package-lock.json ./
RUN npm install

# نسخ بقية الملفات وبناء التطبيق
COPY . .
RUN npm run build

# 🟢 تشغيل React باستخدام Nginx
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html

# ملف إعدادات Nginx لدعم React Router
COPY nginx.conf /etc/nginx/conf.d/default.conf

# فتح المنفذ 80
EXPOSE 80

# تشغيل Nginx
CMD ["nginx", "-g", "daemon off;"]

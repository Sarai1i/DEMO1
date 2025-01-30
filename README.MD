# RAQIM

## Table of Contents
- [Project Overview](#project-overview)
- [Features](#features)
  - [OCR Training & Fine-Tuning](#ocr-training--fine-tuning)
  - [Administrator Report](#administrator-report)
---

## Project Overview
This project enhances **OCR accuracy for Arabic text** by implementing a **fine-tuning and training pipeline** and providing an **Administrator Report** for performance monitoring. It integrates **reCAPTCHA validation**, **user corrections**, and **bad detection for words**, ensuring a **self-improving OCR model** for high-accuracy Arabic text recognition.

---

## Features

### 📌 1. OCR Training & Fine-Tuning
 Fine-tunes the OCR model using **a diverse Arabic dataset** (printed, handwritten, multiple fonts).  
 Improves **Character Error Rate (CER) and Word Error Rate (WER)**.  
 track **OCR Performance**.  

### 📌 2. Administrator Report
 Displays ** OCR performance metrics** (confidence levels, accuracy trends, flagged words).  
 Supports **filtering by date, confidence levels, and document types**.  
 Enables **PDF report downloads** with pagination.  
---

## Installation & Setup

### 1. Prerequisites
- **Backend:** Python 3.x, Flask / FastAPI, PostgreSQL / MongoDB  
- **ML Frameworks:** TensorFlow / PyTorch, OpenCV / Tesseract OCR  
- **Frontend:** React.js 
- **Security:** HTTPS, Authentication  
- **Other:** Git, Node.js, Docker

### 2. Setup Instructions
#### 🏗 Clone the Repository
```bash
git clone https://github.com/your-repo/OCR-Training-Admin-Report.git
cd OCR-Training-Admin-Report

# Use official Python image
FROM python:3.9

# Set working directory
WORKDIR /app

# Copy all project files
COPY . /app

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Command to run the app
CMD ["python", "app.py"]

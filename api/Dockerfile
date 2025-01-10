FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file and the setup.py into the container
COPY requirements.txt /app/requirements.txt
COPY setup.py /app/setup.py

# Install git and other dependencies
RUN apt-get update && \
    apt-get install -y git && \
    rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --upgrade pip
# Explicitly install requests to ensure it's available
RUN pip install requests
RUN pip install flask_socketio

# Install your project as a package using setup.py
RUN pip install -e .

# Copy the rest of your application code to the container
COPY . /app

# Set PYTHONPATH environment variable
ENV PYTHONPATH="/app"

# Expose the port that your Flask app runs on
EXPOSE 5000

# Define the environment variable for Flask
ENV FLASK_APP=server.py
ENV FLASK_RUN_HOST=0.0.0.0

# Run the application
CMD ["flask", "run"]

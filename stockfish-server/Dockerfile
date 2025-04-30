# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV STOCKFISH_PATH=/usr/local/bin/stockfish

# Set the working directory in the container
WORKDIR /app

# Install dependencies, download, extract, and clean up Stockfish in one layer
RUN apt-get update && apt-get install -y --no-install-recommends \
        wget \
        tar \
        ca-certificates \
    # Define variables for Stockfish version and tag
    # Use the standard x86-64 build for better compatibility
    && STOCKFISH_VERSION=stockfish-ubuntu-x86-64 \
    && STOCKFISH_TAG=sf_17.1 \
    # Download the correct .tar file
    && wget "https://github.com/official-stockfish/Stockfish/releases/download/${STOCKFISH_TAG}/${STOCKFISH_VERSION}.tar" -O stockfish.tar \
    # Extract the tarball
    && tar -xf stockfish.tar \
    # Move the executable from the correct extracted path
    # The executable name inside the tarball matches STOCKFISH_VERSION
    && mv "stockfish/${STOCKFISH_VERSION}" "${STOCKFISH_PATH}" \
    # Make it executable
    && chmod +x "${STOCKFISH_PATH}" \
    # Clean up downloaded file and the extracted 'stockfish' directory
    && rm -rf stockfish.tar stockfish \
    # Remove only wget, keep tar as it's a dependency for dpkg
    && apt-get purge -y --auto-remove wget \
    # Clean apt cache
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application
CMD ["python", "app.py"]

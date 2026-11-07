FROM mcr.microsoft.com/playwright/python:v1.55.0-noble
ENV USER=container HOME=/home/container PYTHONUNBUFFERED=1
RUN useradd -m -d /home/container container
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY bot.py .
COPY entrypoint.sh /entrypoint.sh
RUN chmod 755 /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]

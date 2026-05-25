# gunicorn.conf.py — CiteFlow 生产服务器配置
# 启动: cd ~/Desktop/CiteFlow && source .venv/bin/activate && gunicorn api:app -c gunicorn.conf.py

import os
bind = f"0.0.0.0:{os.environ.get('PORT', '8000')}"
workers = 4
worker_class = "uvicorn.workers.UvicornWorker"

# 超时（扫描最长 7 分钟，留余量）
timeout = 600
graceful_timeout = 30
keepalive = 5

# 日志
accesslog = "-"
errorlog = "-"
loglevel = "info"

# 进程命名
proc_name = "citeflow-api"

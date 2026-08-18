#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把内网穿透拿到的公网地址写进 services/request.ts 的 BASE_URL。
用法:
    python set-base-url.py https://abc123.ngrok.io
    python set-base-url.py https://abc123.cpolar.top
脚本会自动补上 /api/v1 后缀。
"""
import sys
import re
import os

if len(sys.argv) < 2:
    print("用法: python set-base-url.py <公网地址，例如 https://abc123.ngrok.io>")
    sys.exit(1)

new_url = sys.argv[1].strip().rstrip('/')
if not new_url.startswith('http'):
    print("错误: 地址必须以 http:// 或 https:// 开头")
    sys.exit(1)

script_dir = os.path.dirname(os.path.abspath(__file__))
target = os.path.abspath(os.path.join(script_dir, '..', 'services', 'request.ts'))

if not os.path.exists(target):
    print(f"未找到 request.ts: {target}")
    sys.exit(1)

with open(target, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"export const BASE_URL = '[^']*';"
replacement = f"export const BASE_URL = '{new_url}/api/v1';"

new_content, n = re.subn(pattern, replacement, content)
if n == 0:
    print("未在 request.ts 中找到 'export const BASE_URL' 行，请检查文件格式")
    sys.exit(1)

with open(target, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"已更新 BASE_URL -> {new_url}/api/v1")
print(f"文件: {target}")
print("下一步: 微信开发者工具 Ctrl+B 重新编译，并勾选「不校验合法域名」")

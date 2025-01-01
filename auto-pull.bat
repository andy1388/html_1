@echo off
title Git 自动拉取工具

:: 设置颜色
color 0A

:: 显示启动信息
echo Git 自动拉取工具已启动
echo 每5分钟自动从 GitHub 拉取更新
echo 按 Ctrl+C 可以退出程序
echo.

:: 记录开始时间
set start_time=%time%
echo 开始时间: %start_time%
echo.

:loop
:: 显示当前时间
echo [%date% %time%] 正在从 GitHub 拉取更改...

:: 执行 git pull
git pull origin main

:: 显示分隔线
echo ----------------------------------------

:: 等待 5 分钟 (300 秒)
timeout /t 300 /nobreak > nul

:: 继续循环
goto loop 
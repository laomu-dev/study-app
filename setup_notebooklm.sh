#!/bin/bash

echo "=========================================="
echo "  NotebookLM MCP 设置脚本"
echo "=========================================="
echo ""

# 检查是否已安装 notebooklm-mcp
if ! command -v uv &> /dev/null; then
    echo "❌ 错误: uv 未安装"
    echo "请先安装 uv: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

echo "✅ notebooklm-mcp 已安装"
echo ""
echo "📋 下一步:"
echo ""
echo "1. 访问 https://notebooklm.google.com"
echo "2. 创建或选择一个笔记本"
echo "3. 复制完整的 URL（应该类似: https://notebooklm.google.com/notebook/xxx）"
echo "4. 运行以下命令进行初始化:"
echo ""
echo "   uv run notebooklm-mcp init https://notebooklm.google.com/notebook/YOUR_NOTEBOOK_ID"
echo ""
echo "5. 完成认证后，测试连接:"
echo ""
echo "   uv run notebooklm-mcp test"
echo ""
echo "6. 启动服务器:"
echo ""
echo "   uv run notebooklm-mcp --config notebooklm-config.json server"
echo ""
echo "详细说明请查看: ./NOTEBOOKLM_SETUP.md"

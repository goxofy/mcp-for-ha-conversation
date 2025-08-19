# MCP Server for Home Assistant Conversation Agent

这是一个简单的 MCP 服务器，用于将用户的智能家居控制需求传递给 Home Assistant 的 conversation agent（语音助手）。

## 功能特性

- 将用户的对话原封不动地传递给 Home Assistant
- 支持 Home Assistant 的 conversation agent API
- 返回语音助手的完整响应结果

## 安装

1. 克隆此仓库
2. 安装依赖：
```bash
npm install
```

### 作为 CLI 全局安装（从 npm）

```bash
npm install -g mcp-for-ha-conversation
```

安装后可直接运行：

```bash
mcp-for-ha-conversation
```

## 构建和运行

1. 构建项目：
```bash
npm run build
```

2. 运行服务器：
```bash
npm start
```

## 使用方法

### 配置 Home Assistant

1. 确保您的 Home Assistant 实例正在运行
2. 创建一个长期访问令牌（在 Home Assistant 设置 > 长期访问令牌中）
3. 记录您的 Home Assistant URL（通常是 http://localhost:8123）

### MCP 工具调用

服务器提供了一个工具 `ha_conversation`，参数如下：

- `text` (必需): 要发送给 Home Assistant 的对话文本

### 示例调用

```javascript
{
  "name": "ha_conversation",
  "arguments": {
    "text": "请打开客厅的灯"
  }
}
```

## 在 Claude Desktop 中配置

在您的 Claude Desktop 配置文件中添加：

```json
{
  "mcpServers": {
    "ha-conversation": {
      "command": "node",
      "args": ["/path/to/your/server/dist/index.js"],
      "env": {
        "HOME_ASSISTANT_URL": "http://localhost:8123",
        "HOME_ASSISTANT_TOKEN": "your_token_here",
        "HOME_ASSISTANT_AGENT_ID": "optional_agent_id",
        "HOME_ASSISTANT_INSECURE": "true"
      }
    }
  }
}
```

或使用全局安装的可执行文件：

```json
{
  "mcpServers": {
    "ha-conversation": {
      "command": "mcp-for-ha-conversation",
      "env": {
        "HOME_ASSISTANT_URL": "http://localhost:8123",
        "HOME_ASSISTANT_TOKEN": "your_token_here",
        "HOME_ASSISTANT_AGENT_ID": "optional_agent_id",
        "HOME_ASSISTANT_INSECURE": "true"
      }
    }
  }
}
```

## 注意事项

- 确保您的 Home Assistant 实例可以从运行此服务器的机器访问
- 建议使用 HTTPS 来保护您的 Home Assistant 连接
- 此服务器会缓存您的 Home Assistant 配置，重启后需要重新提供
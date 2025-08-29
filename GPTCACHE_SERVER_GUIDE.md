# GPTCache Server Guide

A comprehensive guide to using the GPTCache server with dynamic eviction policy switching, mock LLM support, and real-time cache monitoring.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Server Endpoints](#server-endpoints)
- [Eviction Policies](#eviction-policies)
- [Configuration](#configuration)
- [Examples](#examples)
- [Monitoring & Statistics](#monitoring--statistics)
- [Advanced Usage](#advanced-usage)
- [Troubleshooting](#troubleshooting)

## Overview

The GPTCache server provides a REST API interface for caching LLM responses with intelligent eviction policies. Key features include:

- **OpenAI-compatible API** - Drop-in replacement for OpenAI endpoints
- **Dynamic policy switching** - Change eviction strategies without restart
- **Real-time monitoring** - Cache statistics and performance metrics
- **Mock LLM support** - For testing and development
- **Multiple eviction policies** - LRU, LFU, FIFO, RR, and Quality Score

## Quick Start

### 1. Installation

```bash
# Install dependencies
pip install fastapi uvicorn pydantic starlette ruamel.yaml numpy cachetools requests

# Or using the requirements file
pip install -r requirements.txt
```

### 2. Start the Server

```bash
# Basic server with OpenAI proxy
python -m gptcache_server.server --openai true --host 0.0.0.0 --port 8000

# With custom configuration
python -m gptcache_server.server \
  --openai true \
  --openai-cache-config-file server_config.yml \
  --host 0.0.0.0 \
  --port 8000
```

### 3. Test the Server

```bash
# Health check
curl http://localhost:8000/

# Make a chat completion request
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello world!"}]
  }'
```

## Server Endpoints

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/v1/chat/completions` | POST | OpenAI-compatible chat completions |
| `/put` | POST | Manually add cache entry |
| `/get` | POST | Retrieve cache entry |
| `/flush` | POST | Clear all cache data |

### Cache Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/cache/status` | GET | Get detailed cache statistics and status |
| `/cache/stats-summary` | GET | Get summarized cache statistics |
| `/cache/policies` | GET | List available eviction policies |
| `/cache/switch-policy` | POST | Switch eviction policy dynamically |

### Administrative

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/cache_file` | GET | Download cache data (requires key) |

## Eviction Policies

### Available Policies

#### 1. **LRU (Least Recently Used)**
- **Description**: Evicts least recently accessed items
- **Use Case**: General-purpose caching with good temporal locality
- **Parameters**: `maxsize`, `clean_size`

#### 2. **LFU (Least Frequently Used)**
- **Description**: Evicts least frequently accessed items  
- **Use Case**: Workloads with clear popularity patterns
- **Parameters**: `maxsize`, `clean_size`

#### 3. **FIFO (First In, First Out)**
- **Description**: Evicts oldest items first
- **Use Case**: Simple, predictable eviction behavior
- **Parameters**: `maxsize`, `clean_size`

#### 4. **RR (Random Replacement)**
- **Description**: Evicts items randomly
- **Use Case**: When no clear access pattern exists
- **Parameters**: `maxsize`, `clean_size`

#### 5. **Quality Score (Advanced)**
- **Description**: Evicts based on similarity scores, recency, and frequency
- **Use Case**: Intelligent caching with quality-aware decisions
- **Parameters**: 
  - `maxsize`, `clean_size`
  - `learning_rate` (0.0-1.0): Rate of quality score updates
  - `quality_weight` (0.0-1.0): Weight for quality component
  - `recency_weight` (0.0-1.0): Weight for recency component  
  - `frequency_weight` (0.0-1.0): Weight for frequency component
  - **Note**: Weights must sum to 1.0

### Switching Policies

```bash
# Switch to LRU
curl -X POST http://localhost:8000/cache/switch-policy \
  -H "Content-Type: application/json" \
  -d '{
    "policy": "LRU",
    "maxsize": 10,
    "clean_size": 3
  }'

# Switch to Quality Score with custom weights
curl -X POST http://localhost:8000/cache/switch-policy \
  -H "Content-Type: application/json" \
  -d '{
    "policy": "quality_score",
    "maxsize": 6,
    "clean_size": 2,
    "learning_rate": 0.5,
    "quality_weight": 0.7,
    "recency_weight": 0.2,
    "frequency_weight": 0.1
  }'
```

## Configuration

### Server Configuration File (YAML)

```yaml
# server_config.yml
embedding: onnx
embedding_config: {}

storage_config:
  data_dir: ./server_cache_data
  manager: sqlite,faiss
  vector_params:
    dimension: 768
  eviction_manager: quality_score
  eviction_params:
    maxsize: 4
    clean_size: 1
    learning_rate: 0.3
    quality_weight: 0.8
    recency_weight: 0.15
    frequency_weight: 0.05

evaluation: distance
evaluation_config: {}

pre_function: last_content
post_function: first

config:
  similarity_threshold: 0.8
```

### Command Line Options

```bash
python -m gptcache_server.server --help
```

| Option | Description | Default |
|--------|-------------|---------|
| `--host` | Hostname to listen on | localhost |
| `--port` | Port to listen on | 8000 |
| `--cache-dir` | Cache data directory | gptcache_data |
| `--cache-file-key` | Key for cache file downloads | "" |
| `--cache-config-file` | Cache configuration file | None |
| `--openai` | Enable OpenAI proxy | False |
| `--openai-cache-config-file` | OpenAI cache config file | None |

## Examples

### Basic Usage

```python
import requests

# Server endpoint
BASE_URL = "http://localhost:8000"

# Make a chat completion request
response = requests.post(f"{BASE_URL}/v1/chat/completions", json={
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "What is Python?"}]
})

result = response.json()
print(f"From cache: {result.get('gptcache', False)}")
print(f"Response: {result['choices'][0]['message']['content']}")
```

### Cache Monitoring

```python
import requests
import json

def get_cache_status():
    response = requests.get("http://localhost:8000/cache/status")
    return response.json()

def print_cache_stats():
    stats = get_cache_status()
    print(json.dumps(stats, indent=2))

# Monitor cache after each request
print_cache_stats()
```

### Policy Experimentation

```python
import requests
import time

def switch_policy(policy, **params):
    data = {"policy": policy, **params}
    response = requests.post("http://localhost:8000/cache/switch-policy", json=data)
    return response.json()

def make_request(content):
    response = requests.post("http://localhost:8000/v1/chat/completions", json={
        "model": "gpt-3.5-turbo",
        "messages": [{"role": "user", "content": content}]
    })
    return response.json()

# Experiment with different policies
policies = ["LRU", "LFU", "FIFO", "RR"]

for policy in policies:
    print(f"\n=== Testing {policy} ===")
    switch_policy(policy, maxsize=5, clean_size=2)
    
    # Make some requests
    for i in range(3):
        result = make_request(f"Test {policy} request {i}")
        print(f"Request {i}: From cache = {result.get('gptcache', False)}")
        time.sleep(0.1)
```

## Monitoring & Statistics

### Cache Status Response

#### Quality Score Policy
```json
{
  "cache_size": 3,
  "max_size": 6,
  "utilization_percent": 50.0,
  "total_accesses": 8,
  "policy": "Quality Score Eviction",
  "avg_quality_score": 0.756,
  "quality_range": {
    "min": 0.100,
    "max": 1.270
  },
  "avg_access_count": 2.3,
  "weights": {
    "quality": 0.7,
    "recency": 0.2,
    "frequency": 0.1
  },
  "learning_rate": 0.5
}
```

#### Memory-Based Policies (LRU, LFU, FIFO, RR)
```json
{
  "cache_size": 2,
  "max_size": 4,
  "utilization_percent": 50.0,
  "policy": "LRU Eviction",
  "policy_type": "memory",
  "current_size_bytes": 2,
  "cache_keys_count": 2,
  "access_order": "Most recent items are kept",
  "sample_cached_items": ["key_1", "key_2"]
}
```

#### Stats Summary Response
```json
{
  "current_policy": "LFU Eviction",
  "cache_utilization": "2/4 (50.0%)",
  "policy_type": "memory",
  "available_stats": [
    "cache_size", "max_size", "utilization_percent", 
    "cache_keys_count", "sample_cached_items"
  ],
  "key_metrics": {
    "items_cached": 2,
    "utilization": 50.0
  },
  "policy_insight": "Most frequently used items are kept, less popular items evicted"
}
```

### Key Metrics

- **cache_size**: Current number of cached items
- **max_size**: Maximum cache capacity
- **utilization_percent**: Cache fullness percentage
- **total_accesses**: Total cache access count
- **avg_quality_score**: Average quality score (Quality Score policy only)
- **quality_range**: Min/max quality scores
- **avg_access_count**: Average accesses per cached item

### Real-time Monitoring Script

```bash
#!/bin/bash
# monitor_cache.sh

while true; do
  echo "=== $(date) ==="
  curl -s http://localhost:8000/cache/status | python -m json.tool
  echo ""
  sleep 5
done
```

## Advanced Usage

### Custom Mock Function

The server includes a mock LLM function for testing. You can modify it in `gptcache_server/server.py`:

```python
def mock_chat_completion(*args, **kwargs):
    """Custom mock LLM implementation."""
    messages = kwargs.get("messages", [])
    user_content = messages[-1]["content"] if messages else ""
    
    # Custom response logic
    if "weather" in user_content.lower():
        content = "It's sunny and 72°F today!"
    else:
        content = f"[MOCK] Answer to: {user_content}"
    
    return {
        "choices": [{"message": {"role": "assistant", "content": content}}],
        "created": int(time.time()),
        "usage": {"completion_tokens": 0, "prompt_tokens": 0, "total_tokens": 0},
        "object": "chat.completion",
    }
```

### Integration with Real OpenAI

To use real OpenAI instead of the mock:

1. Set your OpenAI API key: `export OPENAI_API_KEY="your-key"`
2. Remove the mock assignment in server.py:
   ```python
   # Comment out this line:
   # openai.ChatCompletion.llm = mock_chat_completion
   ```
3. Restart the server

### Docker Deployment

```dockerfile
# Dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["python", "-m", "gptcache_server.server", "--openai", "true", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
# Build and run
docker build -t gptcache-server .
docker run -p 8000:8000 gptcache-server
```

## Troubleshooting

### Common Issues

#### 1. Server Won't Start
```bash
# Check if port is in use
lsof -i :8000

# Kill existing process
pkill -f "gptcache_server.server"
```

#### 2. Policy Switch Fails
- Ensure weights sum to 1.0 for Quality Score policy
- Check parameter names match the policy requirements
- Verify policy name is valid (case-insensitive)

#### 3. Cache Not Working
```bash
# Check cache status
curl http://localhost:8000/cache/status

# Verify OpenAI proxy is enabled
# Server should show: "OpenAI cache is not initialized" if disabled
```

#### 4. Memory Issues
- Reduce `maxsize` parameter
- Increase `clean_size` for more aggressive eviction
- Monitor system memory usage

### Debug Mode

Add logging to see detailed server behavior:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Performance Tuning

1. **Cache Size**: Balance between hit rate and memory usage
2. **Clean Size**: Larger values reduce eviction frequency
3. **Learning Rate**: Higher values adapt faster to new patterns
4. **Weights**: Adjust based on your workload characteristics

### Logs and Monitoring

Server logs show:
- Cache hits/misses
- Policy switches
- Request processing
- Error conditions

```bash
# Follow server logs
tail -f server.log

# Or run server in foreground to see logs
python -m gptcache_server.server --openai true --host 0.0.0.0 --port 8000
```

## API Reference

### POST /cache/switch-policy

Switch eviction policy dynamically.

**Request Body:**
```json
{
  "policy": "string",           // Required: LRU, LFU, FIFO, RR, quality_score
  "maxsize": 10,               // Optional: Maximum cache size (default: 4)
  "clean_size": 3,             // Optional: Items to evict when full (default: 1)
  
  // Quality Score specific (optional):
  "learning_rate": 0.3,        // 0.0-1.0, default: 0.3
  "quality_weight": 0.8,       // 0.0-1.0, default: 0.8
  "recency_weight": 0.15,      // 0.0-1.0, default: 0.15
  "frequency_weight": 0.05     // 0.0-1.0, default: 0.05
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully switched to LRU eviction policy",
  "policy": "LRU",
  "maxsize": 10,
  "clean_size": 3,
  "cache_reset": true
}
```

### GET /cache/policies

List all available eviction policies.

**Response:**
```json
{
  "available_policies": [
    {
      "name": "LRU",
      "description": "Least Recently Used - evicts least recently accessed items",
      "type": "memory"
    },
    {
      "name": "quality_score", 
      "description": "Quality Score - evicts based on similarity scores, recency, and frequency",
      "type": "advanced",
      "parameters": {
        "learning_rate": "Rate of quality score updates (0.0-1.0)",
        "quality_weight": "Weight for quality component",
        "recency_weight": "Weight for recency component",
        "frequency_weight": "Weight for frequency component"
      }
    }
  ]
}
```

---

## Support

For issues, questions, or contributions:
- Check the troubleshooting section above
- Review server logs for error details
- Ensure all dependencies are installed correctly
- Verify configuration file syntax

**Happy Caching! 🚀**

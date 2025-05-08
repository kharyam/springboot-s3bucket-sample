# buckettest

Sample springboot app which accesses an object bucket using env var params. Rest service for listing bucket contents and retrieve an object by key.

```bash
export AWS_SECRET_ACCESS_KEY=....
export AWS_ACCESS_KEY_ID=D....
export BUCKET_HOST=http://nas.home:9000
export BUCKET_NAME=vllm-bucket
```
# Stage 1: Build dependencies
FROM python:3.11-slim-bullseye AS builder

WORKDIR /app
COPY requirements.txt .

# Install pip and wheel
RUN pip install --no-cache-dir --upgrade pip wheel

# Force install of manylinux2014 wheels (compatible with AWS Lambda)
# This prevents downloading binaries that require newer GLIBC versions
RUN pip install \
    --no-cache-dir \
    --platform manylinux2014_x86_64 \
    --target /app/dependencies \
    --implementation cp \
    --python-version 3.11 \
    --only-binary=:all: \
    --upgrade \
    -r requirements.txt

# Stage 2: Runtime
FROM public.ecr.aws/lambda/python:3.11

COPY --from=builder /app/dependencies ${LAMBDA_TASK_ROOT}
COPY . ${LAMBDA_TASK_ROOT}

CMD [ "main.handler" ]
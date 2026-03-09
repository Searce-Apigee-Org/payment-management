# Payment Management API

## Overview

The Payment Management API provides endpoints and utilities to fetch subscription attributes for Payment Management accounts. It is built using Hapi.js and incorporates Docker for containerized development and deployment.

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Local Running Steps](#local-running-steps)
- [Test Running Steps](#test-running-steps)
- [API Endpoints](#api-endpoints)

---

## Prerequisites

Ensure the following tools are installed on your machine:

- [Docker](https://www.docker.com/): Containerization platform
- [Docker Compose](https://docs.docker.com/compose/): Tool for managing multi-container Docker applications

Verify installations using:

```bash
docker -v
docker-compose -v
```

---

## Local Running Steps

Follow these steps to run the application locally:

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Set up the environment file**:
   - Create a .env file in the project root directory.
   - Copy the contents of .env.example into the new .env file.

3. **Start the application**:
   Use Docker Compose to build and run the application:

   ```bash
   docker-compose up --build
   ```

   The application will start at:
   - Hapi.js API: `http://localhost:3000`

4. **Access the Swagger UI**:
   Visit the Swagger UI for API documentation at:
   - `http://localhost:3000/docs`

5. **Stop the application**:
   To stop and remove the containers, run:
   ```bash
   docker-compose down
   ```

---

## Test Running Steps

To run tests in a Dockerized environment:

1. **Build the Docker image**:

   ```bash
   docker-compose build
   ```

2. **Run the tests**:
   The project uses **Lab** and **Sinon** for testing. Run tests with:

   ```bash
   docker-compose run mockapp npm test
   ```

3. **View test results**:
   Test results will be displayed in your terminal.

4. **Clean up**:
   Stop and remove the containers:
   ```bash
   docker-compose down
   ```

---

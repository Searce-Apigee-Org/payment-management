# Hapi.js Microservice Template

This is a base template for building microservices using **Hapi.js**. It includes a sample codebase, folder structure, and naming conventions for the purpose of API onboarding.

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Requirements](#requirements)
4. [Folder Structure](#folder-structure)
5. [Local Running Steps](#local-running-steps)
6. [Test Running Steps](#test-running-steps)
7. [API Dev Portal](#api)

## Overview

This repository provides a **Hapi.js microservice** template that is provisioned automatically via Microservice Onboarding on SSP. It supports common features like logging, validation, and API documentation (using **Swagger**). The template comes pre-configured with **Redis**, **MongoDB**, and **Core Libraries** for standardization across microservices.

The project uses **Node.js** with the **ES Modules** syntax (`import`/`export`), and it is fully configurable for different environments using **dotenv** and the **config** package.

## Features

- **Hapi.js Framework** for building REST APIs
- **Swagger UI** for API documentation
- **Validation** using **Joi**
- **Error Handling** with **Boom** for HTTP-friendly error responses
- **Redis** integration with **ioredis**
- **MongoDB** integration with **Mongoose**
- **Husky** tool managed by Git hooks to enforce necessary checks and actions before commiting
- Pre-configured **unit** and **integration tests** using **Lab** and **Sinon**
- **Prettier** and **ESLint** integration for code formatting and linting
- **Dockerized Environment** for easy local development and deployment
  - Run the entire application stack (Hapi.js, MongoDB, Redis) in containers using **Docker Compose.**
  - Simplified local development setup without needing to install dependencies manually.

## Requirements

- **Docker**
- **Docker Compose**

## Folder Structure

The folder structure for this microservice is as follows:

```
MICROSERVICE-TEMPLATE/
├── .husky/
├── convict/
├── docs/
│   ├── attributes.
│   ├── swagger.yaml
├── node_modules/
├── src/
│   ├── models/
│   │   ├── mockModel.js
│   ├── plugins/
│   ├── repositories/
│   │   ├── mongo/
│   │   ├── redis/
│   │   ├── index.js
│   ├── routes/
│   │   ├── v1/
│   │   │   ├── index.js
│   ├── scripts/
│   ├── services/
│   │   ├── v1/
│   │   │   ├── index.js
│   ├── util/
│   ├── validations/
│   │   ├── v1/
│   │   │   ├── index.js
│   │   │   ├── server.js
│   │   ├── index.js
│   ├── index.js
│   ├── server.js
├── test/
├── .env
├── .gitignore
├── .prettierrc.json
├── docker-compose.yaml
├── eslint.config.mjs
├── package-lock.json
├── package.json
├── README.md
```

## Folder Structure Definitions

### Root-Level Files:

1. **.husky/**:
   - This directory contains Git hooks managed by the Husky tool. These hooks enforce certain checks or actions before or after Git commands, such as pre-commit, pre-push, or commit-msg hooks. This ensures code quality and consistency (e.g., running linters or tests before committing).

2. **convict/**:
   - Contains configuration files for various environments and services. It might include database connections, environment-specific configurations, or application-specific settings. These configurations are generally imported throughout the application.

3. **docs/**:
   - Includes documentation files, such as swagger.yaml and attributes.json.

4. **node_modules/**:
   - This folder contains all the installed dependencies for the project. It is generated when you run `npm install` and should not be modified directly. It’s listed in `.gitignore` to avoid version control.

5. **test/**:
   - Directory contains unit tests that verify the functionality of individual components or modules in isolation. These tests ensure that functionalities of the application behaves as expected under various conditions.

6. **.env**:
   - A file used to store environment variables for the application, such as database credentials, API keys, and configuration settings. These are usually loaded at runtime and provide a flexible way to configure the application across different environments (development, production).

7. **.gitignore**:
   - Specifies which files and directories Git should ignore when committing changes. Common files to ignore include `node_modules/`, `.env`, log files, and build artifacts.

8. **.prettierrc.json**:
   - Configuration file for Prettier, a code formatting tool. It specifies how code should be formatted, ensuring consistency across the codebase, such as indentation style and line length.

9. **docker-compose.yaml**:
   - A configuration file used by Docker Compose to define and manage multi-container Docker applications. It specifies services like databases, queues, or other microservices that the application depends on, and how they interact.

10. **eslint.config.mjs**:

- Configuration for ESLint, a static code analysis tool that helps identify and fix problematic patterns in JavaScript code. It defines linting rules and which files to lint.

11. **package-lock.json**:

- A file that locks the versions of the dependencies installed in the project, ensuring that the same versions are installed every time `npm install` is run, even across different environments.

12. **package.json**:

- The manifest file for the project that includes metadata about the project (e.g., name, version, scripts) and a list of dependencies (e.g., packages required to run the project).

13. **README.md**:

- Documentation that explains how to set up, run, and develop the project. It typically includes installation instructions, API documentation, and other essential details.

---

### `src/` Directory:

1. **models/**:
   - Contains data models that define how data is structured and interacted with in the application. Models are often used to interact with databases or define the data schema.

2. **plugins/**:
   - Contains reusable plugins that extend the functionality of the application.

3. **repositories/**:
   - Contains files responsible for managing data access. Repositories abstract the details of interacting with databases or downstream services.

4. **scripts/**:
   - Utility scripts.

5. **routes/**:
   - Contains files that define API routes and endpoints. Routes map incoming requests to services.

6. **services/**:
   - Contains the core business logic of the application. Services handle operations that are typically invoked by routes handler.

7. **util/**:
   - Contains utility functions and helper methods used across various parts of the application.

8. **validations/**:
   - Contains validation logic, usually using a validation library (e.g., Joi), to ensure incoming request data is correct and meets the required schema.

9. **index.js**:
   - Entry point for the application.

10. **server.js**:
    - Configures and starts the Hapi.js server.

The folder structure is designed to ensure that concerns are separated, making it easier to scale the microservice and maintain a clean architecture.

## Local Running Steps

To run the application locally using Docker, follow these steps:

1. **Install Docker** and **Docker Compose** (if not already installed):
   - [Install Docker](https://docs.docker.com/get-docker/)
   - [Install Docker Compose](https://docs.docker.com/compose/install/)

2. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

3. **Start the application**:
   Use Docker Compose to start the entire stack (Hapi.js, MongoDB, Redis in containers:

   ```bash
   docker-compose up --build
   ```

   This will start the application, and it will be accessible at the following:
   - Hapi.js API: `http://localhost:80`
   - MongoDB: `localhost:27017`
   - Redis: `localhost:6379`

4. **Access the Swagger UI**:
   Once the application is running, you can access the Swagger UI for API documentation at:
   - `http://localhost:80/docs`

5. **Stop the application**:
   To stop the application and containers:
   ```bash
   docker-compose down
   ```

## Test Running Steps

To run the tests inside a Docker container, follow these steps:

1. **Build the Docker image** (if you haven't already):

   ```bash
   docker-compose build
   ```

2. **Run the tests in Docker**:
   The project uses **Lab** and **Sinon** for testing, and you can run tests using the `npm` command in the container. Use the following command to run the tests inside the container:

   ```bash
   docker-compose run app npm test
   ```

   This will run the unit tests in the Dockerized environment.

3. **View the test results**:
   The test results will be displayed in your terminal. You can view logs to troubleshoot any test failures.

4. **Clean up**:
   After running the tests, you can stop the containers with:
   ```bash
   docker-compose down
   ```

## API Dev Portal (ADP)

**API Dev Portal**

As part of project onboarding, **API Dev Portal** is now integrated in the repo templates for projects using APIs. A mock `docs` folder consisting of mock `sequence diagram`, `attributes.json`, and `swagger.yaml`, that serves as a placeholder for your onboarding journey in ADP. This will serve as your initial API documentation in ADP, to start-off you may follow the guides below.

**What is API Dev Portal?**

The API Developer Portal is designed to streamline API documentation management, replacing the previous manual process of using spreadsheets and static documents that were often misaligned or outdated. It is a documentation page for all APIs in Globe projects.

**Checklist:**

Here are the pre-requisites in the **Application** repository. **_Note that we already added a mock/sample docs for you to check and copy as a guide for your next documentation_**

✅ `docs` folder -> located in the root of this repo

✅ `sequence` folder -> located inside the docs folder /docs/sequence/

✅ `sequence diagram` -> located inside the sequence folder. Mermaid sequence diagrams (.mmd)

✅ `swagger.yaml` -> located inside the docs folder. OpenAPI specification of the service; contains all the endpoints.

✅ `attributes.json` -> located inside the docs folder.

✅ `tag` -> applications should have a release tag in order to be detected by ADP

Here are the pre-requisites in the **Infrastructure** repository. **_Note that we already added a mock/sample .`gitlab-ci.yml` for you to check and copy as a guide_**

Cloud environment: **GCP**

✅ `.gitlab-ci.yml` -> located inside the argonaut-helm-pack. Inside the gitlab-ci.yml file there are 5 inputs that needs to be declared:

- `ENVIRONMENT` - environment that you are using dev, staging, or prod

- `RUNNER_TAG` - the runner that you are going to use

- `FILE_PATH` - where the microservices or APIs are declared with image tags. Usually **_helm-chart/dev.yaml, helm-chart/staging.yal, or helm-chart/prod.yaml_**

- `REPO_PATH` - the repository path of the application e.g. **_globetelecom/platforms/digital-platform/application/cxs/_**

- `SWAGGER_HOST` - the domain name or IP address of the server where the API described by a Swagger (OpenAPI) specification is running

✅ `CI/CD Catalog or component` -> declared inside the .gitlab-ci.yml. This is the pipeline that is being called and processed for it to run the ADP

Below is a sample that you may use in your .gitlab-ci.yml. **_Note that you will need to change the 5 inputs to cater your project needs_**

```bash
workflow:
  auto_cancel:
    on_job_failure: all
  rules:
    - if: "$CI_COMMIT_TAG"
      when: never
    - if: '$CI_COMMIT_BRANCH == "main"'
      when: always
    - if: '$CI_COMMIT_BRANCH == "staging"'
      when: always
    - if: '$CI_COMMIT_BRANCH == "dev"'
      when: always
    - when: never

validate-pipeline:
  stage: validation
  script: echo "Pipeline is valid"
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'


include:
  - component: "$CI_SERVER_FQDN/globetelecom/common-toolchains/pipeline-coe/devportal/full-pipeline@v1.1.44"
    rules:
      - if: '$CI_COMMIT_BRANCH == "main"'
        when: always
    inputs:
      ENVIRONMENT: "prod"
      RUNNER_TAG: "sample-platform-infra-prod"
      FILE_PATH: "helm-chart/prod.yaml"
      REPO_PATH: "globetelecom/platforms/digital-platform/application/sample/"
      SWAGGER_HOST: "sample.globe.com.ph"

  - component: "$CI_SERVER_FQDN/globetelecom/common-toolchains/pipeline-coe/devportal/full-pipeline@v1.1.44"
    rules:
      - if: '$CI_COMMIT_BRANCH == "staging"'
        when: always
    inputs:
      ENVIRONMENT: "staging"
      RUNNER_TAG: "sample-platform-infra-staging"
      FILE_PATH: "helm-chart/staging.yaml"
      REPO_PATH: "globetelecom/platforms/digital-platform/application/sample/"
      SWAGGER_HOST: "sample-stg.globe.com.ph"

  - component: "$CI_SERVER_FQDN/globetelecom/common-toolchains/pipeline-coe/devportal/full-pipeline@v1.1.44"
    rules:
      - if: '$CI_COMMIT_BRANCH == "dev"'
        when: always
    inputs:
      ENVIRONMENT: "dev"
      RUNNER_TAG: "sample-platform-infra-dev"
      FILE_PATH: "helm-chart/dev.yaml"
      REPO_PATH: "globetelecom/platforms/digital-platform/application/sample/"
      SWAGGER_HOST: "sample-dev.globe.com.ph"

stages: [validation, diff, setup, run]
```

**How to run the Sample Mock API**

1.) Edit the `/docs/sequence/mockDiagram.mmd` change the `CXS` to your desired name

2.) Edit the `/docs/attributes.json` change the `<<CHANGE_ME>>` identifier and team name to your desired name

3.) Create a release tag

4.) In infra side, create a new branch from dev

5.) From your new branch, add the release tag in the `FILE_PATH` helm-chart/dev.yaml **_check sample dev.yaml structure_**

5.) MR to dev

6.) After a successful run, you may now check the API in [here](https://compass.globe.com.ph/devportal/)

**Sample dev.yaml file**

```bash
microservice:
  app:
    image:
      tag: "v1.0.0"
microservice2:
  app:
    image:
      tag: "v1.0.1"
```

Additional Reference: [COMPASS API Dev Portal](https://compass.globe.com.ph/latest/getting-started/developer-portal/)

# Additional Resources

For more information on integrating with the core libraries, please refer to the CXS Core Library - Local Integration Guide.

LINK: https://globetelecom.atlassian.net/wiki/spaces/ICCSP/pages/5273027350/CXS+Core+Library+-+Local+Integration+Guide

# Use bash for commands
SHELL := /bin/bash

# Default target executed when running 'make' without arguments
.DEFAULT_GOAL := help

# Phony targets are not files
.PHONY: all build run stop clean docker-build pregenerate help

# Variables
APP_NAME := print-qr-app
DOCKER_COMPOSE_FILE := docker-compose.yml

all: build run ## Build the project and run the application

build: ## Compile TypeScript to JavaScript
	@echo "Building TypeScript..."
	pnpm build

run: build ## Build and run the application using Docker Compose
	@echo "Starting application with Docker Compose..."
	docker-compose -f $(DOCKER_COMPOSE_FILE) up --build -d

stop: ## Stop the application running via Docker Compose
	@echo "Stopping application..."
	docker-compose -f $(DOCKER_COMPOSE_FILE) down

clean: ## Remove build artifacts
	@echo "Cleaning build artifacts..."
	rm -rf dist

docker-build: ## Build the Docker image
	@echo "Building Docker image..."
	docker build -t $(APP_NAME) .

pregenerate: build ## Run the PDF pre-generation script (requires 'pregenerate' script in package.json)
	@echo "Running PDF pre-generation..."
	pnpm pregenerate

help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

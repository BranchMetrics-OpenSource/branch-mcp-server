![Branches](badges/coverage-branches.svg)
![Functions](badges/coverage-functions.svg)
![Lines](badges/coverage-lines.svg)
![Statements](badges/coverage-statements.svg)
![Total](badges/coverage-total.svg)

# Branch MCP Server

[![Build Status](https://github.com/BranchMetrics-OpenSource/branch-mcp-server/actions/workflows/main.yml/badge.svg)](https://github.com/BranchMetrics-OpenSource/branch-mcp-server/actions/workflows/main.yml)
[![Latest release](https://img.shields.io/github/v/release/BranchMetrics-OpenSource/branch-mcp-server)](https://github.com/BranchMetrics-OpenSource/branch-mcp-server/releases)

A Model Context Protocol (MCP) server for interacting with the Branch API.

## Features

- **Comprehensive API Coverage:** Provides tools for most of Branch's core APIs, including Deep Linking, Quick Links, QR Codes, App Management, and the Query API.
- **Dockerized:** Designed to be run as a lightweight, portable Docker container.
- **Flexible Configuration:** Configure credentials and settings easily using environment variables.
- **Automated CI/CD:** Includes GitHub Actions for automated testing, versioning, and publishing to the GitHub Container Registry.

## Table of Contents

- [Getting Started](#getting-started)
- [Ways to Connect](#ways-to-connect)
- [Server Configuration](#server-configuration)
- [Available Tools](#available-tools)
- [Contributing](#contributing)
- [Code of Conduct](#code-of-conduct)
- [Changelog](#changelog)

## Getting Started

This server is designed to be run as a Docker container.

### 1. Build the Docker Image

From the root of the project directory, build the Docker image:

```bash
docker build -t branch-mcp .
```

### 2. Run the Docker Container

Run the container, providing your Branch credentials as environment variables.

```bash
docker run --rm -it -p 8080:8080 \
  -e BRANCH_KEY="key_live_..." \
  -e BRANCH_SECRET="secret_live_..." \
  -e API_KEY="api_app_..." \
  branch-mcp
```

## Ways to Connect

### Local Docker Instance

Once the server is running locally, connect your MCP client using the following configuration:

```json
{
  "servers": {
    "branch-mcp": {
      "serverUrl": "http://localhost:8080/mcp"
    }
  }
}
```

### Run in Your Environment

You can deploy our public Docker image (`ghcr.io/branchmetricsopensource/branch-mcp-server`) to your own infrastructure (e.g., Kubernetes, ECS). You can provide credentials as described in the [Server Configuration](#server-configuration) section to make auth easier for your internal users.

### Branch's Hosted MCP Server

For production use, you can connect directly to Branch's hosted MCP server. Use the following configuration:

```json
{
  "servers": {
    "branch-mcp": {
      "serverUrl": "https://ai.branch.io/mcp"
    }
  }
}
```

The hosted server does not have any auth injected into it at runtime, so you will need to provide keys in your calls to it.

## Server Configuration

The server can be configured by passing environment variables to the Docker container. While most credentials can be passed with each tool call, setting them as environment variables can simplify usage by establishing default values.

| Environment Variable | Description                                                                                            | Required |
| -------------------- | ------------------------------------------------------------------------------------------------------ | :------: |
| `BRANCH_KEY`         | Your Branch Key. Used by the App, Deep Linking, and Daily Exports APIs.                                | Optional |
| `BRANCH_SECRET`      | Your Branch Secret. Used by the App, Deep Linking, and Daily Exports APIs.                             | Optional |
| `API_KEY`            | Your Branch API Key (Access Token). Used by the v2 data APIs (Custom, Aggregate, Cohort, Cross-Event). | Optional |
| `AUTH_TOKEN`         | Your Branch Auth Token. Used for sensitive operations like deleting deep links.                        | Optional |
| `APP_ID`             | Your Branch App ID. Can be used for some data APIs.                                                    | Optional |
| `ORGANIZATION_ID`    | Your Branch Organization ID. Can be used for some data APIs.                                           | Optional |

**Note:** If an authentication variable is not set as an environment variable, it **must** be provided as a parameter in every call to a tool that requires it.

## Available Tools

This server provides tools for the following Branch APIs. See the source code in the `src/apis` directory for full details on each tool's parameters.

### [App API](https://help.branch.io/apidocs/app-api)

View and make updates to an existing Branch app configuration.

- `branch_get_app_settings`: Get the settings for a Branch app.
- `branch_update_app_settings`: Update the settings for a Branch app.

### [Deep Linking API](https://help.branch.io/apidocs/deep-linking-api)

Create, read, update, and delete your Branch Links.

- `branch_create_deep_link`: Create a Branch Deep Link URL.
- `branch_bulk_create_deep_links`: Create multiple Branch deep link URLs in a single request.
- `branch_read_deep_link`: Read the data associated with a Branch deep link URL.
- `branch_update_deep_link`: Update a Branch deep link URL.
- `branch_delete_deep_link`: Delete a Branch deep link URL.

### [Quick Links API](https://help.branch.io/apidocs/quick-links-api)

Programmatically generate Branch Deep Links that surface on the Branch Dashboard.

- `branch_create_quick_link`: Create a Branch Quick Link that appears on the dashboard.
- `branch_bulk_create_quick_links`: Create multiple Branch Quick Links in a single request.
- `branch_update_quick_link`: Update an existing Branch Quick Link.

### [QR Code API](https://help.branch.io/apidocs/qr-code-api)

Programmatically generate and customize Branch-powered QR codes.

- `branch_create_qr_code`: Create a Branch QR code.

### [Query API](https://help.branch.io/apidocs/query-api)

Export select, real-time, campaign-level data.

- `branch_query`: Query Branch data with metrics, dimensions, and filters.

### [Daily Exports API](https://help.branch.io/apidocs/daily-exports-api)

Export all device-level data in daily batches.

- `branch_get_daily_exports`: Pull granular Branch event data directly.

### [Custom Exports API](https://help.branch.io/apidocs/custom-exports-api)

Export select device-level data using your own filters.

- `branch_create_custom_export`: Request a custom data export job.
- `branch_check_data_readiness`: Check if data is ready for export for a given time.
- `branch_get_export_status`: Get the status of a custom data export job.

### [Aggregate Exports API](https://help.branch.io/apidocs/aggregate-api)

Pull aggregate Branch data filtered for limited-access users.

- `branch_create_aggregate_export`: Request a new aggregate data export.
- `branch_get_aggregate_export_status`: Get the status of an aggregate data export job.

### [Cohort Exports API](https://help.branch.io/apidocs/cohort-api)

Pull cohort Branch data to understand user behavior and performance over time.

- `branch_create_cohort_export`: Request a new cohort analytics export.
- `branch_get_cohort_export_status`: Get the status of a cohort data export job.

### [Cross-Events Export API](https://help.branch.io/apidocs/cross-events-export-api)

Query and compare large pools of data across multiple sources.

- `branch_create_cross_event_export`: Request a new cross-event data export.
- `branch_get_cross_event_export_status`: Retrieve the status of a cross-event export job.

## Contributing

Please see our [Contributing Guidelines](CONTRIBUTING.md) for information on how to get involved.

## Code of Conduct

This project is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). All contributors are expected to uphold this code.

## Changelog

All notable changes to this project are documented in the [Changelog](CHANGELOG.md).

https://afdossa.github.io/4030FinalDashboard/

# D3 Connecticut Property Sales Dashboard (2021)
=====================================================

## Overview

This project is a dynamic, multi-view data visualization dashboard built using vanilla JavaScript and the D3.js library. It is designed to analyze and compare property sales data from Connecticut for the year 2021, focusing on the relationship between official **Assessed Value** and the final **Sale Amount**.

The dashboard features three interconnected charts that share a global state, allowing users to drill down into a single property sale and see its context across all visualizations.

## Features

1.  **Sales vs. Assessment Scatter Plot:** Displays every sales record, comparing `Assessed Value` (X-axis) against `Sale Amount` (Y-axis), color-coded by `Property Type`.
    * **Interactivity:** Allows filtering by property type via the legend and selecting an individual data point to highlight it globally.
2.  **Property Type Dumbbell Chart:** Compares the **Average Assessed Value** versus the **Average Sale Amount** for different property categories (e.g., Residential, Commercial).
3.  **Town Comparison Trend Line:** Analyzes the average sales price trend across different assessed value brackets ($200k bins) for all towns, with a dynamic line to highlight the trend for a **selected town**.

## Data Acquisition and Processing

The application uses a static JSON file (`Data.json`) as its data source. The data represents property sales records for the year 2021.

### Data Cleaning Pipeline (`index.js`)

To ensure data quality and accurate visualization, the raw data undergoes strict filtering upon load (defined in the `cleanData` function in `index.js`):

1.  **Type Conversion:** `sale_amount`, `assessed_value`, and `sales_ratio` fields are converted to numeric types.
2.  **Minimum Sale Filter:** Records with a `sale_amount` less than **$10,000** are removed to exclude non-market or administrative transfers.
3.  **Sales Ratio Outlier Removal:** Records with an extreme `sales_ratio` (the ratio of assessed value to sale amount) are removed:
    * Filter: `sales_ratio` must be between **0.05 (5%)** and **5.0 (500%)**.
4.  **Data Sampling:** For performance optimization, the application loads a maximum of **100,000 records** from the cleaned dataset.

## Project Structure

| File | Description |
| :--- | :--- |
| `index.html` | The main entry point. Loads all scripts and defines the HTML structure/containers for the dashboard. |
| `Data.json` | The raw, static JSON dataset used by the application. |
| **`index.js`** | **The Controller:** Manages the global application state (`salesData`, `selectedSale`). Handles data loading, cleaning, and the core event loop (`handlePointClick`) that synchronizes updates across all chart files. |
| `scatterPlot.js` | D3 script for rendering the primary scatter plot visualization and handling its local interactivity. |
| `propertyTypeDumbbell.js` | D3 script for aggregating data by `property_type` and rendering the comparison dumbbell chart. |
| `townComparisonChart.js` | D3 script for aggregating and rendering the sales trend comparison chart. |
| `package.json` | Defines project dependencies, primarily for running a local server (`serve`). |

## Getting Started

This project is a static front-end application and requires a local web server to run due to browser restrictions on loading local files (`d3.json` cannot load `Data.json` directly without a server).

### Prerequisites

You need Node.js and npm (or yarn) installed on your system.

### Local Installation

1.  **Clone or Download:**
    ```bash
    git clone [https://github.com/afdossa/4030FinalDashboard.git](https://github.com/afdossa/4030FinalDashboard.git)
    cd 4030FinalDashboard
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
    This installs the simple local server dependency, `serve`.
3.  **Start the Dashboard:**
    ```bash
    npm start
    ```
    This command runs the `serve` tool, which typically starts the server on `http://localhost:3000` or an available port.

The dashboard will open in your browser, loading the `index.html` file and starting the data loading process defined in `index.js`.

## Technologies

* **D3.js (v7+):** Core library for data-driven document manipulation and visualization.
* **JavaScript (ES6):** Primary language for application logic and state management.
* **HTML5 / CSS3:** Structure and basic styling.
* **`serve`:** Simple command-line utility for serving static content locally.
// index.js

// --- Global State Management (Equivalent to useState in React) ---
let salesData = [];
let selectedSale = null;

// --- API Endpoint and Data Source ---
const DATA_SOURCE_FILE = "Data.json";

// --- Utility Functions (Simulating the App component's methods) ---

/**
 * Handles the click on a data point in the ScatterPlot.
 * This function updates the global selectedSale state and triggers updates
 * in all listening charts.
 * @param {object} sale - The data object of the clicked sale.
 */
const handlePointClick = (sale) => {
    // Toggle selection logic
    if (selectedSale && selectedSale.serial_number === sale.serial_number) {
        selectedSale = null;
    } else {
        selectedSale = sale;
    }

    // Trigger updates in all visualization files
    updateScatterPlot(selectedSale);
    updatePropertyTypeDumbbell(salesData, selectedSale);
    updateTownComparisonChart(selectedSale);

    console.log("Selected Sale:", selectedSale);
};


/**
 * Initializes the dashboard by fetching data and setting up charts.
 */
const initializeDashboard = () => {
    // 1. Data Loading (Equivalent to useEffect fetch/mock logic)
    d3.json(DATA_SOURCE_FILE).then(data => {
        if (!data || data.length === 0) {
            console.error(`Error: Could not load data from ${DATA_SOURCE_FILE}.`);
            // Optionally, call generateMockData() here if needed, but we'll stick to file loading.
            return;
        }

        // 2. Store data globally
        salesData = data;

        // 3. Initialize all chart components (Equivalent to the <Chart ... /> tags in render)
        // These functions would be defined in their respective D3 files (e.g., scatterPlot.js)

        if (typeof initializeScatterPlot === 'function') {
            initializeScatterPlot(salesData, handlePointClick, selectedSale);
        } else {
            console.warn("ScatterPlot initialization function not found. Did you load scatterPlot.js?");
        }

        if (typeof initializePropertyTypeDumbbell === 'function') {
            initializePropertyTypeDumbbell(salesData, selectedSale);
        } else {
            console.warn("Dumbbell Chart initialization function not found.");
        }

        if (typeof initializeTownComparisonChart === 'function') {
            initializeTownComparisonChart(salesData, selectedSale);
        } else {
            console.warn("Town Comparison Chart initialization function not found.");
        }

    }).catch(err => {
        console.error("Critical error loading JSON data:", err);
        // Display a user-friendly error message on the page
        d3.select("#dashboard-root").html('<div style="color: red; padding: 20px;">Error loading dashboard data. Please check "Data.json".</div>');
    });
};

// Start the dashboard once the DOM is ready
document.addEventListener('DOMContentLoaded', initializeDashboard);
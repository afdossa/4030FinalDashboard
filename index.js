// index.js (Controller File)

// --- Global State Management (Equivalent to useState in React) ---
let salesData = [];
let selectedSale = null;

// --- API Endpoint and Data Source ---
const DATA_SOURCE_FILE = "test2.json";
const SAMPLE_SIZE = 1000; // Limit the data points to 15,000 for performance

// --- Utility Functions (Simulating the App component's methods) ---

/**
 * Handles the click on a data point in the ScatterPlot.
 * This function updates the global selectedSale state and triggers updates
 * in all listening charts.
 * @param {object} sale - The data object of the clicked sale.
 */
const handlePointClick = (sale) => {
    // 1. Toggle selection logic
    if (selectedSale && selectedSale.serial_number === sale.serial_number) {
        selectedSale = null;
    } else {
        selectedSale = sale;
    }

    // 2. Trigger updates in all visualization files
    console.time("Dashboard Update Time");

    try {
        // These functions are assumed to be defined in separate, loaded scripts (e.g., scatterPlot.js)
        if (typeof updateScatterPlot === 'function') updateScatterPlot(selectedSale);
        if (typeof updatePropertyTypeDumbbell === 'function') updatePropertyTypeDumbbell(salesData, selectedSale);
        if (typeof updateTownComparisonChart === 'function') updateTownComparisonChart(selectedSale);
    } catch (e) {
        console.error("CRITICAL ERROR during chart update:", e);
        // Alert the user that the dashboard is unstable
        alert("Dashboard experienced a critical rendering error. See console for details.");
    }

    console.timeEnd("Dashboard Update Time");
};


/**
 * Initializes the dashboard by fetching data and setting up charts.
 */
const initializeDashboard = () => {
    // 1. Data Loading
    d3.json(DATA_SOURCE_FILE).then(data => {
        if (!data || data.length === 0) {
            console.error(`Error: Could not load data from ${DATA_SOURCE_FILE}.`);
            d3.select("#dashboard-root").html('<div style="color: red; padding: 20px;">Error loading dashboard data. Please check "test2.json" and ensure a local server is running.</div>');
            return;
        }

        // 2. Store data globally, ensure numerical types, and sample for performance
        const cleanedData = data.map(d => ({
            ...d,
            // Ensure data types are strictly numeric for D3 scales
            assessed_value: +d.assessed_value,
            sale_amount: +d.sale_amount
        }));

        if (cleanedData.length > SAMPLE_SIZE) {
            // Randomly select a subset of the data
            salesData = d3.shuffle(cleanedData).slice(0, SAMPLE_SIZE);
            console.log(`Initial data loaded: ${cleanedData.length} total records. Sampled down to ${salesData.length} points for display performance.`);
        } else {
            salesData = cleanedData;
            console.log(`Initial data loaded: ${salesData.length} records.`);
        }

        // 3. Initialize all chart components (using the sampled salesData)
        // These functions are called from the other, external chart files
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
        d3.select("#dashboard-root").html('<div style="color: red; padding: 20px;">Error loading dashboard data. Please check "test2.json" and ensure a local server is running.</div>');
    });
};

// Start the dashboard once the DOM is ready
document.addEventListener('DOMContentLoaded', initializeDashboard);
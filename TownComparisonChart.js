// townComparisonChart.js

// --- D3 Chart Configuration ---
const TCC_MARGIN = { top: 20, right: 30, bottom: 50, left: 80 };
const TCC_WIDTH = 550 - TCC_MARGIN.left - TCC_MARGIN.right;
const TCC_HEIGHT = 400 - TCC_MARGIN.top - TCC_MARGIN.bottom;
const ASSESSED_BIN_SIZE = 200000; // 200k bin size for x-axis

// --- OUTLIER CAPS (REDUCED X-AXIS CAP) ---
// FIX: Set a maximum relevant X-axis domain to prevent compression from outliers.
const MAX_ASSESSED_VALUE_CAP = 3200000; // Cap X-axis data domain at $3.6M
const MAX_SALE_VALUE_CAP = 3000000;    // Cap Y-axis data domain/scale at $3M (Unchanged)


// --- Helper Functions ---

/**
 * Aggregates the data to calculate the average sale value for each assessed value bin.
 */
const aggregateDataTCC = (salesData) => {
    // d3.rollups groups sales into bins based on the assessed value
    const binnedData = d3.rollups(
        salesData,
        v => ({
            count: v.length,
            average_sale_value: d3.mean(v, d => d.sale_amount)
        }),
        // Key function to calculate the bin start value
        d => Math.floor(d.assessed_value / ASSESSED_BIN_SIZE) * ASSESSED_BIN_SIZE
    );

    // Filter out nulls/undefined from the mean (NaN Fix)
    const aggregated = binnedData
        .map(([bin, stats]) => ({
            bin: bin,
            average_sale_value: stats.average_sale_value
        }))
        .filter(d => d.average_sale_value !== null && d.average_sale_value !== undefined)
        .sort((a, b) => a.bin - b.bin);

    return aggregated;
};

// --- Main Render Function ---

/**
 * D3.js function to render the Town vs. Market Comparison Chart.
 */
function renderTownComparisonChart(containerSelector, data, currentSelectedSale) {
    const selectedTown = currentSelectedSale ? currentSelectedSale.town : null;

    // --- CRITICAL FIX: Filter out extreme outliers BEFORE aggregation ---
    const filteredData = data.filter(d =>
        d.assessed_value <= MAX_ASSESSED_VALUE_CAP &&
        d.sale_amount <= MAX_SALE_VALUE_CAP
    );

    // --- Data Processing (using the filtered data) ---
    const allDataAggregated = aggregateDataTCC(filteredData);

    // Filter the sales data specific to the town
    const townDataAggregated = (() => {
        if (!selectedTown) return [];
        const townSales = filteredData.filter(d => d.town === selectedTown);
        return aggregateDataTCC(townSales);
    })();


    const container = d3.select(containerSelector);

    // Clear previous SVG content (important for updates)
    container.select("svg").remove();

    // Update HTML elements (title and helper text)
    d3.select("#town-comparison-chart-title").text(`Town vs. Market Comparison (${selectedTown || 'All Towns'})`);
    d3.select("#town-info-text").text(selectedTown ? `Comparison for ${selectedTown}` : "Click a point in the scatter plot to select a town and see its comparison line.");
    d3.select(".legend-town-text-span").text(`o - ${selectedTown || 'Town Name'}`);


    const svg = container.append("svg")
        .attr("width", TCC_WIDTH + TCC_MARGIN.left + TCC_MARGIN.right)
        .attr("height", TCC_HEIGHT + TCC_MARGIN.top + TCC_MARGIN.bottom);

    const chartGroup = svg.append("g")
        .attr("transform", `translate(${TCC_MARGIN.left}, ${TCC_MARGIN.top})`);

    // --- Scales ---
    const maxAssessedValue = MAX_ASSESSED_VALUE_CAP;
    const maxSaleValue = MAX_SALE_VALUE_CAP;

    // Use a small buffer (10% of the last tick) to define the domain's end
    const domainEndBuffer = ASSESSED_BIN_SIZE * 0.5;

    const xScale = d3.scaleLinear()
        // Domain ends at the cap plus a small buffer
        .domain([0, maxAssessedValue + domainEndBuffer])
        .range([0, TCC_WIDTH]);

    const yScale = d3.scaleLinear()
        .domain([0, maxSaleValue * 1.05])
        .range([TCC_HEIGHT, 0]);

    // --- AXES and FORMATTING ---

    // 1. X-Axis (Assessed Value) Formatting
    const formatAssessedValue = (d) => {
        const num = d.valueOf();
        if (num >= 1000000) return `${num / 1000000}M`;
        if (num > 0) return `${num / 1000}k`;
        return '0';
    };

    // Use an interval of every 400k (2 * ASSESSED_BIN_SIZE) for clearer ticks
    const X_TICK_INTERVAL = 2 * ASSESSED_BIN_SIZE;

    const xAxis = d3.axisBottom(xScale)
        // Adjust tickValues based on the new, smaller maxAssessedValue
        .tickValues(d3.range(0, maxAssessedValue + X_TICK_INTERVAL, X_TICK_INTERVAL))
        .tickFormat(formatAssessedValue);

    chartGroup.append("g")
        .attr("transform", `translate(0, ${TCC_HEIGHT})`)
        .call(xAxis)
        .selectAll("text")
        .style("font-size", "11px")
        .attr("fill", "#ccc");

    // 2. Y-Axis (Sale Value) Formatting
    const formatSaleValue = (d) => {
        const num = d.valueOf();
        return d3.format("$.1s")(num).replace(/G/, "B").replace(/k/, "K");
    };

    const yAxis = d3.axisLeft(yScale)
        .ticks(10)
        .tickFormat(formatSaleValue);

    chartGroup.append("g")
        .call(yAxis)
        .selectAll("text")
        .style("font-size", "11px")
        .attr("fill", "#ccc");

    // --- Axis Labels (Unchanged) ---
    chartGroup.append("text")
        .attr("class", "x label")
        .attr("text-anchor", "middle")
        .attr("x", TCC_WIDTH / 2)
        .attr("y", TCC_HEIGHT + TCC_MARGIN.bottom - 5)
        .style("fill", "#ddd")
        .text("Average Assessed Value");

    chartGroup.append("text")
        .attr("class", "y label")
        .attr("text-anchor", "middle")
        .attr("y", -TCC_MARGIN.left + 15)
        .attr("x", -TCC_HEIGHT / 2)
        .attr("transform", "rotate(-90)")
        .style("fill", "#ddd")
        .text("Average Sale Value");

    // --- Line Drawing (Unchanged) ---
    const lineGenerator = d3.line()
        .x(d => xScale(d.bin + ASSESSED_BIN_SIZE / 2))
        .y(d => yScale(d.average_sale_value))
        .curve(d3.curveLinear);

    chartGroup.append("path")
        .datum(allDataAggregated)
        .attr("fill", "none")
        .attr("stroke", "cornflowerblue")
        .attr("stroke-width", 2)
        .attr("d", lineGenerator);

    if (selectedTown && townDataAggregated.length > 0) {
        chartGroup.append("path")
            .datum(townDataAggregated)
            .attr("fill", "none")
            .attr("stroke", "darkviolet")
            .attr("stroke-width", 3)
            .attr("d", lineGenerator);
    }

    // --- Selected Point Highlight (WITH NaN FIX - Unchanged) ---
    if (currentSelectedSale) {
        // Ensure the selectedSale is within the chart's bounds before calculating position
        const isSaleInBounds = currentSelectedSale.assessed_value <= MAX_ASSESSED_VALUE_CAP &&
            currentSelectedSale.sale_amount <= MAX_SALE_VALUE_CAP;

        let xPos;
        let yPos;

        if (isSaleInBounds) {
            const selectedBin = Math.floor(currentSelectedSale.assessed_value / ASSESSED_BIN_SIZE) * ASSESSED_BIN_SIZE;
            let highlightedPoint = townDataAggregated.find(d => d.bin === selectedBin);

            if (highlightedPoint) {
                xPos = xScale(highlightedPoint.bin + ASSESSED_BIN_SIZE / 2);
                yPos = yScale(highlightedPoint.average_sale_value);
            } else {
                xPos = xScale(currentSelectedSale.assessed_value);
                yPos = yScale(currentSelectedSale.sale_amount);
            }

            // CRITICAL FIX: Only draw if the coordinates are valid numbers
            if (isFinite(yPos) && isFinite(xPos)) {
                chartGroup.append("circle")
                    .attr("cx", xPos)
                    .attr("cy", yPos)
                    .attr("r", 5)
                    .attr("fill", "yellow")
                    .attr("stroke", "black")
                    .attr("stroke-width", 1)
                    .attr("class", "selected-point");
            } else {
                console.warn(`Selected point skipped in Town Comparison Chart: Invalid coordinates.`);
            }
        }
    }
}

// --- Global Initialization/Update Functions (Required by index.js) ---

function initializeTownComparisonChart(data, currentSelectedSale) {
    renderTownComparisonChart('#town-comparison-chart-container', data, currentSelectedSale);
}

function updateTownComparisonChart(currentSelectedSale) {
    // Assuming 'salesData' is accessible globally from index.js
    renderTownComparisonChart('#town-comparison-chart-container', salesData, currentSelectedSale);
}
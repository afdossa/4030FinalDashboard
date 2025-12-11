// propertyTypeDumbbell.js

const DUMBBELL_MARGIN = { top: 20, right: 30, bottom: 50, left: 80 };
const DUMBBELL_WIDTH = 550 - DUMBBELL_MARGIN.left - DUMBBELL_MARGIN.right;
const DUMBBELL_HEIGHT = 250 - DUMBBELL_MARGIN.top - DUMBBELL_MARGIN.bottom;
const DUMBBELL_BAR_WIDTH = 2; // Width of the connecting line

// Global D3 elements for update access
let dumbbellXScale;
let dumbbellYScale;
let dumbbellSVG;
let dumbbellChartGroup;

// --- DUMBBELL AGGREGATION LOGIC (Identical to TSX useMemo) ---
const aggregateDumbbellData = (data, selectedSale) => {
    const groups = {};

    data.forEach(item => {
        const type = item.property_type;
        // Ensure data is numeric
        const sale = +item.sale_amount;
        const assessed = +item.assessed_value;

        if (isNaN(sale) || isNaN(assessed)) return;

        if (!groups[type]) {
            groups[type] = { totalSale: 0, totalAssessed: 0, count: 0 };
        }
        groups[type].totalSale += sale;
        groups[type].totalAssessed += assessed;
        groups[type].count += 1;
    });

    const chartData = Object.keys(groups).map(type => {
        const avgSale = groups[type].totalSale / groups[type].count;
        const avgAssessed = groups[type].totalAssessed / groups[type].count;

        const isSelectedType = selectedSale && selectedSale.property_type === type;
        const selSale = isSelectedType ? +selectedSale.sale_amount : null;
        const selAssessed = isSelectedType ? +selectedSale.assessed_value : null;

        return {
            name: type,
            avgSale,
            avgAssessed,
            // The range for the vertical line (min/max of the two averages)
            range: [Math.min(avgSale, avgAssessed), Math.max(avgSale, avgAssessed)],
            // Selected sale point data
            selectedSale: selSale,
            selectedAssessed: selAssessed,
            selectedRange: isSelectedType ? [
                Math.min(selSale, selAssessed),
                Math.max(selSale, selAssessed)
            ] : null,
            isSelectedType: isSelectedType // Flag for styling
        };
    }).sort((a, b) => d3.ascending(a.name, b.name));

    return chartData;
};

// --- Formatters ---
const dumbbellFormatCurrency = (val) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
    return `$${val}`;
};


// --- INITIALIZATION ---
const initializePropertyTypeDumbbell = (data, selectedSale) => {
    const chartData = aggregateDumbbellData(data, selectedSale);

    // 1. Setup SVG Container
    dumbbellSVG = d3.select("#dumbbell-chart-container").append("svg")
        .attr("width", DUMBBELL_WIDTH + DUMBBELL_MARGIN.left + DUMBBELL_MARGIN.right)
        .attr("height", DUMBBELL_HEIGHT + DUMBBELL_MARGIN.top + DUMBBELL_MARGIN.bottom);

    dumbbellChartGroup = dumbbellSVG.append("g")
        .attr("class", "dumbbell-chart-group")
        .attr("transform", `translate(${DUMBBELL_MARGIN.left}, ${DUMBBELL_MARGIN.top})`);

    // 2. SCALES (Y-Axis is continuous, X-Axis is ordinal for property types)
    const maxValue = d3.max(chartData, d => d.range[1]) || 1000000;

    dumbbellYScale = d3.scaleLinear()
        .domain([0, maxValue * 1.1]) // Add 10% padding
        .range([DUMBBELL_HEIGHT, 0]);

    dumbbellXScale = d3.scaleBand()
        .domain(chartData.map(d => d.name))
        .range([0, DUMBBELL_WIDTH])
        .padding(0.4); // Padding controls space between bars

    // 3. AXES and Grid
    const yAxis = d3.axisLeft(dumbbellYScale).tickFormat(dumbbellFormatCurrency);
    const xAxis = d3.axisBottom(dumbbellXScale);

    dumbbellChartGroup.append("g").attr("class", "y-axis").call(yAxis).selectAll("text").attr("fill", "#ccc");
    dumbbellChartGroup.append("g").attr("class", "x-axis").attr("transform", `translate(0, ${DUMBBELL_HEIGHT})`).call(xAxis).selectAll("text").attr("fill", "#ccc").style("text-anchor", "middle").attr("transform", "rotate(0)");

    // --- AXIS TITLES ---
    dumbbellChartGroup.append("text")
        .attr("class", "y-axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -DUMBBELL_HEIGHT / 2)
        .attr("y", -DUMBBELL_MARGIN.left + 20)
        .attr("fill", "#9ca3af")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Dollar Value");

    dumbbellChartGroup.append("text")
        .attr("class", "x-axis-label")
        .attr("x", DUMBBELL_WIDTH / 2)
        .attr("y", DUMBBELL_HEIGHT + DUMBBELL_MARGIN.bottom - 10)
        .attr("fill", "#9ca3af")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Property Type");



    // Gridlines (Horizontal)
    dumbbellChartGroup.append("g").attr("class", "grid y-grid").call(d3.axisLeft(dumbbellYScale).tickSize(-DUMBBELL_WIDTH).tickFormat(() => "")).selectAll(".tick line").attr("stroke", "#444");

    // 4. Initial Drawing
    updatePropertyTypeDumbbell(data, selectedSale);

    // 5. Legend (Static)
    drawDumbbellLegend();
};


// --- UPDATE FUNCTION (Called on new data or new selectedSale) ---
const updatePropertyTypeDumbbell = (data, selectedSale) => {
    const chartData = aggregateDumbbellData(data, selectedSale);

    // Use scale update if domains change (not expected here, but good practice)
    const maxValue = d3.max(chartData, d => d.range[1]) || 1000000;
    dumbbellYScale.domain([0, maxValue * 1.1]);

    // Update Y-Axis
    dumbbellChartGroup.select(".y-axis").transition().duration(500).call(d3.axisLeft(dumbbellYScale).tickFormat(dumbbellFormatCurrency));

    // --- 1. General Averages Stick (The Barbell Line) ---
    const avgLines = dumbbellChartGroup.selectAll(".avg-line")
        .data(chartData, d => d.name);

    avgLines.join(
        enter => enter.append("line")
            .attr("class", "avg-line")
            .attr("stroke", "#6b7280")
            .attr("stroke-width", DUMBBELL_BAR_WIDTH),
        update => update.transition().duration(500),
        exit => exit.remove()
    )
        .attr("x1", d => dumbbellXScale(d.name) + dumbbellXScale.bandwidth() / 2)
        .attr("x2", d => dumbbellXScale(d.name) + dumbbellXScale.bandwidth() / 2)
        .attr("y1", d => dumbbellYScale(d.range[0]))
        .attr("y2", d => dumbbellYScale(d.range[1]));

    // --- 2. General Averages Dots (The Bells) ---
    const avgDots = dumbbellChartGroup.selectAll(".avg-dot")
        .data(chartData.flatMap(d => [
            { type: d.name, value: d.avgAssessed, key: `${d.name}-assessed`, color: "#60a5fa", isSelected: d.isSelectedType },
            { type: d.name, value: d.avgSale, key: `${d.name}-sale`, color: "#c084fc", isSelected: d.isSelectedType }
        ]), d => d.key);

    avgDots.join(
        enter => enter.append("circle")
            .attr("class", d => `avg-dot avg-dot-${d.isSelected ? 'selected' : 'default'}`)
            .attr("r", 5)
            .attr("fill", d => d.color),
        update => update.transition().duration(500),
        exit => exit.remove()
    )
        .attr("cx", d => dumbbellXScale(d.type) + dumbbellXScale.bandwidth() / 2)
        .attr("cy", d => dumbbellYScale(d.value));


    // --- 3. Selected Point Stick (Comparison Bar) ---
    const selectedLines = dumbbellChartGroup.selectAll(".sel-line")
        .data(chartData.filter(d => d.selectedRange), d => d.name);

    selectedLines.join(
        enter => enter.append("line")
            .attr("class", "sel-line")
            .attr("stroke", d => SCATTER_COLORS[d.name])
            .attr("stroke-width", 4),
        update => update
            .attr("stroke", d => SCATTER_COLORS[d.name])
            .transition().duration(500),
        exit => exit.remove()
    )
        .attr("x1", d => dumbbellXScale(d.name) + dumbbellXScale.bandwidth() / 2)
        .attr("x2", d => dumbbellXScale(d.name) + dumbbellXScale.bandwidth() / 2)
        .attr("y1", d => dumbbellYScale(d.selectedRange[0]))
        .attr("y2", d => dumbbellYScale(d.selectedRange[1]));


// --- 4. Selected Point Dots (Comparison Bells) ---
    const selectedDots = dumbbellChartGroup.selectAll(".sel-dot")
        .data(chartData.filter(d => d.selectedSale !== null).flatMap(d => [
            { type: d.name, value: d.selectedAssessed, key: `${d.name}-sel-assessed` },
            { type: d.name, value: d.selectedSale, key: `${d.name}-sel-sale` }
        ]), d => d.key);

    selectedDots.join(
        enter => enter.append("circle")
            .attr("class", "sel-dot")
            .attr("r", 5)
            .attr("fill", d => SCATTER_COLORS[d.type])
            .attr("stroke", "#1f2937")
            .attr("stroke-width", 1.5)
            .style("z-index", 10),
        update => update
            .attr("fill", d => SCATTER_COLORS[d.type])
            .transition().duration(500),
        exit => exit.remove()
    )
        .attr("cx", d => dumbbellXScale(d.type) + dumbbellXScale.bandwidth() / 2)
        .attr("cy", d => dumbbellYScale(d.value));



// ---------------------------------------------------------------------
// 🔥 SELECTED LEGEND UPDATE — START HERE
// ---------------------------------------------------------------------
    if (selectedSale) {
        const selColor = SCATTER_COLORS[selectedSale.property_type];

        d3.select("#dumbbell-selected-legend").style("display", "flex");

        d3.select("#dumbbell-selected-legend-circle circle")
            .attr("r", 4) // CONSISTENCY FIX: Standardize radius
            .attr("fill", selColor);

        d3.select("#dumbbell-selected-legend-label")
            .text(`Selected (${selectedSale.property_type})`);
    } else {
        d3.select("#dumbbell-selected-legend").style("display", "none");
    }
// ---------------------------------------------------------------------
// 🔥 SELECTED LEGEND UPDATE — END HERE
// ---------------------------------------------------------------------

// Optional: Add basic D3 Tooltip functionality (simplified version of CustomTooltip)
    addDumbbellTooltip(dumbbellSVG, dumbbellXScale, dumbbellYScale, chartData);
};



// --- Tooltip Functionality (Simplification of CustomTooltip) ---
const addDumbbellTooltip = (svg, xScale, yScale, chartData) => {
    // Basic mouseover/mouseout functionality on the chart area for simplicity
    // A true D3 implementation would attach this to the dots/lines.

    // Clear any existing tooltips/listeners to prevent duplicates
    svg.select(".tooltip-rect").remove();
    d3.select("#dumbbell-tooltip").remove();

    const tooltip = d3.select("body").append("div")
        .attr("id", "dumbbell-tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background-color", "#1f2937")
        .style("border", "1px solid #4b5563")
        .style("padding", "8px")
        .style("border-radius", "4px")
        .style("color", "#fff")
        .style("z-index", 100);

    const tooltipRects = dumbbellChartGroup.selectAll(".tooltip-target")
        .data(chartData, d => d.name);

    tooltipRects.join(
        enter => enter.append("rect")
            .attr("class", "tooltip-target")
            .attr("fill", "transparent")
            .on("mouseover", function(event, d) {
                const htmlContent = `
                    <p style="font-weight: bold; margin-bottom: 5px;">${d.name}</p>
                    <p style="color: #60a5fa;">Avg Assessed: ${dumbbellFormatCurrency(d.avgAssessed)}</p>
                    <p style="color: #c084fc;">Avg Sales: ${dumbbellFormatCurrency(d.avgSale)}</p>
                    ${d.selectedSale !== null ? `
                        <div style="margin-top: 5px; padding-top: 5px; border-top: 1px solid #444;">
                            <p style="color: #22c55e; font-weight: bold;">Selected Point:</p>
                            <p style="color: #22c55e;">Assessed: ${dumbbellFormatCurrency(d.selectedAssessed)}</p>
                            <p style="color: #22c55e;">Sales: ${dumbbellFormatCurrency(d.selectedSale)}</p>
                        </div>
                    ` : ''}
                `;
                tooltip
                    .style("visibility", "visible")
                    .html(htmlContent);
                d3.select(this).attr("fill", "rgba(55, 65, 81, 0.4)"); // Highlight bar
            })
            .on("mousemove", function(event) {
                tooltip
                    .style("top", (event.pageY - 10) + "px")
                    .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", function() {
                tooltip.style("visibility", "hidden");
                d3.select(this).attr("fill", "transparent");
            }),
        update => update,
        exit => exit.remove()
    )
        .attr("x", d => xScale(d.name))
        .attr("y", 0)
        .attr("width", xScale.bandwidth())
        .attr("height", DUMBBELL_HEIGHT);
};


// --- Legend Drawing ---
const drawDumbbellLegend = () => {
    const legendData = [
        { label: 'Average Assessed', color: '#60a5fa' },
        { label: 'Average Sales',   color: '#c084fc' }
        // Selected Point is handled dynamically in updatePropertyTypeDumbbell()
    ];

    const legendContainer = d3.select("#dumbbell-legend-container");

    legendContainer.selectAll(".legend-item")
        .data(legendData)
        .join("div")
        .attr("class", "legend-item flex items-center text-sm text-gray-400")
        .style("display", "flex")
        .style("align-items", "center")
        .style("margin", "0 10px")
        .style("color", "#9ca3af")
        .html(d => `
            <svg width="10" height="10" style="margin-right: 8px;">
                <circle r="4" cx="5" cy="5" fill="${d.color}" />
            </svg>
            ${d.label}
        `);
};

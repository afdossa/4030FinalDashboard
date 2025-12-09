// scatterPlot.js

const SCATTER_MARGIN = { top: 20, right: 40, bottom: 50, left: 80 };
const SCATTER_HEIGHT = 250 - SCATTER_MARGIN.top - SCATTER_MARGIN.bottom;

// Fixed color palette (Matches the TSX)
const SCATTER_COLORS = {
    "Residential":   "#8884d8", // purple
    "Commercial":    "#82ca9d", // green
    "Industrial":    "#FFC658", // yellow (actual yellow!)
    "Apartments":    "#FF7300", // orange
    "Public Utility":"#0088FE", // blue
    "Vacant Land":   "#AA336A"  // magenta (strong contrast)
};

// Global D3 elements and State
let scatterSVG;
let scatterChartGroup;
let scatterXScale;
let scatterYScale;
let scatterRawData = [];
let scatterActiveType = null; // Legend filter state
let scatterOnPointClick; // Function passed from index.js
let scatterSelectedSale = null;

// --- Formatters (Matches the TSX) ---
const scatterFormatCurrency = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
    return `$${value}`;
};

// --- Data Grouping Logic (Matches the TSX useMemo) ---
const scatterGroupData = (data) => {
    const groups = {};
    data.forEach(item => {
        const type = item.property_type;
        if (!groups[type]) groups[type] = [];
        groups[type].push(item);
    });
    return groups;
};

// --- Tooltip Functionality (Only handles visual hover effect) ---
const addScatterTooltip = (selection, formatter) => {
    selection
        .on("mouseover", function(event, d) {
            d3.select(this).attr("r", 6); // visual hover effect
        })
        .on("mouseout", function() {
            d3.select(this).attr("r", 4); // reset size
        });
};


// --- INITIALIZATION FUNCTION ---
const initializeScatterPlot = (data, onPointClickCallback, initialSelectedSale) => {
    scatterRawData = data;
    scatterOnPointClick = onPointClickCallback;
    scatterSelectedSale = initialSelectedSale;

    // 1. Setup SVG Container
    scatterSVG = d3.select("#scatter-plot-container").append("svg")
        .attr("width", "100%") // Use 100% width of container
        .attr("height", SCATTER_HEIGHT + SCATTER_MARGIN.top + SCATTER_MARGIN.bottom);

    const width = scatterSVG.node().getBoundingClientRect().width - SCATTER_MARGIN.left - SCATTER_MARGIN.right;


    // --- 2. Define Clip Path to prevent points from drawing outside the axes ---
    const clipId = "clip-scatter-area";

    // Remove old chart and clip elements
    scatterSVG.selectAll(".chart-container").remove();
    scatterSVG.selectAll("defs").remove();

    // Define the clip area within the SVG <defs>
    scatterSVG.append("defs").append("clipPath")
        .attr("id", clipId)
        .append("rect")
        .attr("width", width)
        .attr("height", SCATTER_HEIGHT); // Clip to the exact chart dimensions

    // Apply the clip path to the chart group
    scatterChartGroup = scatterSVG.append("g")
        .attr("class", "chart-container")
        .attr("transform", `translate(${SCATTER_MARGIN.left}, ${SCATTER_MARGIN.top})`)
        .attr("clip-path", `url(#${clipId})`); // ADDED: Apply clip path here


    // --- 3. SCALES (LOGARITHMIC SCALE WITH PADDING) ---

    // Find the TRUE maximum value.
    const dataMax = d3.max(data, d => Math.max(d.sale_amount, d.assessed_value)) || 2000000;

    // Set the minimum domain to $1,000.
    const LOG_DOMAIN_MIN = 1000;


    // X-Axis: Sale Amount (Log Scale)
    scatterXScale = d3.scaleLog()
        // Domain includes 5% padding
        .domain([LOG_DOMAIN_MIN, dataMax * 1.05])
        .range([0, width])
        .base(10);

    // Y-Axis: Assessed Value (Log Scale)
    scatterYScale = d3.scaleLog()
        // Domain includes 5% padding
        .domain([LOG_DOMAIN_MIN, dataMax * 1.05])
        .range([SCATTER_HEIGHT, 0])
        .base(10);


    // --- 4. AXES, LABELS ---
    // Reduced ticks to 4 for readability on log scale
    const xAxis = d3.axisBottom(scatterXScale).tickFormat(scatterFormatCurrency).ticks(4);
    const yAxis = d3.axisLeft(scatterYScale).tickFormat(scatterFormatCurrency).ticks(4);

    // X-Axis
    scatterSVG.append("g").attr("class", "x-axis").attr("transform", `translate(${SCATTER_MARGIN.left}, ${SCATTER_HEIGHT + SCATTER_MARGIN.top})`).call(xAxis).selectAll("text").attr("fill", "#9ca3af");
    // Y-Axis
    scatterSVG.append("g").attr("class", "y-axis").attr("transform", `translate(${SCATTER_MARGIN.left}, ${SCATTER_MARGIN.top})`).call(yAxis).selectAll("text").attr("fill", "#9ca3af");

    // Axis Labels
    scatterSVG.append("text").attr("class", "x label").attr("text-anchor", "middle").attr("x", SCATTER_MARGIN.left + width / 2).attr("y", SCATTER_HEIGHT + SCATTER_MARGIN.top + SCATTER_MARGIN.bottom - 5).style("fill", "#9ca3af").text("Sales Value");
    scatterSVG.append("text").attr("class", "y label").attr("text-anchor", "middle").attr("y", SCATTER_MARGIN.left - 40).attr("x", -SCATTER_HEIGHT / 2).attr("transform", "rotate(-90)").style("fill", "#9ca3af").text("Assessed Value");

    // --- Draw Initial Data ---
    drawScatterLegend(scatterGroupData(data));
    updateScatterPlot(initialSelectedSale);
};


// --- UPDATE FUNCTION (Handles point drawing, selection ring, and click-tooltip) ---
const updateScatterPlot = (newSelectedSale) => {
    if (!scatterChartGroup) return;

    // RECALCULATE WIDTH AND SCALES ON UPDATE (Crucial for stability)
    const width = scatterSVG.node().getBoundingClientRect().width - SCATTER_MARGIN.left - SCATTER_MARGIN.right;
    scatterXScale.range([0, width]);
    // Apply update to the axes group outside of the chart group
    scatterSVG.select(".x-axis").call(d3.axisBottom(scatterXScale).tickFormat(scatterFormatCurrency).ticks(4));

    // Update the clip path rectangle width on resize
    scatterSVG.select("#clip-scatter-area").select("rect").attr("width", width);


    scatterSelectedSale = newSelectedSale;
    const groupedData = scatterGroupData(scatterRawData);
    const allPoints = [];

    // Combine all data points from all groups into a single array for drawing
    Object.keys(groupedData).forEach(type => {
        groupedData[type].forEach(d => {
            const isSelected = scatterSelectedSale && scatterSelectedSale.serial_number === d.serial_number;

            // --- OPACITY LOGIC (No change needed) ---
            let opacity = 1;

            // Rule 1: If a legend filter is active, dim points that do not match.
            if (scatterActiveType && scatterActiveType !== type) {
                opacity = 0.1;
            }

            // Rule 2: Selected point is always fully opaque (even if filtered by legend)
            if (isSelected) {
                opacity = 1;
            }

            allPoints.push({
                ...d,
                color: SCATTER_COLORS[type] || "#cbd5e1",
                is_selected: isSelected,
                opacity: opacity
            });
        });
    });

    // --- 1. Draw Scatter Points ---
    const points = scatterChartGroup.selectAll(".data-point")
        .data(allPoints, d => d.serial_number);

    // Set duration to 0 for instant data redraw
    const transitionDuration = 0;

    points.join(
        enter => enter.append("circle")
            .attr("class", "data-point")
            .attr("r", 4)
            // Use log scales for positioning
            .attr("cx", d => scatterXScale(d.sale_amount))
            .attr("cy", d => scatterYScale(d.assessed_value))
            .attr("fill", d => d.color)
            .attr("opacity", d => d.opacity)
            .on("click", (event, d) => {
                if (scatterOnPointClick) {
                    scatterOnPointClick(d);
                }
            })
            .call(addScatterTooltip, scatterFormatCurrency), // Attach hover listener only for size change
        update => update
            .transition().duration(transitionDuration) // Use faster transition for updates
            .attr("fill", d => d.color)
            .attr("opacity", d => d.opacity)
            .attr("cx", d => scatterXScale(d.sale_amount))
            .attr("cy", d => scatterYScale(d.assessed_value)),
        exit => exit.remove()
    );

    // --- 2. Highlight Selected Point Ring ---
    const selectedPointData = scatterSelectedSale ? [scatterSelectedSale] : [];

    const selectedRing = scatterChartGroup.selectAll(".selected-ring")
        .data(selectedPointData, d => d.serial_number);

    selectedRing.join(
        enter => enter.append("circle")
            .attr("class", "selected-ring")
            .attr("r", 7)
            .attr("fill", "transparent")
            .attr("stroke", "#22c55e")
            .attr("stroke-width", 3)
            .attr("pointer-events", "none")
            // Use log scales for positioning
            .attr("cx", d => scatterXScale(d.sale_amount))
            .attr("cy", d => scatterYScale(d.assessed_value)),
        update => update
            .transition().duration(150) // Keep short transition for ring movement
            // Use log scales for positioning
            .attr("cx", d => scatterXScale(d.sale_amount))
            .attr("cy", d => scatterYScale(d.assessed_value)),
        exit => exit.remove()
    );

    // --- 3. Add/Remove Permanent Click Tooltip ---
    const tooltipData = scatterSelectedSale ? [scatterSelectedSale] : [];

    // Width and Height of the HTML tooltip box
    const TOOLTIP_WIDTH = 200;
    const TOOLTIP_HEIGHT = 120;
    const OFFSET_X = 10;
    const OFFSET_Y = 10;

    // Get chart width for boundary check
    const chartWidth = scatterSVG.node().getBoundingClientRect().width - SCATTER_MARGIN.left - SCATTER_MARGIN.right;

    const permanentTooltip = scatterChartGroup.selectAll(".permanent-tooltip-group")
        .data(tooltipData, d => d.serial_number); // Key is crucial here

    permanentTooltip.join(
        enter => {
            const group = enter.append("g")
                .attr("class", "permanent-tooltip-group")
                .attr("pointer-events", "none")
                .attr("transform", d => {
                    // Use log scales for initial position
                    let x = scatterXScale(d.sale_amount) + OFFSET_X;
                    let y = scatterYScale(d.assessed_value) - OFFSET_Y;

                    // Boundary check: If the tooltip goes too far right, flip it to the left
                    if (x + TOOLTIP_WIDTH > chartWidth) {
                        x = scatterXScale(d.sale_amount) - TOOLTIP_WIDTH - OFFSET_X;
                    }
                    // Boundary check: If the tooltip goes too high, flip it down
                    if (y < 0) {
                        y = scatterYScale(d.assessed_value) + OFFSET_Y;
                    }

                    return `translate(${x}, ${y})`;
                });

            // Inject an HTML div using foreignObject for rich styling
            group.append("foreignObject")
                .attr("width", TOOLTIP_WIDTH)
                .attr("height", TOOLTIP_HEIGHT)
                .append("xhtml:div")
                .attr("class", "d3-permanent-tooltip")
                .style("background-color", "#374151")
                .style("border", "1px solid #4b5563")
                .style("padding", "10px")
                .style("border-radius", "6px")
                .style("color", "#fff")
                .style("font-size", "12px")
                .style("box-shadow", "2px 2px 5px rgba(0,0,0,0.5)")
                .html(d => `
                    <p style="font-weight: bold; margin-bottom: 5px;">${d.address}</p>
                    <p style="color: #9ca3af; font-size: 0.9em;">${d.town} - ${d.property_type}</p>
                    <p style="color: #60a5fa;">Assessed: ${scatterFormatCurrency(d.assessed_value)}</p>
                    <p style="color: #4ade80;">Sales: ${scatterFormatCurrency(d.sale_amount)}</p>
                    <p style="color: #9ca3af; margin-top: 5px; font-size: 0.75em;">Click point to deselect</p>
                `);

            return group;
        },
        update => update
            .transition().duration(150) // Reduced transition duration for snappier movement
            .attr("transform", d => {
                // Use log scales for updated position
                let x = scatterXScale(d.sale_amount) + OFFSET_X;
                let y = scatterYScale(d.assessed_value) - OFFSET_Y;

                if (x + TOOLTIP_WIDTH > chartWidth) {
                    x = scatterXScale(d.sale_amount) - TOOLTIP_WIDTH - OFFSET_X;
                }
                if (y < 0) {
                    y = scatterYScale(d.assessed_value) + OFFSET_Y;
                }
                return `translate(${x}, ${y})`;
            }),
        exit => exit.remove()
    );
};


// --- Legend Functionality (No change) ---
const drawScatterLegend = (groupedData) => {
    const legendContainer = d3.select("#scatter-plot-legend");
    legendContainer.selectAll("*").remove();

    const types = Object.keys(groupedData);

    legendContainer.selectAll(".legend-item")
        .data(types)
        .join("div")
        .attr("class", "legend-item")
        .style("display", "inline-flex")
        .style("align-items", "center")
        .style("margin-right", "20px")
        .style("cursor", "pointer")
        .on("click", (event, type) => {
            scatterActiveType = scatterActiveType === type ? null : type;

            legendContainer.selectAll(".legend-item")
                .style("opacity", d => (scatterActiveType && scatterActiveType !== d) ? 0.5 : 1);

            updateScatterPlot(scatterSelectedSale);
        })
        .html(d => `
            <svg width="10" height="10" style="margin-right: 5px;">
                <circle r="4" cx="5" cy="5" fill="${SCATTER_COLORS[d]}" />
            </svg>
            ${d}
        `);
};

d3.select("body").selectAll(".d3-tooltip").remove();
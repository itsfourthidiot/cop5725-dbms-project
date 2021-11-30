////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////// Populate dropdown for US states
////////////////////////////////////////////////////////////////////////////////

// US states API
const usStatesApi = "http://localhost:3000/api/us-states"

function parseJSON(response) {
  return response.json();
}

function populateDropdown(data) {
  for(let i=0; i<data.length; i++) {
      if(data[i].NAME == "Florida") {
        $("#us-states").append(
          `<option value=${data[i].ID} selected>${data[i].NAME}</option>`
        )
      } else {
        $("#us-states").append(
          `<option value=${data[i].ID}>${data[i].NAME}</option>`
        )
      }
  }
  $("#us-states").selectpicker("refresh");
}

function displayErrors(err){
  console.log("INSIDE displayErrors!");
  console.log(err);
}

fetch(usStatesApi)
.then(parseJSON)
.then(populateDropdown)
.then(drawDefaultUsVaccinationTrendChart)
.catch(displayErrors);

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////// Query 1:  US vaccination trend
////////////////////////////////////////////////////////////////////////////////

// US vaccination trend API
const usVaccinationTrendApi = "http://localhost:3000/api/vaccination/us-vaccination-trend";

// SVG configurations
const margin = {
  top: 50,
  right: 25,
  bottom: 50,
  left: 50
};
const width = 600 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

// append the svg object to the body of the page
const usVaccinationTrendSvg = d3.select("#us-vaccination-trend")
                                .append("svg")
                                  .attr("width", width + margin.left + margin.right)
                                  .attr("height", height + margin.top + margin.bottom)
                                .append("g")
                                  .attr("transform", `translate(${margin.left},${margin.top})`);

// Initialize X-axis
const xScale = d3.scaleTime()
                 .range([0, width]);
const xAxis = d3.axisBottom(xScale);
usVaccinationTrendSvg.append("g")
                       .attr("transform", `translate(0, ${height})`)
                       .attr("class", "xAxis");

// Initialize Y-axis
const yScale = d3.scaleLinear()
                 .range([height, 0]);
const yAxis = d3.axisLeft(yScale);
usVaccinationTrendSvg.append("g")
                       .attr("class", "yAxis");

// Initialize colors
const colorScale = d3.scaleOrdinal()
                     .range(d3.schemeCategory10);

// Hover tooltip
let tooltip = d3.select("#us-vaccination-trend").append("div")
                  .attr("id", "tooltip")
                  .style("position", "absolute")
                  .style("background-color", "#D3D3D3")
                  .style("padding", "6px")
                  .style("display", "none")

// Vertical line for hover tooltip
let mouseG = usVaccinationTrendSvg.append("g")
                                    .attr("class", "mouse-over-effects")

mouseG.append("path")
        .attr("class", "mouse-line")
        .style("stroke", "#A9A9A9")
        .style("stroke-width", "1px")
        .style("opacity", "0");

// Line chart
function drawUsVaccinationTrendChart(data) {
  // Group data with respect to state_id
  let groupedData = d3.group(data, function(d) {
    return d.STATE_ID;
  });
  
  // Create X-axis
  xScale.domain(d3.extent(data, function(d) {
    return new Date(d.RECORD_DATE);
  }));
  usVaccinationTrendSvg.selectAll(".xAxis")
                         .transition()
                         .duration(500)
                         .call(xAxis);

  // Create Y-axis
  yScale.domain([0, 100]);
  usVaccinationTrendSvg.selectAll(".yAxis")
                         .transition()
                         .duration(500)
                         .call(yAxis);

  // Create colors
  colorScale.domain(groupedData.keys());

  // Vertical line for hover tooltips
  let mousePerLine = mouseG.selectAll(".mouse-per-line")
                           .data(groupedData)
                           .join("g")
                             .attr("class", "mouse-per-line");
  mousePerLine.append("circle")
                .attr("r", 4)
                .style("stroke", function(d) {
                  return colorScale(d[0]);
                })
                .style("fill", "none")
                .style("stroke-width", "1px")
                .style("opacity", "0")

  mouseG.append("svg:rect")
          .attr("width", width) 
          .attr("height", height)
          .attr("fill", "none")
          .attr("pointer-events", "all")
          .on("mouseout", function() {
            d3.select(".mouse-line")
                .style("opacity", "0");
            d3.selectAll(".mouse-per-line circle")
                .style("opacity", "0");
            d3.selectAll(".mouse-per-line text")
                .style("opacity", "0");
            d3.selectAll("#tooltip")
                .style('display', 'none')
          })
          .on('mouseover', function() {
            d3.select(".mouse-line")
                .style("opacity", "1");
            d3.selectAll(".mouse-per-line circle")
                .style("opacity", "1");
            d3.selectAll("#tooltip")
                .style('display', 'block')
          })
          .on('mousemove', function(e) {
            let mouse = d3.pointer(e)
            let xDate = xScale.invert(mouse[0])
            d3.selectAll(".mouse-per-line")
                .attr("transform", function (d, i) {
                  let bisect = d3.bisector(function (d) {
                    return new Date(d.RECORD_DATE);
                  }).left
                  let idx = bisect(d[1], xDate);
                  let record_date = new Date(d[1][idx].RECORD_DATE)
                  let cumulative_first_doses_percentage = +d[1][idx].CUMULATIVE_FIRST_DOSES_PERCENTAGE
                  d3.select(".mouse-line")
                      .attr("d", function () {
                        let data = "M" + xScale(record_date) + "," + (height);
                        data += " " + xScale(record_date) + "," + 0;
                        return data;
                      });
                  return "translate(" + xScale(record_date) + "," + yScale(cumulative_first_doses_percentage) + ")";
                });
            
            tooltip.html(`${xDate.toDateString()}`)
                   .style('display', 'block')
                   .style('left', `${e.pageX + 20}px`)
                   .style('top', `${e.pageY - 20}px`)
                   .style('font-size', "10px")
                   .selectAll()
                   .data(groupedData) // for each vehicle category, list out name and price of premium
                   .join('div')
                   .style('color', d => {
                     return colorScale(d[0])
                   })
                   .html(d => {
                     var xDate = xScale.invert(mouse[0])
                     let bisect = d3.bisector(function (d) {
                      return new Date(d.RECORD_DATE);
                    }).left
                     var idx = bisect(d[1], xDate)
                     return d[0] + ": " +d[1][idx].CUMULATIVE_FIRST_DOSES_PERCENTAGE.toFixed(2)
                   })
          });

  // Draw lines
  usVaccinationTrendSvg.selectAll(".line")
    .data(groupedData)
    .join("path")
      .attr("class", "line")
      .attr("stroke-width", 1.5)
      .attr("stroke", function(d) {
        return colorScale(d[0]);
      })
      .attr("fill", "none")
      .transition()
      .duration(500)
      .attr(
        "d",
        function(d) {
          return d3.line()
                  .x(function(d) {
                    return xScale(new Date(d.RECORD_DATE));
                  })
                  .y(function(d) {
                    return yScale(+d.CUMULATIVE_FIRST_DOSES_PERCENTAGE);
                  })
                  (d[1])
        }
      )

  // Label chart
  usVaccinationTrendSvg.append("text")
                         .attr("x", width / 2)
                         .attr("y", 0)
                         .style("text-anchor", "middle")
                         .style("font-size", "1.5em")
                         .text("US Cumulative Vaccination Trend Query");

  // Label axes
  // X-axis
  usVaccinationTrendSvg.append("text")
                         .attr("x", width / 2)
                         .attr("y", height + margin.bottom / 4)
                         .attr("dy", "1.5em")
                         .style("text-anchor", "middle")
                         .text("Date");
  // Y-axis
  usVaccinationTrendSvg.append("text")
                         .attr("transform", "rotate(-90)")
                         .attr("x", -height / 2)
                         .attr("y", -margin.left / 4)
                         .attr("dy", "-1.1em")
                         .style("text-anchor", "middle")
                         .text("Cumulative Vaccination Count");
}

// Default
function drawDefaultUsVaccinationTrendChart() {
  let fromDate = $('#from-date').val();
  let toDate = $('#to-date').val();
  let id = $("#us-states").val();
  d3.json(usVaccinationTrendApi, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fromDate: fromDate,
      toDate: toDate,
      id: id
    })
  })
  .then(drawUsVaccinationTrendChart)
  .catch(displayErrors);
}

// Send AJAX request on form submit
$("form").submit(function(e){
  e.preventDefault();
  let fromDate = $('#from-date').val();
  let toDate = $('#to-date').val();
  let id = $("#us-states").val();
  d3.json(usVaccinationTrendApi, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fromDate: fromDate,
      toDate: toDate,
      id: id
    })
  })
  .then(drawUsVaccinationTrendChart)
  .catch(displayErrors);
})
////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////// Populate dropdown for Countries
////////////////////////////////////////////////////////////////////////////////

// US states API
const worldCountriesApi = "http://localhost:3000/api/world-countries"

function parseJSON(response) {
  return response.json();
}

function populateDropdown(data) {
  for(let i=0; i<data.length; i++) {
      if(data[i].NAME == "United States") {
        $("#world-countries").append(
          `<option value=${data[i].ID} selected>${data[i].NAME}</option>`
        )
      } else {
        $("#world-countries").append(
          `<option value=${data[i].ID}>${data[i].NAME}</option>`
        )
      }
  }
  $("#world-countries").selectpicker("refresh");
}

function displayErrors(err){
  console.log("INSIDE displayErrors!");
  console.log(err);
}

fetch(worldCountriesApi)
.then(parseJSON)
.then(populateDropdown)
.then(drawDefaultWorldPositivityTrendChart)
.catch(displayErrors);

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////// Query 1:  World positivity trend
////////////////////////////////////////////////////////////////////////////////

// World positivity trend API
const worldPositivityTrendApi = "http://localhost:3000/api/positivity-world/world-positivity-trend";
// const worldPositivitySummaryApi = "http://localhost:3000/api/positivity-world/world-positivity-summary";

// SVG configurations
const margin = {
  top: 25,
  right: 25,
  bottom: 50,
  left: 50
};
const width = 600 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

// append the svg object to the body of the page
const worldPositivityTrendSvg = d3.select("#world-positivity-trend")
                                  .append("svg")
                                  .attr("width", width + margin.left + margin.right)
                                  .attr("height", height + margin.top + margin.bottom)
                                .append("g")
                                  .attr("transform", `translate(${margin.left},${margin.top})`);

// Initialize X-axis
const xScale = d3.scaleTime()
                 .range([0, width]);
const xAxis = d3.axisBottom(xScale);
worldPositivityTrendSvg.append("g")
                       .attr("transform", `translate(0, ${height})`)
                       .attr("class", "xAxis");

// Initialize Y-axis
const yScale = d3.scaleLinear()
                 .range([height, 0]);
const yAxis = d3.axisLeft(yScale);
worldPositivityTrendSvg.append("g")
                       .attr("class", "yAxis");

// Initialize colors
const colorScale = d3.scaleOrdinal()
                     .range(d3.schemeCategory10);

// Hover tooltip
let tooltip = d3.select("#world-positivity-trend")
                  .append("div")
                    .attr("id", "tooltip")
                    .style("position", "absolute")
                    .style("background-color", "#D3D3D3")
                    .style("padding", "6px")
                    .style("display", "none")

let vert = worldPositivityTrendSvg.append("g")
                                    .attr("class", "mouse-over-effects")

vert.append("path")
      .attr("class", "mouse-line")
      .style("stroke", "#A9A9A9")
      .style("stroke-width", "1px")
      .style("opacity", "0");





// Line chart
function drawWorldPositivityTrendChart(data) {
  // Group data with respect to state_id
  var groupedData = d3.group(data, function(d) {
    return d.COUNTRY_ID;
  });
  
  // Create X-axis
  xScale.domain(d3.extent(data, function(d) {
    return new Date(d.RECORD_DATE);
  }));
  worldPositivityTrendSvg.selectAll(".xAxis")
                         .transition()
                         .duration(500)
                         .call(xAxis);

  // Create Y-axis
  yScale.domain(d3.extent(data, function(d) {
    return +d.POSITIVITY_RATE;
  }));
  worldPositivityTrendSvg.selectAll(".yAxis")
                         .transition()
                         .duration(500)
                         .call(yAxis);

  // Create colors
  colorScale.domain(groupedData.keys());

  let mousePerLine = vert.selectAll(".mouse-per-line")
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

vert.append("svg:rect")
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
let positivity_rate = +d[1][idx].POSITIVITY_RATE
d3.select(".mouse-line")
.attr("d", function () {
let data = "M" + xScale(record_date) + "," + (height);
data += " " + xScale(record_date) + "," + 0;
return data;
});
return "translate(" + xScale(record_date) + "," + yScale(positivity_rate) + ")";
});

tooltip.html(`${xDate.toDateString()}`)
.style('display', 'block')
.style('left', `${e.pageX + 20}px`)
.style('top', `${e.pageY - 20}px`)
.style('font-size', "10px")
.selectAll()
.data(groupedData)
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
return d[0] + ": " +d[1][idx].POSITIVITY_RATE.toFixed(2)
})
});




  // Draw lines
  worldPositivityTrendSvg.selectAll(".line")
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
                    return yScale(+d.POSITIVITY_RATE);
                  })
                  (d[1])
        }
      )

  // Label chart
  worldPositivityTrendSvg.append("text")
                         .attr("x", width / 2)
                         .attr("y", 0)
                         .style("text-anchor", "middle")
                         .style("font-size", "1.5em")
                         .text("World Positivity Trend Query");

  // Label axes
  // X-axis
  worldPositivityTrendSvg.append("text")
                         .attr("x", width / 2)
                         .attr("y", height + margin.bottom / 4)
                         .attr("dy", "1.5em")
                         .style("text-anchor", "middle")
                         .text("Date");
  // Y-axis
  worldPositivityTrendSvg.append("text")
                         .attr("transform", "rotate(-90)")
                         .attr("x", -height / 2)
                         .attr("y", -margin.left / 4)
                         .attr("dy", "-1.1em")
                         .style("text-anchor", "middle")
                         .text("Cumulative Positivity Percentage");
}

// Default
function drawDefaultWorldPositivityTrendChart() {
  let fromDate = $('#from-date').val();
  let toDate = $('#to-date').val();
  let id = $("#world-countries").val();
  d3.json(worldPositivityTrendApi, {
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
  .then(drawWorldPositivityTrendChart)
  .catch(displayErrors);
}

// Send AJAX request on form submit
$("form").submit(function(e){
  e.preventDefault();
  let fromDate = $('#from-date').val();
  let toDate = $('#to-date').val();
  let id = $("#world-countries").val();
  console.log(fromDate, toDate, id);
  d3.json(worldPositivityTrendApi, {
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
  .then(drawWorldPositivityTrendChart)
  .catch(displayErrors);
  // d3.json(worldPositivitySummaryApi, {
  //   method: "POST",
  //   headers: {
  //     'Content-Type': 'application/json'
  //   },
  //   body: JSON.stringify({
  //     id: id
  //   })
  // })
  // .catch(displayErrors);
});
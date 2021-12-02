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
      if(data[i].NAME == "Alaska") {
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
.then(drawDefaultCommunityTransmissionTrendChart)
.catch(displayErrors);

////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////// Query 2: Community Transmission
////////////////////////////////////////////////////////////////////////////////

// US vaccination trend API
const CommunityTransmissionTrendApi = "http://localhost:3000/api/community-transmission/community-transmission-trend";
// const CommunitySummaryApi = "http://localhost:3000/api/community/community-summary";

// SVG configurations
const margin = {
  top: 25,
  right: 25,
  bottom: 50,
  left: 50
};
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// append the svg object to the body of the page
const CommunityTransmissionTrendSvg = d3.select("#community-transmission-trend")
                            .append("svg")
                                  .attr("width", width + margin.left + margin.right)
                                  .attr("height", height + margin.top + margin.bottom)
                                .append("g")
                                  .attr("transform", `translate(${margin.left},${margin.top})`);

// Initialize X-axis
const xScale = d3.scaleTime()
                 .range([0, width]);
const xAxis = d3.axisBottom(xScale);
CommunityTransmissionTrendSvg.append("g")
                       .attr("transform", `translate(0, ${height})`)
                       .attr("class", "xAxis");

// Initialize Y-axis
const yScale = d3.scaleLinear()
                 .range([height, 0]);
const yAxis = d3.axisLeft(yScale);
CommunityTransmissionTrendSvg.append("g")
                       .attr("class", "yAxis");

// Initialize colors
const colorScale = d3.scaleOrdinal()
                     .range(d3.schemeCategory10);

// Hover tooltip
let tooltip = d3.select("#community-transmission-trend")
                  .append("div")
                    .attr("id", "tooltip")
                    .style("position", "absolute")
                    .style("background-color", "#D3D3D3")
                    .style("padding", "10px")
                    .style("display", "none")

let vert = CommunityTransmissionTrendSvg.append("g")
                    .attr("class", "mouse-over-effects")

vert.append("path")
    .attr("class", "mouse-line")
    .style("stroke", "#A9A9A9")
    .style("stroke-width", "1px")
    .style("opacity", "0");

// Line chart
function drawCommunityTransmissionTrendChart(data) {
  // Group data with respect to state_id
  var groupedData = d3.group(data, function(d) {
    return d.STATE_NAME;
  });
  // Create X-axis
  xScale.domain(d3.extent(data, function(d) {
    return new Date(d.RECORD_DATE);
  }));
  CommunityTransmissionTrendSvg.selectAll(".xAxis")
                         .transition()
                         .duration(500)
                         .call(xAxis);

  // Create Y-axis
  yScale.domain([
    d3.min(data, function(d) {
      return +d.NUM_OF_HIGH_RISK_COUNTIES
    }),
    d3.max(data, function(d) {
      return +d.NUM_OF_HIGH_RISK_COUNTIES;
    }) * 1.25])
  CommunityTransmissionTrendSvg.selectAll(".yAxis")
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
                .attr("r", 6)
                .style("stroke", function(d) {
                  return colorScale(d[0]);
                })
                .style("fill", "none")
                .style("stroke-width", "2px")
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
                let num_of_high_risk_counties = +d[1][idx].NUM_OF_HIGH_RISK_COUNTIES
                d3.select(".mouse-line")
                    .attr("d", function () {
                      let data = "M" + xScale(record_date) + "," + (height);
                      data += " " + xScale(record_date) + "," + 0;
                      return data;
                    });
                return "translate(" + xScale(record_date) + "," + yScale(num_of_high_risk_counties) + ")";
              });
                  
          tooltip.html(`${xDate.toDateString()}`)
                  .style('display', 'block')
                  .style('left', `${e.pageX + 20}px`)
                  .style('top', `${e.pageY - 20}px`)
                  .style('font-size', "1em")
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
                    return d[0] + ": " +d[1][idx].NUM_OF_HIGH_RISK_COUNTIES
                  })
        });

  // Draw lines
  CommunityTransmissionTrendSvg.selectAll(".line")
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
                    return yScale(+d.NUM_OF_HIGH_RISK_COUNTIES);
                  })
                  (d[1])
        }
      )

  // Label chart
  CommunityTransmissionTrendSvg.append("text")
                         .attr("x", width / 2)
                         .attr("y", 0)
                         .style("text-anchor", "middle")
                         .style("font-size", "1.5em")
                         .text("Community Trend Query (US)");

  // Label axes
  // X-axis
  CommunityTransmissionTrendSvg.append("text")
                         .attr("x", width / 2)
                         .attr("y", height + margin.bottom / 4)
                         .attr("dy", "1.5em")
                         .style("text-anchor", "middle")
                         .text("Date");
  // Y-axis
  CommunityTransmissionTrendSvg.append("text")
                         .attr("transform", "rotate(-90)")
                         .attr("x", -height / 2)
                         .attr("y", -margin.left / 4)
                         .attr("dy", "-1.5em")
                         .style("text-anchor", "middle")
                         .text("Number of high risk counties");
}

// Default
function drawDefaultCommunityTransmissionTrendChart() {
  let fromDate = $('#from-date').val();
  let toDate = $('#to-date').val();
  let id = $("#us-states").val();
  d3.json(CommunityTransmissionTrendApi, {
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
  .then(drawCommunityTransmissionTrendChart)
  .catch(displayErrors);
}

// Send AJAX request on form submit
$("form").submit(function(e){
  e.preventDefault();
  let fromDate = $('#from-date').val();
  let toDate = $('#to-date').val();
  let id = $("#us-states").val();
  console.log(fromDate, toDate, id);
  d3.json(CommunityTransmissionTrendApi, {
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
  .then(drawCommunityTransmissionTrendChart)
  .catch(displayErrors);
  // d3.json(CommunitySummaryApi, {
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
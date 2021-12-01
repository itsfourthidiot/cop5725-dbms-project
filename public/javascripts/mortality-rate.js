/////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////// Toggle between USA and World
/////////////////////////////////////////////////////////////////////////////////

$("#toggleus").click(function(){
  $("#world-mortality-rate").hide();
  $("#us-mortality-rate").show();
});

$("#toggleworld").click(function(){
  $("#us-mortality-rate").hide();
  $("#world-mortality-rate").show();
});

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////// Common things to both the queries
////////////////////////////////////////////////////////////////////////////////
// SVG configurations
const margin = {
  top: 50,
  right: 25,
  bottom: 50,
  left: 50
};
const width = 600 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

function displayErrors(err){
  console.log("INSIDE displayErrors!");
  console.log(err);
}

////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////// Populate dropdown for US states
////////////////////////////////////////////////////////////////////////////////

// US states API
const usStatesApi = "http://localhost:3000/api/us-states"

function parseJSON(response) {
  return response.json();
}

function populateUsStatesDropdown(data) {
  console.log(data);
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

fetch(usStatesApi)
.then(parseJSON)
.then(populateUsStatesDropdown)
.then(drawDefaultUsMortalityRateTrendChart)
.catch(displayErrors);

////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////// US Mortality trend
////////////////////////////////////////////////////////////////////////////////

// US Mortality trend API
const usMortalityRateTrendApi = "http://localhost:3000/api/mortality-rate/us-mortality-rate-trend";
// const usMortalitySummaryApi = "http://localhost:3000/api/mortality/us-mortality-summary";

// append the svg object to the body of the page
const usMortalityRateTrendSvg = d3.select("#us-mortality-rate-trend")
                              .append("svg")
                                  .attr("width", width + margin.left + margin.right)
                                  .attr("height", height + margin.top + margin.bottom)
                                .append("g")
                                  .attr("transform", `translate(${margin.left},${margin.top})`);

// Initialize X-axis
const usXScale = d3.scaleTime()
                 .range([0, width]);
const usXAxis = d3.axisBottom(usXScale);
usMortalityRateTrendSvg.append("g")
                       .attr("transform", `translate(0, ${height})`)
                       .attr("class", "usXAxis");

// Initialize Y-axis
const usYScale = d3.scaleLinear()
                 .range([height, 0]);
const usYAxis = d3.axisLeft(usYScale);
usMortalityRateTrendSvg.append("g")
                       .attr("class", "usYAxis");

// Initialize colors
const usColorScale = d3.scaleOrdinal()
                     .range(d3.schemeCategory10);

// Hover tooltip
let usTooltip = d3.select("#us-mortality-rate-trend")
                  .append("div")
                    .attr("id", "us-tooltip")
                    .style("position", "absolute")
                    .style("background-color", "#D3D3D3")
                    .style("padding", "6px")
                    .style("display", "none")

let usVert = usMortalityRateTrendSvg.append("g")
                                    .attr("class", "mouse-over-effects")

usVert.append("path")
        .attr("class", "us-mouse-line")
        .style("stroke", "#A9A9A9")
        .style("stroke-width", "1px")
        .style("opacity", "0");

// Line chart
function drawUsMortalityRateTrendChart(data) {
  // Group data with respect to state_id
  var groupedData = d3.group(data, function(d) {
    return d.STATE_ID;
  });
  // Create X-axis
  usXScale.domain(d3.extent(data, function(d) {
    return new Date(d.RECORD_DATE);
  }));
  usMortalityRateTrendSvg.selectAll(".usXAxis")
                         .transition()
                         .duration(500)
                         .call(usXAxis);

  // Create Y-axis
  usYScale.domain(d3.extent(data, function(d) {
    return +d.DEATH_RATE;
  }));
  usMortalityRateTrendSvg.selectAll(".usYAxis")
                         .transition()
                         .duration(500)
                         .call(usYAxis);

  // Create colors
  usColorScale.domain(groupedData.keys());

  let usMousePerLine = usVert.selectAll(".us-mouse-per-line")
                           .data(groupedData)
                           .join("g")
                             .attr("class", "us-mouse-per-line");

  usMousePerLine.append("circle")
                .attr("r", 4)
                .style("stroke", function(d) {
                  return usColorScale(d[0]);
                })
                .style("fill", "none")
                .style("stroke-width", "1px")
                .style("opacity", "0")

  usVert.append("svg:rect")
          .attr("width", width) 
          .attr("height", height)
          .attr("fill", "none")
          .attr("pointer-events", "all")
          .on("mouseout", function() {
            d3.select(".us-mouse-line")
                .style("opacity", "0");
            d3.selectAll(".us-mouse-per-line circle")
                .style("opacity", "0");
            d3.selectAll(".us-mouse-per-line text")
                .style("opacity", "0");
            d3.selectAll("#us-tooltip")
                .style('display', 'none')
          })
          .on('mouseover', function() {
            d3.select(".us-mouse-line")
                .style("opacity", "1");
            d3.selectAll(".us-mouse-per-line circle")
                .style("opacity", "1");
            d3.selectAll("#us-tooltip")
                .style('display', 'block')
          })
          .on('mousemove', function(e) {
            let mouse = d3.pointer(e)
            let xDate = usXScale.invert(mouse[0])
            d3.selectAll(".us-mouse-per-line")
                .attr("transform", function (d, i) {
                  let bisect = d3.bisector(function (d) {
                    return new Date(d.RECORD_DATE);
                  }).left
                  let idx = bisect(d[1], xDate);
                  let record_date = new Date(d[1][idx].RECORD_DATE)
                  let death_rate = +d[1][idx].DEATH_RATE
                  d3.select(".us-mouse-line")
                      .attr("d", function () {
                        let data = "M" + usXScale(record_date) + "," + (height);
                        data += " " + usXScale(record_date) + "," + 0;
                        return data;
                      });
                  return "translate(" + usXScale(record_date) + "," + usYScale(death_rate) + ")";
                });
            
            usTooltip.html(`${xDate.toDateString()}`)
                   .style('display', 'block')
                   .style('left', `${e.pageX + 20}px`)
                   .style('top', `${e.pageY - 20}px`)
                   .style('font-size', "10px")
                   .selectAll()
                   .data(groupedData)
                   .join('div')
                   .style('color', d => {
                     return usColorScale(d[0])
                   })
                   .html(d => {
                     var xDate = usXScale.invert(mouse[0])
                     let bisect = d3.bisector(function (d) {
                      return new Date(d.RECORD_DATE);
                    }).left
                     var idx = bisect(d[1], xDate)
                     return d[0] + ": " +d[1][idx].DEATH_RATE.toFixed(2)
                   })
          });

  // Draw lines
  usMortalityRateTrendSvg.selectAll(".line")
    .data(groupedData)
    .join("path")
      .attr("class", "line")
      .attr("stroke-width", 1.5)
      .attr("stroke", function(d) {
        return usColorScale(d[0]);
      })
      .attr("fill", "none")
      .transition()
      .duration(500)
      .attr(
        "d",
        function(d) {
          return d3.line()
                  .x(function(d) {
                    return usXScale(new Date(d.RECORD_DATE));
                  })
                  .y(function(d) {
                    return usYScale(+d.DEATH_RATE);
                  })
                  (d[1])
        }
      )

  // Label chart
  usMortalityRateTrendSvg.append("text")
                         .attr("x", width / 2)
                         .attr("y", 0)
                         .style("text-anchor", "middle")
                         .style("font-size", "1.5em")
                         .text("US Mortality Trend Query");

  // Label axes
  // X-axis
  usMortalityRateTrendSvg.append("text")
                         .attr("x", width / 2)
                         .attr("y", height + margin.bottom / 4)
                         .attr("dy", "1.5em")
                         .style("text-anchor", "middle")
                         .text("Date");
  // Y-axis
  usMortalityRateTrendSvg.append("text")
                         .attr("transform", "rotate(-90)")
                         .attr("x", -height / 2)
                         .attr("y", -margin.left / 4)
                         .attr("dy", "-1.1em")
                         .style("text-anchor", "middle")
                         .text("Cumulative First Dose Percentage");
}

// Default
function drawDefaultUsMortalityRateTrendChart() {
  let fromDate = $('#us-from-date').val();
  let toDate = $('#us-to-date').val();
  let id = $("#us-states").val();
  d3.json(usMortalityRateTrendApi, {
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
  .then(drawUsMortalityRateTrendChart)
  .catch(displayErrors);
}

// Send AJAX request on form submit
$("#us-mortality-rate form").submit(function(e){
  e.preventDefault();
  let fromDate = $('#us-from-date').val();
  let toDate = $('#us-to-date').val();
  let id = $("#us-states").val();
  d3.json(usMortalityRateTrendApi, {
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
  .then(drawUsMortalityRateTrendChart)
  .catch(displayErrors);
  // d3.json(usMortalitySummaryApi, {
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

// ////////////////////////////////////////////////////////////////////////////////
// //////////////////////////////////////////////// Populate dropdown for US states
// ////////////////////////////////////////////////////////////////////////////////
// // US states API
// const worldCountriesApi = "http://localhost:3000/api/world-countries"

// function parseJSON(response) {
//   return response.json();
// }

// function populateDropdown(data) {
//   for(let i=0; i<data.length; i++) {
//       if(data[i].NAME == "United States") {
//         $("#world-countries").append(
//           `<option value=${data[i].ID} selected>${data[i].NAME}</option>`
//         )
//       } else {
//         $("#world-countries").append(
//           `<option value=${data[i].ID}>${data[i].NAME}</option>`
//         )
//       }
//   }
//   $("#world-countries").selectpicker("refresh");
// }

// function displayErrors(err){
//   console.log("INSIDE displayErrors!");
//   console.log(err);
// }

// fetch(worldCountriesApi)
// .then(parseJSON)
// .then(populateDropdown)
// .then(drawDefaultWorldDeathRateTrendChart)
// .catch(displayErrors);

// ////////////////////////////////////////////////////////////////////////////////
// ////////////////////////////////////////////////////////////////////////////////

// ////////////////////////////////////////////////////////////////////////////////
// /////////////////////////////////////////// Query 1:  World mortality rate trend
// ////////////////////////////////////////////////////////////////////////////////

// // US vaccination trend API
// const worldMortalityRateTrendApi = "http://localhost:3000/api/mortality-rate/world-mortality-rate-trend";
// const worldMortalityRateSummaryApi = "http://localhost:3000/api/mortality-rate/world-mortality-rate-summary";

// // SVG configurations
// const margin = {
//   top: 25,
//   right: 25,
//   bottom: 50,
//   left: 50
// };
// const width = 600 - margin.left - margin.right;
// const height = 400 - margin.top - margin.bottom;

// // append the svg object to the body of the page
// const worldMortalityRateTrendSvg = d3.select("#world-mortality-rate-trend")
//                                      .attr("width", width + margin.left + margin.right)
//                                      .attr("height", height + margin.top + margin.bottom)
//                                    .append("g")
//                                      .attr("transform", `translate(${margin.left},${margin.top})`);

// // Initialize X-axis
// const xScale = d3.scaleTime()
//                  .range([0, width]);
// const xAxis = d3.axisBottom(xScale);
// worldMortalityRateTrendSvg.append("g")
//                             .attr("transform", `translate(0, ${height})`)
//                             .attr("class", "xAxis");

// // Initialize Y-axis
// const yScale = d3.scaleLinear()
//                  .range([height, 0]);
// const yAxis = d3.axisLeft(yScale);
// worldMortalityRateTrendSvg.append("g")
//                             .attr("class", "yAxis");

// // Initialize colors
// const colorScale = d3.scaleOrdinal()
//                      .range(d3.schemeCategory10);

// // Line chart
// function drawWorldMortalityRateTrendChart(data) {
//   // Group data with respect to state_id
//   var groupedData = d3.group(data, function(d) {
//     return d.COUNTRY_ID;
//   });
//   // Create X-axis
//   xScale.domain(d3.extent(data, function(d) {
//     return new Date(d.RECORD_DATE);
//   }));
//   worldMortalityRateTrendSvg.selectAll(".xAxis")
//                               .transition()
//                               .duration(500)
//                               .call(xAxis);

//   // Create Y-axis
//   yScale.domain(d3.extent(data, function(d) {
//     return new Date(d.DEATH_RATE);
//   }));
//   worldMortalityRateTrendSvg.selectAll(".yAxis")
//                               .transition()
//                               .duration(500)
//                               .call(yAxis);

//   // Create colors
//   colorScale.domain(groupedData.keys());

//   // Draw lines
//   worldMortalityRateTrendSvg.selectAll(".line")
//                             .data(groupedData)
//                             .join("path")
//                               .attr("class", "line")
//                               .attr("stroke-width", 1.5)
//                               .attr("stroke", function(d) {
//                                 return colorScale(d[0]);
//                               })
//                               .attr("fill", "none")
//                               .transition()
//                               .duration(500)
//                               .attr(
//                                 "d",
//                                 function(d) {
//                                   return d3.line()
//                                           .x(function(d) {
//                                             return xScale(new Date(d.RECORD_DATE));
//                                           })
//                                           .y(function(d) {
//                                             return yScale(+d.DEATH_RATE);
//                                           })
//                                           (d[1])
//                                 }
//       )

//   // Label chart
//   worldMortalityRateTrendSvg.append("text")
//                               .attr("x", width / 2)
//                               .attr("y", 0)
//                               .style("text-anchor", "middle")
//                               .style("font-size", "1.5em")
//                               .text("World Mortality Rate Trend Query");

//   // Label axes
//   // X-axis
//   worldMortalityRateTrendSvg.append("text")
//                               .attr("x", width / 2)
//                               .attr("y", height + margin.bottom / 4)
//                               .attr("dy", "1.5em")
//                               .style("text-anchor", "middle")
//                               .text("Date");
//   // Y-axis
//   worldMortalityRateTrendSvg.append("text")
//                               .attr("transform", "rotate(-90)")
//                               .attr("x", -height / 2)
//                               .attr("y", -margin.left / 4)
//                               .attr("dy", "-1.1em")
//                               .style("text-anchor", "middle")
//                               .text("Death Rate");
// }

// // Default
// function drawDefaultWorldDeathRateTrendChart() {
//   let fromDate = $('#from-date').val();
//   let toDate = $('#to-date').val();
//   let id = $("#world-countries").val();
//   d3.json(worldMortalityRateTrendApi, {
//     method: "POST",
//     headers: {
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({
//       fromDate: fromDate,
//       toDate: toDate,
//       id: id
//     })
//   })
//   .then(drawWorldMortalityRateTrendChart)
//   .catch(displayErrors);
// }

// // Send AJAX request on form submit
// $("form").submit(function(e){
//   e.preventDefault();
//   let fromDate = $('#from-date').val();
//   let toDate = $('#to-date').val();
//   let id = $("#world-countries").val();
//   d3.json(worldMortalityRateTrendApi, {
//     method: "POST",
//     headers: {
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({
//       fromDate: fromDate,
//       toDate: toDate,
//       id: id
//     })
//   })
//   .then(drawWorldMortalityRateTrendChart)
//   .catch(displayErrors);
//   d3.json(worldMortalityRateSummaryApi, {
//     method: "POST",
//     headers: {
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({
//       id: id
//     })
//   })
//   .catch(displayErrors);
// });
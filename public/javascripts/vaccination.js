/////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////// Toggle between USA and World
/////////////////////////////////////////////////////////////////////////////////

$("#toggleus").click(function(){
  $(this).addClass("active");
  $("#toggleworld").removeClass("active");
  $("#world-vaccination").hide();
  $("#us-vaccination").show();
});

$("#toggleworld").click(function(){
  $(this).addClass("active");
  $("#toggleus").removeClass("active");
  $("#us-vaccination").hide();
  $("#world-vaccination").show();
});

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////// Common things to both the queries
////////////////////////////////////////////////////////////////////////////////
// SVG configurations
const margin = {
  top: 50,
  right: 25,
  bottom: 50,
  left: 150
};
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

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
.then(drawDefaultUsVaccinationTrendChart)
.catch(displayErrors);

////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////// Query 1:  US vaccination trend
////////////////////////////////////////////////////////////////////////////////
// US vaccination trend API
const usVaccinationTrendApi = "http://localhost:3000/api/vaccination/us-vaccination-trend";

// append the svg object to the body of the page
const usVaccinationTrendSvg = d3.select("#us-vaccination-trend")
                                .append("svg")
                                  .attr("width", width + margin.left + margin.right)
                                  .attr("height", height + margin.top + margin.bottom)
                                .append("g")
                                  .attr("transform", `translate(${margin.left},${margin.top})`);

// Initialize X-axis
const usXScale = d3.scaleTime()
                   .range([0, width]);
const usXAxis = d3.axisBottom(usXScale);
usVaccinationTrendSvg.append("g")
                       .attr("transform", `translate(0, ${height})`)
                       .attr("class", "usXAxis");

// Initialize Y-axis
const usYScale = d3.scaleLinear()
                   .range([height, 0]);
const usYAxis = d3.axisLeft(usYScale);
usVaccinationTrendSvg.append("g")
                       .attr("class", "usYAxis");

// Initialize colors
const usColorScale = d3.scaleOrdinal()
                       .range(d3.schemeCategory10);

// Hover tooltip
let usTooltip = d3.select("#us-vaccination-trend")
                  .append("div")
                    .attr("id", "us-tooltip")
                    .style("position", "absolute")
                    .style("background-color", "#D3D3D3")
                    .style("padding", "1em")
                    .style("display", "none")

let usVert = usVaccinationTrendSvg.append("g")
                                    .attr("class", "mouse-over-effects")

usVert.append("path")
        .attr("class", "us-mouse-line")
        .style("stroke", "#A9A9A9")
        .style("stroke-width", "1px")
        .style("opacity", "0");

// Line chart
function drawUsVaccinationTrendChart(data) {
  // Group data with respect to state_id
  let groupedData = d3.group(data, function(d) {
    return d.STATE_NAME;
  });
  
  // Create X-axis
  usXScale.domain(d3.extent(data, function(d) {
    return new Date(d.RECORD_DATE);
  }));
  usVaccinationTrendSvg.selectAll(".usXAxis")
                         .transition()
                         .duration(500)
                         .call(usXAxis);

  // Create Y-axis
  usYScale.domain([
    d3.min(data, function(d) {
      return +d.TOTAL_DOSES_PER_THOUSAND
    }),
    d3.max(data, function(d) {
      return +d.TOTAL_DOSES_PER_THOUSAND;
    }) * 1.25])
  usVaccinationTrendSvg.selectAll(".usYAxis")
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
                .attr("r", 6)
                .style("stroke", function(d) {
                  return usColorScale(d[0]);
                })
                .style("fill", "none")
                .style("stroke-width", "2px")
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
                  let total_doses_per_thousand = +d[1][idx].TOTAL_DOSES_PER_THOUSAND
                  d3.select(".us-mouse-line")
                      .attr("d", function () {
                        let data = "M" + usXScale(record_date) + "," + (height);
                        data += " " + usXScale(record_date) + "," + 0;
                        return data;
                      });
                  return "translate(" + usXScale(record_date) + "," + usYScale(total_doses_per_thousand) + ")";
                });
            
            usTooltip.html(`${xDate.toDateString()}`)
                   .style('display', 'block')
                   .style('left', `${e.pageX + 20}px`)
                   .style('top', `${e.pageY - 20}px`)
                   .style('font-size', "1em")
                   .selectAll()
                   .data(groupedData)
                   .join('div')
                   .style('color', d => {
                     return usColorScale(d[0])
                   })
                   .html(d => {
                     let xDate = usXScale.invert(mouse[0])
                     let bisect = d3.bisector(function (d) {
                      return new Date(d.RECORD_DATE);
                    }).left
                     let idx = bisect(d[1], xDate)
                     return d[0] + ": Atleast 1 dose(" +d[1][idx].ATLEAST_ONE_DOSE.toFixed(2) + "%), Fully vaccinated(" + d[1][idx].FULLY_VACCINATED.toFixed(2) + "%)"
                   })
          });

  // Draw lines
  usVaccinationTrendSvg.selectAll(".line")
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
                    return usYScale(+d.TOTAL_DOSES_PER_THOUSAND);
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
                         .text("Vaccination Trend Query (US)");

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
                         .attr("dy", "-1.5em")
                         .style("text-anchor", "middle")
                         .text("Total doses administered per thousand");
}

// Default
function drawDefaultUsVaccinationTrendChart() {
  let fromDate = $('#us-from-date').val();
  let toDate = $('#us-to-date').val();
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
$("#us-vaccination form").submit(function(e){
  e.preventDefault();
  let fromDate = $('#us-from-date').val();
  let toDate = $('#us-to-date').val();
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

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////// Populate dropdown for World countries
////////////////////////////////////////////////////////////////////////////////

// US states API
const worldCountriesApi = "http://localhost:3000/api/world-countries"

function populateWorldCountriesDropdown(data) {
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

fetch(worldCountriesApi)
.then(parseJSON)
.then(populateWorldCountriesDropdown)
.then(drawDefaultWorldVaccinationTrendChart)
.catch(displayErrors);

////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////// World vaccination trend
////////////////////////////////////////////////////////////////////////////////

// US vaccination trend API
const worldVaccinationTrendApi = "http://localhost:3000/api/vaccination/world-vaccination-trend";

// append the svg object to the body of the page
const worldVaccinationTrendSvg = d3.select("#world-vaccination-trend")
                                  .append("svg")
                                  .attr("width", width + margin.left + margin.right)
                                  .attr("height", height + margin.top + margin.bottom)
                                .append("g")
                                  .attr("transform", `translate(${margin.left},${margin.top})`);

// Initialize X-axis
const worldXScale = d3.scaleTime()
                   .range([0, width]);
const worldXAxis = d3.axisBottom(worldXScale);
worldVaccinationTrendSvg.append("g")
                       .attr("transform", `translate(0, ${height})`)
                       .attr("class", "worldXAxis");

// Initialize Y-axis
const worldYScale = d3.scaleLinear()
                   .range([height, 0]);
const worldYAxis = d3.axisLeft(worldYScale);
worldVaccinationTrendSvg.append("g")
                       .attr("class", "worldYAxis");

// Initialize colors
const worldColorScale = d3.scaleOrdinal()
                          .range(d3.schemeCategory10);

// Hover tooltip
let worldTooltip = d3.select("#world-vaccination-trend")
                  .append("div")
                    .attr("id", "world-tooltip")
                    .style("position", "absolute")
                    .style("background-color", "#D3D3D3")
                    .style("padding", "10px")
                    .style("display", "none")

let worldVert = worldVaccinationTrendSvg.append("g")
                                    .attr("class", "mouse-over-effects")

worldVert.append("path")
        .attr("class", "world-mouse-line")
        .style("stroke", "#A9A9A9")
        .style("stroke-width", "1px")
        .style("opacity", "0");

// Line chart
function drawWorldVaccinationTrendChart(data) {
  // Group data with respect to state_id
  let groupedData = d3.group(data, function(d) {
    return d.COUNTRY_NAME;
  });

  // Create X-axis
  worldXScale.domain(d3.extent(data, function(d) {
    return new Date(d.RECORD_DATE);
  }));
  worldVaccinationTrendSvg.selectAll(".worldXAxis")
                         .transition()
                         .duration(500)
                         .call(worldXAxis);

  // Create Y-axis
  worldYScale.domain([
    d3.min(data, function(d) {
      return +d.TOTAL_DOSES_PER_MILLION
    }),
    d3.max(data, function(d) {
      return +d.TOTAL_DOSES_PER_MILLION;
    }) * 1.25])
  worldVaccinationTrendSvg.selectAll(".worldYAxis")
                         .transition()
                         .duration(500)
                         .call(worldYAxis);

  // Create colors
  worldColorScale.domain(groupedData.keys());

  let worldMousePerLine = worldVert.selectAll(".world-mouse-per-line")
        .data(groupedData)
        .join("g")
          .attr("class", "world-mouse-per-line");

  worldMousePerLine.append("circle")
        .attr("r", 6)
        .style("stroke", function(d) {
          return worldColorScale(d[0]);
        })
        .style("fill", "none")
        .style("stroke-width", "2px")
        .style("opacity", "0")

  worldVert.append("svg:rect")
        .attr("width", width) 
        .attr("height", height)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .on("mouseout", function() {
          d3.select(".world-mouse-line")
              .style("opacity", "0");
          d3.selectAll(".world-mouse-per-line circle")
              .style("opacity", "0");
          d3.selectAll(".world-mouse-per-line text")
              .style("opacity", "0");
          d3.selectAll("#world-tooltip")
              .style('display', 'none')
        })
        .on('mouseover', function() {
          d3.select(".world-mouse-line")
              .style("opacity", "1");
          d3.selectAll(".world-mouse-per-line circle")
              .style("opacity", "1");
          d3.selectAll("#world-tooltip")
              .style('display', 'block')
        })
        .on('mousemove', function(e) {
          let mouse = d3.pointer(e)
          let xDate = worldXScale.invert(mouse[0])
          d3.selectAll(".world-mouse-per-line")
              .attr("transform", function (d, i) {
                let bisect = d3.bisector(function (d) {
                  return new Date(d.RECORD_DATE);
                }).left
                let idx = bisect(d[1], xDate);
                let record_date = new Date(d[1][idx].RECORD_DATE)
                let total_doses_per_million = +d[1][idx].TOTAL_DOSES_PER_MILLION
                d3.select(".world-mouse-line")
                    .attr("d", function () {
                      let data = "M" + worldXScale(record_date) + "," + (height);
                      data += " " + worldXScale(record_date) + "," + 0;
                      return data;
                    });
                return "translate(" + worldXScale(record_date) + "," + worldYScale(total_doses_per_million) + ")";
              });
    
    worldTooltip.html(`${xDate.toDateString()}`)
           .style('display', 'block')
           .style('left', `${e.pageX + 20}px`)
           .style('top', `${e.pageY - 20}px`)
           .style('font-size', "1em")
           .selectAll()
           .data(groupedData)
           .join('div')
           .style('color', d => {
             return worldColorScale(d[0])
           })
           .html(d => {
             let xDate = worldXScale.invert(mouse[0])
             let bisect = d3.bisector(function (d) {
              return new Date(d.RECORD_DATE);
            }).left
             let idx = bisect(d[1], xDate)
             return d[0] + ": " +d[1][idx].TOTAL_DOSES_PER_MILLION.toFixed(2)
           })
  });

  // Draw lines
  worldVaccinationTrendSvg.selectAll(".line")
    .data(groupedData)
    .join("path")
      .attr("class", "line")
      .attr("stroke-width", 1.5)
      .attr("stroke", function(d) {
        return worldColorScale(d[0]);
      })
      .attr("fill", "none")
      .transition()
      .duration(500)
      .attr(
        "d",
        function(d) {
          return d3.line()
                  .x(function(d) {
                    return worldXScale(new Date(d.RECORD_DATE));
                  })
                  .y(function(d) {
                    return worldYScale(+d.TOTAL_DOSES_PER_MILLION);
                  })
                  (d[1])
        }
      )

  // Label chart
  worldVaccinationTrendSvg.append("text")
                         .attr("x", width / 2)
                         .attr("y", 0)
                         .style("text-anchor", "middle")
                         .style("font-size", "1.5em")
                         .text("Vaccination Trend Query (World)");

  // Label axes
  // X-axis
  worldVaccinationTrendSvg.append("text")
                         .attr("x", width / 2)
                         .attr("y", height + margin.bottom / 4)
                         .attr("dy", "1.5em")
                         .style("text-anchor", "middle")
                         .text("Date");
  // Y-axis
  worldVaccinationTrendSvg.append("text")
                         .attr("transform", "rotate(-90)")
                         .attr("x", -height / 2)
                         .attr("y", -margin.left / 4)
                         .attr("dy", "-1.1em")
                         .style("text-anchor", "middle")
                         .text("Total doses administered per million");
}

// Default
function drawDefaultWorldVaccinationTrendChart() {
  let fromDate = $('#world-from-date').val();
  let toDate = $('#world-to-date').val();
  let id = $("#world-countries").val();
  d3.json(worldVaccinationTrendApi, {
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
  .then(drawWorldVaccinationTrendChart)
  .catch(displayErrors);
}

// Send AJAX request on form submit
$("#world-vaccination form").submit(function(e){
  e.preventDefault();
  let fromDate = $('#world-from-date').val();
  let toDate = $('#world-to-date').val();
  let id = $("#world-countries").val();
  d3.json(worldVaccinationTrendApi, {
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
  .then(drawWorldVaccinationTrendChart)
  .catch(displayErrors);
});
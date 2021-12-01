const totalNumberOfRowsApi = "http://localhost:3000/api/total-number-of-rows"

function parseJSON(response) {
  return response.json();
}

function openPopup(data) {
  alert(`Total number of rows: ${data[0]["TOTALCOUNT"]}`);
}

function displayErrors(err){
  console.log("INSIDE displayErrors!");
  console.log(err);
}

$("#num-rows").click(function() {
  fetch(totalNumberOfRowsApi)
  .then(parseJSON)
  .then(openPopup)
  .catch(displayErrors);
});
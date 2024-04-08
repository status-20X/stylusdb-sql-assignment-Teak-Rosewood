const fs = require("fs");
const csv = require("csv-parser");

function readCSV(filepath) {
  const result = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filepath)
      .pipe(csv())
      .on("data", (data) => result.push(data))
      .on("end", () => {
        resolve(result);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

function writeCSV(filePath, data) {
  // Convert JSON data to CSV format

  if (data.length <= 0) return;

  let csvData = [Object.keys(data[0]).join(",")];
  data.forEach((item) => {
    csvData.push(Object.values(item).join(","));
  });

  csvData = csvData.join("\n");

  // Write CSV data to file
  fs.writeFile(filePath, csvData, (err) => {
    if (err) {
      console.error("Error writing CSV file:", err);
    } else {
      // console.log("CSV file saved successfully!");
    }
  });
}

module.exports = { readCSV, writeCSV };

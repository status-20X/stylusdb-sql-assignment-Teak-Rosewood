const { readCSV, writeCSV } = require("./csvReader");
const {
  parseQuery,
  parseINSERTQuery,
  parseDELETEQuery,
} = require("./queryParser");
const aggregateMethods = require("./aggregateMethods");
const performInnerJoin = require("./JoinMethods/performInnerJoin");
const performRightJoin = require("./JoinMethods/performRightJoin");
const performLeftJoin = require("./JoinMethods/performLeftJoin");
const fs = require("fs");

const pre = "";

async function executeSELECTQuery(query) {
  try {
    console.log(query);
    const {
      fields,
      table,
      whereClauses,
      joinType,
      joinTable,
      joinCondition,
      hasAggregateWithoutGroupBy,
      groupByFields,
      orderByFields,
      limit,
      isDistinct,
    } = parseQuery(query);
    let data = await readCSV(`${pre}${table}.csv`);

    // inner join if specified
    if (joinTable && joinCondition) {
      const joinData = await readCSV(`${pre}${joinTable}.csv`);
      switch (joinType.toUpperCase()) {
        case "INNER":
          data = performInnerJoin(data, joinData, joinCondition, fields, table);
          break;
        case "LEFT":
          data = performLeftJoin(data, joinData, joinCondition, fields, table);
          break;
        case "RIGHT":
          data = performRightJoin(
            data,
            joinData,
            joinCondition,
            fields,
            joinTable
          );
          break;
        default:
          throw new Error(`Invalid syntax at join Type ${joinType}`);
      }
    }

    // WHERE CLAUSE filtering of DATA
    let filteredData =
      whereClauses?.length > 0
        ? data.filter((row) => {
            return whereClauses.every((clause) =>
              evaluateCondition(row, clause)
            );
          })
        : data;

    if (groupByFields?.length > 0) {
      filteredData = [...applyGroupBy(filteredData, groupByFields, fields)];
    }

    if (hasAggregateWithoutGroupBy) {
      const row = {
        ...filteredData[0],
      };
      fields.forEach((f) => {
        const { funcName, colName } = getAggregate(f);

        if (funcName === "count") {
          row[f] = aggregateMethods[funcName](filteredData);
        } else {
          row[f] = aggregateMethods[funcName](filteredData, colName);
        }
      });

      filteredData = [{ ...row }];
    }

    // selecting the rows
    filteredData = filteredData.map((row) => {
      const selectedRow = {};
      fields.forEach((field) => {
        selectedRow[field] = row[field];
      });
      return selectedRow;
    });

    // SETTING ORDER BY CLAUSE
    if (orderByFields) {
      filteredData.sort((a, b) => {
        for (let { fieldName, order } of orderByFields) {
          if (a[fieldName] < b[fieldName]) return order === "ASC" ? -1 : 1;
          if (a[fieldName] > b[fieldName]) return order === "ASC" ? 1 : -1;
        }
        return 0;
      });
    }

    if (isDistinct) {
      filteredData = [
        ...new Map(
          filteredData.map((item) => [
            fields.map((field) => item[field]).join("|"),
            item,
          ])
        ).values(),
      ];
    }

    if (limit !== null) {
      filteredData = filteredData.slice(0, limit);
    }
    return filteredData;
  } catch (err) {
    console.error("Error executing query:", err);
    throw new Error(`Failed to execute query: ${err.message}`);
  }
}

function evaluateCondition(row, clause) {
  const { field, operator, value } = clause;
  switch (operator) {
    case "=":
      return row[field] === value;
    case "!=":
      return row[field] !== value;
    case ">":
      return Number(row[field]) > Number(value);
    case "<":
      return Number(row[field]) < Number(value);
    case ">=":
      return Number(row[field]) >= Number(value);

    case "<=":
      return Number(row[field]) <= Number(value);
    case "LIKE":
      const regexPattern = "^" + clause.value.replace(/%/g, ".*") + "$";
      return new RegExp(regexPattern, "i").test(row[field]);
    default:
      throw new Error(`Invalid operator used ${operator}`);
  }
}

function applyGroupBy(data, groupByFields, fields) {
  const aggregates = [...fields];
  groupByFields.forEach((gfield) => {
    aggregates.forEach((f, j) => {
      if (f === gfield) {
        aggregates.splice(j, 1);
      }
    });
  });

  const extraFiedsCheck = aggregates.every((f) => {
    f = f.trim().toLowerCase();
    return (
      f.includes("count") ||
      f.includes("sum") ||
      f.includes("max") ||
      f.includes("min") ||
      f.includes("avg")
    );
  });

  if (!extraFiedsCheck) {
    throw new Error(
      "SELECT clause must contain extra fields with Aggregate functions(i.e COUNT, MAX, MIN, SUM, AVG) only"
    );
  }

  const returnData = [];
  const groups = data.reduce((groupedData, row) => {
    const key = groupByFields.map((gfield) => row[gfield]).join("-");

    if (!groupedData[key]) {
      groupedData[key] = [];
    }
    groupedData[key].push(row);

    return groupedData;
  }, {});

  Object.keys(groups).forEach((key) => {
    const tempRow = { ...groups[key][0] };
    aggregates.forEach((aggField) => {
      const { funcName, colName } = getAggregate(aggField);

      if (funcName === "count") {
        tempRow[aggField] = aggregateMethods[funcName](groups[key]);
      } else {
        tempRow[aggField] = aggregateMethods[funcName](groups[key], colName);
      }
    });
    returnData.push(tempRow);
  });

  return returnData;
}

function getAggregate(field) {
  const fSplit = field.split("(");
  const funcName = fSplit[0].toLowerCase();
  const colName = fSplit[1].split(")")[0];
  return { funcName, colName };
}

async function executeINSERTQuery(query) {
  const { table, columns, values } = parseINSERTQuery(query);

  try {
    const data = await readCSV(`${pre}${table}.csv`);

    let newData = {};
    columns.forEach((col, idx) => {
      newData[col] = values[idx];
    });

    data.push(newData);
    writeCSV(`${pre}${table}.csv`, data);

    await readCSV(`${pre}${table}.csv`);
    return true;
  } catch (err) {
    console.log(`error in inserting the data in ${table}: ${err}`);
  }
}

async function executeDELETEQuery(query) {
  const { table, whereClauses } = parseDELETEQuery(query);

  let data = await readCSV(`${pre}${table}.csv`);

  if (whereClauses?.length > 0) {
    data = data.filter((row) => {
      return whereClauses.every((clause) => !evaluateCondition(row, clause));
    });
  } else {
    data = [];
  }

  writeCSV(`${pre}${table}.csv`, data);
  return { message: "Rows deleted successfully." };
}

module.exports = { executeSELECTQuery, executeINSERTQuery, executeDELETEQuery };

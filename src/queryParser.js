function parseQuery(query) {
  try {
    query = query.trim();

    // checking DISTINCT KEYWORD
    let isDistinct = false;
    if (query.toUpperCase().includes("SELECT DISTINCT")) {
      isDistinct = true;
      query = query.replace("SELECT DISTINCT", "SELECT");
    }

    // Updated regex to capture LIMIT clause
    const limitRegex = /\sLIMIT\s(\d+)/i;
    const limitMatch = query.match(limitRegex);
    query = query.split(limitRegex)[0].trim();

    let limit = null;
    if (limitMatch) {
      limit = parseInt(limitMatch[1]);
    }

    // extracting order by clause fields
    const orderByRegex = /\sORDER BY\s(.+)/i;
    const orderByMatch = query.match(orderByRegex);
    query = query.split(orderByRegex)[0].trim();

    // console.log("query : ", query, "\n\n");
    // console.log(orderByMatch);

    let orderByFields = null;
    if (orderByMatch) {
      orderByFields = orderByMatch[1].split(",").map((field) => {
        const [fieldName, order] = field.trim().split(/\s+/);
        return { fieldName, order: order ? order.toUpperCase() : "ASC" };
      });
    }

    // GROUP BY SPLITTING;
    const groupByRegEx = /\sGROUP BY\s(.+)/i;
    const groupByMatch = query.match(groupByRegEx);
    query = query.split(/\sGROUP BY\s/i)[0];

    let groupByFields = null;
    if (groupByMatch) {
      groupByFields = groupByMatch[1].split(",").map((field) => field.trim());
    }

    const whereSplit = query.split(/\sWHERE\s/i);

    query = whereSplit[0];

    // whereClauses Conditions
    const whereString = whereSplit.length > 1 ? whereSplit[1] : null;

    const whereClauses = whereString ? parseWhereClause(whereString) : [];

    // Extracting joinTable, joinCondition from joinPart
    const { joinType, joinTable, joinCondition } = parseJoinClause(query);

    const joinSplit = query.split(joinType);

    const selectPart = joinSplit[0];

    // Extracting table, fields from selectPart
    const selectRegex = /^SELECT\s(.+?)\sFROM\s(.+)/i;
    const selectMatch = selectPart.match(selectRegex);
    if (!selectMatch) {
      throw new Error(
        "Invalid SELECT clause. Ensure it follows 'SELECT field1, field2 FROM table' format."
      );
    }

    const [, fields, table] = selectMatch;

    const aggregateRegEx =
      /(?:\b(?:COUNT|SUM|AVG|MIN|MAX)\b\s*\(\s*\*\s*\)|\b(?:COUNT|SUM|AVG|MIN|MAX)\b\s*\(\s*[\w\.\*]+\s*\))/gi;

    const containAggregate = fields.match(aggregateRegEx);

    const hasAggregateWithoutGroupBy =
      containAggregate?.length > 0 && !groupByFields;

    // group by condition for error

    if (groupByFields) {
      groupByFields.forEach((gfield) => {
        if (!fields.includes(gfield))
          throw new Error(
            "All fields in GROUP BY must be present in SELECT clause"
          );
      });
    }

    return {
      fields: fields.split(",").map((field) => field.trim()),
      table: table.trim(),
      whereClauses,
      joinType,
      joinTable,
      joinCondition,
      groupByFields,
      hasAggregateWithoutGroupBy,
      orderByFields,
      limit,
      isDistinct,
    };
  } catch (err) {
    throw new Error(`Query parsing error: ${err.message}`);
  }
}

function parseWhereClause(whereString) {
  const conditionRegex = /(.*?)(=|!=|>|<|>=|<=)(.*)/;

  return whereString.split(/and|or/i).map((condStr) => {
    if (/\sLIKE\s/.test(condStr)) {
      const [field, pattern] = condStr.split(/\sLIKE\s/i);

      return { field: field.trim(), operator: "LIKE", value: pattern.trim() };
    }
    const match = condStr.match(conditionRegex);
    if (match) {
      const [, field, operator, value] = match;
      return {
        field: field.trim(),
        operator: operator.trim(),
        value: value.trim(),
      };
    } else throw new Error("invalid WHERE clause format");
  });
}

function parseJoinClause(query) {
  const joinRegex =
    /(INNER|LEFT|RIGHT) JOIN\s(.+?)\sON\s([\w.]+)\s*=\s*([\w.]+)/i;
  const joinMatch = query.match(joinRegex);

  if (joinMatch) {
    return {
      joinType: joinMatch[1].trim(),
      joinTable: joinMatch[2].trim(),
      joinCondition: {
        left: joinMatch[3].trim(),
        right: joinMatch[4].trim(),
      },
    };
  }
  return {
    joinType: null,
    joinTable: null,
    joinCondition: null,
  };
}

function parseINSERTQuery(query) {
  const insertRegex = /^INSERT\sINTO\s(.+?)\s\((.*)\)\sVALUES\s\((.*)\)/i;
  const insertMatch = query.match(insertRegex);
  if (insertMatch) {
    const [, table, columns, values] = insertMatch;

    return {
      type: "INSERT",
      table,
      columns: columns.split(",").map((col) => col.trim()),
      values: values.split(",").map((val) => val.trim()),
    };
  } else {
    throw new Error(
      "Syntax error in INSERT Query it must be in format: INSERT INTO grades (columns[comma seperated]) VALUES (values [comma seperated])"
    );
  }
}

function parseDELETEQuery(query) {
  const whereSplit = query.split(/\sWHERE\s/i);
  query = whereSplit[0].trim();
  const whereClauses =
    whereSplit.length > 1 ? parseWhereClause(whereSplit[1]) : [];

  console.log(query);
  const deleteRegex = /^DELETE\sFROM\s(.+)/i;
  const deleteMatch = query.match(deleteRegex);
  console.log(deleteMatch);
  if (deleteMatch) {
    const [, table] = deleteMatch;
    return { type: "DELETE", table, whereClauses };
  } else throw new Error("DELETE Query syntax is invalid");
}

module.exports = {
  parseQuery,
  parseJoinClause,
  parseINSERTQuery,
  parseDELETEQuery,
};

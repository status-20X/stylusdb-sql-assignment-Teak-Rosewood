function performLeftJoin(data, joinData, joinCondition, fields, leftTableName) {
  // Logic for LEFT JOIN

  return data.flatMap((leftTableRow) => {
    const filteredData = joinData.filter((rightTableRow) => {
      const leftValue = leftTableRow[joinCondition.left.split(".")[1]];
      const rightValue = rightTableRow[joinCondition.right.split(".")[1]];
      return leftValue === rightValue;
    });

    if (filteredData.length == 0) {
      return fields.reduce((acc, field) => {
        const [tableName, fieldName] = field.split(".");
        acc[field] =
          tableName === leftTableName ? leftTableRow[fieldName] : null;

        return acc;
      }, {});
    }

    return filteredData.map((rightTableRow) => {
      return fields.reduce((acc, field) => {
        const [tableName, fieldName] = field.split(".");

        acc[field] =
          tableName === leftTableName
            ? leftTableRow[fieldName]
            : rightTableRow[fieldName];

        return acc;
      }, {});
    });
  });
}

module.exports = performLeftJoin;

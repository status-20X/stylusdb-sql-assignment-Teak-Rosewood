function performInnerJoin(
  data,
  joinData,
  joinCondition,
  fields,
  leftTableName
) {
  // Logic for INNER JOIN
  return data.flatMap((leftTableRow) => {
    return joinData
      .filter((rightTableRow) => {
        const leftValue = leftTableRow[joinCondition.left.split(".")[1]];
        const rightValue = rightTableRow[joinCondition.right.split(".")[1]];
        return leftValue === rightValue;
      })
      .map((rightTableRow) => {
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

module.exports = performInnerJoin;

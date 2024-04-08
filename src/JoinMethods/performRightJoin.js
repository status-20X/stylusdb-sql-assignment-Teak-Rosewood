const performLeftJoin = require("./performLeftJoin");

function performRightJoin(
  data,
  joinData,
  joinCondition,
  fields,
  rightTableName
) {
  return joinData.flatMap((rightTableRow) => {
    const filteredData = data.filter((leftTableRow) => {
      const leftValue = leftTableRow[joinCondition.left.split(".")[1]];
      const rightValue = rightTableRow[joinCondition.right.split(".")[1]];
      return leftValue === rightValue;
    });

    if (filteredData.length == 0) {
      return fields.reduce((acc, field) => {
        const [tableName, fieldName] = field.split(".");
        acc[field] =
          tableName === rightTableName ? rightTableRow[fieldName] : null;

        return acc;
      }, {});
    }

    return filteredData.map((leftTableRow) => {
      return fields.reduce((acc, field) => {
        const [tableName, fieldName] = field.split(".");

        acc[field] =
          tableName === rightTableName
            ? rightTableRow[fieldName]
            : leftTableRow[fieldName];

        return acc;
      }, {});
    });
  });
}

module.exports = performRightJoin;

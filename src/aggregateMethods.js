aggregateMethods = {
  count: function (data) {
    return data.length;
  },
  sum: function (data, column) {
    return data.reduce((acc, item) => acc + Number(item[column]), 0);
  },
  avg: function (data, column) {
    const add = this.sum(data, column);
    return add / data.length;
  },
  min: function (data, column) {
    return Math.min(...data.map((item) => item[column]));
  },
  max: function (data, column) {
    return Math.max(...data.map((item) => item[column]));
  },
};

module.exports = aggregateMethods;

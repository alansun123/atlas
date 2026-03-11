function toInt(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function paginate(list, page = 1, pageSize = 20) {
  const start = (page - 1) * pageSize;
  return {
    list: list.slice(start, start + pageSize),
    pagination: {
      page,
      pageSize,
      total: list.length,
    },
  };
}

function containsKeyword(target, keyword) {
  if (!keyword) return true;
  return String(target || '').toLowerCase().includes(String(keyword).toLowerCase());
}

module.exports = {
  toInt,
  paginate,
  containsKeyword,
};

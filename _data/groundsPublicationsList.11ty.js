module.exports = function (data) {
  const pubs = data?.grounds_publications?.publications;
  return Array.isArray(pubs) ? pubs : [];
};
